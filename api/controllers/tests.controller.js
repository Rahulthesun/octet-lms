/**
 * controllers/tests.controller.js
 * ─────────────────────────────────────────────────────────────
 * Admin-facing test authoring endpoints — thin wrappers around
 * services/tests.service.js.
 * ─────────────────────────────────────────────────────────────
 */

const testsService = require("../services/tests.service");
const testAnalyticsService = require("../services/testAnalytics.service");
const PDFDocument = require("pdfkit");
const { buildTestAnalyticsPdf, buildOverallAnalyticsPdf } = require("../utils/testAnalyticsPdf");

const createTest = async (req, res) => {
  try {
    const test = await testsService.createTest({ ...req.body, createdBy: req.user.id });
    res.status(201).json(test);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

const listTests = async (req, res) => {
  try {
    const { batchId, status } = req.query;
    const tests = await testsService.listTestsForAdmin({ batchId, status });
    res.status(200).json(tests);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

const getTest = async (req, res) => {
  try {
    const test = await testsService.getTestForAdmin(req.params.id);
    res.status(200).json(test);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

const updateTest = async (req, res) => {
  try {
    const test = await testsService.updateTest(req.params.id, req.body);
    res.status(200).json(test);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

const deleteTest = async (req, res) => {
  try {
    const result = await testsService.deleteTest(req.params.id);
    if (!result) return res.status(404).json({ error: "Test not found" });
    res.status(200).json({ success: true });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

const uploadQuestionFile = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const test = await testsService.attachQuestionFile(req.params.id, req.file);
    res.status(200).json(test);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

const uploadAnswerKeyFile = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const test = await testsService.attachAnswerKeyFile(req.params.id, req.file);
    res.status(200).json(test);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

/** GET /api/tests/:id/analytics?passPct= */
const getTestAnalytics = async (req, res) => {
  try {
    const passPct = req.query.passPct ? Number(req.query.passPct) : undefined;
    const analytics = await testAnalyticsService.getTestAnalytics(req.params.id, { passPct });
    res.status(200).json(analytics);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

/** GET /api/tests/:id/analytics/pdf?passPct= */
const downloadTestAnalyticsPdf = async (req, res) => {
  try {
    const passPct = req.query.passPct ? Number(req.query.passPct) : undefined;
    const analytics = await testAnalyticsService.getTestAnalytics(req.params.id, { passPct });

    const doc = new PDFDocument({ margin: 40, size: "A4" });
    const filename = `${analytics.test.title.replace(/[^a-zA-Z0-9]+/g, "_")}_analytics.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    doc.pipe(res);
    buildTestAnalyticsPdf(doc, analytics);
    doc.end();
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

/** GET /api/tests/analytics/overall?passPct= — analytics across every test. */
const getOverallAnalytics = async (req, res) => {
  try {
    const passPct = req.query.passPct ? Number(req.query.passPct) : undefined;
    const analytics = await testAnalyticsService.getOverallAnalytics({ passPct });
    res.status(200).json(analytics);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

/** GET /api/tests/analytics/overall/pdf?passPct= — the same, as a downloadable PDF. */
const downloadOverallAnalyticsPdf = async (req, res) => {
  try {
    const passPct = req.query.passPct ? Number(req.query.passPct) : undefined;
    const analytics = await testAnalyticsService.getOverallAnalytics({ passPct });

    const doc = new PDFDocument({ margin: 40, size: "A4" });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="all_tests_analytics.pdf"`);
    doc.pipe(res);
    buildOverallAnalyticsPdf(doc, analytics);
    doc.end();
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

module.exports = {
  createTest,
  listTests,
  getTest,
  updateTest,
  deleteTest,
  uploadQuestionFile,
  uploadAnswerKeyFile,
  getTestAnalytics,
  downloadTestAnalyticsPdf,
  getOverallAnalytics,
  downloadOverallAnalyticsPdf,
};
