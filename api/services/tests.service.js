/**
 * services/tests.service.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Admin-side test authoring: create/list/update/delete tests, manage MCQ
 * questions, and attach the descriptive question-paper/answer-key files.
 * Correct answers (test_questions.correct_option) are only ever returned
 * from the admin-facing functions here — testAttempts.service.js has its
 * own, separate student-facing serializer that strips them.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { v4: uuidv4 } = require("uuid");
const { PutObjectCommand, DeleteObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const supabase = require("../config/supabase");
const r2 = require("../config/r2");
const notificationsService = require("./notifications.service");
const audienceService = require("./audience.service");
const questionBank = require("./questionBank.service");
const { signKey } = require("./questionImages.service");
const { toDbColumns, serializeQuestion } = require("../utils/mcqQuestion");

const BUCKET = process.env.R2_BUCKET_NAME;

function badRequest(message) {
  return Object.assign(new Error(message), { status: 400 });
}
function notFound(message = "Test not found") {
  return Object.assign(new Error(message), { status: 404 });
}

// ─── R2 file helpers (question papers, answer keys) ────────────────────────

async function uploadTestFile(file, prefix) {
  const ext = (file.originalname.split(".").pop() || "bin").toLowerCase();
  const key = `test-files/${prefix}/${uuidv4()}.${ext}`;
  await r2.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: file.buffer, ContentType: file.mimetype }));
  return { key, name: file.originalname };
}

async function deleteTestFile(key) {
  if (!key) return;
  try {
    await r2.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
  } catch {
    // Best-effort — never let an R2 cleanup failure block the DB operation.
  }
}

async function getSignedFileUrl(key) {
  if (!key) return null;
  return getSignedUrl(r2, new GetObjectCommand({ Bucket: BUCKET, Key: key }), { expiresIn: 3600 });
}

// ─── Serialization ──────────────────────────────────────────────────────────

function mapTestRow(t) {
  return {
    id: t.id,
    title: t.title,
    type: t.type,
    subjectId: t.subject_id,
    subjectName: t.chapters?.subjects?.name || t.subjects?.name || null,
    chapterId: t.chapter_id || null,
    chapterName: t.chapters?.name || null,
    batchId: t.batch_id,
    audience: t.audience || "BATCH",
    allStudents: t.audience === "ALL",
    batchName: t.audience === "ALL" ? "All Students" : (t.batches?.name || null),
    status: t.status,
    scheduledStart: t.scheduled_start,
    scheduledEnd: t.scheduled_end,
    maxMarks: t.max_marks,
    instructions: t.instructions,
    questionText: t.question_text,
    questionFileName: t.question_file_name,
    answerKeyFileName: t.answer_key_file_name,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
  };
}

const TEST_SELECT = "*, subjects(name), batches(name), chapters(name, subjects(name))";

/** Looks up a chapter's own subject_id, so tests.subject_id stays populated (and existing subject-based display/filtering keeps working) even though the picker now assigns a chapter, not a subject directly. */
async function subjectIdForChapter(chapterId) {
  if (!chapterId) return null;
  const { data, error } = await supabase.from("chapters").select("subject_id").eq("id", chapterId).maybeSingle();
  if (error) throw error;
  if (!data) throw badRequest("Chapter not found");
  return data.subject_id;
}

// ─── Questions (MCQ) ────────────────────────────────────────────────────────

function validateQuestions(questions) {
  if (!Array.isArray(questions) || questions.length === 0) {
    throw badRequest("At least one question is required for an MCQ test");
  }
  // Every question and each of its four options must have an image or text.
  questions.forEach((q, i) => toDbColumns(q, i + 1));
}

/**
 * Draft autosave support: keeps only the questions that are FULLY filled in
 * (every option + correct answer) — anything half-typed is simply skipped
 * for now rather than persisted or rejected. test_questions' NOT NULL
 * columns are deliberately left untouched (see sql/test_draft_status.sql),
 * so this is how a draft avoids ever trying to insert an incomplete row.
 */
function filterCompleteQuestions(questions) {
  if (!Array.isArray(questions)) return [];
  return questions.filter((q) => {
    try {
      toDbColumns(q, 1);
      return true;
    } catch {
      return false;
    }
  });
}

