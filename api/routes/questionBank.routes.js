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

// POST /api/question-bank/manual              — add question(s) straight to the bank (optionally appended to an existing test-derived group via sourceTestId)
router.post(
  "/manual",
  verifyToken,
  adminOnly,
  handle((req) =>
    bank.createManual({
      questions: req.body?.questions,
      label: req.body?.label,
      createdBy: req.user.id,
      sourceTestId: req.body?.sourceTestId,
    })
  )
);

// DELETE /api/question-bank/groups?sourceTestId=|title=   — delete an entire group's bank copies
router.delete(
  "/groups",
  verifyToken,
  adminOnly,
  handle((req) => bank.deleteGroup({ sourceTestId: req.query.sourceTestId, title: req.query.title }))
);

// PATCH /api/question-bank/groups/rename       — rename a manually-added group's label (bulk, all its questions)
router.patch(
  "/groups/rename",
  verifyToken,
  adminOnly,
  handle((req) => bank.renameManualGroup(req.body?.oldTitle, req.body?.newTitle, req.user.id))
);

// POST /api/question-bank/backfill            — (re)store questions of every existing test; idempotent
router.post("/backfill", verifyToken, adminOnly, handle(() => bank.backfillAll()));

// PATCH /api/question-bank/:id                — edit an existing bank question's content in place
// (text/images/options/correct answer/marks). This is a separate copy-store —
// editing a bank row never touches any test that previously imported a copy of it.
router.patch(
  "/:id",
  verifyToken,
  adminOnly,
  handle((req) => bank.updateQuestion(req.params.id, req.body || {}, req.user.id))
);

// DELETE /api/question-bank/:id                — delete one bank question
router.delete(
  "/:id",
  verifyToken,
  adminOnly,
  handle((req) => bank.deleteQuestion(req.params.id))
);

module.exports = router;
