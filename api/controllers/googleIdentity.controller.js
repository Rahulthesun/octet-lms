/**
 * controllers/googleIdentity.controller.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Student-facing "link your Google account" flow — separate from the
 * admin's Calendar OAuth in googleAuth.controller.js.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const svc = require("../services/googleIdentity.service");
const { signState, verifyState } = require("../utils/oauthState");

function handleError(res, err) {
  const status = err.status || 500;
  console.error(`[google-identity] ${status} — ${err.message}`);
  res.status(status).json({ error: err.message || "Internal server error", code: err.code });
}

/** GET /api/google-identity/connect-url — any authenticated student. */
async function getConnectUrl(req, res) {
  try {
    const state = signState(req.user.id);
    const url = svc.buildAuthUrl(state);
    res.json({ url });
  } catch (err) {
    handleError(res, err);
  }
}

/** GET /api/google-identity/callback — Google redirects here directly, no bearer token available. */
async function callback(req, res) {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  const { code, state, error: googleError } = req.query;

  if (googleError) {
    return res.redirect(`${frontendUrl}/student/profile?google_identity=error`);
  }

  try {
    const studentAuthUserId = verifyState(state);
    await svc.exchangeCodeAndLink(code, studentAuthUserId);
    res.redirect(`${frontendUrl}/student/profile?google_identity=linked`);
  } catch (err) {
    console.error("[google-identity] callback failed:", err.message);
    res.redirect(`${frontendUrl}/student/profile?google_identity=error`);
  }
}

/** GET /api/google-identity/status */
async function status(req, res) {
  try {
    res.json(await svc.getStatus(req.user.id));
  } catch (err) {
    handleError(res, err);
  }
}

/** POST /api/google-identity/unlink */
async function unlink(req, res) {
  try {
    await svc.unlink(req.user.id);
    res.json({ success: true });
  } catch (err) {
    handleError(res, err);
  }
}

module.exports = { getConnectUrl, callback, status, unlink };
