/**
 * services/subject.service.js
 * ─────────────────────────────────────────────────────────────
 * Handles all DB operations for the `subjects` table in Supabase.
 *
 * DB Schema:
 *  subjects {
 *    id          : uuid (auto-generated)
 *    name        : text (required)
 *    description : text
 *    order_index : integer (controls display order, default 0)
 *    is_visible  : boolean (default true)
 *    grade       : integer, 11 or 12 (required) — which class this subject
 *                  belongs to. A (grade, lower(name)) unique index means the
 *                  same subject name can exist in both grades separately,
 *                  but never twice within the same grade.
 *    created_at  : timestamptz (auto-set)
 *    updated_at  : timestamptz (auto-set)
 *  }
 * ─────────────────────────────────────────────────────────────
 */

const  supabase  = require("../config/supabase");

const VALID_GRADES = [11, 12];

/** Wraps a Postgres unique-violation (23505) into a clean, user-facing error. */
function duplicateSubjectError(name, grade) {
  return Object.assign(
    new Error(`A subject named "${name}" already exists in grade ${grade}.`),
    { status: 409 },
  );
}

// ─── Create ───────────────────────────────────────────────────

const createSubject = async ({ name, description, orderIndex, isVisible, grade }) => {
  if (!VALID_GRADES.includes(grade)) {
    throw Object.assign(new Error("grade must be 11 or 12"), { status: 400 });
  }

  const { data, error } = await supabase
    .from("subjects")
    .insert({
      name,
      description,
      order_index: orderIndex ?? 0,
      is_visible:  isVisible  ?? true,
      grade,
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") throw duplicateSubjectError(name, grade);
    throw new Error(error.message);
  }
  return data;
};

// ─── Read all ─────────────────────────────────────────────────

const getAllSubjects = async () => {
  const { data, error } = await supabase
    .from("subjects")
    .select("*")
    .order("grade", { ascending: true })
    .order("order_index", { ascending: true });

  if (error) throw new Error(error.message);
  return data;
};

// ─── Read one ─────────────────────────────────────────────────

const getSubjectById = async (id) => {
  const { data, error } = await supabase
    .from("subjects")
    .select("*")
    .eq("id", id)
    .single();

  // PGRST116 = no rows found — return null so controller sends 404
  if (error?.code === "PGRST116") return null;
  if (error) throw new Error(error.message);
  return data;
};

// ─── Update ───────────────────────────────────────────────────

const updateSubject = async (id, updates) => {
  if (updates.grade !== undefined && !VALID_GRADES.includes(updates.grade)) {
    throw Object.assign(new Error("grade must be 11 or 12"), { status: 400 });
  }

  // Whitelist allowed fields — never let raw req.body hit the DB
  const allowed = {};
  if (updates.name        !== undefined) allowed.name        = updates.name;
  if (updates.description !== undefined) allowed.description = updates.description;
  if (updates.orderIndex  !== undefined) allowed.order_index = updates.orderIndex;
  if (updates.isVisible   !== undefined) allowed.is_visible  = updates.isVisible;
  if (updates.grade       !== undefined) allowed.grade       = updates.grade;
  allowed.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("subjects")
    .update(allowed)
    .eq("id", id)
    .select()
    .single();

  if (error?.code === "PGRST116") return null;
  if (error) {
    if (error.code === "23505") {
      const existing = await getSubjectById(id);
      throw duplicateSubjectError(allowed.name ?? existing?.name, allowed.grade ?? existing?.grade);
    }
    throw new Error(error.message);
  }
  return data;
};

// ─── Delete ───────────────────────────────────────────────────

const deleteSubject = async (id) => {
  // First check it exists — so we can return null for a proper 404
  const existing = await getSubjectById(id);
  if (!existing) return null;

  const { error } = await supabase
    .from("subjects")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);

  // ON DELETE CASCADE handles all child chapters, subtopics, pdfs, videos
  return { id };
};

module.exports = {
  createSubject,
  getAllSubjects,
  getSubjectById,
  updateSubject,
  deleteSubject,
};
