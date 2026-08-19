/**
 * controllers/attendanceSettings.controller.js
 * ─────────────────────────────────────────────────────────────────────────────
 */

const svc = require("../services/attendanceSettings.service");

function handleError(res, err) {
  const status = err.status || 500;
  console.error(`[attendance-settings] ${status} — ${err.message}`);
  res.status(status).json({ error: err.message || "Internal server error" });
}

/** GET /api/attendance-settings — admin only. */
async function get(req, res) {
  try {
    res.json(await svc.getSettings());
  } catch (err) {
    handleError(res, err);
  }
}

/**
 * PATCH /api/attendance-settings — admin only.
 * Body: { presentThreshold?, partialThreshold?, autoCalculate?, autoSync?,
 *         allowOverride?, syncDelayMinutes?, countTimeAfterClassEnd? }
 */
async function update(req, res) {
  try {
    res.json(await svc.updateSettings(req.user.id, req.body));
  } catch (err) {
    handleError(res, err);
  }
}

module.exports = { get, update };
