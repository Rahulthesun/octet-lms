/**
 * controllers/attendance.controller.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Thin HTTP layer.  Validates req params/body, calls the service,
 * and shapes the response.  No Supabase calls here.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const PDFDocument = require("pdfkit");
const svc = require("../services/attendance.service");
const {
  buildStudentReportCsv,
  buildBatchReportCsv,
  buildStudentReportPdf,
  buildBatchReportPdf,
} = require("../utils/attendanceReportFormat");

// ─── Shared error handler ─────────────────────────────────────────────────────

function handleError(res, err) {
  const status = err.status || 500;
  const message = err.message || "Internal server error";
  console.error(`[attendance] ${status} — ${message}`);
  res.status(status).json({ error: message });
}

// ─── Batches ─────────────────────────────────────────────────────────────────

/**
 * GET /api/attendance/batches
 * Query: grade (optional, reserved for future use — currently ignored)
 */
async function getBatches(req, res) {
  try {
    const batches = await svc.getBatches();
    res.json({ batches });
  } catch (err) {
    handleError(res, err);
  }
}

/**
 * POST /api/attendance/batches
 * Body: { name, mode, days?, start_time?, end_time?, meet_link?, location? }
 */
async function createBatch(req, res) {
  const { id, name, mode, days, start_time, end_time, meet_link, location } = req.body;

  if (!name) {
    return res.status(400).json({ error: "name is required" });
  }

  try {
    const batch = await svc.createBatch({ id, name, mode, days, start_time, end_time, meet_link, location });
    res.status(201).json({ batch });
  } catch (err) {
    handleError(res, err);
  }
}

// ─── Students ─────────────────────────────────────────────────────────────────

/**
 * GET /api/attendance/batches/:batchId/students
 * Query: date (optional, reserved — currently ignored server-side)
 */
async function getBatchStudents(req, res) {
  const { batchId } = req.params;

  try {
    const students = await svc.getBatchStudents(batchId);
    res.json({ students });
  } catch (err) {
    handleError(res, err);
  }
}

/**
 * GET /api/attendance/batches/:batchId/eligible-students
 * Query: grade (optional, reserved)
 */
async function getEligibleStudents(req, res) {
  const { batchId } = req.params;

  try {
    const students = await svc.getEligibleStudents(batchId);
    res.json({ students });
  } catch (err) {
    handleError(res, err);
  }
}

/**
 * POST /api/attendance/batches/:batchId/students
 * Body: { studentIds: string[] }
 */
async function addStudentsToBatch(req, res) {
  const { batchId } = req.params;
  const { studentIds } = req.body;

  if (!Array.isArray(studentIds) || studentIds.length === 0) {
    return res.status(400).json({ error: "studentIds must be a non-empty array" });
  }

  try {
    await svc.addStudentsToBatch(batchId, studentIds);
    res.json({ success: true });
  } catch (err) {
    handleError(res, err);
  }
}

/**
 * GET /api/attendance/batches/:batchId/today
 * Returns today's session (if started) plus the FULL enrolled roster,
 * with absent defaulted for anyone not yet marked.
 */
async function getTodayRoster(req, res) {
  const { batchId } = req.params;

  try {
    const result = await svc.getTodayRoster(batchId);
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
}

/**
 * GET /api/attendance/batches/:batchId/summary
 * Aggregate stats: total students, total sessions, avg attendance %,
 * today's present/absent snapshot.
 */
async function getBatchSummary(req, res) {
  const { batchId } = req.params;

  try {
    const summary = await svc.getBatchSummary(batchId);
    res.json(summary);
  } catch (err) {
    handleError(res, err);
  }
}

/**
 * POST /api/attendance/students/:studentId/override
 * Body: { batchId, unblocked }
 */
async function overrideStudentBlock(req, res) {
  const { studentId } = req.params;
  const { batchId, unblocked } = req.body;

  if (!batchId || typeof unblocked !== "boolean") {
    return res.status(400).json({ error: "batchId and unblocked (boolean) are required" });
  }

  try {
    await svc.setStudentOverride(studentId, batchId, unblocked);
    res.json({ success: true });
  } catch (err) {
    handleError(res, err);
  }
}

// ─── Sessions ─────────────────────────────────────────────────────────────────

/**
 * POST /api/attendance/sessions
 * Body: { batchId, date }   date = "YYYY-MM-DD"
 */
async function startSession(req, res) {
  const { batchId, date } = req.body;

  if (!batchId || !date) {
    return res.status(400).json({ error: "batchId and date are required" });
  }
  // Basic date format guard
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: "date must be YYYY-MM-DD" });
  }

  try {
    const session = await svc.startSession(batchId, date);
    res.json({ session });
  } catch (err) {
    handleError(res, err);
  }
}

/**
 * POST /api/attendance/sessions/:sessionId/refresh
 */
