/**
 * services/testResultReportScheduler.service.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Sends the result-report email/PDF for evaluated attempts whose test
 * window has just closed. testResultReport.service.js's sendResultReport()
 * already tries this the moment an attempt is auto-graded or manually
 * graded, but defers (does nothing) while the test is still open for other
 * students — this poll is what actually delivers those deferred reports the
 * moment scheduled_end passes, even if nobody triggers a new grading event
 * right then. Same in-process polling pattern as every other scheduler here.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { runDueResultReports } = require("./testResultReport.service");

const POLL_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes — results should appear promptly once a test closes

let running = false;

async function checkAndSend() {
  if (running) return;
  running = true;
  try {
    const results = await runDueResultReports();
    if (results.length > 0) {
      console.log(`[test-result-report] sent ${results.filter((r) => r.status === "sent").length}/${results.length} due report(s)`);
    }
  } catch (err) {
    console.error("[test-result-report] run failed:", err.message);
  } finally {
    running = false;
  }
}

function startTestResultReportScheduler({ intervalMs = POLL_INTERVAL_MS, initialDelayMs = 30000 } = {}) {
  const timer = setInterval(checkAndSend, intervalMs);
  timer.unref?.();
  const initial = setTimeout(checkAndSend, initialDelayMs);
  initial.unref?.();
}

module.exports = { startTestResultReportScheduler, checkAndSend };
