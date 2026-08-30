/**
 * services/notifications.service.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Centralized notification engine — every trigger in the app (test scheduled,
 * test result published, new video uploaded, task due, admin broadcast) goes
 * through createNotification() here, never writes to the notifications table
 * directly. That's what "centralized" means in practice: one place that
 * resolves recipients, writes the in-app row, sends the branded email, and
 * logs delivery — so every trigger behaves identically and the admin's
 * delivery-tracking dashboard sees everything in one place.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const supabase = require("../config/supabase");
const { sendEmail } = require("../utils/email");

const API_PUBLIC_URL = (process.env.API_PUBLIC_URL || `http://localhost:${process.env.PORT || 8000}`).replace(/\/$/, "");
const LOGIN_URL = process.env.LOGIN_URL || "https://your-lms.com/login";

function notFound(message) {
  return Object.assign(new Error(message), { status: 404 });
}

// ─── Recipient resolution ───────────────────────────────────────────────────

async function resolveRecipientAuthIds({ userIds, studentIds, batchIds, gradeFilter, allApproved }) {
  const result = new Set();

  if (Array.isArray(userIds)) {
    for (const id of userIds) if (id) result.add(id);
  }

  // Individually-added students (e.g. "+ Add" outside the selected batches
  // in the admin compose tool) — client only ever deals in students.id,
  // never a raw auth_user_id, so it's resolved here, not trusted from input.
  if (Array.isArray(studentIds) && studentIds.length > 0) {
    const { data, error } = await supabase.from("students").select("auth_user_id").in("id", studentIds);
    if (error) throw error;
    for (const row of data || []) if (row.auth_user_id) result.add(row.auth_user_id);
  }

  if (Array.isArray(batchIds) && batchIds.length > 0) {
    const { data, error } = await supabase
      .from("batch_enrollments")
      .select("students(auth_user_id)")
      .in("batch_id", batchIds);
    if (error) throw error;
    for (const row of data || []) {
      if (row.students?.auth_user_id) result.add(row.students.auth_user_id);
    }
  }

  if (gradeFilter) {
    // students.class_grade is free-text ("11", "11th", "12th", ...) rather
    // than the clean integer subjects.grade uses — a prefix match is the
    // only reliable way to line the two up.
    const { data, error } = await supabase
      .from("students")
      .select("auth_user_id")
      .like("class_grade", `${gradeFilter}%`)
      .eq("status", "APPROVED");
    if (error) throw error;
    for (const row of data || []) if (row.auth_user_id) result.add(row.auth_user_id);
  }

  if (allApproved) {
    const { data, error } = await supabase.from("students").select("auth_user_id").eq("status", "APPROVED");
    if (error) throw error;
    for (const row of data || []) if (row.auth_user_id) result.add(row.auth_user_id);
  }

  return [...result];
}

// ─── Email delivery + tracking ──────────────────────────────────────────────

async function _sendAndLogEmail(notification, recipientEmail) {
  const { data: logRow, error: logErr } = await supabase
    .from("notification_email_log")
    .insert({
      notification_id: notification.id,
      recipient_email: recipientEmail,
      subject: notification.title,
      status: "queued",
    })
    .select()
    .single();
  if (logErr) throw logErr;

  const trackingPixelUrl = `${API_PUBLIC_URL}/api/notifications/track/${logRow.id}/open.gif`;

  try {
    const info = await sendEmail({
      to: recipientEmail,
      subject: notification.title,
      text: notification.body,
      cta: notification.link ? { text: "Open your portal", url: LOGIN_URL } : undefined,
      trackingPixelUrl,
    });
    await supabase
      .from("notification_email_log")
      .update({ status: "sent", sent_at: new Date().toISOString(), provider_message_id: info?.messageId || null })
      .eq("id", logRow.id);
  } catch (err) {
    await supabase
      .from("notification_email_log")
      .update({ status: "failed", failed_at: new Date().toISOString(), error: err.message })
      .eq("id", logRow.id);
  }
}

// ─── The single entry point every trigger calls ─────────────────────────────

/**
 * @param {object} input
 * @param {'announcement'|'assignment_due'|'video_uploaded'|'test_result'|'test_scheduled'|'test_reminder'} input.type
 * @param {string} input.title
 * @param {string} input.body
 * @param {string|null} [input.link]         Deep link within the app, e.g. "/student/tests/<id>"
 * @param {object} [input.data]              Arbitrary structured payload for the frontend
 * @param {string[]} [input.userIds]         Explicit auth_user_id recipients (internal/system triggers)
 * @param {string[]} [input.studentIds]      Explicit students.id recipients (resolved to auth ids here)
 * @param {string[]} [input.batchIds]        Every enrolled student in these batches
 * @param {number|string} [input.gradeFilter] Every approved student in this grade
 * @param {boolean} [input.allApproved]      Every approved student in the org
 * @param {string|null} [input.createdBy]    auth_user_id of the admin who triggered this (null for system triggers)
 * @param {boolean} [input.email]            Whether to also send an email (default true)
 */
