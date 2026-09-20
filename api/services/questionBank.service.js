/**
 * services/questionBank.service.js
 * ─────────────────────────────────────────────────────────────────────────────
 * The question bank: every MCQ question ever created, kept forever and grouped
 * under the title of the test it came from.
 *
 *  - Saving is automatic: tests.service.js calls syncFromTest() whenever a
 *    test's questions are written. Nothing to click.
 *  - Bank rows are independent copies. Deleting a test never deletes them.
 *  - content_hash is unique, so the same question is never stored twice, no
 *    matter how many times it is imported into other tests.
 *  - Importing gives the caller the content (with image keys); the new test
 *    stores its OWN copy, so editing or deleting it never affects the bank.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const supabase = require("../config/supabase");
const { contentHash, serializeQuestion } = require("../utils/mcqQuestion");
const { signKey } = require("./questionImages.service");

const COPY_COLUMNS = [
  "question_type", "question_text", "question_image_key",
  "option_a_type", "option_a", "option_a_image_key",
  "option_b_type", "option_b", "option_b_image_key",
  "option_c_type", "option_c", "option_c_image_key",
  "option_d_type", "option_d", "option_d_image_key",
  "correct_option", "marks",
];

function badRequest(message) {
  return Object.assign(new Error(message), { status: 400 });
}

/**
 * Stores any of these test_questions rows that are not already in the bank.
 * Callers treat failures as non-fatal (a bank hiccup must never block saving a test).
 */
async function syncFromTest(test, questionRows) {
  if (!questionRows || questionRows.length === 0) return { added: 0 };
  const rows = questionRows.map((q) => {
    const copy = Object.fromEntries(COPY_COLUMNS.map((c) => [c, q[c] ?? null]));
    return {
      ...copy,
      content_hash: contentHash(q),
      source_test_id: test.id,
      source_test_title: test.title,
      source_question_id: q.id || null,
      created_by: test.created_by || null,
    };
  });
  // De-duplicate within this batch too.
  const unique = [...new Map(rows.map((r) => [r.content_hash, r])).values()];
  const { data, error } = await supabase
    .from("question_bank")
    .upsert(unique, { onConflict: "content_hash", ignoreDuplicates: true })
    .select("id");
  if (error) throw error;
  return { added: (data || []).length };
}

/** Re-runs the back-fill for every existing MCQ test. Idempotent. */
async function backfillAll() {
  const { data: tests, error } = await supabase
    .from("tests")
    .select("id, title, created_by")
    .eq("type", "mcq")
    .order("created_at", { ascending: true });
  if (error) throw error;

  let added = 0;
  for (const t of tests || []) {
    const { data: qs, error: qErr } = await supabase
      .from("test_questions")
      .select("*")
      .eq("test_id", t.id)
      .order("order_index", { ascending: true });
    if (qErr) throw qErr;
    added += (await syncFromTest(t, qs)).added;
  }
  return { tests: (tests || []).length, added };
}

/** Past tests that have questions in the bank, newest first, optionally filtered by title. */
async function listGroups({ search } = {}) {
  let query = supabase
    .from("question_bank")
    .select("source_test_id, source_test_title, created_at")
    .order("created_at", { ascending: false });
  const term = search ? String(search).replace(/[%_,()]/g, " ").trim() : "";
  if (term) query = query.ilike("source_test_title", `%${term}%`);
  const { data, error } = await query.range(0, 9999);
  if (error) throw error;

  const groups = new Map();
  for (const r of data || []) {
    const key = r.source_test_id || `title:${r.source_test_title}`;
    const g = groups.get(key) || {
      sourceTestId: r.source_test_id,
      title: r.source_test_title,
      questionCount: 0,
      lastAdded: r.created_at,
    };
    g.questionCount += 1;
    groups.set(key, g);
  }

  // Which of these tests still exist (a deleted test's questions stay in the bank).
  const ids = [...groups.values()].map((g) => g.sourceTestId).filter(Boolean);
  let existing = new Set();
  if (ids.length > 0) {
    const { data: tests } = await supabase.from("tests").select("id").in("id", ids);
    existing = new Set((tests || []).map((t) => t.id));
  }
  return [...groups.values()].map((g) => ({ ...g, testExists: g.sourceTestId ? existing.has(g.sourceTestId) : false }));
}

/** Full questions of one group, in original order, with signed image URLs and keys. */
async function listQuestions({ sourceTestId, title }) {
  if (!sourceTestId && !title) throw badRequest("sourceTestId or title is required");
  let query = supabase.from("question_bank").select("*").order("created_at", { ascending: true });
  query = sourceTestId
    ? query.eq("source_test_id", sourceTestId)
    : query.is("source_test_id", null).eq("source_test_title", title);
  const { data, error } = await query;
  if (error) throw error;

  const out = [];
  for (const row of data || []) {
    out.push({
      bankQuestionId: row.id,
      sourceTestTitle: row.source_test_title,
      correctOption: row.correct_option,
      marks: Number(row.marks),
      ...(await serializeQuestion(row, signKey, { withKeys: true })),
    });
  }
  return out;
}

/** Which of these bank ids really exist (validates the tracking reference on save). */
async function existingIds(ids) {
  const wanted = [...new Set((ids || []).filter(Boolean))];
  if (wanted.length === 0) return new Set();
  const { data, error } = await supabase.from("question_bank").select("id").in("id", wanted);
  if (error) throw error;
  return new Set((data || []).map((r) => r.id));
}

module.exports = { syncFromTest, backfillAll, listGroups, listQuestions, existingIds };
