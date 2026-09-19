/**
 * services/audience.service.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Resolves "who is this for?" for online classes, attendance sessions, tests
 * and notifications.
 *
 * "All Students" is NOT a batch that students are added to. It is a rule —
 * audience = 'ALL' — resolved at the moment of use to every ACTIVE student
 * (approved, not graduated, not archived). Because it is evaluated live, a
 * student admitted tomorrow is included automatically and a graduated
 * student drops out automatically.
 *
 * A student enrolled in several batches is always returned once.
 *
 * Mixing rule (deliberate): "All Students" and individual batches are
 * mutually exclusive in a single selection. The API rejects a request that
 * combines them (400) and the admin UI clears the batches when All Students
 * is ticked (and vice versa), because "All Students" already includes every
 * batch — combining them would only be a redundant, confusing selection.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const supabase = require("../config/supabase");
const { applyActiveStudentFilter, hasGraduated, todayInTz } = require("../utils/graduation");

const AUDIENCE_ALL = "ALL";
const AUDIENCE_BATCH = "BATCH";
/** Sentinel the client sends in a batch field to mean "All Students". */
const ALL_STUDENTS_TOKEN = "ALL";

function badRequest(message) {
  return Object.assign(new Error(message), { status: 400 });
}

/**
 * Normalises the several shapes clients send into one { audience, batchIds }.
 * Accepts: allStudents:true, audience:'ALL', batchId:'ALL', or batchIds that
 * contain 'ALL'. Throws 400 if All Students is mixed with real batches.
 */
function normalizeAudience({ audience, allStudents, batchId, batchIds } = {}) {
  const ids = [];
  if (batchId) ids.push(batchId);
  if (Array.isArray(batchIds)) ids.push(...batchIds);
  const realBatches = [...new Set(ids.filter((id) => id && id !== ALL_STUDENTS_TOKEN))];
  const wantsAll = allStudents === true || audience === AUDIENCE_ALL || ids.includes(ALL_STUDENTS_TOKEN);

  if (wantsAll && realBatches.length > 0) {
    throw badRequest("Choose either All Students or specific batches, not both");
  }
  if (wantsAll) return { audience: AUDIENCE_ALL, batchIds: [] };
  return { audience: AUDIENCE_BATCH, batchIds: realBatches };
}

/** Every active student (approved, not graduated, not archived). */
async function getActiveStudents(select = "id, name, email, auth_user_id") {
  const { data, error } = await applyActiveStudentFilter(supabase.from("students").select(select));
  if (error) throw error;
  return data || [];
}

/** Active students enrolled in any of the given batches, de-duplicated by id. */
async function getActiveStudentsInBatches(batchIds, select = "id, name, email, auth_user_id") {
  if (!batchIds || batchIds.length === 0) return [];
  // The columns that decide "active" are always fetched, whatever the caller asked for.
  const columns = [...new Set([...select.split(",").map((c) => c.trim()), "id", "status", "is_alumni", "graduation_date"])].join(", ");
  const { data, error } = await supabase
    .from("batch_enrollments")
    .select(`student_id, students(${columns})`)
    .in("batch_id", batchIds);
  if (error) throw error;

  const today = todayInTz();
  const map = new Map();
  for (const row of data || []) {
    const s = row.students;
    if (!s || map.has(s.id)) continue;
    if (s.status && s.status !== "APPROVED") continue;
    if (hasGraduated(s, today)) continue;
    map.set(s.id, s);
  }
  return [...map.values()];
}

/** Active students for a resolved audience, de-duplicated by id. */
async function resolveStudents({ audience, batchIds }, select) {
  if (audience === AUDIENCE_ALL) return getActiveStudents(select);
  return getActiveStudentsInBatches(batchIds, select);
}

/** Set of active student ids — for filtering a list that came from elsewhere. */
async function getActiveStudentIdSet() {
  const rows = await getActiveStudents("id");
  return new Set(rows.map((r) => r.id));
}

/** Filters a list of student ids down to the active ones. */
async function filterActiveStudentIds(studentIds) {
  if (!studentIds || studentIds.length === 0) return [];
  const { data, error } = await applyActiveStudentFilter(
    supabase.from("students").select("id").in("id", studentIds)
  );
  if (error) throw error;
  return (data || []).map((r) => r.id);
}

module.exports = {
  AUDIENCE_ALL,
  AUDIENCE_BATCH,
  ALL_STUDENTS_TOKEN,
  normalizeAudience,
  getActiveStudents,
  getActiveStudentsInBatches,
  resolveStudents,
  getActiveStudentIdSet,
  filterActiveStudentIds,
};
