/**
 * utils/meetInterval.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Pure interval math for turning a participant's raw join/leave sessions
 * (which can be multiple, out of order, and overlapping) into one correct
 * "total minutes attended, clamped to the official class window" number.
 * No Google/Supabase/Express knowledge here — deliberately isolated so the
 * calculation itself is easy to reason about and verify against the worked
 * examples in the spec.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * Merges overlapping/touching [start, end] millisecond intervals into the
 * minimal set of non-overlapping intervals covering the same total time.
 * Input order doesn't matter. This is what prevents double-counting when a
 * participant appears to have overlapping sessions (e.g. a flaky
 * reconnect).
 */
function mergeIntervals(intervals) {
  const sorted = intervals
    .filter((iv) => iv.end > iv.start)
    .slice()
    .sort((a, b) => a.start - b.start);

  const merged = [];
  for (const iv of sorted) {
    const last = merged[merged.length - 1];
    if (last && iv.start <= last.end) {
      last.end = Math.max(last.end, iv.end);
    } else {
      merged.push({ start: iv.start, end: iv.end });
    }
  }
  return merged;
}

/**
 * Given a participant's raw sessions (each `{ start, end }`, ISO strings or
 * Dates; `end` may be null/undefined for a session that never got a leave
 * event, e.g. the conference record was fetched mid-meeting), the class's
 * scheduled window, and whether time after the scheduled end should count:
 *
 *   1. Clamps each session to the class window — a student joining before
 *      class start or (by default) staying after class end doesn't
 *      artificially inflate their attendance.
 *   2. Merges the clamped intervals so overlapping/duplicate sessions can
 *      never be double-counted.
 *   3. Sums the merged intervals into total minutes.
 *
 * Returns `{ minutes, mergedIntervals }`. `minutes` is rounded to 2 decimals.
 */
function calculateAttendedMinutes(sessions, classStart, classEnd, { countAfterEnd = false } = {}) {
  const windowStart = new Date(classStart).getTime();
  const windowEnd = new Date(classEnd).getTime();
  const now = Date.now();

  const clamped = sessions
    .map((s) => {
      const rawStart = new Date(s.start).getTime();
      const rawEnd = s.end ? new Date(s.end).getTime() : now; // still-open session — treat as ongoing until now
      if (!Number.isFinite(rawStart) || !Number.isFinite(rawEnd)) return null;

      const effectiveStart = Math.max(rawStart, windowStart);
      const effectiveEnd = countAfterEnd ? rawEnd : Math.min(rawEnd, windowEnd);

      return effectiveEnd > effectiveStart ? { start: effectiveStart, end: effectiveEnd } : null;
    })
    .filter(Boolean);

  const merged = mergeIntervals(clamped);
  const totalMs = merged.reduce((sum, iv) => sum + (iv.end - iv.start), 0);
  const minutes = Math.round((totalMs / 60000) * 100) / 100;

  return { minutes, mergedIntervals: merged };
}

/** Percentage of the class duration attended, rounded to 2 decimals. */
function calculatePercentage(minutesAttended, classDurationMinutes) {
  if (!classDurationMinutes || classDurationMinutes <= 0) return 0;
  return Math.round((minutesAttended / classDurationMinutes) * 10000) / 100;
}

/** Classifies a percentage against the configured Present/Partial/Absent thresholds. */
function classifyAttendance(pct, presentThreshold, partialThreshold) {
  if (pct >= presentThreshold) return "present";
  if (pct >= partialThreshold) return "partial";
  return "absent";
}

module.exports = { mergeIntervals, calculateAttendedMinutes, calculatePercentage, classifyAttendance };

// ─── Effective class window + late-join grace ───────────────────────────────
//
// A class is only "held" while the host is actually in the room. Measuring
// students against the SCHEDULED window alone punishes them for the host
// starting late or ending early: in a 5-minute class where the host arrived
// two minutes in, a student who stayed for the whole time the class really
// ran would still score under 50% and be marked absent. So attendance is
// measured against the EFFECTIVE window — the part of the scheduled window
// the host was present for — and a student who is a little late is forgiven
// that lateness, up to a small grace.

const MIN_EFFECTIVE_WINDOW_MS = 60 * 1000; // below this, fall back to the scheduled window
const MAX_GRACE_MS = 5 * 60 * 1000; // late-join grace never exceeds 5 minutes
const GRACE_FRACTION = 0.1; // ...or 10% of the effective class, whichever is smaller

/**
 * @param hostSessions [{ start, end|null }] the organizer's own join/leave sessions (may be empty)
 * @param conferenceStartIso the conference record's start time (fallback anchor when the host can't be identified)
 * @returns { start: ms, end: ms, usedHost: boolean }
 */
function computeEffectiveWindow(classStart, classEnd, hostSessions, conferenceStartIso) {
  const schedStart = new Date(classStart).getTime();
  const schedEnd = new Date(classEnd).getTime();
  const now = Date.now();

  let start = schedStart;
  let end = schedEnd;
  let usedHost = false;

  const hostIntervals = (hostSessions || [])
    .map((s) => {
      const st = new Date(s.start).getTime();
      const en = s.end ? new Date(s.end).getTime() : now;
      return Number.isFinite(st) && Number.isFinite(en) ? { st, en } : null;
    })
    .filter(Boolean)
    .map((iv) => ({ st: Math.max(iv.st, schedStart), en: Math.min(iv.en, schedEnd) }))
    .filter((iv) => iv.en > iv.st);

  if (hostIntervals.length > 0) {
    start = Math.min(...hostIntervals.map((iv) => iv.st));
    end = Math.max(...hostIntervals.map((iv) => iv.en));
    usedHost = true;
  } else if (conferenceStartIso) {
    const confStart = new Date(conferenceStartIso).getTime();
    if (Number.isFinite(confStart)) start = Math.min(Math.max(confStart, schedStart), schedEnd);
  }

  if (end - start < MIN_EFFECTIVE_WINDOW_MS) {
    return { start: schedStart, end: schedEnd, usedHost: false };
  }
  return { start, end, usedHost };
}

/**
 * Minutes a student is forgiven for arriving a little late and/or leaving a
 * little early: each of those gaps is credited, capped at the grace.
 */
function lateJoinCreditMinutes(mergedIntervals, windowStartMs, windowEndMs) {
  if (!mergedIntervals || mergedIntervals.length === 0) return 0;
  const graceMs = Math.min(MAX_GRACE_MS, (windowEndMs - windowStartMs) * GRACE_FRACTION);
  const firstJoin = mergedIntervals[0].start;
  const lastLeave = mergedIntervals[mergedIntervals.length - 1].end;
  const lateBy = Math.max(0, firstJoin - windowStartMs);
  const earlyBy = Math.max(0, windowEndMs - lastLeave);
  const creditMs = Math.min(lateBy, graceMs) + Math.min(earlyBy, graceMs);
  return Math.round((creditMs / 60000) * 100) / 100;
}

module.exports.computeEffectiveWindow = computeEffectiveWindow;
module.exports.lateJoinCreditMinutes = lateJoinCreditMinutes;
