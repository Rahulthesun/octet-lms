/**
 * services/qaDescriptive.service.js
 * ─────────────────────────────────────────────────────────────────────────
 * Descriptive (non-MCQ) Q&A/Practice items — a question + model answer,
 * no options/correct-option. Separate from questionBank.service.js, which
 * is MCQ-only. Scoped to a Class (subtopic_id), same as MCQ questions in
 * the qa/practice flow.
 * ─────────────────────────────────────────────────────────────────────────
 */

const supabase = require("../config/supabase");
const { signKey } = require("./questionImages.service");

function badRequest(message) {
  return Object.assign(new Error(message), { status: 400 });
}

function normalizeField(input, prefix) {
  const obj = typeof input[prefix] === "object" && input[prefix] !== null ? input[prefix] : null;
  const rawType = obj ? obj.type : input[`${prefix}Type`];
  const type = rawType === "image" ? "image" : "text";
  const rawText = obj ? obj.text : input[prefix];
  const text = type === "text" ? String(rawText || "").trim() : null;
  const imageKey = type === "image" ? (obj ? obj.imageKey || obj.imageUrl : input[`${prefix}ImageKey`]) || null : null;
  const contentHash = type === "image" ? (obj ? obj.contentHash || obj.imageContentHash : input[`${prefix}ImageContentHash`]) || null : null;
  const perceptualHash = type === "image" ? (obj ? obj.perceptualHash || obj.imagePerceptualHash : input[`${prefix}ImagePerceptualHash`]) || null : null;

  if (type === "text" && !text) throw badRequest(`${prefix === "question" ? "Question" : "Answer"} text is required`);
  if (type === "image" && !imageKey) throw badRequest(`${prefix === "question" ? "Question" : "Answer"} image is required`);
  return {
    type,
    text,
    imageKey,
    contentHash,
    perceptualHash,
  };
}

async function createItems({ subtopicId, items, createdBy }) {
  if (!subtopicId) throw badRequest("subtopicId is required");
  const list = Array.isArray(items) ? items : [];
  if (list.length === 0) throw badRequest("At least one item is required");

  const rows = list.map((item) => {
    const q = normalizeField(item, "question");
    const a = normalizeField(item, "answer");
    return {
      subtopic_id: subtopicId,
      question_type: q.type,
      question_text: q.text,
      question_image_key: q.imageKey,
      question_image_content_hash: q.contentHash,
      question_image_perceptual_hash: q.perceptualHash,
      answer_type: a.type,
      answer_text: a.text,
      answer_image_key: a.imageKey,
      answer_image_content_hash: a.contentHash,
      answer_image_perceptual_hash: a.perceptualHash,
      marks: Number(item.marks) > 0 ? Number(item.marks) : 1,
      created_by: createdBy || null,
    };
  });

  const { data, error } = await supabase.from("qa_descriptive_items").insert(rows).select("id");
  if (error) throw error;
  return { added: (data || []).length };
}

async function serialize(row) {
  return {
    id: row.id,
    subtopicId: row.subtopic_id,
    question: {
      type: row.question_type,
      text: row.question_text,
      imageUrl: row.question_image_key ? await signKey(row.question_image_key) : null,
    },
    answer: {
      type: row.answer_type,
      text: row.answer_text,
      imageUrl: row.answer_image_key ? await signKey(row.answer_image_key) : null,
    },
    marks: Number(row.marks),
    createdAt: row.created_at,
  };
}

async function listForSubtopic(subtopicId) {
  const { data, error } = await supabase
    .from("qa_descriptive_items")
    .select("*")
    .eq("subtopic_id", subtopicId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return Promise.all((data || []).map(serialize));
}

async function updateItem(id, updates, editorId) {
  const q = normalizeField(updates, "question");
  const a = normalizeField(updates, "answer");
  const payload = {
    question_type: q.type,
    question_text: q.text,
    question_image_key: q.imageKey,
    question_image_content_hash: q.contentHash,
    question_image_perceptual_hash: q.perceptualHash,
    answer_type: a.type,
    answer_text: a.text,
    answer_image_key: a.imageKey,
    answer_image_content_hash: a.contentHash,
    answer_image_perceptual_hash: a.perceptualHash,
    marks: Number(updates.marks) > 0 ? Number(updates.marks) : 1,
    updated_by: editorId || null,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from("qa_descriptive_items")
    .update(payload)
    .eq("id", id)
    .select("*")
    .maybeSingle();
  if (error) throw error;
  if (!data) throw Object.assign(new Error("Item not found"), { status: 404 });
  return serialize(data);
}

async function deleteItem(id) {
  const { error } = await supabase.from("qa_descriptive_items").delete().eq("id", id);
  if (error) throw error;
  return { deleted: true };
}

module.exports = { createItems, listForSubtopic, updateItem, deleteItem };
