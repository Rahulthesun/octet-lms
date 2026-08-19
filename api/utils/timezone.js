/**
 * utils/timezone.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Converts a wall-clock date/time in an IANA timezone (e.g. what an admin
 * types into "Date" + "Start Time" for the institution's own timezone) into
 * a real UTC instant, correctly accounting for that zone's DST rules — using
 * only the built-in Intl API, no extra dependency.
 *
 * Google Calendar itself is given the naive "YYYY-MM-DDTHH:mm:ss" string
 * plus a separate `timeZone` field (its documented, DST-safe way of taking a
 * local time) — this helper is for OUR OWN database, which needs one true
 * UTC instant to store in a `timestamptz` column and compare against `now()`.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/** "YYYY-MM-DD" + "HH:mm" (24h) + IANA zone → ISO 8601 UTC instant. */
function zonedTimeToUtcIso(dateStr, timeStr, timeZone) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hour, minute] = timeStr.split(":").map(Number);

  // First guess: treat the wall-clock numbers as if they were already UTC.
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, 0);

  // Ask Intl what that instant actually looks like when rendered in the
  // target zone, then measure the difference — that difference IS the
  // zone's UTC offset at this specific date (DST-correct).
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  const parts = {};
  dtf.formatToParts(new Date(utcGuess)).forEach((p) => {
    if (p.type !== "literal") parts[p.type] = p.value;
  });

  const asUtcIfLocalWereUtc = Date.UTC(
    Number(parts.year),
    Number(parts.month) - 1,
    Number(parts.day),
    Number(parts.hour) === 24 ? 0 : Number(parts.hour),
    Number(parts.minute),
    Number(parts.second)
  );

  const offsetMs = asUtcIfLocalWereUtc - utcGuess;
  return new Date(utcGuess - offsetMs).toISOString();
}

/** Human-readable "<Weekday>, <Day> <Month> <Year>, <h:mm AM/PM>" in a given zone. */
function formatInTimeZone(isoString, timeZone) {
  return new Date(isoString).toLocaleString("en-IN", {
    timeZone,
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

module.exports = { zonedTimeToUtcIso, formatInTimeZone };