/**
 * DANGER: full delete + reinsert of every test_questions row for this test.
 * test_answers.question_id -> test_questions(id) is ON DELETE CASCADE (see
 * sql/tests.sql), so calling this on a test that already has submitted
 * attempts DESTROYS every one of those students' test_answers rows (and the
 * attempt's frozen marks_awarded/max_marks is left stale, pointing at
 * answers that no longer exist). NEVER call this to fix a single question's
 * answer key on a test that has already been attempted — use
 * updateTestQuestionAnswerKey() below instead, which updates one row
 * in place (preserving its id, so test_answers stays correctly linked) and
 * re-grades every existing test_answers/test_attempts row for that question.
 * This function remains safe only for a test with zero attempts yet (e.g.
 * while still authoring it, before scheduled_start / before any student has
 * started), or when the caller has explicitly accepted the data loss.
 */
async function replaceQuestions(testId, questions) {
  validateQuestions(questions);

  // Build (and so validate) every row BEFORE touching the existing questions.
  // bank_question_id is only a tracking reference to the bank row an imported
  // copy came from; unknown ids are dropped rather than trusted.
  const knownBankIds = await questionBank.existingIds(questions.map((q) => q.bankQuestionId));
  const rows = questions.map((q, i) => ({
    test_id: testId,
    order_index: i,
    ...toDbColumns(q, i + 1),
    bank_question_id: q.bankQuestionId && knownBankIds.has(q.bankQuestionId) ? q.bankQuestionId : null,
  }));

  const { error: delErr } = await supabase.from("test_questions").delete().eq("test_id", testId);
  if (delErr) throw delErr;

  const { data, error } = await supabase.from("test_questions").insert(rows).select();
  if (error) throw error;

  const totalMarks = data.reduce((sum, q) => sum + Number(q.marks), 0);
  const { data: testRow, error: updErr } = await supabase
    .from("tests")
    .update({ max_marks: totalMarks, updated_at: new Date().toISOString() })
    .eq("id", testId)
    .select("id, title, created_by")
    .single();
  if (updErr) throw updErr;

  // Automatic question-bank saving. Never blocks saving the test itself.
  try {
    await questionBank.syncFromTest(testRow, data);
  } catch (bankErr) {
    console.error(`[question-bank] sync failed for test ${testId}:`, bankErr.message);
  }

  return data.sort((a, b) => a.order_index - b.order_index);
}

async function getQuestionsForAdmin(testId) {
  const { data, error } = await supabase
    .from("test_questions")
    .select("*")
    .eq("test_id", testId)
    .order("order_index", { ascending: true });
  if (error) throw error;

  const out = [];
  for (const q of data || []) {
    out.push({
      id: q.id,
      orderIndex: q.order_index,
      correctOption: q.correct_option,
      marks: q.marks,
      bankQuestionId: q.bank_question_id,
      ...(await serializeQuestion(q, signKey, { withKeys: true })),
    });
  }
  return out;
}

/**
 * Retroactive re-grading: edits ONE existing test_questions row in place
 * (never delete+reinsert) — so its id, and therefore every test_answers row
 * that references it, stays correctly linked — then re-scores every
 * existing test_answers row for that question against the new answer key
 * and re-sums the affected test_attempts' frozen totals. Use this instead of
 * replaceQuestions()/updateTest({questions}) whenever only one existing
 * question's correct_option/marks/content is changing on a test that may
 * already have submitted attempts.
 *
 * `updates` may contain any subset of: correctOption, marks, and/or the
 * question/option content fields (questionType/questionText/questionImageKey,
 * optionAType/optionA/optionAImageKey, ... same shape as a normal question).
 * Whatever is NOT supplied is kept as-is from the current row — the full,
 * merged question is still run through the same toDbColumns() validation
 * every other question save uses, so a partial edit can never leave the
 * row in a half-valid state (e.g. missing text AND missing image on an option).
 */
