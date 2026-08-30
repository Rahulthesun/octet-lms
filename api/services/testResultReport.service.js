/**
 * services/testResultReport.service.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Sends the result PDF the moment an attempt becomes 'evaluated' — to the
 * student, father, and mother — mirroring parentReports.service.js's
 * idempotent-log pattern (test_result_report_log, unique on attempt_id) so
 * a retried grading action or a re-triggered auto-grade never double-sends.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const PDFDocument = require("pdfkit");
const supabase = require("../config/supabase");
const { sendEmail } = require("../utils/email");
const { buildTestResultPdf } = require("../utils/testResultPdf");
const notificationsService = require("./notifications.service");

async function alreadySent(attemptId) {
  const { data, error } = await supabase.from("test_result_report_log").select("id").eq("attempt_id", attemptId).maybeSingle();
  if (error) throw error;
  return !!data;
}

async function logResult(attemptId, { recipients, status, error }) {
  const { error: upsertErr } = await supabase
    .from("test_result_report_log")
    .upsert(
      { attempt_id: attemptId, recipients, status, error: error || null, sent_at: new Date().toISOString() },
      { onConflict: "attempt_id" }
    );
  if (upsertErr) throw upsertErr;
}

async function buildReportData(attemptId) {
  const { data: attempt, error } = await supabase
    .from("test_attempts")
    .select("*, students(auth_user_id, name, admission_number, class_grade, preferred_batch, email, father_email, mother_email)")
    .eq("id", attemptId)
    .maybeSingle();
  if (error) throw error;
  if (!attempt) throw Object.assign(new Error("Attempt not found"), { status: 404 });

  const { data: test, error: testErr } = await supabase.from("tests").select("*").eq("id", attempt.test_id).maybeSingle();
  if (testErr) throw testErr;
  if (!test) throw Object.assign(new Error("Test not found"), { status: 404 });

  const student = attempt.students;

  let questions = null;
  if (test.type === "mcq") {
    const ids = attempt.question_order || [];
    const { data: qRows } = await supabase.from("test_questions").select("*").in("id", ids);
    const byId = Object.fromEntries((qRows || []).map((q) => [q.id, q]));
    const { data: answers } = await supabase.from("test_answers").select("*").eq("attempt_id", attempt.id);
    const answerByQ = Object.fromEntries((answers || []).map((a) => [a.question_id, a]));
    questions = ids
      .map((id) => byId[id])
      .filter(Boolean)
      .map((q) => ({
        questionText: q.question_text,
        correctOption: q.correct_option,
        marks: q.marks,
        selectedOption: answerByQ[q.id]?.selected_option || null,
        isCorrect: answerByQ[q.id]?.is_correct ?? false,
        marksAwarded: answerByQ[q.id]?.marks_awarded ?? 0,
      }));
  }

  return {
    test: {
      id: test.id,
      title: test.title,
      type: test.type,
    },
    student: {
      id: student.id,
      authUserId: student.auth_user_id,
      name: student.name,
      admissionNumber: student.admission_number,
      grade: student.class_grade,
      batch: student.preferred_batch,
      email: student.email,
      fatherEmail: student.father_email,
      motherEmail: student.mother_email,
    },
    attempt: {
      id: attempt.id,
      marksAwarded: attempt.marks_awarded,
      maxMarks: attempt.max_marks,
      submittedAt: attempt.submitted_at,
      autoSubmitted: attempt.auto_submitted,
      evaluatorFeedback: attempt.evaluator_feedback,
    },
    questions,
  };
}

async function generatePdfBuffer(report) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: "A4" });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    buildTestResultPdf(doc, report);
    doc.end();
  });
}

/**
 * Generates + emails the result PDF to student, father, and mother
 * (whichever have an email on file). Idempotent per attempt — safe to call
 * more than once (e.g. if grading is corrected and re-saved, pass force).
 */
async function sendResultReport(attemptId, { force = false } = {}) {
  if (!force && (await alreadySent(attemptId))) {
    return { attemptId, status: "already_sent" };
  }

  const report = await buildReportData(attemptId);
  const { student, test } = report;

  const recipients = [
    student.fatherEmail ? { type: "father", email: student.fatherEmail } : null,
    student.motherEmail ? { type: "mother", email: student.motherEmail } : null,
    student.email ? { type: "student", email: student.email } : null,
  ].filter(Boolean);

  if (recipients.length === 0) {
    await logResult(attemptId, { recipients: [], status: "skipped_no_recipients" });
    return { attemptId, status: "skipped_no_recipients" };
  }

  const pdfBuffer = await generatePdfBuffer(report);
  const filename = `${student.name.replace(/[^a-zA-Z0-9]+/g, "_")}_${test.title.replace(/[^a-zA-Z0-9]+/g, "_")}_result.pdf`;
  const subject = `${student.name}'s result for ${test.title}`;
  const firstName = student.name.split(" ")[0];

  const results = [];
  for (const r of recipients) {
    const text = r.type === "student"
      ? `Hi ${firstName},\n\nHere is your attached result for ${test.title}.\n\n-- Chemistry@OCTET`
      : `Hello,\n\nHere is the attached pdf representing your ward ${student.name}'s result for ${test.title}.\n\n-- Chemistry@OCTET`;

    try {
      await sendEmail({ to: r.email, subject, text, attachments: [{ filename, content: pdfBuffer }] });
      results.push({ type: r.type, email: r.email, ok: true });
    } catch (err) {
      results.push({ type: r.type, email: r.email, ok: false, error: err.message });
    }
  }

  const anyOk = results.some((r) => r.ok);
  const allOk = results.every((r) => r.ok);
  const status = allOk ? "sent" : anyOk ? "partial" : "failed";

  await logResult(attemptId, {
    recipients: results,
    status,
    error: allOk ? null : results.filter((r) => !r.ok).map((r) => `${r.type}: ${r.error}`).join("; "),
  });

  // In-app inbox entry for the student — the PDF email above is already
  // sent directly (with the attachment), so this notification is created
  // without a second email to avoid double-sending the same result.
  if (student.authUserId) {
    const pct = report.attempt.maxMarks > 0 ? Math.round((report.attempt.marksAwarded / report.attempt.maxMarks) * 100) : null;
    notificationsService.createNotification({
      type: "test_result",
      title: `Result published: ${test.title}`,
      body: `You scored ${report.attempt.marksAwarded}/${report.attempt.maxMarks}${pct !== null ? ` (${pct}%)` : ""} in ${test.title}.`,
      link: "/student/tests",
      userIds: [student.authUserId],
      email: false,
    }).catch((err) => console.error("test_result notification failed:", err.message));
  }

  return { attemptId, status, recipients: results };
}

module.exports = { sendResultReport, buildReportData, generatePdfBuffer };
