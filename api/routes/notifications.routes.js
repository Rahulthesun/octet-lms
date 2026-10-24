/**
 * routes/notifications.routes.js
 * ─────────────────────────────────────────────────────────────
 * Mounted at: /api/notifications
 *
 * The tracking pixel and provider webhook are deliberately public (no
 * verifyToken) — email clients loading an inline image, and Brevo's
 * webhook caller, never carry a Supabase bearer token. Both only ever
 * transition a row forward (queued/sent -> delivered/read/failed), so
 * there's nothing sensitive to protect by locking them down.
 * ─────────────────────────────────────────────────────────────
 */

const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/notifications.controller");
const { verifyToken, requireRole } = require("../middleware/auth");

const { publicHookLimiter } = require("../middleware/rateLimit");
const crypto = require("crypto");

const adminOnly = requireRole(["admin"]);

// The webhook is called by Brevo, not a browser, so it authenticates with a
// shared secret (set BREVO_WEBHOOK_SECRET and configure Brevo to send it as
// "Authorization: Bearer <secret>" or ?secret=). With no secret configured the
// endpoint is closed rather than open to anyone.
function requireWebhookSecret(req, res, next) {
  const expected = process.env.BREVO_WEBHOOK_SECRET;
  if (!expected) return res.status(503).json({ error: "Webhook not configured" });
  const header = req.headers.authorization || "";
  const provided = header.startsWith("Bearer ") ? header.slice(7) : String(req.query.secret || "");
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(401).json({ error: "Invalid webhook credentials" });
  }
  next();
}

// ─── Public ──────────────────────────────────────────────────────

// GET  /api/notifications/track/:logId/open.gif   — email open-tracking pixel
router.get("/track/:logId/open.gif", publicHookLimiter, ctrl.trackOpen);

// POST /api/notifications/webhook/brevo           — optional Brevo delivery/bounce webhook
router.post("/webhook/brevo", publicHookLimiter, requireWebhookSecret, ctrl.providerWebhook);

// ─── Self (any authenticated user) ──────────────────────────────

// GET  /api/notifications/me              — my inbox (optional ?onlyUnread=true&limit=&offset=)
router.get("/me", verifyToken, ctrl.listMyNotifications);

// GET  /api/notifications/me/unread-count — badge count
router.get("/me/unread-count", verifyToken, ctrl.getMyUnreadCount);

// POST /api/notifications/me/:id/read     — mark one read
router.post("/me/:id/read", verifyToken, ctrl.markRead);

// POST /api/notifications/me/read-all     — mark everything read
router.post("/me/read-all", verifyToken, ctrl.markAllRead);

// ─── Admin: compose/broadcast + delivery tracking ───────────────

// POST /api/notifications/broadcast       — send an announcement (batch-wise and/or individual students)
router.post("/broadcast", verifyToken, adminOnly, ctrl.broadcast);

// GET  /api/notifications/admin/email-log — delivery tracking list (optional ?status=)
router.get("/admin/email-log", verifyToken, adminOnly, ctrl.getEmailLog);

// GET  /api/notifications/admin/email-log/summary — counts by status
router.get("/admin/email-log/summary", verifyToken, adminOnly, ctrl.getEmailLogSummary);

module.exports = router;
