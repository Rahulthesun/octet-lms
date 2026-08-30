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
    batchName: t.batches?.name || null,
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
  questions.forEach((q, i) => {
    const n = i + 1;
    if (!q.questionText?.trim()) throw badRequest(`Question ${n} is missing its text`);
    if (!q.optionA?.trim() || !q.optionB?.trim() || !q.optionC?.trim() || !q.optionD?.trim()) {
      throw badRequest(`Question ${n} is missing one or more options`);
    }
    if (!["a", "b", "c", "d"].includes(q.correctOption)) {
      throw badRequest(`Question ${n} needs a correct option (A, B, C, or D)`);
    }
  });
}

async function replaceQuestions(testId, questions) {
  validateQuestions(questions);

  const { error: delErr } = await supabase.from("test_questions").delete().eq("test_id", testId);
  if (delErr) throw delErr;

  const rows = questions.map((q, i) => ({
    test_id: testId,
    order_index: i,
    question_text: q.questionText.trim(),
    option_a: q.optionA.trim(),
    option_b: q.optionB.trim(),
    option_c: q.optionC.trim(),
    option_d: q.optionD.trim(),
    correct_option: q.correctOption,
    marks: q.marks && Number(q.marks) > 0 ? Number(q.marks) : 1,
  }));

  const { data, error } = await supabase.from("test_questions").insert(rows).select();
  if (error) throw error;

  const totalMarks = data.reduce((sum, q) => sum + Number(q.marks), 0);
  const { error: updErr } = await supabase.from("tests").update({ max_marks: totalMarks, updated_at: new Date().toISOString() }).eq("id", testId);
  if (updErr) throw updErr;

  return data.sort((a, b) => a.order_index - b.order_index);
}

async function getQuestionsForAdmin(testId) {
  const { data, error } = await supabase
    .from("test_questions")
    .select("*")
    .eq("test_id", testId)
    .order("order_index", { ascending: true });
  if (error) throw error;
  return (data || []).map((q) => ({
    id: q.id,
    orderIndex: q.order_index,
    questionText: q.question_text,
    optionA: q.option_a,
    optionB: q.option_b,
    optionC: q.option_c,
    optionD: q.option_d,
    correctOption: q.correct_option,
    marks: q.marks,
  }));
}

// ─── Create / list / get / update / delete ─────────────────────────────────

async function createTest({
  title, type, subjectId, batchId, scheduledStart, scheduledEnd,
  instructions, maxMarks, questionText, createdBy, questions,
}) {
  if (!title?.trim()) throw badRequest("Title is required");
  if (!["mcq", "descriptive"].includes(type)) throw badRequest("type must be 'mcq' or 'descriptive'");
  if (!batchId) throw badRequest("A batch is required");
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

/** Notifies every student enrolled in the test's batch the moment it's scheduled. Best-effort. */
async function _notifyTestScheduled(test) {
  const startLabel = new Date(test.scheduledStart).toLocaleString("en-IN", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
  await notificationsService.createNotification({
    type: "test_scheduled",
    title: `${test.type === "mcq" ? "MCQ" : "Descriptive"} test scheduled: ${test.title}`,
    body: `${test.title} has been scheduled for ${startLabel}${test.batchName ? ` (${test.batchName})` : ""}.`,
    link: "/student/tests",
    batchIds: test.batchId ? [test.batchId] : [],
  });
}

async function updateTest(testId, updates) {
  const allowed = {};
  if (updates.title !== undefined) allowed.title = updates.title.trim();
  if (updates.subjectId !== undefined) allowed.subject_id = updates.subjectId || null;
  if (updates.batchId !== undefined) allowed.batch_id = updates.batchId;
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
  if (batchId) query = query.eq("batch_id", batchId);
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
