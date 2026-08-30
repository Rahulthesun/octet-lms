/**
 * services/notificationReminders.service.js
 * ─────────────────────────────────────────────────────────────────────────────
 * The two time-based notification triggers — a test reminder shortly before
 * it starts, and a due-soon reminder for personal tasks (the closest real,
 * DB-backed concept to "assignment/homework due" this app has; there is no
 * separate admin-assigned homework entity, so this reuses the existing
 * Personal Tasks due_at field). Same in-process polling pattern as every
 * other scheduler in this app.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const supabase = require("../config/supabase");
const notificationsService = require("./notifications.service");

const TEST_REMINDER_WINDOW_MIN = 30; // remind once a test starts within this many minutes
const TASK_REMINDER_WINDOW_MIN = 60; // remind once a personal task is due within this many minutes

async function checkTestReminders() {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + TEST_REMINDER_WINDOW_MIN * 60000);

  const { data: tests, error } = await supabase
    .from("tests")
    .select("id, title, type, batch_id, scheduled_start")
    .eq("status", "scheduled")
    .is("reminder_sent_at", null)
    .gte("scheduled_start", now.toISOString())
    .lte("scheduled_start", windowEnd.toISOString());
  if (error) throw error;

  for (const t of tests || []) {
    try {
      const startLabel = new Date(t.scheduled_start).toLocaleString("en-IN", {
        day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
      });
      await notificationsService.createNotification({
        type: "test_reminder",
        title: `Reminder: ${t.title} starts soon`,
        body: `${t.title} starts at ${startLabel}. Be ready to begin on time — the timer starts automatically.`,
        link: "/student/tests",
        batchIds: t.batch_id ? [t.batch_id] : [],
      });
      await supabase.from("tests").update({ reminder_sent_at: new Date().toISOString() }).eq("id", t.id);
    } catch (err) {
      console.error(`[notification-reminders] test ${t.id} failed:`, err.message);
    }
  }
}

async function checkTaskReminders() {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + TASK_REMINDER_WINDOW_MIN * 60000);

  const { data: tasks, error } = await supabase
    .from("personal_tasks")
    .select("id, user_id, content, due_at")
    .eq("completed", false)
    .is("reminder_sent_at", null)
    .not("due_at", "is", null)
    .gte("due_at", now.toISOString())
    .lte("due_at", windowEnd.toISOString());
  if (error) throw error;

  for (const t of tasks || []) {
    try {
      const dueLabel = new Date(t.due_at).toLocaleString("en-IN", {
        day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
      });
      await notificationsService.createNotification({
        type: "assignment_due",
        title: "Task due soon",
        body: `"${t.content}" is due at ${dueLabel}.`,
        userIds: [t.user_id],
        email: false,
      });
      await supabase.from("personal_tasks").update({ reminder_sent_at: new Date().toISOString() }).eq("id", t.id);
    } catch (err) {
      console.error(`[notification-reminders] task ${t.id} failed:`, err.message);
    }
  }
}

let running = false;

async function runReminderChecks() {
  if (running) return;
  running = true;
  try {
    await checkTestReminders();
    await checkTaskReminders();
  } catch (err) {
    console.error("[notification-reminders] run failed:", err.message);
  } finally {
    running = false;
  }
}

function startNotificationRemindersScheduler({ intervalMs = 5 * 60 * 1000, initialDelayMs = 25000 } = {}) {
  const timer = setInterval(runReminderChecks, intervalMs);
  timer.unref?.();
  const initial = setTimeout(runReminderChecks, initialDelayMs);
  initial.unref?.();
}

module.exports = { startNotificationRemindersScheduler, runReminderChecks };