async function updateTestQuestionAnswerKey(testId, questionId, updates = {}, editorId) {
  const { data: existing, error: exErr } = await supabase
    .from("test_questions")
    .select("*")
    .eq("id", questionId)
    .eq("test_id", testId)
    .maybeSingle();
  if (exErr) throw exErr;
  if (!existing) throw notFound("Question not found on this test");

  // Current row, re-expressed in the same API shape toDbColumns() expects,
  // so an edit that only sends { correctOption: 'b' } still validates and
  // persists the question's existing text/images untouched.
  const current = {
    questionType: existing.question_type,
    questionText: existing.question_text,
    questionImageKey: existing.question_image_key,
    optionAType: existing.option_a_type,
    optionA: existing.option_a,
    optionAImageKey: existing.option_a_image_key,
    optionBType: existing.option_b_type,
    optionB: existing.option_b,
    optionBImageKey: existing.option_b_image_key,
    optionCType: existing.option_c_type,
    optionC: existing.option_c,
    optionCImageKey: existing.option_c_image_key,
    optionDType: existing.option_d_type,
    optionD: existing.option_d,
    optionDImageKey: existing.option_d_image_key,
    correctOption: existing.correct_option,
    marks: existing.marks,
  };
  const merged = { ...current, ...updates };
  const cols = toDbColumns(merged, 1);

  const { data: updatedQ, error: updErr } = await supabase
    .from("test_questions")
    .update(cols)
    .eq("id", questionId)
    .select()
    .single();
  if (updErr) throw updErr;

  const marksChanged = Number(existing.marks) !== Number(updatedQ.marks);
  const correctChanged = existing.correct_option !== updatedQ.correct_option;

  // Keep tests.max_marks correct if this question's marks changed.
  let testRow;
  if (marksChanged) {
    const { data: allQs, error: aqErr } = await supabase.from("test_questions").select("marks").eq("test_id", testId);
    if (aqErr) throw aqErr;
    const totalMarks = (allQs || []).reduce((sum, q) => sum + Number(q.marks), 0);
    const { data: t, error: tErr } = await supabase
      .from("tests")
      .update({ max_marks: totalMarks, updated_at: new Date().toISOString() })
      .eq("id", testId)
      .select("*")
      .single();
    if (tErr) throw tErr;
    testRow = t;
  } else {
    const { data: t, error: tErr } = await supabase.from("tests").select("*").eq("id", testId).single();
    if (tErr) throw tErr;
    testRow = t;
  }

  let regraded = { answersUpdated: 0, attemptsResummed: 0 };
  if (marksChanged || correctChanged) {
    regraded = await _regradeQuestion(questionId, updatedQ.correct_option, Number(updatedQ.marks), testRow.max_marks);
  }

  if (editorId) {
    // No dedicated audit table for this yet — at least leave a trace in logs.
    console.log(`[tests] question ${questionId} on test ${testId} answer-key edited by ${editorId}`);
  }

  return {
    id: updatedQ.id,
    orderIndex: updatedQ.order_index,
    correctOption: updatedQ.correct_option,
    marks: updatedQ.marks,
    bankQuestionId: updatedQ.bank_question_id,
    ...(await serializeQuestion(updatedQ, signKey, { withKeys: true })),
    maxMarks: testRow.max_marks,
    regraded,
  };
}

/**
 * Re-scores every existing test_answers row for one question against its
 * (possibly just-changed) correct_option/marks, then re-sums
 * test_attempts.marks_awarded for every attempt that answered it — but only
 * for attempts already 'submitted' or 'evaluated' (an 'in_progress' attempt
 * will simply get graded correctly whenever it finalizes normally). An
 * 'evaluated' attempt stays 'evaluated' and keeps its original evaluated_at
 * — this is a correction of an already-evaluated score, not a new
 * evaluation event, and deliberately does NOT re-trigger the result-report
 * email (test_result_report_log is left untouched, so a previously emailed
 * PDF result is not resent — see testResultReport.service.js). It may now
 * be stale relative to the corrected score; that's expected, and up to an
 * admin to notice/resend manually if they choose to.
 */
