/**
 * services/testAnalytics.service.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Result analytics for one test, for the admin "Report" view: an overall
 * summary, a score distribution, per-question correctness (MCQ only),
 * batch-wise breakdown (meaningful for an All Students test — a single-batch
 * test just has one row), and the full per-student table. Built entirely
 * from test_attempts / test_answers — no mock numbers.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const supabase = require("../config/supabase");

function notFound(message = "Test not found") {
  return Object.assign(new Error(message), { status: 404 });
}

const DEFAULT_PASS_PCT = 40;

function pct(marks, max) {
  return max > 0 ? Math.round((Number(marks) / Number(max)) * 100) : 0;
}

/** Fixed score bands, same convention as the rest of the app's percentage color scale. */
const BANDS = [
  { label: "0-39%", min: 0, max: 39 },
  { label: "40-59%", min: 40, max: 59 },
  { label: "60-74%", min: 60, max: 74 },
  { label: "75-89%", min: 75, max: 89 },
  { label: "90-100%", min: 90, max: 100 },
];

async function getTestAnalytics(testId, { passPct = DEFAULT_PASS_PCT } = {}) {
  const { data: test, error: testErr } = await supabase
    .from("tests")
    .select("*, subjects(name), batches(name), chapters(name)")
    .eq("id", testId)
    .maybeSingle();
  if (testErr) throw testErr;
  if (!test) throw notFound();

  const { data: attempts, error: attErr } = await supabase
    .from("test_attempts")
    .select("id, student_id, status, marks_awarded, max_marks, submitted_at, auto_submitted, students(name, admission_number, class_grade, preferred_batch)")
    .eq("test_id", testId)
    .order("marks_awarded", { ascending: false, nullsFirst: false });
  if (attErr) throw attErr;

  // Who the test was actually for, so "did not attempt" is a real count,
  // not just "however many rows happened to exist".
  const audienceService = require("./audience.service");
  const targeted = test.audience === "ALL"
    ? await audienceService.getActiveStudents("id, name, admission_number, preferred_batch")
    : await audienceService.getActiveStudentsInBatches([test.batch_id], "id, name, admission_number, preferred_batch");

  const attemptByStudent = new Map((attempts || []).map((a) => [a.student_id, a]));
  const evaluated = (attempts || []).filter((a) => a.status === "evaluated");

  // ─── Summary ────────────────────────────────────────────────────────────
  const totalTargeted = targeted.length;
  const attemptedCount = (attempts || []).filter((a) => a.status !== "not_started").length;
  const evaluatedCount = evaluated.length;
  const notAttemptedCount = Math.max(0, totalTargeted - attemptedCount);
  const scores = evaluated.map((a) => Number(a.marks_awarded) || 0);
  const maxMarks = Number(test.max_marks) || 0;
  const avgMarks = evaluatedCount > 0 ? scores.reduce((s, v) => s + v, 0) / evaluatedCount : null;
  const highest = evaluatedCount > 0 ? Math.max(...scores) : null;
  const lowest = evaluatedCount > 0 ? Math.min(...scores) : null;
  const passCount = evaluated.filter((a) => pct(a.marks_awarded, a.max_marks || maxMarks) >= passPct).length;

  const summary = {
    totalTargeted,
    attemptedCount,
    notAttemptedCount,
    evaluatedCount,
    pendingEvaluationCount: attemptedCount - evaluatedCount,
    maxMarks,
    avgMarks: avgMarks !== null ? Math.round(avgMarks * 10) / 10 : null,
    avgPct: avgMarks !== null && maxMarks > 0 ? Math.round((avgMarks / maxMarks) * 100) : null,
    highest,
    lowest,
    passPct,
    passCount,
    failCount: evaluatedCount - passCount,
  };

  // ─── Score distribution ─────────────────────────────────────────────────
  const scoreDistribution = BANDS.map((b) => ({
    label: b.label,
    value: evaluated.filter((a) => {
      const p = pct(a.marks_awarded, a.max_marks || maxMarks);
      return p >= b.min && p <= b.max;
    }).length,
  }));

  // ─── Per-question correctness (MCQ only) ───────────────────────────────
  let perQuestion = [];
  if (test.type === "mcq") {
    const { data: questions, error: qErr } = await supabase
      .from("test_questions")
      .select("id, order_index, question_type, question_text, marks")
      .eq("test_id", testId)
      .order("order_index", { ascending: true });
    if (qErr) throw qErr;

    const attemptIds = evaluated.map((a) => a.id);
    let answers = [];
    if (attemptIds.length > 0) {
      const { data, error: ansErr } = await supabase
        .from("test_answers")
        .select("question_id, attempt_id, is_correct, selected_option")
        .in("attempt_id", attemptIds);
      if (ansErr) throw ansErr;
      answers = data || [];
    }

    perQuestion = (questions || []).map((q, i) => {
      const qAnswers = answers.filter((a) => a.question_id === q.id);
      const correct = qAnswers.filter((a) => a.is_correct).length;
      const incorrect = qAnswers.filter((a) => !a.is_correct && a.selected_option).length;
      const unanswered = Math.max(0, evaluatedCount - correct - incorrect);
      return {
        questionId: q.id,
        orderIndex: q.order_index,
        label: `Q${i + 1}`,
        questionLabel: q.question_type === "image" ? `Question ${i + 1} (image)` : (q.question_text || `Question ${i + 1}`).slice(0, 60),
        marks: q.marks,
        correctCount: correct,
        incorrectCount: incorrect,
        unansweredCount: unanswered,
        correctPct: evaluatedCount > 0 ? Math.round((correct / evaluatedCount) * 100) : 0,
      };
    });
  }

  // ─── Batch-wise breakdown ───────────────────────────────────────────────
  // Single-batch test: one row. All Students test: one row per batch that
  // actually has targeted students, so it's genuinely useful there.
  const { data: batchRows, error: batchErr } = await supabase.from("batches").select("id, name").order("name");
  if (batchErr) throw batchErr;
  const batchNameById = Object.fromEntries((batchRows || []).map((b) => [b.id, b.name]));

  const byBatch = new Map();
  for (const s of targeted) {
    const key = s.preferred_batch || "UNASSIGNED";
    if (!byBatch.has(key)) byBatch.set(key, { studentIds: [], scores: [] });
    byBatch.get(key).studentIds.push(s.id);
  }
  for (const a of evaluated) {
    const student = a.students;
    const key = student?.preferred_batch || "UNASSIGNED";
    if (!byBatch.has(key)) byBatch.set(key, { studentIds: [], scores: [] });
    byBatch.get(key).scores.push(Number(a.marks_awarded) || 0);
  }
  const batchWise = [...byBatch.entries()].map(([batchId, v]) => ({
    batchId,
    batchName: batchNameById[batchId] || (batchId === "UNASSIGNED" ? "No batch" : batchId),
    targetedCount: v.studentIds.length,
    evaluatedCount: v.scores.length,
    avgMarks: v.scores.length > 0 ? Math.round((v.scores.reduce((s, x) => s + x, 0) / v.scores.length) * 10) / 10 : null,
    avgPct: v.scores.length > 0 && maxMarks > 0 ? Math.round((v.scores.reduce((s, x) => s + x, 0) / v.scores.length / maxMarks) * 100) : null,
  })).sort((a, b) => a.batchName.localeCompare(b.batchName));

  // ─── Per-student table ──────────────────────────────────────────────────
  const perStudent = targeted
    .map((s) => {
      const a = attemptByStudent.get(s.id);
      const p = a && a.status === "evaluated" ? pct(a.marks_awarded, a.max_marks || maxMarks) : null;
      return {
        studentId: s.id,
        name: s.name,
        admissionNumber: s.admission_number,
        batchId: s.preferred_batch,
        batchName: s.preferred_batch ? (batchNameById[s.preferred_batch] || s.preferred_batch) : null,
        status: a?.status || "not_started",
        marksAwarded: a?.status === "evaluated" ? a.marks_awarded : null,
        maxMarks: a?.max_marks ?? maxMarks,
        pct: p,
        submittedAt: a?.submitted_at || null,
        autoSubmitted: !!a?.auto_submitted,
        pass: p !== null ? p >= passPct : null,
      };
    })
    .sort((a, b) => {
      if (a.marksAwarded === null && b.marksAwarded === null) return a.name.localeCompare(b.name);
      if (a.marksAwarded === null) return 1;
      if (b.marksAwarded === null) return -1;
      return b.marksAwarded - a.marksAwarded;
    });

  return {
    test: {
      id: test.id,
      title: test.title,
      type: test.type,
      subjectName: test.chapters?.name ? test.subjects?.name : (test.subjects?.name || null),
      chapterName: test.chapters?.name || null,
      batchName: test.audience === "ALL" ? "All Students" : (test.batches?.name || null),
      audience: test.audience || "BATCH",
      scheduledStart: test.scheduled_start,
      scheduledEnd: test.scheduled_end,
      maxMarks,
    },
    summary,
    scoreDistribution,
    perQuestion,
    batchWise,
    perStudent,
  };
}

