/**
 * controllers/notifications.controller.js
 * ─────────────────────────────────────────────────────────────
 * In-app inbox (any authenticated user, self-scoped), the admin
 * broadcast/compose tool, delivery tracking, and the public
 * tracking-pixel/webhook endpoints. Thin wrappers around
 * services/notifications.service.js.
 * ─────────────────────────────────────────────────────────────
 */

const notificationsService = require("../services/notifications.service");

// 1x1 transparent GIF, served by the open-tracking pixel.
const TRANSPARENT_GIF = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBTAA7", "base64");

// ─── In-app inbox (self) ────────────────────────────────────────

const listMyNotifications = async (req, res) => {
  try {
    const { onlyUnread, limit, offset } = req.query;
    const notifications = await notificationsService.listForUser(req.user.id, {
      onlyUnread: onlyUnread === "true",
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
    res.status(200).json(notifications);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

const getMyUnreadCount = async (req, res) => {
  try {
    const count = await notificationsService.getUnreadCount(req.user.id);
    res.status(200).json({ count });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

const markRead = async (req, res) => {
  try {
    const notification = await notificationsService.markRead(req.user.id, req.params.id);
    res.status(200).json(notification);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

const markAllRead = async (req, res) => {
  try {
    const result = await notificationsService.markAllRead(req.user.id);
    res.status(200).json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

// ─── Admin: compose & broadcast ─────────────────────────────────

const broadcast = async (req, res) => {
  try {
    const { title, body, link, batchIds, studentIds, gradeFilter, allApproved, email } = req.body;
    const result = await notificationsService.createNotification({
      type: "announcement",
      title,
      body,
      link: link || null,
      batchIds,
      studentIds,
      gradeFilter,
      allApproved,
      createdBy: req.user.id,
      email: email !== false,
    });
    res.status(201).json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

// ─── Admin: delivery tracking ────────────────────────────────────

const getEmailLog = async (req, res) => {
  try {
    const { status, limit, offset } = req.query;
    const log = await notificationsService.listEmailLogAdmin({
      status: status || undefined,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
    res.status(200).json(log);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

const getEmailLogSummary = async (req, res) => {
  try {
    const summary = await notificationsService.getEmailLogSummary();
    res.status(200).json(summary);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

// ─── Public: tracking pixel + provider webhook ──────────────────

const trackOpen = async (req, res) => {
  try {
    await notificationsService.trackEmailOpen(req.params.logId);
  } catch {
    // Never let a bad/expired pixel hit break the image response.
  }
  res.set("Content-Type", "image/gif");
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  res.status(200).send(TRANSPARENT_GIF);
};

const providerWebhook = async (req, res) => {
  try {
    // Brevo's webhook payload shape: { event, "message-id", ... }
    const { event, "message-id": messageId } = req.body || {};
    await notificationsService.handleProviderWebhookEvent({ messageId, event });
  } catch (err) {
    console.error("notification webhook error:", err.message);
  }
  res.status(200).json({ received: true });
};

module.exports = {
  listMyNotifications,
  getMyUnreadCount,
  markRead,
  markAllRead,
  broadcast,
  getEmailLog,
  getEmailLogSummary,
  trackOpen,
  providerWebhook,
};
