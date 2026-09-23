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

const adminOnly = requireRole(["admin", "developer"]);

// ─── Public ──────────────────────────────────────────────────────

// GET  /api/notifications/track/:logId/open.gif   — email open-tracking pixel
router.get("/track/:logId/open.gif", ctrl.trackOpen);

// POST /api/notifications/webhook/brevo           — optional Brevo delivery/bounce webhook
router.post("/webhook/brevo", ctrl.providerWebhook);

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
