/**
 * routes/attendance.routes.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Mounted at /api/attendance in server.js.
 *
 * Middleware:
 *   verifyToken   — any authenticated user (admin, developer, student)
 *   requireRole   — restrict to specific roles where needed
 *
 * All routes are auth-gated at minimum. Admin-only routes additionally
 * require the 'admin' or 'developer' role.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const express      = require("express");
const router       = express.Router();
const ctrl         = require("../controllers/attendance.controller");
const { verifyToken, requireRole } = require("../middleware/auth");

// Role gate for admin/developer actions
const adminOnly = requireRole(["admin", "developer"]);

// ─── Batches ──────────────────────────────────────────────────────────────────
// GET  /api/attendance/batches              → list all batches
// POST /api/attendance/batches              → create a batch

router.get("/batches",     verifyToken, adminOnly, ctrl.getBatches);
router.post("/batches",    verifyToken, adminOnly, ctrl.createBatch);

// ─── Batch → Students ─────────────────────────────────────────────────────────
// GET  /api/attendance/batches/:batchId/students              → roster + pct
// GET  /api/attendance/batches/:batchId/eligible-students     → not-yet-enrolled
// POST /api/attendance/batches/:batchId/students              → enroll students

router.get( "/batches/:batchId/students",           verifyToken, adminOnly, ctrl.getBatchStudents);
router.get( "/batches/:batchId/eligible-students",  verifyToken, adminOnly, ctrl.getEligibleStudents);
router.post("/batches/:batchId/students",           verifyToken, adminOnly, ctrl.addStudentsToBatch);

// ─── Batch → Today's roster / summary (admin dashboard) ───────────────────────
// GET /api/attendance/batches/:batchId/today      → today's session + full roster
// GET /api/attendance/batches/:batchId/summary    → aggregate stats for the batch

router.get("/batches/:batchId/today",   verifyToken, adminOnly, ctrl.getTodayRoster);
router.get("/batches/:batchId/summary", verifyToken, adminOnly, ctrl.getBatchSummary);

// ─── Batch → Full statistics report (admin Students → Attendance) ─────────────
// GET /api/attendance/batches/:batchId/report          → JSON: per-student + day-by-day
// GET /api/attendance/batches/:batchId/report/csv      → CSV download
// GET /api/attendance/batches/:batchId/report/pdf      → PDF download

router.get("/batches/:batchId/report",     verifyToken, adminOnly, ctrl.getBatchReport);
router.get("/batches/:batchId/report/csv", verifyToken, adminOnly, ctrl.downloadBatchReportCsv);
router.get("/batches/:batchId/report/pdf", verifyToken, adminOnly, ctrl.downloadBatchReportPdf);

// ─── Student override ─────────────────────────────────────────────────────────
// POST /api/attendance/students/:studentId/override

router.post("/students/:studentId/override", verifyToken, adminOnly, ctrl.overrideStudentBlock);

// ─── Student → Full attendance report (admin Students → Attendance) ───────────
// GET /api/attendance/students/:studentId/report          → JSON: summary + full history
// GET /api/attendance/students/:studentId/report/csv      → CSV download
// GET /api/attendance/students/:studentId/report/pdf      → PDF download

router.get("/students/:studentId/report",     verifyToken, adminOnly, ctrl.getStudentReport);
router.get("/students/:studentId/report/csv", verifyToken, adminOnly, ctrl.downloadStudentReportCsv);
router.get("/students/:studentId/report/pdf", verifyToken, adminOnly, ctrl.downloadStudentReportPdf);

// ─── Sessions ─────────────────────────────────────────────────────────────────
// POST /api/attendance/sessions                         → start/get session
// POST /api/attendance/sessions/:sessionId/refresh      → rotate QR token
// GET  /api/attendance/sessions/:sessionId/roster       → present/absent list

router.post("/sessions",                       verifyToken, adminOnly, ctrl.startSession);
router.post("/sessions/:sessionId/refresh",    verifyToken, adminOnly, ctrl.refreshSession);
router.get( "/sessions/:sessionId/roster",     verifyToken, adminOnly, ctrl.getRoster);

// ─── Session attendance detail / override / unmatched Meet participants ──────
// GET  /api/attendance/sessions/:sessionId/detail                              → full roster incl. duration/tri-state/sync info
// POST /api/attendance/sessions/:sessionId/override                           → correct an automatic result
// POST /api/attendance/sessions/:sessionId/unmatched/:participantIndex/assign → assign an unmatched Meet participant to a student
// POST /api/attendance/sessions/:sessionId/unmatched/:participantIndex/ignore → dismiss an unmatched Meet participant
// POST /api/attendance/sessions/:sessionId/mark-reviewed                      → bookkeeping-only "admin looked at this" flag

router.get( "/sessions/:sessionId/detail",   verifyToken, adminOnly, ctrl.getSessionDetail);
router.post("/sessions/:sessionId/override", verifyToken, adminOnly, ctrl.overrideAttendance);
router.post("/sessions/:sessionId/unmatched/:participantIndex/assign", verifyToken, adminOnly, ctrl.assignUnmatchedParticipant);
router.post("/sessions/:sessionId/unmatched/:participantIndex/ignore", verifyToken, adminOnly, ctrl.ignoreUnmatchedParticipant);
router.post("/sessions/:sessionId/mark-reviewed", verifyToken, adminOnly, ctrl.markSessionReviewed);

// ─── Manual mark ─────────────────────────────────────────────────────────────
// POST /api/attendance/sessions/:sessionId/manual-mark

router.post("/sessions/:sessionId/manual-mark", verifyToken, adminOnly, ctrl.manualMark);

// ─── QR Scan (student self-mark — any authenticated student) ─────────────────
// POST /api/attendance/scan

router.post("/scan", verifyToken, ctrl.scanQrToken);

// ─── Logged-in student's own attendance (student self-service) ───────────────
// GET /api/attendance/me                    → overall summary (%, present/absent count)
// GET /api/attendance/me/history            → full session-by-session history
// GET /api/attendance/me/month              → calendar view for a given month
// GET /api/attendance/me/schedule/today     → today's scheduled classes + join link

router.get("/me",                verifyToken, ctrl.getMyAttendance);
router.get("/me/history",        verifyToken, ctrl.getMyAttendanceHistory);
router.get("/me/month",          verifyToken, ctrl.getMyMonthAttendance);
router.get("/me/schedule/today", verifyToken, ctrl.getMyTodaySchedule);

// ─── Trend ────────────────────────────────────────────────────────────────────
// GET /api/attendance/students/:studentId/trend?sessions=5

router.get("/students/:studentId/trend", verifyToken, adminOnly, ctrl.getStudentTrend);

module.exports = router;