async function createNotification({
  type, title, body, link = null, data = {},
  userIds, studentIds, batchIds, gradeFilter, allApproved,
  createdBy = null, email: sendEmailToRecipients = true,
}) {
  if (!title?.trim() || !body?.trim()) {
    throw Object.assign(new Error("title and body are required"), { status: 400 });
  }

  const recipients = await resolveRecipientAuthIds({ userIds, studentIds, batchIds, gradeFilter, allApproved });
  if (recipients.length === 0) return { notificationCount: 0, emailCount: 0, recipients: [] };

  const rows = recipients.map((uid) => ({ user_id: uid, type, title: title.trim(), body: body.trim(), link, data, created_by: createdBy }));
  const { data: inserted, error } = await supabase.from("notifications").insert(rows).select();
  if (error) throw error;

  let emailCount = 0;
  if (sendEmailToRecipients) {
    const { data: studentRows, error: stuErr } = await supabase
      .from("students")
      .select("auth_user_id, email")
      .in("auth_user_id", recipients);
    if (stuErr) throw stuErr;
    const emailByAuthId = Object.fromEntries((studentRows || []).filter((s) => s.email).map((s) => [s.auth_user_id, s.email]));

    const sends = inserted
      .filter((n) => emailByAuthId[n.user_id])
      .map((n) => _sendAndLogEmail(n, emailByAuthId[n.user_id]));
    const results = await Promise.allSettled(sends);
    emailCount = results.length;
  }

  return { notificationCount: inserted.length, emailCount, recipients };
}

// ─── In-app inbox ────────────────────────────────────────────────────────────

async function listForUser(userId, { onlyUnread = false, limit = 50, offset = 0 } = {}) {
  let query = supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (onlyUnread) query = query.is("read_at", null);

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map((n) => ({
    id: n.id,
    type: n.type,
    title: n.title,
    body: n.body,
    link: n.link,
    data: n.data,
    read: !!n.read_at,
    createdAt: n.created_at,
  }));
}

async function getUnreadCount(userId) {
  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);
  if (error) throw error;
  return count || 0;
}

async function markRead(userId, notificationId) {
  const { data, error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", userId)
    .select()
    .maybeSingle();
  if (error) throw error;
  if (!data) throw notFound("Notification not found");
  return data;
}

async function markAllRead(userId) {
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .is("read_at", null);
  if (error) throw error;
  return { success: true };
}

// ─── Admin: delivery tracking ────────────────────────────────────────────────

async function listEmailLogAdmin({ status, limit = 50, offset = 0 } = {}) {
  let query = supabase
    .from("notification_email_log")
    .select("*, notifications(type, title)")
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (status) query = query.eq("status", status);

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map((row) => ({
    id: row.id,
    notificationId: row.notification_id,
    type: row.notifications?.type || null,
    title: row.notifications?.title || row.subject,
    recipientEmail: row.recipient_email,
    subject: row.subject,
    status: row.status,
    error: row.error,
    sentAt: row.sent_at,
    deliveredAt: row.delivered_at,
    readAt: row.read_at,
    failedAt: row.failed_at,
    createdAt: row.created_at,
  }));
}

async function getEmailLogSummary() {
  const { data, error } = await supabase.from("notification_email_log").select("status");
  if (error) throw error;
  const summary = { queued: 0, sent: 0, delivered: 0, read: 0, failed: 0, total: data.length };
  for (const row of data) summary[row.status] = (summary[row.status] || 0) + 1;
  return summary;
}

/** Hit by the 1x1 tracking pixel embedded in every notification email. */
async function trackEmailOpen(logId) {
  const { data, error } = await supabase.from("notification_email_log").select("id, status").eq("id", logId).maybeSingle();
  if (error) throw error;
  if (!data || data.status === "failed") return; // never resurrect a failed send
  await supabase
    .from("notification_email_log")
    .update({ status: "read", read_at: new Date().toISOString() })
    .eq("id", logId);
}

/**
 * Optional Brevo webhook target — populates true "delivered"/"failed"
 * (bounce) states if the admin configures this URL in their Brevo account
 * (Transactional > Settings > Webhooks). Without that configuration,
 * "delivered" simply mirrors "sent", which is the honest default for plain
 * SMTP with no delivery receipts.
 */
async function handleProviderWebhookEvent({ messageId, event }) {
  if (!messageId) return;
  const { data: row } = await supabase
    .from("notification_email_log")
    .select("id, status")
    .eq("provider_message_id", messageId)
    .maybeSingle();
  if (!row) return;

  if (event === "delivered" && row.status !== "failed" && row.status !== "read") {
    await supabase.from("notification_email_log").update({ status: "delivered", delivered_at: new Date().toISOString() }).eq("id", row.id);
  } else if (event === "hard_bounce" || event === "soft_bounce" || event === "error" || event === "blocked") {
    await supabase.from("notification_email_log").update({ status: "failed", failed_at: new Date().toISOString(), error: event }).eq("id", row.id);
  }
}

module.exports = {
  createNotification,
  listForUser,
  getUnreadCount,
  markRead,
  markAllRead,
  listEmailLogAdmin,
  getEmailLogSummary,
  trackEmailOpen,
  handleProviderWebhookEvent,
};
