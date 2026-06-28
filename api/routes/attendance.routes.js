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

// ─── Student override ─────────────────────────────────────────────────────────
// POST /api/attendance/students/:studentId/override

router.post("/students/:studentId/override", verifyToken, adminOnly, ctrl.overrideStudentBlock);

// ─── Sessions ─────────────────────────────────────────────────────────────────
// POST /api/attendance/sessions                         → start/get session
// POST /api/attendance/sessions/:sessionId/refresh      → rotate QR token
// GET  /api/attendance/sessions/:sessionId/roster       → present/absent list

router.post("/sessions",                       verifyToken, adminOnly, ctrl.startSession);
router.post("/sessions/:sessionId/refresh",    verifyToken, adminOnly, ctrl.refreshSession);
router.get( "/sessions/:sessionId/roster",     verifyToken, adminOnly, ctrl.getRoster);

// ─── Manual mark ─────────────────────────────────────────────────────────────
// POST /api/attendance/sessions/:sessionId/manual-mark

router.post("/sessions/:sessionId/manual-mark", verifyToken, adminOnly, ctrl.manualMark);

// ─── QR Scan (student self-mark — any authenticated student) ─────────────────
// POST /api/attendance/scan

router.post("/scan", verifyToken, ctrl.scanQrToken);

// ─── Trend ────────────────────────────────────────────────────────────────────
// GET /api/attendance/students/:studentId/trend?sessions=5

router.get("/students/:studentId/trend", verifyToken, adminOnly, ctrl.getStudentTrend);

module.exports = router;