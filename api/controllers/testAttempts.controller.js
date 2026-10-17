/**
 * controllers/testAttempts.controller.js
 * ─────────────────────────────────────────────────────────────
 * Student attempt flow + admin grading/results view — thin wrappers
 * around services/testAttempts.service.js.
 * ─────────────────────────────────────────────────────────────
 */

const PDFDocument = require("pdfkit");
const testAttemptsService = require("../services/testAttempts.service");
const { buildStudentTestReportPdf } = require("../utils/testReportPdf");

// ─── Student ────────────────────────────────────────────────────

const listMyTests = async (req, res) => {
  try {
    const tests = await testAttemptsService.listTestsForStudent(req.user.id);
    res.status(200).json(tests);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

const startAttempt = async (req, res) => {
  try {
    const attempt = await testAttemptsService.startAttempt(req.params.id, req.user.id);
    res.status(200).json(attempt);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

const getMyAttempt = async (req, res) => {
  try {
    const detail = await testAttemptsService.getMyAttemptDetail(req.params.id, req.user.id);
    res.status(200).json(detail);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

const saveAnswer = async (req, res) => {
  try {
    const result = await testAttemptsService.saveAnswer(req.params.id, req.user.id, req.body);
    res.status(200).json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

const submitAttempt = async (req, res) => {
  try {
    const result = await testAttemptsService.submitAttempt(req.params.id, req.user.id, {
      answerText: req.body.answerText,
      answerFile: req.file || null,
      autoSubmitted: req.body.autoSubmitted === "true" || req.body.autoSubmitted === true,
    });
    res.status(200).json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

// ─── Admin ──────────────────────────────────────────────────────

const adminListAttempts = async (req, res) => {
  try {
    const attempts = await testAttemptsService.adminListAttempts(req.params.id);
    res.status(200).json(attempts);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

const adminGetAttempt = async (req, res) => {
  try {
    const detail = await testAttemptsService.adminGetAttemptDetail(req.params.id, req.params.attemptId);
    res.status(200).json(detail);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

const gradeAttempt = async (req, res) => {
  try {
    const attempt = await testAttemptsService.gradeDescriptiveAttempt(req.params.id, req.params.attemptId, {
      marksAwarded: req.body.marksAwarded,
      feedback: req.body.feedback,
      gradedByUserId: req.user.id,
    });
    res.status(200).json(attempt);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

const adminGetStudentMonthlyReport = async (req, res) => {
  try {
    const report = await testAttemptsService.getStudentMonthlyReport(req.params.studentId, req.query.month);
    res.status(200).json(report);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

const adminDownloadStudentMonthlyReportPdf = async (req, res) => {
  try {
    const report = await testAttemptsService.getStudentMonthlyReport(req.params.studentId, req.query.month);
    const filename = `test_report_${(report.student.name || report.student.id).toString().replace(/[^a-zA-Z0-9_-]/g, "_")}_${report.month}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    const doc = new PDFDocument({ margin: 40, size: "A4" });
    doc.pipe(res);
    buildStudentTestReportPdf(doc, report);
    doc.end();
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

module.exports = {
  listMyTests,
  startAttempt,
  getMyAttempt,
  saveAnswer,
  submitAttempt,
  adminListAttempts,
  adminGetAttempt,
  gradeAttempt,
  adminGetStudentMonthlyReport,
  adminDownloadStudentMonthlyReportPdf,
};