async function _regradeQuestion(questionId, newCorrectOption, newMarks, newTestMaxMarks) {
  const { error: correctErr } = await supabase
    .from("test_answers")
    .update({ is_correct: true, marks_awarded: newMarks })
    .eq("question_id", questionId)
    .eq("selected_option", newCorrectOption);
  if (correctErr) throw correctErr;

  const { error: wrongErr } = await supabase
    .from("test_answers")
    .update({ is_correct: false, marks_awarded: 0 })
    .eq("question_id", questionId)
    .neq("selected_option", newCorrectOption);
  if (wrongErr) throw wrongErr;

  const { data: affected, error: affErr } = await supabase
    .from("test_answers")
    .select("attempt_id")
    .eq("question_id", questionId);
  if (affErr) throw affErr;
  const attemptIds = [...new Set((affected || []).map((a) => a.attempt_id))];
  if (attemptIds.length === 0) return { answersUpdated: 0, attemptsResummed: 0 };

  const { data: attempts, error: attErr } = await supabase
    .from("test_attempts")
    .select("id, status")
    .in("id", attemptIds)
    .in("status", ["submitted", "evaluated"]);
  if (attErr) throw attErr;

  let attemptsResummed = 0;
  for (const attempt of attempts || []) {
    const { data: answers, error: ansErr } = await supabase
      .from("test_answers")
      .select("marks_awarded")
      .eq("attempt_id", attempt.id);
    if (ansErr) throw ansErr;
    const sum = (answers || []).reduce((s, a) => s + Number(a.marks_awarded || 0), 0);
    const { error: updAttErr } = await supabase
      .from("test_attempts")
      .update({ marks_awarded: sum, max_marks: newTestMaxMarks })
      .eq("id", attempt.id);
    if (updAttErr) throw updAttErr;
    attemptsResummed += 1;
  }

  return { answersUpdated: attemptIds.length, attemptsResummed };
}

// ─── Create / list / get / update / delete ─────────────────────────────────

async function createTest({
  title, type, chapterId, subjectId, batchId, allStudents, audience, scheduledStart, scheduledEnd,
  instructions, maxMarks, questionText, createdBy, questions,
}) {
  if (!title?.trim()) throw badRequest("Title is required");
  if (!["mcq", "descriptive"].includes(type)) throw badRequest("type must be 'mcq' or 'descriptive'");
  // "All Students" (resolved live to every active student) or exactly one batch — never both.
  const target = audienceService.normalizeAudience({ audience, allStudents, batchId });
  const isAllStudents = target.audience === audienceService.AUDIENCE_ALL;
  if (!isAllStudents && target.batchIds.length !== 1) throw badRequest("Choose a batch or All Students");
  batchId = isAllStudents ? null : target.batchIds[0];
  if (!scheduledStart || !scheduledEnd) throw badRequest("Start and end time are required");
  if (new Date(scheduledEnd) <= new Date(scheduledStart)) throw badRequest("End time must be after start time");

  if (type === "mcq") validateQuestions(questions);

  // The picker assigns a chapter, not a subject directly — subject_id is
  // still derived and stored from it so existing subject-based display stays correct.
  const resolvedSubjectId = chapterId ? await subjectIdForChapter(chapterId) : (subjectId || null);

  const { data: test, error } = await supabase
    .from("tests")
    .insert({
      title: title.trim(),
      type,
      chapter_id: chapterId || null,
      subject_id: resolvedSubjectId,
      batch_id: batchId,
      audience: isAllStudents ? "ALL" : "BATCH",
      scheduled_start: scheduledStart,
      scheduled_end: scheduledEnd,
      max_marks: type === "descriptive" ? Number(maxMarks) || 0 : 0,
      instructions: instructions?.trim() || null,
      question_text: type === "descriptive" ? (questionText?.trim() || null) : null,
      created_by: createdBy || null,
    })
    .select(TEST_SELECT)
    .single();
  if (error) throw error;

  if (type === "mcq") {
    await replaceQuestions(test.id, questions);
    const { data: refreshed } = await supabase.from("tests").select(TEST_SELECT).eq("id", test.id).single();
    const mapped = mapTestRow(refreshed || test);
    _notifyTestScheduled(mapped).catch((err) => console.error("test_scheduled notification failed:", err.message));
    return mapped;
  }

  const mapped = mapTestRow(test);
  _notifyTestScheduled(mapped).catch((err) => console.error("test_scheduled notification failed:", err.message));
  return mapped;
}