/**
 * Analytics across EVERY test, for the admin "All Tests Report": one row per
 * test (so the whole test history can be scanned at a glance), an overall
 * score distribution across every evaluated attempt in the system, a
 * batch-wise breakdown, and top/bottom students by their average across all
 * the tests they've taken. Same building blocks as getTestAnalytics, just
 * summed across every test instead of scoped to one.
 */
async function getOverallAnalytics({ passPct = DEFAULT_PASS_PCT } = {}) {
  const { data: tests, error: testsErr } = await supabase
    .from("tests")
    .select("id, title, type, status, audience, batch_id, scheduled_start, scheduled_end, max_marks, batches(name)")
    .order("scheduled_start", { ascending: false });
  if (testsErr) throw testsErr;

  const testById = new Map((tests || []).map((t) => [t.id, t]));
  const testIds = (tests || []).map((t) => t.id);

  let attempts = [];
  if (testIds.length > 0) {
    const { data, error: attErr } = await supabase
      .from("test_attempts")
      .select("id, test_id, student_id, status, marks_awarded, max_marks, students(name, preferred_batch)")
      .in("test_id", testIds);
    if (attErr) throw attErr;
    attempts = data || [];
  }

  const evaluated = attempts.filter((a) => a.status === "evaluated");

  // ─── Overall summary ────────────────────────────────────────────────────
  const totalTests = tests.length;
  const mcqCount = tests.filter((t) => t.type === "mcq").length;
  const descriptiveCount = totalTests - mcqCount;
  const totalAttempts = attempts.filter((a) => a.status !== "not_started").length;
  const evaluatedCount = evaluated.length;
  const percentages = evaluated.map((a) => pct(a.marks_awarded, a.max_marks));
  const avgPct = percentages.length > 0 ? Math.round(percentages.reduce((s, v) => s + v, 0) / percentages.length) : null;
  const passCount = evaluated.filter((a) => pct(a.marks_awarded, a.max_marks) >= passPct).length;

  const summary = {
    totalTests,
    mcqCount,
    descriptiveCount,
    totalAttempts,
    evaluatedCount,
    pendingEvaluationCount: totalAttempts - evaluatedCount,
    avgPct,
    passPct,
    passCount,
    failCount: evaluatedCount - passCount,
  };

  // ─── Score distribution across every evaluated attempt ─────────────────
  const scoreDistribution = BANDS.map((b) => ({
    label: b.label,
    value: percentages.filter((p) => p >= b.min && p <= b.max).length,
  }));

  // ─── Per-test summary row ───────────────────────────────────────────────
  const evaluatedByTest = new Map();
  for (const a of evaluated) {
    if (!evaluatedByTest.has(a.test_id)) evaluatedByTest.set(a.test_id, []);
    evaluatedByTest.get(a.test_id).push(pct(a.marks_awarded, a.max_marks));
  }
  const attemptedByTest = new Map();
  for (const a of attempts) {
    if (a.status === "not_started") continue;
    attemptedByTest.set(a.test_id, (attemptedByTest.get(a.test_id) || 0) + 1);
  }
  const perTest = (tests || []).map((t) => {
    const pcts = evaluatedByTest.get(t.id) || [];
    const testAvg = pcts.length > 0 ? Math.round(pcts.reduce((s, v) => s + v, 0) / pcts.length) : null;
    const testPassCount = pcts.filter((p) => p >= passPct).length;
    return {
      testId: t.id,
      title: t.title,
      type: t.type,
      status: t.status,
      batchName: t.audience === "ALL" ? "All Students" : (t.batches?.name || null),
      scheduledStart: t.scheduled_start,
      scheduledEnd: t.scheduled_end,
      attemptedCount: attemptedByTest.get(t.id) || 0,
      evaluatedCount: pcts.length,
      avgPct: testAvg,
      passCount: testPassCount,
      failCount: pcts.length - testPassCount,
    };
  });

  // ─── Batch-wise, across every test ──────────────────────────────────────
  const { data: batchRows, error: batchErr } = await supabase.from("batches").select("id, name").order("name");
  if (batchErr) throw batchErr;
  const batchNameById = Object.fromEntries((batchRows || []).map((b) => [b.id, b.name]));

  const pctsByBatch = new Map();
  for (const a of evaluated) {
    const batchId = a.students?.preferred_batch || "UNASSIGNED";
    if (!pctsByBatch.has(batchId)) pctsByBatch.set(batchId, []);
    pctsByBatch.get(batchId).push(pct(a.marks_awarded, a.max_marks));
  }
  const batchWise = [...pctsByBatch.entries()]
    .map(([batchId, pcts]) => ({
      batchId,
      batchName: batchNameById[batchId] || (batchId === "UNASSIGNED" ? "No batch" : batchId),
      evaluatedCount: pcts.length,
      avgPct: Math.round(pcts.reduce((s, v) => s + v, 0) / pcts.length),
    }))
    .sort((a, b) => a.batchName.localeCompare(b.batchName));

  // ─── Per-student, across every test they've taken ───────────────────────
  const pctsByStudent = new Map();
  const nameByStudent = new Map();
  for (const a of evaluated) {
    if (!a.students) continue;
    if (!pctsByStudent.has(a.student_id)) pctsByStudent.set(a.student_id, []);
    pctsByStudent.get(a.student_id).push(pct(a.marks_awarded, a.max_marks));
    nameByStudent.set(a.student_id, a.students.name);
  }
  const perStudent = [...pctsByStudent.entries()]
    .map(([studentId, pcts]) => ({
      studentId,
      name: nameByStudent.get(studentId) || "Unknown",
      testsEvaluated: pcts.length,
      avgPct: Math.round(pcts.reduce((s, v) => s + v, 0) / pcts.length),
    }))
    .sort((a, b) => b.avgPct - a.avgPct);

  return { summary, scoreDistribution, perTest, batchWise, perStudent };
}

module.exports = { getTestAnalytics, getOverallAnalytics, DEFAULT_PASS_PCT };
