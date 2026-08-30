/**
 * services/parentReportScheduler.service.js
 * ─────────────────────────────────────────────────────────────────────────────
 * In-process scheduler for the monthly parent/student attendance report —
 * same pattern as onlineAttendanceSync.service.js's scheduler (setInterval,
 * .unref()'d, no external cron/queue dependency).
 *
 * Fires once the LMS timezone's wall clock reads the LAST DAY of the month
 * at or after 18:30 (6:30 PM). Polling (instead of a precise one-shot
 * timer) means a missed tick, a server restart, or a slightly-late poll
 * all still catch the window correctly — anything from 18:30 onward on the
 * last day is treated as "due".
 * ─────────────────────────────────────────────────────────────────────────────
 */

const parentReportsService = require("./parentReports.service");

const LMS_TIMEZONE = process.env.LMS_TIMEZONE || "Asia/Kolkata";
const POLL_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

function nowPartsInZone() {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: LMS_TIMEZONE,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hour12: false,
  });
  const parts = {};
  fmt.formatToParts(new Date()).forEach((p) => { if (p.type !== "literal") parts[p.type] = p.value; });
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour === "24" ? "0" : parts.hour),
    minute: Number(parts.minute),
  };
}

/** Same "day 0 of next month" trick used throughout the app (e.g. attendance.service.js's getMyMonthAttendance). */
function isLastDayOfMonth(year, month, day) {
  return day === new Date(year, month, 0).getDate();
}

let running = false;

async function checkAndRunMonthlyReports() {
  if (running) return; // never let two runs overlap
  const { year, month, day, hour, minute } = nowPartsInZone();

  if (!isLastDayOfMonth(year, month, day)) return;
  const minutesSince1830 = hour * 60 + minute - (18 * 60 + 30);
  if (minutesSince1830 < 0) return; // not 6:30 PM yet in the LMS timezone

  running = true;
  try {
    console.log(`[parent-reports] running monthly reports for ${month}/${year}`);
    const results = await parentReportsService.runMonthlyReportsForAllStudents(year, month);
    const sent = results.filter((r) => r.status === "sent").length;
    const skipped = results.filter((r) => r.status === "already_sent").length;
    console.log(`[parent-reports] monthly run complete — ${sent} sent, ${skipped} already sent, ${results.length} total`);
  } catch (err) {
    console.error("[parent-reports] monthly run failed:", err.message);
  } finally {
    running = false;
  }
}

function startMonthlyReportScheduler({ intervalMs = POLL_INTERVAL_MS, initialDelayMs = 20000 } = {}) {
  const timer = setInterval(checkAndRunMonthlyReports, intervalMs);
  timer.unref?.();
  const initial = setTimeout(checkAndRunMonthlyReports, initialDelayMs);
  initial.unref?.();
}

module.exports = { startMonthlyReportScheduler, checkAndRunMonthlyReports };
