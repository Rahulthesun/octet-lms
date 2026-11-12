/**
 * services/batchMembership.service.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Which batch a student belonged to ON A GIVEN DATE — so a batch change does
 * not rewrite their history.
 *
 *   batch_enrollments         — the CURRENT roster (who is in a batch now).
 *   batch_enrollment_history  — past memberships, each with the day it ended
 *                               (sql/batch_enrollment_history.sql).
 *
 * A student's "windows" are:
 *   - one per history row:          [started_on, ended_on)
 *   - one per current enrollment:   [latest history ended_on, ∞)
 *     (from the beginning when the student has no history — i.e. exactly
 *      the old behaviour for everyone who has never moved batch).
 *
 * Anything that measures the PAST against a batch (attendance %, calendars,
 * reports, which tests were meant for a student) asks `countsFor()` whether
 * a session/test on a date belonged to the student. Anything about the
 * PRESENT (rosters, today's classes, upcoming tests) keeps using
 * batch_enrollments directly.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const supabase = require("../config/supabase");
const { todayInTz } = require("../utils/graduation");

const HISTORY_TABLE = "batch_enrollment_history";
let warnedMissingTable = false;

function isMissingTable(error) {
  return error && (error.code === "PGRST205" || error.code === "42P01");
}

/** History rows for these students; [] (with one warning) until the migration has been run. */
async function fetchHistory(studentIds) {
  if (studentIds.length === 0) return [];
  const { data, error } = await supabase
    .from(HISTORY_TABLE)
    .select("student_id, batch_id, started_on, ended_on")
    .in("student_id", studentIds);
  if (isMissingTable(error)) {
    if (!warnedMissingTable) {
      console.warn(`[batchMembership] table ${HISTORY_TABLE} not found — run sql/batch_enrollment_history.sql. Using current enrollments only.`);
      warnedMissingTable = true;
    }
    return [];
  }
  if (error) throw error;
  return data || [];
}

/** Map studentId → [{ batchId, from, to }] (from/to are "YYYY-MM-DD" or null; `to` is exclusive). */
async function getWindowsForStudents(studentIds) {
  const ids = [...new Set((studentIds || []).filter(Boolean))];
  const result = new Map(ids.map((id) => [id, []]));
  if (ids.length === 0) return result;

  const [{ data: enrollments, error }, history] = await Promise.all([
    supabase.from("batch_enrollments").select("student_id, batch_id").in("student_id", ids),
    fetchHistory(ids),
  ]);
  if (error) throw error;

  const movedOn = new Map(); // studentId → latest ended_on
  for (const h of history) {
    const to = String(h.ended_on).slice(0, 10);
    result.get(h.student_id).push({ batchId: h.batch_id, from: h.started_on ? String(h.started_on).slice(0, 10) : null, to });
    if (!movedOn.has(h.student_id) || to > movedOn.get(h.student_id)) movedOn.set(h.student_id, to);
  }
  for (const e of enrollments || []) {
    result.get(e.student_id).push({ batchId: e.batch_id, from: movedOn.get(e.student_id) || null, to: null });
  }
  return result;
}

async function getWindows(studentId) {
  return (await getWindowsForStudents([studentId])).get(studentId) || [];
}

/** Every batch id the windows touch — for narrowing a query before countsFor() filters it. */
function windowBatchIds(windows) {
  return [...new Set((windows || []).map((w) => w.batchId))];
}

/** True when the student was in `batchId` on `date` ("YYYY-MM-DD"). */
function inBatchOn(windows, batchId, date) {
  return (windows || []).some(
    (w) => w.batchId === batchId && (!w.from || !date || date >= w.from) && (!w.to || !date || date < w.to)
  );
}

/**
 * True when a session ({ audience, batch_id, date }) or a test
 * ({ audience, batch_id, scheduled_start }) belonged to the student.
 * All Students items always do.
 */
function countsFor(windows, item) {
  if (!item) return false;
  if (item.audience === "ALL") return true;
  const date = item.date ? String(item.date).slice(0, 10) : item.scheduled_start ? todayInTz(new Date(item.scheduled_start)) : null;
  return inBatchOn(windows, item.batch_id, date);
}

/**
 * Permanently moves a student to `newBatchId` from `on` (default today):
 * their current enrollments are closed into history and replaced by the new
 * batch. Past sessions/tests stay counted against the batch they were in.
 */
async function moveStudentToBatch(studentId, newBatchId, { on = todayInTz() } = {}) {
  if (!newBatchId) return;
  const { data: current, error } = await supabase.from("batch_enrollments").select("batch_id").eq("student_id", studentId);
  if (error) throw error;
  const leaving = (current || []).map((e) => e.batch_id).filter((b) => b !== newBatchId);
  const alreadyIn = (current || []).some((e) => e.batch_id === newBatchId);
  if (alreadyIn && leaving.length === 0) return;

  if (leaving.length > 0) {
    const history = await fetchHistory([studentId]);
    const startedOn = history.reduce((max, h) => (!max || h.ended_on > max ? String(h.ended_on).slice(0, 10) : max), null);
    const rows = leaving.map((batchId) => ({ student_id: studentId, batch_id: batchId, started_on: startedOn, ended_on: on }));
    const { error: histErr } = await supabase.from(HISTORY_TABLE).insert(rows);
    if (histErr && !isMissingTable(histErr)) throw histErr;
    if (isMissingTable(histErr)) console.warn(`[batchMembership] ${HISTORY_TABLE} missing — batch history for ${studentId} not recorded.`);
  }

  const { error: upErr } = await supabase
    .from("batch_enrollments")
    .upsert({ batch_id: newBatchId, student_id: studentId }, { onConflict: "batch_id,student_id", ignoreDuplicates: true });
  if (upErr) throw upErr;
  if (leaving.length > 0) {
    const { error: delErr } = await supabase.from("batch_enrollments").delete().eq("student_id", studentId).in("batch_id", leaving);
    if (delErr) throw delErr;
  }
}

module.exports = {
  getWindowsForStudents,
  getWindows,
  windowBatchIds,
  inBatchOn,
  countsFor,
  moveStudentToBatch,
};
