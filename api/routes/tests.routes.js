/**
 * routes/tests.routes.js
 * ─────────────────────────────────────────────────────────────
 * Mounted at: /api/tests
 *
 * Admin (create/manage tests, view+grade attempts) is admin/developer-only.
 * Student endpoints (list my tests, take an attempt) are any authenticated
 * user — each one further scopes to req.user.id inside the service layer,
 * so a student can never read or act on another student's attempt.
 *
 * IMPORTANT: static paths ("/me", "/:id/attempts/me/...") are declared
 * before the generic "/:id" routes so Express doesn't swallow them.
 * ─────────────────────────────────────────────────────────────
 */

const express = require("express");
const multer = require("multer");
const router = express.Router();
const testsCtrl = require("../controllers/tests.controller");
const attemptsCtrl = require("../controllers/testAttempts.controller");
const { verifyToken, requireRole } = require("../middleware/auth");

const adminOnly = requireRole(["admin", "developer"]);

const allowedExtensions = new Set(["pdf", "pptx", "docx", "doc", "png", "jpg", "jpeg"]);
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const ext = file.originalname.split(".").pop()?.toLowerCase();
    if (allowedExtensions.has(ext)) return cb(null, true);
    cb(new Error("Unsupported file type"), false);
  },
  limits: { fileSize: 25 * 1024 * 1024 },
});
const handleUploadError = (err, req, res, next) => {
  if (!err) return next();
  if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ error: "File is too large. Maximum upload size is 25 MB." });
  }
  return res.status(400).json({ error: err.message || "Invalid upload" });
};

// ─── Student: my tests / my attempt ────────────────────────────

// GET  /api/tests/me                          → list tests for my batch(es), with my attempt status
router.get("/me", verifyToken, attemptsCtrl.listMyTests);

// POST /api/tests/:id/attempts/start           → start (or resume) my attempt
router.post("/:id/attempts/start", verifyToken, attemptsCtrl.startAttempt);

// GET  /api/tests/:id/attempts/me              → my attempt detail (shuffled questions, no answers pre-submit)
router.get("/:id/attempts/me", verifyToken, attemptsCtrl.getMyAttempt);

// POST /api/tests/:id/attempts/me/answer       → autosave one MCQ answer
router.post("/:id/attempts/me/answer", verifyToken, attemptsCtrl.saveAnswer);

// POST /api/tests/:id/attempts/me/submit       → submit (MCQ auto-grades immediately; descriptive awaits grading)
router.post("/:id/attempts/me/submit", verifyToken, upload.single("answerFile"), handleUploadError, attemptsCtrl.submitAttempt);

// ─── Admin: attempts / grading (before "/:id" so these aren't shadowed) ───

// GET  /api/tests/:id/attempts                 → list every student's attempt for this test
router.get("/:id/attempts", verifyToken, adminOnly, attemptsCtrl.adminListAttempts);

// GET  /api/tests/:id/attempts/:attemptId      → one student's full marked answers
router.get("/:id/attempts/:attemptId", verifyToken, adminOnly, attemptsCtrl.adminGetAttempt);

// POST /api/tests/:id/attempts/:attemptId/grade → grade a descriptive attempt
router.post("/:id/attempts/:attemptId/grade", verifyToken, adminOnly, attemptsCtrl.gradeAttempt);

// ─── Admin: test authoring ─────────────────────────────────────

// POST /api/tests/:id/question-file            → upload/replace the descriptive question paper
router.post("/:id/question-file", verifyToken, adminOnly, upload.single("file"), handleUploadError, testsCtrl.uploadQuestionFile);

// POST /api/tests/:id/answer-key-file          → upload/replace the descriptive answer key
router.post("/:id/answer-key-file", verifyToken, adminOnly, upload.single("file"), handleUploadError, testsCtrl.uploadAnswerKeyFile);

// POST /api/tests                              → create a test (MCQ with questions[], or descriptive)
router.post("/", verifyToken, adminOnly, testsCtrl.createTest);

// GET  /api/tests                              → list all tests (optional ?batchId=&status=)
router.get("/", verifyToken, adminOnly, testsCtrl.listTests);

// GET  /api/tests/:id                          → one test, with questions (admin — includes correct answers)
router.get("/:id", verifyToken, adminOnly, testsCtrl.getTest);

// PATCH /api/tests/:id                         → update a test (and optionally replace its questions[])
router.patch("/:id", verifyToken, adminOnly, testsCtrl.updateTest);

// DELETE /api/tests/:id                        → delete a test (cascades questions/attempts/answers)
router.delete("/:id", verifyToken, adminOnly, testsCtrl.deleteTest);

module.exports = router;
