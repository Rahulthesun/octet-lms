/**
 * services/subject.service.js
 * ─────────────────────────────────────────────────────────────
 * Handles all DB operations for the `subjects` table in Supabase.
 *
 * DB Schema:
 *  subjects {
 *    id          : uuid (auto-generated)
 *    name        : text (required, unique)
 *    description : text
 *    order_index : integer (controls display order, default 0)
 *    is_visible  : boolean (default true)
 *    created_at  : timestamptz (auto-set)
 *    updated_at  : timestamptz (auto-set)
 *  }
 * ─────────────────────────────────────────────────────────────
 */

const  supabase  = require("../config/supabase");

// ─── Create ───────────────────────────────────────────────────

const createSubject = async ({ name, description, orderIndex, isVisible, standard }) => {
  const { data, error } = await supabase
    .from("subjects")
    .insert({
      name,
      description,
      order_index: orderIndex ?? 0,
      is_visible:  isVisible  ?? true,
      // Optional class/grade tag ('11' | '12'). Left null for every existing
      // subject — this never touches subjects created before this feature.
      standard: standard ?? null,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

// ─── Read all ─────────────────────────────────────────────────

const getAllSubjects = async () => {
  const { data, error } = await supabase
    .from("subjects")
    .select("*")
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
  // Whitelist allowed fields — never let raw req.body hit the DB
  const allowed = {};
  if (updates.name        !== undefined) allowed.name        = updates.name;
  if (updates.description !== undefined) allowed.description = updates.description;
  if (updates.orderIndex  !== undefined) allowed.order_index = updates.orderIndex;
  if (updates.isVisible   !== undefined) allowed.is_visible  = updates.isVisible;
  if (updates.standard    !== undefined) allowed.standard    = updates.standard;
  allowed.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("subjects")
    .update(allowed)
    .eq("id", id)
    .select()
    .single();

  if (error?.code === "PGRST116") return null;
  if (error) throw new Error(error.message);
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