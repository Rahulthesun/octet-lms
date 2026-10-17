/**
 * controllers/testSettings.controller.js
 * ─────────────────────────────────────────────────────────────────────────────
 */

const svc = require("../services/testSettings.service");

function handleError(res, err) {
  const status = err.status || 500;
  console.error(`[test-settings] ${status} — ${err.message}`);
  res.status(status).json({ error: err.message || "Internal server error" });
}

/** GET /api/test-settings — admin only. */
async function get(req, res) {
  try {
    res.json(await svc.getSettings());
  } catch (err) {
    handleError(res, err);
  }
}

/**
 * PATCH /api/test-settings — admin only.
 * Body: { passPercentage? }
 */
async function update(req, res) {
  try {
    res.json(await svc.updateSettings(req.user.id, req.body));
  } catch (err) {
    handleError(res, err);
  }
}

module.exports = { get, update };
