/**
 * controllers/googleAuth.controller.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Admin-only Google account connection flow.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const svc = require("../services/googleAuth.service");
const { signState, verifyState } = require("../utils/oauthState");

function handleError(res, err) {
  const status = err.status || 500;
  console.error(`[google-auth] ${status} — ${err.message}`);
  res.status(status).json({ error: err.message || "Internal server error", code: err.code });
}

/**
 * GET /api/google/connect-url
 * Authenticated (admin) — returns the Google consent URL to redirect the
 * browser to. Kept as a separate step (rather than redirecting directly)
 * so the frontend can navigate with a normal full-page redirect from a
 * user gesture, and so this route can require a Bearer token while the
 * actual Google redirect cannot.
 */
async function getConnectUrl(req, res) {
  try {
    const state = signState(req.user.id);
    const url = svc.buildAuthUrl(state);
    res.json({ url });
  } catch (err) {
    handleError(res, err);
  }
}

/**
 * GET /api/google/callback
 * Google redirects the admin's browser here directly — no Authorization
 * header is available, so identity comes from the signed `state` instead.
 */
async function callback(req, res) {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
  const { code, state, error: googleError } = req.query;

  if (googleError) {
    return res.redirect(
      `${frontendUrl}/admin/online-classes?google=error&reason=${encodeURIComponent(String(googleError))}`
    );
  }

  try {
    const adminUserId = verifyState(state);
    const { email } = await svc.exchangeCodeAndStore(code, adminUserId);
    res.redirect(`${frontendUrl}/admin/online-classes?google=connected&email=${encodeURIComponent(email || "")}`);
  } catch (err) {
    console.error("[google-auth] callback failed:", err.message);
    res.redirect(`${frontendUrl}/admin/online-classes?google=error`);
  }
}

/** GET /api/google/status */
async function status(req, res) {
  try {
    res.json(await svc.getStatus(req.user.id));
  } catch (err) {
    handleError(res, err);
  }
}

/** POST /api/google/disconnect */
async function disconnect(req, res) {
  try {
    await svc.disconnect(req.user.id);
    res.json({ success: true });
  } catch (err) {
    handleError(res, err);
  }
}

module.exports = { getConnectUrl, callback, status, disconnect };
