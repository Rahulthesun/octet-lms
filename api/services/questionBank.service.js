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
const { FIELDS, contentHash, serializeQuestion, toDbColumns } = require("../utils/mcqQuestion");
const { isNearDuplicateImage } = require("../utils/perceptualHash");
const { signKey } = require("./questionImages.service");

const COPY_COLUMNS = [
  "question_type", "question_text", "question_image_key", "question_image_content_hash",
  "option_a_type", "option_a", "option_a_image_key", "option_a_image_content_hash",
  "option_b_type", "option_b", "option_b_image_key", "option_b_image_content_hash",
  "option_c_type", "option_c", "option_c_image_key", "option_c_image_content_hash",
  "option_d_type", "option_d", "option_d_image_key", "option_d_image_content_hash",
  "correct_option", "marks",
];

// Only the columns a near-duplicate scan needs — never the full row (images,
// text, etc.) — kept minimal since this runs on every manual add/edit.
const PERCEPTUAL_SCAN_COLUMNS = ["id", "source_test_title", "created_at", ...FIELDS.map((f) => f.imagePerceptualHash)];

function badRequest(message) {
  return Object.assign(new Error(message), { status: 400 });
}

function conflict(message) {
  return Object.assign(new Error(message), { status: 409 });
}

function formatReadableDate(iso) {
  if (!iso) return "an unknown date";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "an unknown date";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

/**
 * Perceptual (near-duplicate) image check — an ADDITIONAL mechanism to the
 * exact content_hash/upsert dedup above (see utils/perceptualHash.js for
 * the dHash algorithm/threshold reasoning). The exact hash only catches
 * byte-identical re-uploads; this catches separate screenshots of the same
 * textbook question. `cols` is a toDbColumns()-shaped object (the row about
 * to be inserted/updated). `excludeId` leaves one existing bank row out of
 * the comparison set — used by updateQuestion() so editing a row never
 * flags itself as a duplicate of its own previous content.
 *
 * Skips entirely (no query at all) when the incoming question has no image
 * field with a perceptual hash — the common case for text-only questions,
 * and for any client that hasn't computed one.
 */
async function assertNoPerceptualDuplicate(cols, { excludeId } = {}) {
  const imageFields = FIELDS.filter((f) => cols[f.type] === "image" && cols[f.imagePerceptualHash]);
  if (imageFields.length === 0) return;

  let query = supabase.from("question_bank").select(PERCEPTUAL_SCAN_COLUMNS.join(", "));
  if (excludeId) query = query.neq("id", excludeId);
  const { data: existingRows, error } = await query;
  if (error) throw error;

  for (const f of imageFields) {
    const incomingHash = cols[f.imagePerceptualHash];
    for (const row of existingRows || []) {
      const existingHash = row[f.imagePerceptualHash];
      if (!existingHash) continue;
      if (isNearDuplicateImage(incomingHash, existingHash)) {
        throw conflict(
          `${f.label}'s image looks identical to a question already in the bank ` +
            `(from "${row.source_test_title || "an untitled group"}", added ${formatReadableDate(row.created_at)}) — ` +
            `remove or replace it before saving.`
        );
      }
    }
  }
}

/**
 * Stores any of these test_questions rows that are not already in the bank.
 * Callers treat failures as non-fatal (a bank hiccup must never block saving a test).
 */
const TEXT_COLUMNS_TO_TRIM = ["question_text", "option_a", "option_b", "option_c", "option_d"];

/** trim() + collapse internal whitespace runs, so accidental spacing never fragments one group into two. */
function normalizeTitleKey(title) {
  return String(title || "").trim().replace(/\s+/g, " ");
}

async function syncFromTest(test, questionRows) {
  if (!questionRows || questionRows.length === 0) return { added: 0 };
  const normalizedTitle = normalizeTitleKey(test.title);
  const rows = questionRows.map((q) => {
    const copy = Object.fromEntries(COPY_COLUMNS.map((c) => [c, q[c] ?? null]));
    // Defensive re-trim: test_questions rows should already be trimmed at
    // test-creation time, but never let stray whitespace produce a spurious
    // content_hash / duplicate bank row.
    for (const c of TEXT_COLUMNS_TO_TRIM) {
      if (typeof copy[c] === "string") copy[c] = copy[c].trim();
    }
    return {
      ...copy,
      content_hash: contentHash(copy),
      source_test_id: test.id,
      source_test_title: normalizedTitle,
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
  const title = normalizeTitleKey(label);
  if (!title) throw badRequest("A label is required");

  const rows = [];
  for (let i = 0; i < list.length; i++) {
    const cols = toDbColumns(list[i], i + 1);
    await assertNoPerceptualDuplicate(cols);
    rows.push({
      ...cols,
      content_hash: contentHash(cols),
      source_test_id: sourceTestId || null,
      source_test_title: title,
      source_question_id: null,
      created_by: createdBy || null,
    });
  }
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
    const normalizedTitle = normalizeTitleKey(r.source_test_title);
    // Manual groups (no source_test_id) key off the normalized title so
    // accidental whitespace never splits one group into two. Test-derived
    // groups always key off source_test_id — two different tests that
    // happen to share the exact same title are legitimately different
    // groups and must NOT be merged (surfaced via chapter/date below).
    const key = r.source_test_id || `title:${normalizedTitle}`;
    const g = groups.get(key) || {
      sourceTestId: r.source_test_id,
      title: normalizedTitle,
      questionCount: 0,
      lastAdded: r.created_at,
    };
    g.questionCount += 1;
    if (new Date(r.created_at) > new Date(g.lastAdded)) g.lastAdded = r.created_at;
    groups.set(key, g);
  }

  // Which of these tests still exist (a deleted test's questions stay in the bank).
  const ids = [...groups.values()].map((g) => g.sourceTestId).filter(Boolean);
  let existing = new Set();
  let testMeta = new Map();
  if (ids.length > 0) {
    const { data: tests } = await supabase.from("tests").select("id, created_at, chapters(name)").in("id", ids);
    existing = new Set((tests || []).map((t) => t.id));
    testMeta = new Map((tests || []).map((t) => [t.id, t]));
  }

  // Flag groups that share the exact same displayed title but a different
  // source_test_id, so the UI can show chapter/date to tell them apart
  // instead of silently merging two legitimately different tests.
  const titleCounts = new Map();
  for (const g of groups.values()) {
    titleCounts.set(g.title, (titleCounts.get(g.title) || 0) + 1);
  }

  return [...groups.values()].map((g) => {
    const meta = g.sourceTestId ? testMeta.get(g.sourceTestId) : null;
    return {
      ...g,
      testExists: g.sourceTestId ? existing.has(g.sourceTestId) : false,
      chapter: meta ? meta.chapters?.name || null : null,
      testCreatedAt: meta ? meta.created_at || null : null,
      titleSharedWithOtherGroup: (titleCounts.get(g.title) || 0) > 1,
    };
  });
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

  // De-dup TEXT questions that are byte-for-byte identical in wording
  // (case/whitespace-insensitive) but ended up as separate bank rows, e.g.
  // the same screenshot re-uploaded under a new R2 key. Image questions
  // (or questions with any image option) can't be safely compared this way
  // without perceptual image hashing, so they're left as-is.
  const norm = (s) => String(s || "").trim().toLowerCase().replace(/\s+/g, " ");
  const seen = new Set();
  const out = [];
  for (const row of data || []) {
    const isAllText = [row.question_type, row.option_a_type, row.option_b_type, row.option_c_type, row.option_d_type]
      .every((t) => t !== "image");
    if (isAllText) {
      const dedupKey = [row.question_text, row.option_a, row.option_b, row.option_c, row.option_d]
        .map(norm)
        .join("\x1f");
      if (seen.has(dedupKey)) continue;
      seen.add(dedupKey);
    }
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
  await assertNoPerceptualDuplicate(cols, { excludeId: bankQuestionId });
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
