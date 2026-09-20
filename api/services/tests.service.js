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
    subjectName: t.subjects?.name || null,
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

const TEST_SELECT = "*, subjects(name), batches(name)";

// ─── Questions (MCQ) ────────────────────────────────────────────────────────

function validateQuestions(questions) {
  if (!Array.isArray(questions) || questions.length === 0) {
    throw badRequest("At least one question is required for an MCQ test");
  }
  // Every question and each of its four options must have an image or text.
  questions.forEach((q, i) => toDbColumns(q, i + 1));
}

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

// ─── Create / list / get / update / delete ─────────────────────────────────

async function createTest({
  title, type, subjectId, batchId, allStudents, audience, scheduledStart, scheduledEnd,
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

  const { data: test, error } = await supabase
    .from("tests")
    .insert({
      title: title.trim(),
      type,
      subject_id: subjectId || null,
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
  if (updates.subjectId !== undefined) allowed.subject_id = updates.subjectId || null;
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
