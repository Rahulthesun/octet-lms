/**
 * services/testAttempts.service.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Student-facing attempt flow (start → answer → submit → auto-grade) and the
 * admin-facing "view a student's marked answers" / "grade a descriptive
 * attempt" flow. MCQ correct answers are NEVER sent to a student before
 * their attempt is evaluated — every student-facing read here is built from
 * a hand-picked field list, not a raw row spread.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const supabase = require("../config/supabase");
const attendanceService = require("./attendance.service");
const testsService = require("./tests.service");

function badRequest(message) {
  return Object.assign(new Error(message), { status: 400 });
}
function forbidden(message = "You do not have access to this test") {
  return Object.assign(new Error(message), { status: 403 });
}
function notFound(message) {
  return Object.assign(new Error(message), { status: 404 });
}

// ─── Shuffle ────────────────────────────────────────────────────────────────

/** Fisher-Yates — a fresh, independent shuffle per student, per attempt. */
function shuffledIds(ids) {
  const arr = [...ids];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ─── Student identity / batch membership ───────────────────────────────────

async function getStudentForUser(authUserId) {
  const { data, error } = await supabase
    .from("students")
    .select("id, name, email, father_email, mother_email")
    .eq("auth_user_id", authUserId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw forbidden("No student profile found for this account");
  return data;
}

async function assertStudentInTestBatch(studentId, batchId) {
  const batchIds = await attendanceService.getStudentBatchIds(studentId);
  if (!batchIds.includes(batchId)) throw forbidden("This test is not assigned to your batch");
}

// ─── Fetch test + attempt together ─────────────────────────────────────────

async function getTestAndAttempt(testId, studentId) {
  const { data: test, error } = await supabase.from("tests").select(testsService.TEST_SELECT).eq("id", testId).maybeSingle();
  if (error) throw error;
  if (!test) throw notFound("Test not found");

  const { data: attempt, error: attErr } = await supabase
    .from("test_attempts")
    .select("*")
    .eq("test_id", testId)
    .eq("student_id", studentId)
    .maybeSingle();
  if (attErr) throw attErr;

  return { test, attempt };
}

// ─── Auto-grading (shared by explicit submit + the expiry safety net) ─────

async function finalizeMcqAttempt(attempt, test, { autoSubmitted = false } = {}) {
  const { data: answers, error: ansErr } = await supabase
    .from("test_answers")
    .select("marks_awarded")
    .eq("attempt_id", attempt.id);
  if (ansErr) throw ansErr;

  const marksAwarded = (answers || []).reduce((sum, a) => sum + Number(a.marks_awarded || 0), 0);
  const now = new Date().toISOString();

  const { data: updated, error } = await supabase
    .from("test_attempts")
    .update({
      status: "evaluated",
      submitted_at: attempt.submitted_at || now,
      auto_submitted: autoSubmitted || attempt.auto_submitted,
      marks_awarded: marksAwarded,
      max_marks: test.max_marks,
      evaluated_at: now,
    })
    .eq("id", attempt.id)
    .select()
    .single();
  if (error) throw error;

  const testResultReport = require("./testResultReport.service");
  testResultReport.sendResultReport(attempt.id).catch((err) => {
    console.error(`[tests] result report failed for attempt ${attempt.id}:`, err.message);
  });

  return updated;
}

/**
 * Server-side safety net: finds every MCQ attempt still 'in_progress' whose
 * test has already passed scheduled_end (student closed the tab, lost
 * connection, etc.) and grades it from whatever answers were autosaved.
 * Called lazily from every student read-path below, and also from the
 * periodic scheduler for attempts nobody happens to look at again.
 */
async function autoFinalizeExpiredAttempts() {
  const nowIso = new Date().toISOString();
  const { data: overdue, error } = await supabase
    .from("test_attempts")
    .select("*, tests!inner(id, type, max_marks, scheduled_end)")
    .eq("status", "in_progress")
    .lt("tests.scheduled_end", nowIso);
  if (error) throw error;

  const results = [];
  for (const attempt of overdue || []) {
    if (attempt.tests.type !== "mcq") continue; // descriptive stays 'submitted' until a human grades it
    try {
      await finalizeMcqAttempt(attempt, attempt.tests, { autoSubmitted: true });
      results.push({ attemptId: attempt.id, ok: true });
    } catch (err) {
      results.push({ attemptId: attempt.id, ok: false, error: err.message });
    }
  }
  return results;
}

// ─── Student: list tests for my batch(es) ──────────────────────────────────

async function listTestsForStudent(authUserId) {
  const student = await getStudentForUser(authUserId);
  const batchIds = await attendanceService.getStudentBatchIds(student.id);
  if (batchIds.length === 0) return [];

  await autoFinalizeExpiredAttempts();

  const { data: tests, error } = await supabase
    .from("tests")
    .select(testsService.TEST_SELECT)
    .in("batch_id", batchIds)
    .neq("status", "cancelled")
    .order("scheduled_start", { ascending: false });
  if (error) throw error;

  const testIds = (tests || []).map((t) => t.id);
  let attemptMap = {};
  if (testIds.length > 0) {
    const { data: attempts, error: attErr } = await supabase
      .from("test_attempts")
      .select("test_id, status, marks_awarded, max_marks, submitted_at")
      .eq("student_id", student.id)
      .in("test_id", testIds);
    if (attErr) throw attErr;
    attemptMap = Object.fromEntries((attempts || []).map((a) => [a.test_id, a]));
  }

  const now = Date.now();
  const results = [];
  for (const t of tests || []) {
    const mapped = testsService.mapTestRow(t);
    if (t.type === "descriptive" && t.question_file_key) {
      mapped.questionFileUrl = await testsService.getSignedFileUrl(t.question_file_key);
    }
    const attempt = attemptMap[t.id] || null;
    const start = new Date(t.scheduled_start).getTime();
    const end = new Date(t.scheduled_end).getTime();
    let window = "upcoming";
    if (now >= start && now <= end) window = "live";
    else if (now > end) window = "ended";
    results.push({
      ...mapped,
      window,
      myAttempt: attempt
        ? {
            status: attempt.status,
            marksAwarded: attempt.marks_awarded,
            maxMarks: attempt.max_marks,
            submittedAt: attempt.submitted_at,
          }
        : null,
    });
  }
  return results;
}

// ─── Student: start an attempt ──────────────────────────────────────────────

async function startAttempt(testId, authUserId) {
  const student = await getStudentForUser(authUserId);
  const { data: test, error } = await supabase.from("tests").select("*").eq("id", testId).maybeSingle();
  if (error) throw error;
  if (!test) throw notFound("Test not found");
  if (test.status === "cancelled") throw badRequest("This test has been cancelled");

  await assertStudentInTestBatch(student.id, test.batch_id);

  const now = Date.now();
  const start = new Date(test.scheduled_start).getTime();
  const end = new Date(test.scheduled_end).getTime();
  if (now < start) throw badRequest("This test has not started yet");
  if (now > end) throw badRequest("This test's window has closed");

  const { data: existing, error: exErr } = await supabase
    .from("test_attempts")
    .select("*")
    .eq("test_id", testId)
    .eq("student_id", student.id)
    .maybeSingle();
  if (exErr) throw exErr;

  if (existing) {
    if (existing.status !== "not_started") return existing; // resume — same shuffle re-served
  }

  let questionOrder = null;
  if (test.type === "mcq") {
    const { data: questions, error: qErr } = await supabase.from("test_questions").select("id").eq("test_id", testId);
    if (qErr) throw qErr;
    if (!questions || questions.length === 0) throw badRequest("This test has no questions yet");
    questionOrder = shuffledIds(questions.map((q) => q.id));
  }

  const payload = {
    test_id: testId,
    student_id: student.id,
    status: "in_progress",
    question_order: questionOrder,
    started_at: new Date().toISOString(),
    max_marks: test.max_marks,
  };

  const { data: attempt, error: upsertErr } = await supabase
    .from("test_attempts")
    .upsert(payload, { onConflict: "test_id,student_id" })
    .select()
    .single();
  if (upsertErr) throw upsertErr;
  return attempt;
}

// ─── Student: read my attempt (questions in shuffled order, no answers) ───

async function getMyAttemptDetail(testId, authUserId) {
  const student = await getStudentForUser(authUserId);
  await autoFinalizeExpiredAttempts();

  const { test, attempt } = await getTestAndAttempt(testId, student.id);
  if (!attempt) throw notFound("You have not started this test");

  const base = {
    test: testsService.mapTestRow(test),
    attempt: {
      id: attempt.id,
      status: attempt.status,
      startedAt: attempt.started_at,
      submittedAt: attempt.submitted_at,
      marksAwarded: attempt.status === "evaluated" ? attempt.marks_awarded : null,
      maxMarks: attempt.max_marks,
      evaluatorFeedback: attempt.status === "evaluated" ? attempt.evaluator_feedback : null,
    },
    serverNow: new Date().toISOString(),
  };

  if (test.type === "mcq") {
    const ids = attempt.question_order || [];
    const { data: questions, error } = await supabase.from("test_questions").select("*").in("id", ids);
    if (error) throw error;
    const byId = Object.fromEntries((questions || []).map((q) => [q.id, q]));

    let myAnswers = {};
    if (attempt.status === "evaluated") {
      const { data: answers } = await supabase.from("test_answers").select("*").eq("attempt_id", attempt.id);
      myAnswers = Object.fromEntries((answers || []).map((a) => [a.question_id, a]));
    } else {
      const { data: answers } = await supabase.from("test_answers").select("question_id, selected_option").eq("attempt_id", attempt.id);
      myAnswers = Object.fromEntries((answers || []).map((a) => [a.question_id, a]));
    }

    base.questions = ids
      .map((id) => byId[id])
      .filter(Boolean)
      .map((q) => ({
        id: q.id,
        questionText: q.question_text,
        optionA: q.option_a,
        optionB: q.option_b,
        optionC: q.option_c,
        optionD: q.option_d,
        marks: q.marks,
        selectedOption: myAnswers[q.id]?.selected_option || null,
        // Only revealed once the attempt is fully evaluated:
        correctOption: attempt.status === "evaluated" ? q.correct_option : undefined,
        isCorrect: attempt.status === "evaluated" ? myAnswers[q.id]?.is_correct ?? false : undefined,
      }));
  } else {
    base.descriptive = {
      questionText: test.question_text,
      questionFileUrl: await testsService.getSignedFileUrl(test.question_file_key),
      questionFileName: test.question_file_name,
      answerText: attempt.answer_text,
      answerFileName: attempt.answer_file_name,
    };
  }

  return base;
}

// ─── Student: autosave one MCQ answer ──────────────────────────────────────

async function saveAnswer(testId, authUserId, { questionId, selectedOption }) {
  if (!["a", "b", "c", "d"].includes(selectedOption)) throw badRequest("selectedOption must be a, b, c, or d");

  const student = await getStudentForUser(authUserId);
  const { test, attempt } = await getTestAndAttempt(testId, student.id);
  if (test.type !== "mcq") throw badRequest("This is not an MCQ test");
  if (!attempt || attempt.status !== "in_progress") throw badRequest("This attempt is not in progress");
  if (Date.now() > new Date(test.scheduled_end).getTime()) throw badRequest("This test's window has closed");
  if (!(attempt.question_order || []).includes(questionId)) throw badRequest("That question is not part of your attempt");

  const { data: question, error: qErr } = await supabase.from("test_questions").select("*").eq("id", questionId).maybeSingle();
  if (qErr) throw qErr;
  if (!question) throw notFound("Question not found");

  const isCorrect = question.correct_option === selectedOption;
  const marksAwarded = isCorrect ? Number(question.marks) : 0;

  const { error } = await supabase
    .from("test_answers")
    .upsert(
      {
        attempt_id: attempt.id,
        question_id: questionId,
        selected_option: selectedOption,
        is_correct: isCorrect,
        marks_awarded: marksAwarded,
        answered_at: new Date().toISOString(),
      },
      { onConflict: "attempt_id,question_id" }
    );
  if (error) throw error;

  return { questionId, saved: true };
}

// ─── Student: submit ────────────────────────────────────────────────────────

async function submitAttempt(testId, authUserId, { answerText, answerFile, autoSubmitted = false } = {}) {
  const student = await getStudentForUser(authUserId);
  const { test, attempt } = await getTestAndAttempt(testId, student.id);
  if (!attempt || attempt.status !== "in_progress") throw badRequest("This attempt is not in progress");

  if (test.type === "mcq") {
    return finalizeMcqAttempt(attempt, test, { autoSubmitted });
  }

  if (!autoSubmitted && Date.now() > new Date(test.scheduled_end).getTime()) {
    throw badRequest("This test's window has closed");
  }

  // Descriptive — record the answer, hand off to a human for grading.
  let fileMeta = null;
  if (answerFile) fileMeta = await testsService.uploadTestFile(answerFile, "answers");

  const { data: updated, error } = await supabase
    .from("test_attempts")
    .update({
      status: "submitted",
      submitted_at: new Date().toISOString(),
      auto_submitted: autoSubmitted,
      answer_text: answerText?.trim() || null,
      answer_file_key: fileMeta?.key ?? attempt.answer_file_key,
      answer_file_name: fileMeta?.name ?? attempt.answer_file_name,
      max_marks: test.max_marks,
    })
    .eq("id", attempt.id)
    .select()
    .single();
  if (error) throw error;
  return updated;
}

// ─── Admin: list / view attempts for a test ────────────────────────────────

async function adminListAttempts(testId) {
  const { data, error } = await supabase
    .from("test_attempts")
    .select("*, students(name, admission_number, class_grade, preferred_batch)")
    .eq("test_id", testId)
    .order("created_at", { ascending: true });
  if (error) throw error;

  return (data || []).map((a) => ({
    id: a.id,
    studentId: a.student_id,
    studentName: a.students?.name || "Unknown",
    admissionNumber: a.students?.admission_number || null,
    grade: a.students?.class_grade || null,
    batch: a.students?.preferred_batch || null,
    status: a.status,
    startedAt: a.started_at,
    submittedAt: a.submitted_at,
    autoSubmitted: a.auto_submitted,
    marksAwarded: a.marks_awarded,
    maxMarks: a.max_marks,
  }));
}

async function adminGetAttemptDetail(testId, attemptId) {
  const { data: test, error: testErr } = await supabase.from("tests").select("*").eq("id", testId).maybeSingle();
  if (testErr) throw testErr;
  if (!test) throw notFound("Test not found");

  const { data: attempt, error } = await supabase
    .from("test_attempts")
    .select("*, students(name, admission_number, class_grade, preferred_batch)")
    .eq("id", attemptId)
    .eq("test_id", testId)
    .maybeSingle();
  if (error) throw error;
  if (!attempt) throw notFound("Attempt not found");

  const base = {
    id: attempt.id,
    student: {
      id: attempt.student_id,
      name: attempt.students?.name || "Unknown",
      admissionNumber: attempt.students?.admission_number || null,
      grade: attempt.students?.class_grade || null,
      batch: attempt.students?.preferred_batch || null,
    },
    status: attempt.status,
    startedAt: attempt.started_at,
    submittedAt: attempt.submitted_at,
    autoSubmitted: attempt.auto_submitted,
    marksAwarded: attempt.marks_awarded,
    maxMarks: attempt.max_marks,
    evaluatorFeedback: attempt.evaluator_feedback,
  };

  if (test.type === "mcq") {
    const ids = attempt.question_order || [];
    const { data: questions, error: qErr } = await supabase.from("test_questions").select("*").in("id", ids);
    if (qErr) throw qErr;
    const byId = Object.fromEntries((questions || []).map((q) => [q.id, q]));

    const { data: answers } = await supabase.from("test_answers").select("*").eq("attempt_id", attempt.id);
    const answerByQ = Object.fromEntries((answers || []).map((a) => [a.question_id, a]));

    base.questions = ids
      .map((id) => byId[id])
      .filter(Boolean)
      .map((q) => ({
        id: q.id,
        questionText: q.question_text,
        optionA: q.option_a,
        optionB: q.option_b,
        optionC: q.option_c,
        optionD: q.option_d,
        correctOption: q.correct_option,
        marks: q.marks,
        selectedOption: answerByQ[q.id]?.selected_option || null,
        isCorrect: answerByQ[q.id]?.is_correct ?? false,
        marksAwarded: answerByQ[q.id]?.marks_awarded ?? 0,
      }));
  } else {
    base.descriptive = {
      questionText: test.question_text,
      questionFileUrl: await testsService.getSignedFileUrl(test.question_file_key),
      answerKeyFileUrl: await testsService.getSignedFileUrl(test.answer_key_file_key),
      answerText: attempt.answer_text,
      answerFileUrl: await testsService.getSignedFileUrl(attempt.answer_file_key),
      answerFileName: attempt.answer_file_name,
    };
  }

  return base;
}

// ─── Admin: grade a descriptive attempt ────────────────────────────────────

async function gradeDescriptiveAttempt(testId, attemptId, { marksAwarded, feedback, gradedByUserId }) {
  const { data: test, error: testErr } = await supabase.from("tests").select("*").eq("id", testId).maybeSingle();
  if (testErr) throw testErr;
  if (!test) throw notFound("Test not found");
  if (test.type !== "descriptive") throw badRequest("Only descriptive attempts are graded manually");

  const marks = Number(marksAwarded);
  if (!Number.isFinite(marks) || marks < 0) throw badRequest("marksAwarded must be a non-negative number");
  if (marks > Number(test.max_marks)) throw badRequest(`marksAwarded cannot exceed the test's max marks (${test.max_marks})`);

  const { data: attempt, error } = await supabase
    .from("test_attempts")
    .update({
      status: "evaluated",
      marks_awarded: marks,
      max_marks: test.max_marks,
      evaluator_feedback: feedback?.trim() || null,
      evaluated_by: gradedByUserId || null,
      evaluated_at: new Date().toISOString(),
    })
    .eq("id", attemptId)
    .eq("test_id", testId)
    .select()
    .single();
  if (error) throw error;
  if (!attempt) throw notFound("Attempt not found");

  const testResultReport = require("./testResultReport.service");
  testResultReport.sendResultReport(attempt.id).catch((err) => {
    console.error(`[tests] result report failed for attempt ${attempt.id}:`, err.message);
  });

  return attempt;
}

module.exports = {
  listTestsForStudent,
  startAttempt,
  getMyAttemptDetail,
  saveAnswer,
  submitAttempt,
  adminListAttempts,
  adminGetAttemptDetail,
  gradeDescriptiveAttempt,
  autoFinalizeExpiredAttempts,
  getStudentForUser,
};
