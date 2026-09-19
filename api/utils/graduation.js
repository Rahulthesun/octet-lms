/**
 * utils/graduation.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Single source of truth for "is this student still active?".
 *
 * A student is graduated the moment their graduation_date is today or in the
 * past (institution timezone), regardless of whether the archive job has run
 * yet. Every auth check and every audience query goes through these helpers
 * so the rule can never drift between screens.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const TIMEZONE = process.env.LMS_TIMEZONE || "Asia/Kolkata";

const REVOKED_MESSAGE = "Your access has been revoked because you graduated.";

/** Today's calendar date as "YYYY-MM-DD" in the institution's timezone. */
function todayInTz(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const get = (t) => parts.find((p) => p.type === t).value;
  return `${get("year")}-${get("month")}-${get("day")}`;
}

/** True when the graduation date has arrived (today or earlier). */
function hasGraduated(student, today = todayInTz()) {
  if (!student) return false;
  if (student.is_alumni === true) return true;
  const g = student.graduation_date;
  if (!g) return false;
  return String(g).slice(0, 10) <= today;
}

/**
 * Applies the "active student" rules to a supabase-js query builder over the
 * `students` table: approved, not yet graduated, not archived.
 */
function applyActiveStudentFilter(query, today = todayInTz()) {
  return query
    .eq("status", "APPROVED")
    .eq("is_alumni", false)
    .or(`graduation_date.is.null,graduation_date.gt.${today}`);
}

/**
 * Batch year label for a graduation date: a 12th-standard cohort finishing in
 * Jan-Jul of year Y belongs to academic year (Y-1)-Y, e.g. 2027-03-20 ->
 * "2026-27". Finishing in Aug-Dec of Y belongs to Y-(Y+1).
 */
function computeBatchYear(graduationDate) {
  const [y, m] = String(graduationDate).slice(0, 10).split("-").map(Number);
  const startYear = m <= 7 ? y - 1 : y;
  const endShort = String((startYear + 1) % 100).padStart(2, "0");
  return `${startYear}-${endShort}`;
}

/** Strict YYYY-MM-DD validation (real calendar date). */
function isValidDateString(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

module.exports = {
  TIMEZONE,
  REVOKED_MESSAGE,
  todayInTz,
  hasGraduated,
  applyActiveStudentFilter,
  computeBatchYear,
  isValidDateString,
};
