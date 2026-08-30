/**
 * services/dashboard.service.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Aggregates data that already lives in other services into the two shapes
 * the admin and student dashboards need. No new tables, no new source of
 * truth — every figure here is computed from the same rows the rest of the
 * app already reads and writes.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const supabase = require("../config/supabase");
const studentsService = require("./students.service");
const attendanceService = require("./attendance.service");
const attendanceSettingsService = require("./attendanceSettings.service");
const onlineClassesService = require("./onlineClasses.service");
const subjectService = require("./subject.service");
const storageService = require("./storage.service");

const EMPTY_STUDENT_OVERVIEW = {
  attendance: { totalSessions: 0, presentCount: 0, absentCount: 0, attendancePct: null },
  todayClasses: [],
  upcomingClasses: [],
};

/** "YYYY-MM-DD" for an ISO instant, in a given IANA timezone. */
function dateStrInZone(iso, timeZone) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

// ─── Admin overview ────────────────────────────────────────────────────────

async function getAdminOverview() {
  const [
    studentStatsResult,
    attendanceOverview,
    settings,
    allClasses,
    storageUsage,
    pendingResult,
    subjects,
    approvedIds,
  ] = await Promise.all([
    studentsService.getDashboardStats(),
    attendanceService.getOrgAttendanceOverview(),
    attendanceSettingsService.getSettings(),
    onlineClassesService.listForAdmin(),
    storageService.getStorageUsage(),
    studentsService.getPendingStudents(),
    subjectService.getAllSubjects(),
    studentsService.getApprovedStudentIds(),
  ]);

  const pctByStudent = await attendanceService.getAttendancePercentagesForStudents(approvedIds);
  const belowThresholdCount = Object.values(pctByStudent).filter(
    (pct) => pct !== null && pct < settings.presentThreshold
  ).length;

  const now = new Date();
  const nowIso = now.toISOString();

  const liveClasses = (allClasses || []).filter((c) => c.status !== "cancelled");

  const todayClasses = liveClasses.filter(
    (c) => dateStrInZone(c.scheduledStart, c.timezone) === dateStrInZone(nowIso, c.timezone)
  );

  const upcomingClasses = liveClasses
    .filter((c) => c.scheduledStart > nowIso)
    .sort((a, b) => new Date(a.scheduledStart) - new Date(b.scheduledStart))
    .slice(0, 5);

  return {
    students: studentStatsResult.stats,
    attendance: {
      avgAttendancePct: attendanceOverview.avgAttendancePct,
      liveSessionsToday: attendanceOverview.liveSessionsToday,
      presentTodayCount: attendanceOverview.presentTodayCount,
      presentThreshold: settings.presentThreshold,
      belowThresholdCount,
    },
    onlineClasses: {
      today: todayClasses,
      upcoming: upcomingClasses,
    },
    storage: storageUsage,
    recentApplications: (pendingResult.applications || []).slice(0, 5),
    pendingApplicationsCount: pendingResult.count,
    subjectsCount: (subjects || []).length,
  };
}

// ─── Student overview ──────────────────────────────────────────────────────

async function getStudentOverview(authUserId) {
  // Guest-mode admins (or any authenticated user with no students row —
  // e.g. an admin account that has never had a student profile) should see
  // the dashboard exactly as a brand-new student would: a valid, empty
  // state, never a 404. Only a real student's own missing data (checked
  // deeper inside attendanceService for an actual student) is an error.
  const { data: student, error: lookupErr } = await supabase
    .from("students")
    .select("id")
    .eq("auth_user_id", authUserId)
    .maybeSingle();
  if (lookupErr) throw lookupErr;
  if (!student) return EMPTY_STUDENT_OVERVIEW;

  const [summary, todaySchedule, myClasses] = await Promise.all([
    attendanceService.getMyAttendanceSummary(authUserId),
    attendanceService.getMyTodaySchedule(authUserId),
    onlineClassesService.listForStudent(authUserId),
  ]);

  const nowIso = new Date().toISOString();
  const upcomingClasses = (myClasses || [])
    .filter((c) => c.status !== "cancelled" && c.scheduledStart > nowIso)
    .sort((a, b) => new Date(a.scheduledStart) - new Date(b.scheduledStart))
    .slice(0, 5);

  return {
    attendance: summary,
    todayClasses: todaySchedule.classes,
    upcomingClasses,
  };
}

module.exports = { getAdminOverview, getStudentOverview };
