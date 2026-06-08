/**
 * services/subtopic.service.js
 * ─────────────────────────────────────────────────────────────
 * DB Schema:
 *  subtopics {
 *    id          : uuid (auto-generated)
 *    chapter_id  : uuid (FK → chapters, on delete cascade)
 *    name        : text (required)
 *    description : text
 *    order_index : integer (controls display order, default 0)
 *    is_visible  : boolean (default true)
 *    created_at  : timestamptz (auto-set)
 *    updated_at  : timestamptz (auto-set)
 *  }
 *
 *  PDFs and Videos reference subtopic_id in their own tables
 *  rather than being embedded — keeps queries simple and lets
 *  you fetch "all PDFs in this subtopic" efficiently.
 * ─────────────────────────────────────────────────────────────
 */

const supabase = require("../config/supabase");

// ─── Create ───────────────────────────────────────────────────

const createSubtopic = async ({ name, chapterId, description, orderIndex, isVisible }) => {
  const { data, error } = await supabase
    .from("subtopics")
    .insert({
      name,
      chapter_id:  chapterId,
      description,
      order_index: orderIndex ?? 0,
      is_visible:  isVisible  ?? true,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

// ─── Read all by chapter ──────────────────────────────────────

const getSubtopicsByChapter = async (chapterId) => {
  const { data, error } = await supabase
    .from("subtopics")
    .select("*")
    .eq("chapter_id", chapterId)
    .order("order_index", { ascending: true });

  if (error) throw new Error(error.message);
  if (!data || data.length === 0) throw new Error(`No subtopics found for chapter ID: ${chapterId}`);
  return data;
};

// ─── Read one ─────────────────────────────────────────────────

const getSubtopicById = async (id) => {
  const { data, error } = await supabase
    .from("subtopics")
    .select("*")
    .eq("id", id)
    .single();

  if (error?.code === "PGRST116") return null;
  if (error) throw new Error(error.message);
  return data;
};

// ─── Update ───────────────────────────────────────────────────

const updateSubtopic = async (id, updates) => {
  const allowed = {};
  if (updates.name        !== undefined) allowed.name        = updates.name;
  if (updates.description !== undefined) allowed.description = updates.description;
  if (updates.orderIndex  !== undefined) allowed.order_index = updates.orderIndex;
  if (updates.isVisible   !== undefined) allowed.is_visible  = updates.isVisible;
  if (updates.chapterId   !== undefined) allowed.chapter_id  = updates.chapterId;
  allowed.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("subtopics")
    .update(allowed)
    .eq("id", id)
    .select()
    .single();

  if (error?.code === "PGRST116") return null;
  if (error) throw new Error(error.message);
  return data;
};

// ─── Delete ───────────────────────────────────────────────────

const deleteSubtopic = async (id) => {
  const existing = await getSubtopicById(id);
  if (!existing) return null;

  const { error } = await supabase
    .from("subtopics")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);

  // ON DELETE CASCADE removes all pdfs and videos under this subtopic
  return { id };
};

module.exports = {
  createSubtopic,
  getSubtopicsByChapter,
  getSubtopicById,
  updateSubtopic,
  deleteSubtopic,
};