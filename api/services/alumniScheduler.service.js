/**
 * services/alumniScheduler.service.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Periodic archive job: moves students whose graduation date has arrived into
 * the Alumni archive. This is only the tidy-up — access is already cut off by
 * the auth middleware the moment the date arrives, so a late run never leaves
 * a graduated student with access.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { archiveDueStudents } = require("./alumni.service");

let running = false;

async function run() {
  if (running) return;
  running = true;
  try {
    const results = await archiveDueStudents();
    if (results.length > 0) {
      const ok = results.filter((r) => r.ok).length;
      console.log(`[alumni-scheduler] archived ${ok}/${results.length} graduated students`);
    }
  } catch (err) {
    console.error("[alumni-scheduler] run failed:", err.message);
  } finally {
    running = false;
  }
}

function startAlumniScheduler({ intervalMs = 10 * 60 * 1000, initialDelayMs = 15000 } = {}) {
  const timer = setInterval(run, intervalMs);
  timer.unref?.();
  const initial = setTimeout(run, initialDelayMs);
  initial.unref?.();
}

module.exports = { startAlumniScheduler, runAlumniArchive: run };
