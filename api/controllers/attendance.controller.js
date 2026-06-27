/**
 * controllers/attendance.controller.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Thin HTTP layer.  Validates req params/body, calls the service,
 * and shapes the response.  No Supabase calls here.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const svc = require("../services/attendance.service");

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
  const { name, days, start_time, end_time, meet_link, location } = req.body;

  if (!name) {
    return res.status(400).json({ error: "name is required" });
  }

  try {
    const batch = await svc.createBatch({ name, days, start_time, end_time, meet_link, location });
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
    return res.status(400).json({ error: "qrToken is required" });
  }
  if (!authUserId) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  try {
    await svc.scanQrToken(qrToken, authUserId);
    res.json({ success: true });
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
  overrideStudentBlock,
  startSession,
  refreshSession,
  getRoster,
  manualMark,
  scanQrToken,
  getStudentTrend,
};