/**
 * services/parentReports.service.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Monthly attendance PDF reports (to student + father + mother) and
 * same-day absence alerts (to father + mother). Everything here reads from
 * the same attendance_sessions/attendance_records tables the rest of the
 * app already uses — no parallel data source, no invented numbers.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const PDFDocument = require("pdfkit");
const supabase = require("../config/supabase");
const attendanceService = require("./attendance.service");
const studentsService = require("./students.service");
const { sendEmail } = require("../utils/email");
const { buildParentMonthlyReportPdf, monthName } = require("../utils/parentReportPdf");
const { zonedTimeToUtcIso } = require("../utils/timezone");

const LMS_TIMEZONE = process.env.LMS_TIMEZONE || "Asia/Kolkata";

// ─── Report data ────────────────────────────────────────────────────────────

/**
 * Placeholder for real test-results data. The Tests feature
 * (web/app/admin/tests) has no backing database table yet — this always
 * returns an empty list, so the monthly report correctly shows
 * attendance-only until that's built, never invented numbers. Swap the
 * body of this function for a real query once a test_results table exists;
 * nothing else in this file or in parentReportPdf.js needs to change.
 */
async function getTestResultsForMonth(_studentId, _year, _month) {
  return [];
}

async function getStudentMonthlyReportData(studentId, year, month) {
  const { data: student, error: stuErr } = await supabase
    .from("students")
    .select("id, name, admission_number, class_grade, preferred_batch, email, father_email, mother_email")
    .eq("id", studentId)
    .maybeSingle();
  if (stuErr) throw stuErr;
  if (!student) throw Object.assign(new Error("Student not found"), { status: 404 });

  const monthStr = String(month).padStart(2, "0");
  const startDate = `${year}-${monthStr}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${monthStr}-${String(lastDay).padStart(2, "0")}`;

  const batchIds = await attendanceService.getStudentBatchIds(studentId);

  let days = [];
  if (batchIds.length > 0) {
    const { data: sessions, error: sessErr } = await supabase
      .from("attendance_sessions")
      .select("id, date, source, online_classes(title)")
      .in("batch_id", batchIds)
      .gte("date", startDate)
      .lte("date", endDate)
      .order("date", { ascending: true });
    if (sessErr) throw sessErr;

    const sessionIds = (sessions || []).map((s) => s.id);
    const recordMap = {};
    if (sessionIds.length > 0) {
      const { data: records, error: recErr } = await supabase
        .from("attendance_records")
        .select("session_id, present, final_status, automatic_status")
        .eq("student_id", studentId)
        .in("session_id", sessionIds);
      if (recErr) throw recErr;
      (records || []).forEach((r) => { recordMap[r.session_id] = r; });
    }

    days = (sessions || []).map((s) => ({
      date: s.date,
      status: attendanceService.effectiveStatus(recordMap[s.id]),
      source: s.source || "OFFLINE",
      classTitle: s.online_classes?.title || null,
    }));
  }

  const totalSessions = days.length;
  const presentCount = days.filter((d) => d.status === "present").length;
  const partialCount = days.filter((d) => d.status === "partial").length;
  const absentCount = totalSessions - presentCount - partialCount;

  const testResults = await getTestResultsForMonth(studentId, year, month);

  return {
    student: {
      id: student.id,
      name: student.name,
      roll: student.admission_number,
      grade: student.class_grade,
      batch: student.preferred_batch,
      email: student.email,
      fatherEmail: student.father_email,
      motherEmail: student.mother_email,
    },
    year,
    month,
    totalSessions,
    presentCount,
    partialCount,
    absentCount,
    // Matches the same formula every other attendance % in the app uses
    // (present-only over total — partial is tracked separately, not
    // half-weighted into the headline percentage).
    attendancePct: totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : null,
    days,
    testResults,
  };
}

async function generatePdfBuffer(report) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: "A4" });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    buildParentMonthlyReportPdf(doc, report);
    doc.end();
  });
}

// ─── Monthly report send + idempotency log ─────────────────────────────────

