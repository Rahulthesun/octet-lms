/**
 * services/testAutoSubmitScheduler.service.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Safety net for MCQ attempts a student never explicitly submitted (closed
 * tab, lost connection, browser crash) — the frontend already auto-submits
 * on timer expiry and every student read-path lazily finalizes overdue
 * attempts too, but this in-process poll guarantees it happens even for an
 * attempt nobody looks at again. Same polling pattern as every other
 * scheduler in this app.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const testAttemptsService = require("./testAttempts.service");

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes — exams are time-sensitive, poll tighter than attendance/report jobs

let running = false;

async function checkAndAutoFinalize() {
  if (running) return;
  running = true;
  try {
    const results = await testAttemptsService.autoFinalizeExpiredAttempts();
    if (results.length > 0) {
      console.log(`[test-auto-submit] finalized ${results.filter((r) => r.ok).length}/${results.length} overdue attempt(s)`);
    }
  } catch (err) {
    console.error("[test-auto-submit] run failed:", err.message);
  } finally {
    running = false;
  }
}

function startTestAutoSubmitScheduler({ intervalMs = POLL_INTERVAL_MS, initialDelayMs = 20000 } = {}) {
  const timer = setInterval(checkAndAutoFinalize, intervalMs);
  timer.unref?.();
  const initial = setTimeout(checkAndAutoFinalize, initialDelayMs);
  initial.unref?.();
}

module.exports = { startTestAutoSubmitScheduler, checkAndAutoFinalize };
