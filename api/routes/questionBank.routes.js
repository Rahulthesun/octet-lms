/**
 * routes/questionBank.routes.js
 * ─────────────────────────────────────────────────────────────
 * Mounted at: /api/question-bank   (admin only)
 *
 * The bank fills itself automatically whenever a test's questions are
 * saved (see tests.service.js), so there is no "add" route here — only
 * reading, importing and a re-runnable back-fill.
 * ─────────────────────────────────────────────────────────────
 */

const express = require("express");
const router = express.Router();
const bank = require("../services/questionBank.service");
const { verifyToken, requireRole } = require("../middleware/auth");

const adminOnly = requireRole(["admin", "developer"]);

const handle = (fn) => async (req, res) => {
  try {
    res.status(200).json(await fn(req));
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

// GET  /api/question-bank/groups?search=      — past tests that have questions in the bank
router.get("/groups", verifyToken, adminOnly, handle((req) => bank.listGroups({ search: req.query.search })));

// GET  /api/question-bank/questions?sourceTestId=|title=   — the questions of one past test
router.get(
  "/questions",
  verifyToken,
  adminOnly,
  handle((req) => bank.listQuestions({ sourceTestId: req.query.sourceTestId, title: req.query.title }))
);

// POST /api/question-bank/backfill            — (re)store questions of every existing test; idempotent
router.post("/backfill", verifyToken, adminOnly, handle(() => bank.backfillAll()));

module.exports = router;
