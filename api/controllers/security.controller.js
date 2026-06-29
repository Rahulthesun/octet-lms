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

/**
 * POST /api/security/watermark/lookup
 * 
 * Detects and decrypts a watermark token to find the originating user.
 * Admin only — used when investigating leaked documents.
 * 
 * Request body: { token: "3f8a2c91b047" }
 * Response: { user_id, student_name, student_email, created_at }
 */
async function lookupWatermark(req, res) {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: "Token is required" });
    }

    // Validate token format (12-char hex)
    if (!/^[a-f0-9]{12}$/.test(token)) {
      return res.status(400).json({ error: "Invalid token format" });
    }

    // Look up the token
    const watermark = await svc.lookupWatermarkToken(token);

    if (!watermark) {
      return res.status(404).json({ error: "Watermark token not found" });
    }

    // Get student info
    const student = await svc.getStudentForWatermark(watermark.user_id);

    return res.status(200).json({
      success: true,
      data: {
        token: token,
        user_id: watermark.user_id,
        student_name: student?.name || "Unknown",
        student_email: student?.email || "Unknown",
        student_blocked: student?.blocked || false,
        token_created_at: watermark.created_at,
      }
    });

  } catch (error) {
    console.error("Watermark lookup error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

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

module.exports = { getWatermarkToken, lookupWatermark, logSecurityEvent };