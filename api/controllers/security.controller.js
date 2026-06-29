/**
 * controllers/security.controller.js
 */

const svc = require("../services/security.service");

async function getWatermarkToken(req, res) {
  try {
    const token = await svc.getOrCreateWatermarkToken(req.user.id);
    res.json({ token });
  } catch (err) {
    console.error("[watermark]", err.message);
    res.status(500).json({ error: "Failed to generate watermark token" });
  }
}

// Called from PdfViewer lockdown hook — fire-and-forget from the client,
// so we always return 200 even if the insert fails (don't block the UI).
async function logSecurityEvent(req, res) {
  const { event, ts, ...rest } = req.body;

  if (!event) return res.status(400).json({ error: "event is required" });

  try {
    const userId = req.user?.id || null;
    await svc.logSecurityEvent(userId, event, { ts, ...rest });
  } catch (err) {
    console.error("[security-log]", err.message);
    // Intentionally not returning 500 — client doesn't need to handle this
  }

  res.json({ ok: true });
}

module.exports = { getWatermarkToken, logSecurityEvent };