/**
 * routes/qaContent.routes.js
 * ─────────────────────────────────────────────────────────────
 * Routes for the Q&A / Practice Questions content categories.
 *
 * These reuse the SAME subjects/chapters/subtopics hierarchy as the
 * existing notes content (just rows with subjects.category = 'qa' or
 * 'practice' instead of 'notes' — see api/sql/content_category.sql), plus
 * question_bank rows scoped to a subtopic (api/sql/qa_bank_questions.sql)
 * and a new qa_bank_resources table for attached PDF/Word files
 * (api/sql/qa_bank_resources.sql).
 *
 * Subject/chapter CRUD itself is unchanged — reuse
 * /api/subjects (?category=qa|practice) and /api/chapters as-is.
 * This file only adds what's new: subtopic-scoped questions + resources.
 *
 * Mounted at: /api/qa-content (see server.js)
 *
 * Admin routes (create/import/upload/delete) are admin/developer only.
 * Read routes are any authenticated user, including students browsing
 * untimed practice material — correct answers ARE included in the read
 * response on purpose (this is self-paced practice material, not a
 * scored test, so showing the answer is expected, not a leak).
 * ─────────────────────────────────────────────────────────────
 */

const express = require("express");
const multer = require("multer");
const router = express.Router();

const bank = require("../services/questionBank.service");
const descriptive = require("../services/qaDescriptive.service");
const resources = require("../services/qaBankResources.service");
const subjectService = require("../services/subject.service");
const chapterService = require("../services/chapter.service");
const subtopicService = require("../services/subtopic.service");
const { verifyToken, requireRole } = require("../middleware/auth");

const adminOnly = requireRole(["admin", "developer"]);

const handle = (fn) => async (req, res) => {
  try {
    res.status(200).json(await fn(req));
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message || "Something went wrong" });
  }
};

// ─── File upload (PDF / Word) for a Class's attached resources ───────────

const allowedResourceTypes = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const ext = file.originalname.split(".").pop()?.toLowerCase();
    const allowedExt = ["pdf", "doc", "docx"].includes(ext);
    if (allowedResourceTypes.has(file.mimetype) && allowedExt) {
      cb(null, true);
    } else {
      cb(new Error("Only PDF and Word (.doc/.docx) files are supported"), false);
    }
  },
  limits: { fileSize: 50 * 1024 * 1024 },
});

const handleUploadError = (err, req, res, next) => {
  if (!err) return next();
  if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ error: "File is too large. Maximum upload size is 50 MB." });
  }
  return res.status(400).json({ error: err.message || "Invalid upload" });
};

// ─── Tree browsing (Subject → Unit(chapter) → Class(subtopic)) ───────────
// GET /api/qa-content/tree?category=qa|practice
// Any authenticated user (students browse this read-only). Only
// is_visible rows are included so admins can stage content before
// publishing it.
router.get(
  "/tree",
  verifyToken,
  handle(async (req) => {
    const category = req.query.category === "practice" ? "practice" : "qa";
    const subjects = (await subjectService.getAllSubjects(category)).filter((s) => s.is_visible);

    const tree = [];
    for (const subject of subjects) {
      const chapters = (await chapterService.getChaptersBySubject(subject.id)).filter((c) => c.is_visible);
      const chaptersWithClasses = [];
      for (const chapter of chapters) {
        const subtopics = (await subtopicService.getSubtopicsByChapter(chapter.id)).filter((s) => s.is_visible);
        chaptersWithClasses.push({ ...chapter, subtopics });
      }
      tree.push({ ...subject, chapters: chaptersWithClasses });
    }
    return tree;
  })
);

// ─── Questions scoped to a Class (subtopic) ───────────────────────────────

// GET /api/qa-content/subtopics/:subtopicId/questions  (admin + student read)
router.get(
  "/subtopics/:subtopicId/questions",
  verifyToken,
  handle((req) => bank.listQuestionsForSubtopic(req.params.subtopicId))
);

// POST /api/qa-content/subtopics/:subtopicId/questions  (admin only — manual question-wise entry)
router.post(
  "/subtopics/:subtopicId/questions",
  verifyToken,
  adminOnly,
  handle((req) =>
    bank.createManual({
      questions: req.body?.questions,
      label: req.body?.label || "Q&A / Practice Questions",
      createdBy: req.user.id,
      subtopicId: req.params.subtopicId,
    })
  )
);

// POST /api/qa-content/subtopics/:subtopicId/import   (admin only — copy from Question Bank)
router.post(
  "/subtopics/:subtopicId/import",
  verifyToken,
  adminOnly,
  handle((req) => bank.copyQuestionsToSubtopic(req.body?.bankQuestionIds, req.params.subtopicId, req.user.id))
);

// PATCH /api/qa-content/questions/:id   (admin only — edit one question)
router.patch(
  "/questions/:id",
  verifyToken,
  adminOnly,
  handle((req) => bank.updateQuestion(req.params.id, req.body || {}, req.user.id))
);

// ─── Descriptive (non-MCQ) items: question + model answer ─────────────────

// GET  /api/qa-content/subtopics/:subtopicId/descriptive   (any authenticated user)
router.get(
  "/subtopics/:subtopicId/descriptive",
  verifyToken,
  handle((req) => descriptive.listForSubtopic(req.params.subtopicId))
);

// POST /api/qa-content/subtopics/:subtopicId/descriptive   (admin only)
router.post(
  "/subtopics/:subtopicId/descriptive",
  verifyToken,
  adminOnly,
  handle((req) => descriptive.createItems({ subtopicId: req.params.subtopicId, items: req.body?.items, createdBy: req.user.id }))
);

// PATCH /api/qa-content/descriptive/:id   (admin only)
router.patch(
  "/descriptive/:id",
  verifyToken,
  adminOnly,
  handle((req) => descriptive.updateItem(req.params.id, req.body || {}, req.user.id))
);

// DELETE /api/qa-content/descriptive/:id   (admin only)
router.delete(
  "/descriptive/:id",
  verifyToken,
  adminOnly,
  handle((req) => descriptive.deleteItem(req.params.id))
);

// DELETE /api/qa-content/questions/:id   (admin only)
router.delete(
  "/questions/:id",
  verifyToken,
  adminOnly,
  handle((req) => bank.deleteQuestion(req.params.id))
);

// ─── Attached resources (PDF/Word) scoped to a Class (subtopic) ──────────

// GET /api/qa-content/subtopics/:subtopicId/resources  (admin + student read)
router.get(
  "/subtopics/:subtopicId/resources",
  verifyToken,
  handle((req) => resources.getResourcesBySubtopic(req.params.subtopicId))
);

// POST /api/qa-content/subtopics/:subtopicId/resources/upload  (admin only)
router.post(
  "/subtopics/:subtopicId/resources/upload",
  verifyToken,
  adminOnly,
  upload.single("file"),
  handleUploadError,
  handle((req) =>
    resources.createResource({
      title: req.body?.title,
      subtopicId: req.params.subtopicId,
      uploadedBy: req.user.id,
      file: req.file,
    })
  )
);

// DELETE /api/qa-content/resources/:id   (admin only)
router.delete(
  "/resources/:id",
  verifyToken,
  adminOnly,
  handle(async (req) => {
    const deleted = await resources.deleteResource(req.params.id);
    if (!deleted) throw Object.assign(new Error("Resource not found"), { status: 404 });
    return { message: "Resource deleted", id: deleted.id };
  })
);

module.exports = router;