async function alreadySent(studentId, year, month) {
  const { data, error } = await supabase
    .from("parent_report_log")
    .select("id")
    .eq("student_id", studentId)
    .eq("report_year", year)
    .eq("report_month", month)
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

async function logReportResult(studentId, year, month, { recipients, status, error }) {
  const { error: upsertErr } = await supabase
    .from("parent_report_log")
    .upsert(
      {
        student_id: studentId,
        report_year: year,
        report_month: month,
        recipients,
        status,
        error: error || null,
        sent_at: new Date().toISOString(),
      },
      { onConflict: "student_id,report_year,report_month" }
    );
  if (upsertErr) throw upsertErr;
}

/**
 * Generates + emails one student's monthly report to father, mother, and
 * the student themselves (whichever of the three have an email on file).
 * Idempotent: skips (without re-sending) if already logged for this
 * student+year+month, unless `force` is passed — used by the "resend"
 * admin action.
 */
async function sendMonthlyReportForStudent(studentId, year, month, { force = false } = {}) {
  if (!force && (await alreadySent(studentId, year, month))) {
    return { studentId, status: "already_sent" };
  }

  const report = await getStudentMonthlyReportData(studentId, year, month);
  const label = monthName(month);
  const firstName = report.student.name.split(" ")[0];

  const recipients = [
    report.student.fatherEmail ? { type: "father", email: report.student.fatherEmail } : null,
    report.student.motherEmail ? { type: "mother", email: report.student.motherEmail } : null,
    report.student.email ? { type: "student", email: report.student.email } : null,
  ].filter(Boolean);

  if (recipients.length === 0) {
    await logReportResult(studentId, year, month, { recipients: [], status: "skipped_no_recipients" });
    return { studentId, status: "skipped_no_recipients" };
  }

  const pdfBuffer = await generatePdfBuffer(report);
  const filename = `${report.student.name.replace(/[^a-zA-Z0-9]+/g, "_")}_${label}_${year}_attendance.pdf`;
  const subject = `${report.student.name}'s ${label} month attendance report`;

  const results = [];
  for (const r of recipients) {
    const text = r.type === "student"
      ? `Hi ${firstName},\n\nHere is your attached attendance report for the month of ${label}.\n\n-- Chemistry@OCTET`
      : `Hello,\n\nHere is the attached pdf representing your ward ${report.student.name}'s attendance report for the month of ${label}.\n\n-- Chemistry@OCTET`;

    try {
      await sendEmail({
        to: r.email,
        subject,
        text,
        attachments: [{ filename, content: pdfBuffer }],
      });
      results.push({ type: r.type, email: r.email, ok: true });
    } catch (err) {
      results.push({ type: r.type, email: r.email, ok: false, error: err.message });
    }
  }

  const anyOk = results.some((r) => r.ok);
  const allOk = results.every((r) => r.ok);
  const status = allOk ? "sent" : anyOk ? "partial" : "failed";

  await logReportResult(studentId, year, month, {
    recipients: results,
    status,
    error: allOk ? null : results.filter((r) => !r.ok).map((r) => `${r.type}: ${r.error}`).join("; "),
  });

  return { studentId, status, recipients: results };
}

/** Runs every approved student through sendMonthlyReportForStudent, one at a time — one student's failure never stops the rest. */
async function runMonthlyReportsForAllStudents(year, month) {
  const approvedIds = await studentsService.getApprovedStudentIds();
  const results = [];
  for (const studentId of approvedIds) {
    try {
      results.push(await sendMonthlyReportForStudent(studentId, year, month));
    } catch (err) {
      results.push({ studentId, status: "failed", error: err.message });
    }
  }
  return results;
}

// ─── Same-day absence alerts ────────────────────────────────────────────────

async function sendAbsenceAlert(student, date, batchName) {
  const recipients = [student.father_email, student.mother_email].filter(Boolean);
  if (recipients.length === 0) return { ok: false, reason: "no_parent_email" };

  const dateLabel = new Date(date).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
  const subject = `Attendance Alert - ${student.name} absent on ${dateLabel}`;
  const text = `Hello,\n\nYour ward ${student.name} is absent today (${dateLabel})${batchName ? ` for ${batchName}` : ""}.\n\nIf you believe this is a mistake, please contact the administration.\n\n-- Chemistry@OCTET`;

  await sendEmail({ to: recipients, subject, text });
  return { ok: true, recipients };
}

/** Sends the absence alert to every student marked absent in one session, then marks the session processed so it's never re-checked. */
async function processAbsenceAlertsForSession(sessionId) {
  const detail = await attendanceService.getSessionAttendanceDetail(sessionId);
  const absentees = detail.roster.filter((r) => r.finalStatus === "absent");

  const results = [];
  for (const entry of absentees) {
    const { data: student, error } = await supabase
      .from("students")
      .select("id, name, father_email, mother_email")
      .eq("id", entry.studentId)
      .maybeSingle();
    if (error || !student) continue;

    try {
      const r = await sendAbsenceAlert(student, detail.session.date, detail.session.batchName);
      results.push({ studentId: student.id, ...r });
    } catch (err) {
      results.push({ studentId: student.id, ok: false, error: err.message });
    }
  }

  const { error: markErr } = await supabase
    .from("attendance_sessions")
    .update({ absence_notified_at: new Date().toISOString() })
    .eq("id", sessionId);
  if (markErr) throw markErr;

  return { sessionId, absenteeCount: absentees.length, results };
}

/**
 * Finds sessions whose class has actually ended (with a buffer, so late
 * QR scans / the Meet sync still have time to land) and haven't had
 * absence alerts sent yet. Looks back a few days only, so a period of
 * server downtime can catch up without ever reaching back into old history.
 */
async function findSessionsDueForAbsenceCheck({ bufferMinutes = 45 } = {}) {
  const lookbackDate = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const { data: sessions, error } = await supabase
    .from("attendance_sessions")
    .select("id, date, batches(end_time), online_classes(scheduled_end)")
    .is("absence_notified_at", null)
    .gte("date", lookbackDate)
    .order("date", { ascending: true });
  if (error) throw error;

  const due = [];
  const now = Date.now();
  for (const s of sessions || []) {
    let endInstant = null;
    if (s.online_classes?.scheduled_end) {
      endInstant = new Date(s.online_classes.scheduled_end);
    } else if (s.batches?.end_time) {
      endInstant = new Date(zonedTimeToUtcIso(s.date, String(s.batches.end_time).slice(0, 5), LMS_TIMEZONE));
    }
    if (!endInstant || Number.isNaN(endInstant.getTime())) continue;

    if (endInstant.getTime() + bufferMinutes * 60000 <= now) due.push(s.id);
  }
  return due;
}

module.exports = {
  getStudentMonthlyReportData,
  generatePdfBuffer,
  sendMonthlyReportForStudent,
  runMonthlyReportsForAllStudents,
  sendAbsenceAlert,
  processAbsenceAlertsForSession,
  findSessionsDueForAbsenceCheck,
};