/** Notifies every student the test is for (its batch, or ALL active students) the moment it's scheduled. Best-effort. */
async function _notifyTestScheduled(test) {
  const startLabel = new Date(test.scheduledStart).toLocaleString("en-IN", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
  await notificationsService.createNotification({
    type: "test_scheduled",
    title: `${test.type === "mcq" ? "MCQ" : "Descriptive"} test scheduled: ${test.title}`,
    body: `${test.title} has been scheduled for ${startLabel}${test.batchName ? ` (${test.batchName})` : ""}.`,
    link: "/student/tests",
    ...(test.audience === "ALL" ? { allStudents: true } : { batchIds: test.batchId ? [test.batchId] : [] }),
  });
}

async function updateTest(testId, updates) {
  const allowed = {};
  if (updates.title !== undefined) allowed.title = updates.title.trim();
  if (updates.chapterId !== undefined) {
    allowed.chapter_id = updates.chapterId || null;
    allowed.subject_id = await subjectIdForChapter(updates.chapterId);
  } else if (updates.subjectId !== undefined) {
    allowed.subject_id = updates.subjectId || null;
  }
  if (updates.batchId !== undefined || updates.allStudents !== undefined || updates.audience !== undefined) {
    const target = audienceService.normalizeAudience({ audience: updates.audience, allStudents: updates.allStudents, batchId: updates.batchId });
    if (target.audience === audienceService.AUDIENCE_ALL) {
      allowed.audience = "ALL";
      allowed.batch_id = null;
    } else {
      if (target.batchIds.length !== 1) throw badRequest("Choose a batch or All Students");
      allowed.audience = "BATCH";
      allowed.batch_id = target.batchIds[0];
    }
  }
  if (updates.scheduledStart !== undefined) allowed.scheduled_start = updates.scheduledStart;
  if (updates.scheduledEnd !== undefined) allowed.scheduled_end = updates.scheduledEnd;
  if (updates.instructions !== undefined) allowed.instructions = updates.instructions?.trim() || null;
  if (updates.status !== undefined) allowed.status = updates.status;
  if (updates.questionText !== undefined) allowed.question_text = updates.questionText?.trim() || null;
  if (updates.maxMarks !== undefined) allowed.max_marks = Number(updates.maxMarks) || 0;
  allowed.updated_at = new Date().toISOString();

  if (allowed.scheduled_start && allowed.scheduled_end && new Date(allowed.scheduled_end) <= new Date(allowed.scheduled_start)) {
    throw badRequest("End time must be after start time");
  }

  const { data, error } = await supabase.from("tests").update(allowed).eq("id", testId).select(TEST_SELECT).maybeSingle();
  if (error) throw error;
  if (!data) throw notFound();

  if (updates.questions !== undefined) {
    await replaceQuestions(testId, updates.questions);
    const { data: refreshed } = await supabase.from("tests").select(TEST_SELECT).eq("id", testId).single();
    return mapTestRow(refreshed);
  }

  return mapTestRow(data);
}

// ─── Draft autosave (test creation in progress) ────────────────────────────
//
// Deliberately lenient counterparts to createTest/updateTest above, used
// only by the "Schedule Test" form's silent autosave. They never touch
// replaceQuestions()'s delete-and-reinsert behaviour or createTest/
// updateTest's own validation — those stay exactly as strict as before for
// every other caller (including the final "Schedule test" submit, which
// still goes through the normal PATCH /api/tests/:id -> updateTest path).

/** Creates a minimal 'draft' test row the instant the admin has a title, chapter or batch — no full validation required yet. */
async function createDraftTest({
  title, type, chapterId, subjectId, batchId, allStudents, audience, scheduledStart, scheduledEnd,
  instructions, maxMarks, questionText, createdBy, questions,
}) {
  let isAllStudents = false;
  let resolvedBatchId = null;
  try {
    const target = audienceService.normalizeAudience({ audience, allStudents, batchId });
    isAllStudents = target.audience === audienceService.AUDIENCE_ALL;
    resolvedBatchId = isAllStudents ? null : (target.batchIds[0] || null);
  } catch {
    // A draft doesn't need audience settled yet — leave it unset.
  }

  const resolvedType = ["mcq", "descriptive"].includes(type) ? type : "mcq";
  let resolvedSubjectId = subjectId || null;
  if (chapterId) {
    try {
      resolvedSubjectId = await subjectIdForChapter(chapterId);
    } catch {
      // Invalid/unsaved chapter selection — don't block the draft on it.
    }
  }

  const validSchedule = scheduledStart && scheduledEnd && new Date(scheduledEnd) > new Date(scheduledStart);

  const { data: test, error } = await supabase
    .from("tests")
    .insert({
      title: title?.trim() || "Untitled draft",
      type: resolvedType,
      chapter_id: chapterId || null,
      subject_id: resolvedSubjectId,
      batch_id: resolvedBatchId,
      audience: isAllStudents ? "ALL" : "BATCH",
      status: "draft",
      scheduled_start: validSchedule ? scheduledStart : null,
      scheduled_end: validSchedule ? scheduledEnd : null,
      max_marks: resolvedType === "descriptive" ? Number(maxMarks) || 0 : 0,
      instructions: instructions?.trim() || null,
      question_text: resolvedType === "descriptive" ? (questionText?.trim() || null) : null,
      created_by: createdBy || null,
    })
    .select(TEST_SELECT)
    .single();
  if (error) throw error;

  if (resolvedType === "mcq") {
    const complete = filterCompleteQuestions(questions);
    if (complete.length > 0) await replaceQuestions(test.id, complete);
  }

  return getTestForAdmin(test.id);
}

/** Re-persists the current in-progress state of a draft test. Never sends a notification (that only happens on real create/schedule). */
async function updateDraftTest(testId, updates) {
  const { data: existing, error: fetchErr } = await supabase.from("tests").select("id, status").eq("id", testId).maybeSingle();
  if (fetchErr) throw fetchErr;
  if (!existing) throw notFound();
  if (existing.status !== "draft") throw badRequest("Only a draft test can be autosaved this way");

  const allowed = { updated_at: new Date().toISOString() };
  if (updates.title !== undefined) allowed.title = updates.title?.trim() || "Untitled draft";
  if (updates.instructions !== undefined) allowed.instructions = updates.instructions?.trim() || null;
  if (updates.maxMarks !== undefined) allowed.max_marks = Number(updates.maxMarks) || 0;
  if (updates.questionText !== undefined) allowed.question_text = updates.questionText?.trim() || null;

  if (updates.chapterId !== undefined) {
    allowed.chapter_id = updates.chapterId || null;
    if (updates.chapterId) {
      try {
        allowed.subject_id = await subjectIdForChapter(updates.chapterId);
      } catch {
        // Leave subject_id as-is if the chapter doesn't resolve yet.
      }
    } else {
      allowed.subject_id = null;
    }
  }

  if (updates.batchId !== undefined || updates.allStudents !== undefined || updates.audience !== undefined) {
    try {
      const target = audienceService.normalizeAudience({ audience: updates.audience, allStudents: updates.allStudents, batchId: updates.batchId });
      if (target.audience === audienceService.AUDIENCE_ALL) {
        allowed.audience = "ALL";
        allowed.batch_id = null;
      } else if (target.batchIds.length === 1) {
        allowed.audience = "BATCH";
        allowed.batch_id = target.batchIds[0];
      }
    } catch {
      // Ignore an unresolved/invalid audience selection while still drafting.
    }
  }

  if (updates.scheduledStart !== undefined || updates.scheduledEnd !== undefined) {
    const { data: current } = await supabase.from("tests").select("scheduled_start, scheduled_end").eq("id", testId).single();
    const nextStart = updates.scheduledStart !== undefined ? updates.scheduledStart || null : current?.scheduled_start || null;
    const nextEnd = updates.scheduledEnd !== undefined ? updates.scheduledEnd || null : current?.scheduled_end || null;
    if (!nextStart || !nextEnd || new Date(nextEnd) > new Date(nextStart)) {
      allowed.scheduled_start = nextStart;
      allowed.scheduled_end = nextEnd;
    }
    // An invalid (end <= start) combination is simply not persisted yet —
    // the in-memory form state still has it, it just isn't autosaved until valid.
  }

  const { error } = await supabase.from("tests").update(allowed).eq("id", testId);
  if (error) throw error;

  if (updates.questions !== undefined) {
    const complete = filterCompleteQuestions(updates.questions);
    if (complete.length > 0) {
      await replaceQuestions(testId, complete);
    } else {
      // Nothing complete yet — clear any previously-saved (now-removed) questions.
      await supabase.from("test_questions").delete().eq("test_id", testId);
    }
  }

  return getTestForAdmin(testId);
}

/** Promotes a draft to a real, fully-validated test in one step (final "Schedule test" submit). Reuses updateTest's normal strict path. */
async function promoteDraftTest(testId, input) {
  return updateTest(testId, { ...input, status: "scheduled" });
}

async function deleteTest(testId) {
  const { data: test, error: fetchErr } = await supabase.from("tests").select("*").eq("id", testId).maybeSingle();
  if (fetchErr) throw fetchErr;
  if (!test) return null;

  await deleteTestFile(test.question_file_key);
  await deleteTestFile(test.answer_key_file_key);

  // Delete any uploaded descriptive answer files students submitted too.
  const { data: attempts } = await supabase.from("test_attempts").select("answer_file_key").eq("test_id", testId);
  for (const a of attempts || []) await deleteTestFile(a.answer_file_key);

  const { error } = await supabase.from("tests").delete().eq("id", testId);
  if (error) throw error;
  return { id: testId };
}

async function listTestsForAdmin({ batchId, status } = {}) {
  let query = supabase.from("tests").select(TEST_SELECT).order("scheduled_start", { ascending: false });
  if (batchId === audienceService.ALL_STUDENTS_TOKEN) query = query.eq("audience", "ALL");
  else if (batchId) query = query.eq("batch_id", batchId);
  if (status) query = query.eq("status", status);
  else query = query.neq("status", "draft"); // in-progress drafts never show up in the main tests list
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(mapTestRow);
}

async function getTestForAdmin(testId) {
  const { data: test, error } = await supabase.from("tests").select(TEST_SELECT).eq("id", testId).maybeSingle();
  if (error) throw error;
  if (!test) throw notFound();

  const mapped = mapTestRow(test);
  if (test.type === "mcq") {
    mapped.questions = await getQuestionsForAdmin(testId);
  } else {
    mapped.questionFileUrl = await getSignedFileUrl(test.question_file_key);
    mapped.answerKeyFileUrl = await getSignedFileUrl(test.answer_key_file_key);
  }
  return mapped;
}

// ─── Descriptive file attachment ───────────────────────────────────────────

async function attachQuestionFile(testId, file) {
  const { data: test, error } = await supabase.from("tests").select("question_file_key, type").eq("id", testId).maybeSingle();
  if (error) throw error;
  if (!test) throw notFound();
  if (test.type !== "descriptive") throw badRequest("Only descriptive tests take an uploaded question file");

  const uploaded = await uploadTestFile(file, "questions");
  await deleteTestFile(test.question_file_key);

  const { data: updated, error: updErr } = await supabase
    .from("tests")
    .update({ question_file_key: uploaded.key, question_file_name: uploaded.name, updated_at: new Date().toISOString() })
    .eq("id", testId)
    .select(TEST_SELECT)
    .single();
  if (updErr) throw updErr;
  return mapTestRow(updated);
}

async function attachAnswerKeyFile(testId, file) {
  const { data: test, error } = await supabase.from("tests").select("answer_key_file_key, type").eq("id", testId).maybeSingle();
  if (error) throw error;
  if (!test) throw notFound();
  if (test.type !== "descriptive") throw badRequest("Only descriptive tests take an answer key file");

  const uploaded = await uploadTestFile(file, "keys");
  await deleteTestFile(test.answer_key_file_key);

  const { data: updated, error: updErr } = await supabase
    .from("tests")
    .update({ answer_key_file_key: uploaded.key, answer_key_file_name: uploaded.name, updated_at: new Date().toISOString() })
    .eq("id", testId)
    .select(TEST_SELECT)
    .single();
  if (updErr) throw updErr;
  return mapTestRow(updated);
}

module.exports = {
  createTest,
  updateTest,
  updateTestQuestionAnswerKey,
  createDraftTest,
  updateDraftTest,
  promoteDraftTest,
  deleteTest,
  listTestsForAdmin,
  getTestForAdmin,
  attachQuestionFile,
  attachAnswerKeyFile,
  uploadTestFile,
  deleteTestFile,
  getSignedFileUrl,
  mapTestRow,
  TEST_SELECT,
};
