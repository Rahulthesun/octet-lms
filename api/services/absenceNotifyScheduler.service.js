/**
 * services/absenceNotifyScheduler.service.js
 * ─────────────────────────────────────────────────────────────────────────────
 * In-process scheduler for same-day absence alerts to parents. Same pattern
 * as onlineAttendanceSync.service.js's scheduler — polling, not a precise
 * timer, so a missed tick or restart just catches up on the next pass.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const parentReportsService = require("./parentReports.service");

const POLL_INTERVAL_MS = 15 * 60 * 1000; // 15 minutes

let running = false;

async function checkAndSendAbsenceAlerts() {
  if (running) return;
  running = true;
  try {
    const dueSessionIds = await parentReportsService.findSessionsDueForAbsenceCheck();
    if (dueSessionIds.length === 0) return;

    console.log(`[absence-alerts] processing ${dueSessionIds.length} session(s)`);
    for (const sessionId of dueSessionIds) {
      try {
        const result = await parentReportsService.processAbsenceAlertsForSession(sessionId);
        console.log(`[absence-alerts] session ${sessionId}: ${result.absenteeCount} absentee(s) notified`);
      } catch (err) {
        console.error(`[absence-alerts] session ${sessionId} failed:`, err.message);
      }
    }
  } catch (err) {
    console.error("[absence-alerts] run failed:", err.message);
  } finally {
    running = false;
  }
}

function startAbsenceNotifyScheduler({ intervalMs = POLL_INTERVAL_MS, initialDelayMs = 30000 } = {}) {
  const timer = setInterval(checkAndSendAbsenceAlerts, intervalMs);
  timer.unref?.();
  const initial = setTimeout(checkAndSendAbsenceAlerts, initialDelayMs);
  initial.unref?.();
}

module.exports = { startAbsenceNotifyScheduler, checkAndSendAbsenceAlerts };