async function refreshSession(req, res) {
  const { sessionId } = req.params;

  try {
    const result = await svc.refreshSession(sessionId);
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
}

/**
 * GET /api/attendance/sessions/:sessionId/roster
 * Returns the FULL enrolled roster for that session (name, roll, present,
 * markedAt), defaulting present:false for anyone without a record.
 */
async function getRoster(req, res) {
  const { sessionId } = req.params;

  try {
    const entries = await svc.getRoster(sessionId);
    res.json({ entries });
  } catch (err) {
    handleError(res, err);
  }
}

/**
 * POST /api/attendance/sessions/:sessionId/manual-mark
 * Body: { studentId, present }
 */
async function manualMark(req, res) {
  const { sessionId } = req.params;
  const { studentId, present } = req.body;

  if (!studentId || typeof present !== "boolean") {
    return res.status(400).json({ error: "studentId and present (boolean) are required" });
  }

  try {
    await svc.manualMark(sessionId, studentId, present);
    res.json({ success: true });
  } catch (err) {
    handleError(res, err);
  }
}

/**
 * POST /api/attendance/scan
 * Body: { qrToken }
 * Auth: student JWT — we pull userId from req.user (set by verifyToken middleware)
 */
async function scanQrToken(req, res) {
  const { qrToken } = req.body;
  const authUserId = req.user?.id;

  if (!qrToken) {
    console.log("[attendance] scanQrToken: missing qrToken in request body");
    return res.status(400).json({ error: "qrToken is required" });
  }
  if (!authUserId) {
    console.log("[attendance] scanQrToken: missing auth user ID (verifyToken middleware issue?)");
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    await svc.scanQrToken(qrToken, authUserId);
    res.json({ success: true });
  } catch (err) {
    handleError(res, err);
    console.log(`[attendance] scanQrToken: error scanning QR token for user ${authUserId}: ${err.message}`)
  }
}

// ─── Logged-in student's own attendance ───────────────────────────────────────

/**
 * GET /api/attendance/me
 * Overall summary for the logged-in student (all their batches, all-time).
 */
async function getMyAttendance(req, res) {
  const authUserId = req.user?.id;
  if (!authUserId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const summary = await svc.getMyAttendanceSummary(authUserId);
    res.json(summary);
  } catch (err) {
    handleError(res, err);
  }
}

/**
 * GET /api/attendance/me/history
 * Query: limit (default 50, max 200)
 */
async function getMyAttendanceHistory(req, res) {
  const authUserId = req.user?.id;
  if (!authUserId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const limit = parseInt(req.query.limit, 10) || 50;
  if (limit < 1 || limit > 200) {
    return res.status(400).json({ error: "limit must be between 1 and 200" });
  }

  try {
    const history = await svc.getMyAttendanceHistory(authUserId, limit);
    res.json({ history });
  } catch (err) {
    handleError(res, err);
  }
}

/**
 * GET /api/attendance/me/month
 * Query: year (default current), month 1-12 (default current)
 */
async function getMyMonthAttendance(req, res) {
  const authUserId = req.user?.id;
  if (!authUserId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const now = new Date();
  const year = parseInt(req.query.year, 10) || now.getFullYear();
  const month = parseInt(req.query.month, 10) || now.getMonth() + 1;

  if (month < 1 || month > 12) {
    return res.status(400).json({ error: "month must be between 1 and 12" });
  }

  try {
    const result = await svc.getMyMonthAttendance(authUserId, year, month);
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
}

/**
 * GET /api/attendance/me/schedule/today
 * Batches scheduled for today for the logged-in student, with join link
 * (online/hybrid) or location (offline).
 */
async function getMyTodaySchedule(req, res) {
  const authUserId = req.user?.id;
  if (!authUserId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    const result = await svc.getMyTodaySchedule(authUserId);
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
}

// ─── Admin: per-student & per-batch attendance reports ────────────────────────

/**
 * GET /api/attendance/students/:studentId/report
 * Full attendance history + summary for one student (admin view).
 */
async function getStudentReport(req, res) {
  const { studentId } = req.params;
  try {
    const report = await svc.getStudentAttendanceReport(studentId);
    res.json(report);
  } catch (err) {
    handleError(res, err);
  }
}

/**
 * GET /api/attendance/students/:studentId/report/csv
 */
async function downloadStudentReportCsv(req, res) {
  const { studentId } = req.params;
  try {
    const report = await svc.getStudentAttendanceReport(studentId);
    const csv = buildStudentReportCsv(report);
    const filename = `attendance_${(report.student.roll || report.student.id).toString().replace(/[^a-zA-Z0-9_-]/g, "_")}.csv`;
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (err) {
    handleError(res, err);
  }
}

/**
 * GET /api/attendance/students/:studentId/report/pdf
 */
async function downloadStudentReportPdf(req, res) {
  const { studentId } = req.params;
  try {
    const report = await svc.getStudentAttendanceReport(studentId);
    const filename = `attendance_${(report.student.roll || report.student.id).toString().replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    const doc = new PDFDocument({ margin: 40, size: "A4" });
    doc.pipe(res);
    buildStudentReportPdf(doc, report);
    doc.end();
  } catch (err) {
    handleError(res, err);
  }
}

/**
 * GET /api/attendance/batches/:batchId/report
 * Full batch statistics: per-student totals + day-by-day breakdown.
 */
async function getBatchReport(req, res) {
  const { batchId } = req.params;
  try {
    const report = await svc.getBatchAttendanceReport(batchId);
    res.json(report);
  } catch (err) {
    handleError(res, err);
  }
}

/**
 * GET /api/attendance/batches/:batchId/report/csv
 */
async function downloadBatchReportCsv(req, res) {
  const { batchId } = req.params;
  try {
    const report = await svc.getBatchAttendanceReport(batchId);
    const csv = buildBatchReportCsv(report);
    const filename = `batch_${report.batch.name.replace(/[^a-zA-Z0-9_-]/g, "_")}.csv`;
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (err) {
    handleError(res, err);
  }
}

/**
 * GET /api/attendance/batches/:batchId/report/pdf
 */
async function downloadBatchReportPdf(req, res) {
  const { batchId } = req.params;
  try {
    const report = await svc.getBatchAttendanceReport(batchId);
    const filename = `batch_${report.batch.name.replace(/[^a-zA-Z0-9_-]/g, "_")}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    const doc = new PDFDocument({ margin: 40, size: "A4" });
    doc.pipe(res);
    buildBatchReportPdf(doc, report);
    doc.end();
  } catch (err) {
    handleError(res, err);
  }
}

// ─── Session attendance detail, override, unmatched-participant review ────────
// (used by both the QR/offline roster drill-down and the Google Meet
// online-class attendance view — same session concept, same endpoints)

/**
 * GET /api/attendance/sessions/:sessionId/detail
 * Full per-student roster for one session — duration, automatic vs final
 * pct/status, override audit, plus (for Google Meet sessions) sync status
 * and any unmatched participants awaiting manual review.
 */
async function getSessionDetail(req, res) {
  try {
    res.json(await svc.getSessionAttendanceDetail(req.params.sessionId));
  } catch (err) {
    handleError(res, err);
  }
}

/**
 * POST /api/attendance/sessions/:sessionId/override
 * Body: { studentId, status: 'present'|'partial'|'absent', reason? }
 * Overrides an automatically-calculated (or QR-based) result without
 * destroying the original automatic_pct/automatic_status audit trail.
 */
async function overrideAttendance(req, res) {
  const { studentId, status, reason } = req.body;
  if (!studentId || !status) {
    return res.status(400).json({ error: "studentId and status are required" });
  }
  try {
    const authUserId = req.user?.id;
    res.json(await svc.overrideAttendanceRecord(req.params.sessionId, studentId, { status, reason }, authUserId));
  } catch (err) {
    handleError(res, err);
  }
}

/**
 * POST /api/attendance/sessions/:sessionId/unmatched/:participantIndex/assign
 * Body: { studentId }
 * Assigns a Google Meet participant Google couldn't confidently match to
 * an LMS student, and links their Google identity for future classes.
 */
async function assignUnmatchedParticipant(req, res) {
  const { studentId } = req.body;
  if (!studentId) {
    return res.status(400).json({ error: "studentId is required" });
  }
  try {
    const authUserId = req.user?.id;
    res.json(
      await svc.assignUnknownParticipant(req.params.sessionId, req.params.participantIndex, studentId, authUserId)
    );
  } catch (err) {
    handleError(res, err);
  }
}

/** POST /api/attendance/sessions/:sessionId/unmatched/:participantIndex/ignore */
async function ignoreUnmatchedParticipant(req, res) {
  try {
    res.json(await svc.ignoreUnknownParticipant(req.params.sessionId, req.params.participantIndex));
  } catch (err) {
    handleError(res, err);
  }
}

/** POST /api/attendance/sessions/:sessionId/mark-reviewed */
async function markSessionReviewed(req, res) {
  try {
    res.json(await svc.markSessionReviewed(req.params.sessionId));
  } catch (err) {
    handleError(res, err);
  }
}

// ─── Trend ────────────────────────────────────────────────────────────────────

/**
 * GET /api/attendance/students/:studentId/trend
 * Query: sessions (default 5)
 */
async function getStudentTrend(req, res) {
  const { studentId } = req.params;
  const sessions = parseInt(req.query.sessions, 10) || 5;

  if (sessions < 1 || sessions > 50) {
    return res.status(400).json({ error: "sessions must be between 1 and 50" });
  }

  try {
    const points = await svc.getStudentTrend(studentId, sessions);
    res.json({ points });
  } catch (err) {
    handleError(res, err);
  }
}

module.exports = {
  getBatches,
  createBatch,
  getBatchStudents,
  getEligibleStudents,
  addStudentsToBatch,
  getTodayRoster,
  getBatchSummary,
  overrideStudentBlock,
  startSession,
  refreshSession,
  getRoster,
  manualMark,
  scanQrToken,
  getMyAttendance,
  getMyAttendanceHistory,
  getMyMonthAttendance,
  getMyTodaySchedule,
  getStudentReport,
  downloadStudentReportCsv,
  downloadStudentReportPdf,
  getBatchReport,
  downloadBatchReportCsv,
  downloadBatchReportPdf,
  getSessionDetail,
  overrideAttendance,
  assignUnmatchedParticipant,
  ignoreUnmatchedParticipant,
  markSessionReviewed,
  getStudentTrend,
};
