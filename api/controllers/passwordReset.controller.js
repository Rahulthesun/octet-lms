/**
 * controllers/passwordReset.controller.js
 * Public (no login) — thin wrappers around services/passwordReset.service.js.
 */

const svc = require("../services/passwordReset.service");

/** POST /api/auth/forgot-password { email } */
exports.requestReset = async (req, res) => {
  try {
    await svc.requestReset(req.body?.email);
    // Always the same response, registered or not — see service for why.
    res.json({ ok: true, message: "If that email has an account, a password reset link has been sent to it." });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

/** GET /api/auth/reset-password/validate?token= */
exports.validateToken = async (req, res) => {
  try {
    res.json(await svc.validateToken(req.query.token));
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

/** POST /api/auth/reset-password { token, password } */
exports.resetPassword = async (req, res) => {
  try {
    const result = await svc.resetPassword(req.body?.token, req.body?.password);
    res.json({ ok: true, message: "Your password has been reset. You can now sign in with your new password.", email: result.email });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};
