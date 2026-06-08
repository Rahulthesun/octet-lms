/**
 * services/chapter.service.js
 * ─────────────────────────────────────────────────────────────
 * DB Schema:
 *  chapters {
 *    id          : uuid (auto-generated)
 *    subject_id  : uuid (FK → subjects, on delete cascade)
 *    name        : text (required)
 *    description : text
 *    order_index : integer (controls display order, default 0)
 *    is_visible  : boolean (default true)
 *    created_at  : timestamptz (auto-set)
 *    updated_at  : timestamptz (auto-set)
 *  }
 * ─────────────────────────────────────────────────────────────
 */

const supabase = require("../config/supabase");

// ─── Create ───────────────────────────────────────────────────

const createChapter = async ({ name, subjectId, description, orderIndex, isVisible }) => {
  const { data, error } = await supabase
    .from("chapters")
    .insert({
      name,
      subject_id:  subjectId,
      description,
      order_index: orderIndex ?? 0,
      is_visible:  isVisible  ?? true,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};


// ─── Get Chapter By Chapter ID ───────────────────────────────────────


const getChapterById = async (id) => {
  const { data, error } = await supabase 
  .from("chapters")
  .select("*")
  .eq("id", id)
  .single();

  if (error?.code === "PGRST116") return null;
  if (error) throw new Error(error.message);
  return data;
}

// ─── Read all by subject ───────────────────────────────────────

const getChaptersBySubject = async (subjectId) => {
  const { data, error } = await supabase
    .from("chapters")
    .select("*")
    .eq("subject_id", subjectId)
    .order("order_index", { ascending: true });

  if (error) throw new Error(error.message);
  return data; // returns [] if subject has no chapters — that's fine
};

// ─── Update ───────────────────────────────────────────────────

const updateChapter = async (id, updates) => {
  const allowed = {};
  if (updates.name        !== undefined) allowed.name        = updates.name;
  if (updates.description !== undefined) allowed.description = updates.description;
  if (updates.orderIndex  !== undefined) allowed.order_index = updates.orderIndex;
  if (updates.isVisible   !== undefined) allowed.is_visible  = updates.isVisible;
  if (updates.subjectId   !== undefined) allowed.subject_id  = updates.subjectId;
  allowed.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("chapters")
    .update(allowed)
    .eq("id", id)
    .select()
    .single();

  if (error?.code === "PGRST116") return null;
  if (error) throw new Error(error.message);
  return data;
};

// ─── Delete ───────────────────────────────────────────────────

const deleteChapter = async (id) => {
  const { data: existing } = await supabase
    .from("chapters")
    .select("id")
    .eq("id", id)
    .single();

  if (!existing) return null;

  const { error } = await supabase
    .from("chapters")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);

  // ON DELETE CASCADE removes all subtopics, pdfs, videos under this chapter
  return { id };
};

module.exports = {
  createChapter,
  getChapterById,
  getChaptersBySubject,
  updateChapter,
  deleteChapter,

};