/**
 * services/progressReports.service.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Gathers the data behind the OCTET Annual Progress Report: for each of the
 * 12 months of a year, the student's monthly test report (same source as the
 * admin Test Reports modal) and that month's attendance records (same source
 * as the admin Attendance Reports modal).
 * ─────────────────────────────────────────────────────────────────────────────
 */

const attendanceService = require("./attendance.service");
const testAttemptsService = require("./testAttempts.service");

async function getStudentProgressReport(studentId, year) {
  const y = Number(year);
  if (!Number.isInteger(y) || y < 2000 || y > 2100) {
    throw Object.assign(new Error("year must be a 4-digit year"), { status: 400 });
  }

  const months = Array.from({ length: 12 }, (_, i) => `${y}-${String(i + 1).padStart(2, "0")}`);

  const [attendance, ...tests] = await Promise.all([
    attendanceService.getStudentAttendanceReport(studentId),
    ...months.map((m) => testAttemptsService.getStudentMonthlyReport(studentId, m)),
  ]);

  return {
    student: attendance.student,
    year: y,
    months: months.map((month, i) => ({
      month,
      test: tests[i],
      attendance: attendance.records.filter((r) => String(r.date).slice(0, 7) === month),
    })),
  };
}

module.exports = { getStudentProgressReport };
