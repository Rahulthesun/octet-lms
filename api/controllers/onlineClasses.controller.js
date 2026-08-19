/**
 * controllers/onlineClasses.controller.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Thin HTTP layer over services/onlineClasses.service.js.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const svc = require("../services/onlineClasses.service");
const { syncClassAttendance } = require("../services/onlineAttendanceSync.service");
const { getSessionByOnlineClassId, getSessionAttendanceDetail } = require("../services/attendance.service");

function handleError(res, err) {
  const status = err.status || 500;
  console.error(`[online-classes] ${status} — ${err.message}`);
  res.status(status).json({ error: err.message || "Internal server error", code: err.code });
}

/**
 * POST /api/online-classes
 * Body: { batchId, subjectId?, title, description?, date, startTime, endTime,
 *         timezone?, extraStudentIds?, createGoogleMeet?, sendNotification?,
 *         idempotencyKey? }
 */
async function schedule(req, res) {
  try {
    const result = await svc.scheduleOnlineClass(req.user.id, req.body);
    res.status(201).json({ class: result });
  } catch (err) {
    handleError(res, err);
  }
}

/** GET /api/online-classes — admin: every class (scheduled/rescheduled/cancelled), newest first. */
async function listAdmin(req, res) {
  try {
    res.json({ classes: await svc.listForAdmin() });
  } catch (err) {
    handleError(res, err);
  }
}

/** GET /api/online-classes/me/upcoming — student: their own classes. */
async function listMine(req, res) {
  try {
    res.json({ classes: await svc.listForStudent(req.user.id) });
  } catch (err) {
    handleError(res, err);
  }
}

/** GET /api/online-classes/:classId */
async function getOne(req, res) {
  try {
    res.json({ class: await svc.getById(req.params.classId) });
  } catch (err) {
    handleError(res, err);
  }
}

/** PATCH /api/online-classes/:classId — reschedule (and/or edit title/description). */
async function reschedule(req, res) {
  try {
    const result = await svc.rescheduleOnlineClass(req.user.id, req.params.classId, req.body);
    res.json({ class: result });
  } catch (err) {
    handleError(res, err);
  }
}

/** POST /api/online-classes/:classId/cancel */
async function cancel(req, res) {
  try {
    const result = await svc.cancelOnlineClass(req.user.id, req.params.classId);
    res.json({ class: result });
  } catch (err) {
    handleError(res, err);
  }
}

/**
 * POST /api/online-classes/:classId/sync-attendance
 * Admin-only, idempotent. Re-fetches Google Meet participant data and
 * recalculates attendance for this class right now, instead of waiting for
 * the automatic post-class sync — same underlying function either way, so
 * running it twice never creates duplicate attendance records.
 */
async function syncAttendance(req, res) {
  try {
    const result = await syncClassAttendance(req.params.classId);
    res.json(result);
  } catch (err) {
    handleError(res, err);
  }
}

/**
 * GET /api/online-classes/:classId/attendance
 * Admin-only. The calculated (or awaiting-sync) attendance roster for this
 * class's linked session — same shape as
 * GET /api/attendance/sessions/:sessionId/detail, just looked up by class
 * id instead of session id for convenience from the Online Classes page.
 */
async function getAttendance(req, res) {
  try {
    const session = await getSessionByOnlineClassId(req.params.classId);
    if (!session) {
      return res.status(404).json({ error: "No attendance session linked to this class yet" });
    }
    res.json(await getSessionAttendanceDetail(session.id));
  } catch (err) {
    handleError(res, err);
  }
}

module.exports = { schedule, listAdmin, listMine, getOne, reschedule, cancel, syncAttendance, getAttendance };
