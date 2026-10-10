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
const { contentHash, serializeQuestion, toDbColumns } = require("../utils/mcqQuestion");
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

/**
 * Manually adds one or more questions straight to the bank. By default this
 * creates/appends to a standalone manual group (source_test_id stays null,
 * source_test_title is the admin's own free-text label). Passing
 * sourceTestId appends instead to an existing test-derived group — the new
 * rows are bank-only extras (no matching test_questions row), tracked the
 * same way as any other bank question. Reuses the same validation
 * (toDbColumns) and hashing (contentHash) as a normal test save, and the
 * same upsert+ignoreDuplicates so re-submitting the same content never
 * double-stores it.
 */
async function createManual({ questions, label, createdBy, sourceTestId }) {
  const list = Array.isArray(questions) ? questions : [];
  if (list.length === 0) throw badRequest("At least one question is required");
  const title = typeof label === "string" ? label.trim() : "";
  if (!title) throw badRequest("A label is required");

  const rows = list.map((q, i) => {
    const cols = toDbColumns(q, i + 1);
    return {
      ...cols,
      content_hash: contentHash(cols),
      source_test_id: sourceTestId || null,
      source_test_title: title,
      source_question_id: null,
      created_by: createdBy || null,
    };
  });
  const unique = [...new Map(rows.map((r) => [r.content_hash, r])).values()];
  const { data, error } = await supabase
    .from("question_bank")
    .upsert(unique, { onConflict: "content_hash", ignoreDuplicates: true })
    .select("id");
  if (error) throw error;
  // ignoreDuplicates means a byte-identical repeat save returns no row for
  // it — fall back to looking the existing row up by content_hash so the
  // caller (autosave) always gets an id to PATCH against going forward.
  let ids = (data || []).map((r) => r.id);
  if (ids.length < unique.length) {
    const hashes = unique.map((r) => r.content_hash);
    const { data: existing } = await supabase.from("question_bank").select("id, content_hash").in("content_hash", hashes);
    const byHash = new Map((existing || []).map((r) => [r.content_hash, r.id]));
    ids = unique.map((r) => byHash.get(r.content_hash)).filter(Boolean);
  }
  return { added: (data || []).length, submitted: list.length, ids };
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

/**
 * Edits an existing bank question's content in place (question text/images,
 * options, correct answer, marks) — the row keeps its id, so any test that
 * previously imported a copy of it is completely unaffected (that test's
 * own test_questions row is a separate, independent copy; editing here
 * never touches it). content_hash is recomputed from the new content so
 * future dedup (syncFromTest/createManual) still matches correctly against
 * the edited text instead of the stale original.
 */
async function updateQuestion(bankQuestionId, updates, editorId) {
  if (!bankQuestionId) throw badRequest("bankQuestionId is required");
  const cols = toDbColumns(updates, 1);
  const payload = {
    ...cols,
    content_hash: contentHash(cols),
    updated_by: editorId || null,
    updated_at: new Date().toISOString(),
  };
  const { data, error } = await supabase
    .from("question_bank")
    .update(payload)
    .eq("id", bankQuestionId)
    .select("*")
    .maybeSingle();
  if (error) {
    // A unique content_hash collision means this edit now matches another
    // existing bank question's content exactly — surface that plainly
    // instead of a raw DB error.
    if (error.code === "23505") throw badRequest("Another question in the bank already has this exact content");
    throw error;
  }
  if (!data) throw Object.assign(new Error("Question not found in bank"), { status: 404 });

  const { signKey } = require("./questionImages.service");
  return {
    bankQuestionId: data.id,
    sourceTestTitle: data.source_test_title,
    correctOption: data.correct_option,
    marks: Number(data.marks),
    ...(await serializeQuestion(data, signKey, { withKeys: true })),
  };
}

/**
 * Renames a manually-added group's label (bulk update across every question
 * that shares it). Only manual groups (source_test_id is null) can be
 * renamed here — a group tied to a real test is named after that test and
 * is renamed by renaming the test itself, not from this page.
 */
async function renameManualGroup(oldTitle, newTitle, editorId) {
  const from = typeof oldTitle === "string" ? oldTitle.trim() : "";
  const to = typeof newTitle === "string" ? newTitle.trim() : "";
  if (!from) throw badRequest("oldTitle is required");
  if (!to) throw badRequest("A new label is required");
  const { data, error } = await supabase
    .from("question_bank")
    .update({ source_test_title: to, updated_by: editorId || null, updated_at: new Date().toISOString() })
    .is("source_test_id", null)
    .eq("source_test_title", from)
    .select("id");
  if (error) throw error;
  if (!data || data.length === 0) throw Object.assign(new Error("Group not found"), { status: 404 });
  return { renamed: data.length, title: to };
}

/**
 * Deletes one bank question. This is a separate copy-store — deleting a
 * bank row never touches any test that previously imported a copy of it
 * (that test's test_questions row is an independent copy with no FK back
 * here).
 */
async function deleteQuestion(bankQuestionId) {
  if (!bankQuestionId) throw badRequest("bankQuestionId is required");
  const { data, error } = await supabase.from("question_bank").delete().eq("id", bankQuestionId).select("id").maybeSingle();
  if (error) throw error;
  if (!data) throw Object.assign(new Error("Question not found in bank"), { status: 404 });
  return { deleted: true };
}

/**
 * Deletes an entire group (every question sharing a source_test_id, or —
 * for manual groups — every question sharing a source_test_title). Deleting
 * a group tied to a still-existing test only clears its bank copies; the
 * live test and its own test_questions are completely untouched.
 */
async function deleteGroup({ sourceTestId, title }) {
  if (!sourceTestId && !title) throw badRequest("sourceTestId or title is required");
  let query = supabase.from("question_bank").delete();
  query = sourceTestId ? query.eq("source_test_id", sourceTestId) : query.is("source_test_id", null).eq("source_test_title", title);
  const { data, error } = await query.select("id");
  if (error) throw error;
  if (!data || data.length === 0) throw Object.assign(new Error("Group not found"), { status: 404 });
  return { deleted: data.length };
}

/** Which of these bank ids really exist (validates the tracking reference on save). */
async function existingIds(ids) {
  const wanted = [...new Set((ids || []).filter(Boolean))];
  if (wanted.length === 0) return new Set();
  const { data, error } = await supabase.from("question_bank").select("id").in("id", wanted);
  if (error) throw error;
  return new Set((data || []).map((r) => r.id));
}

module.exports = { syncFromTest, createManual, backfillAll, listGroups, listQuestions, existingIds, updateQuestion, renameManualGroup, deleteQuestion, deleteGroup };
