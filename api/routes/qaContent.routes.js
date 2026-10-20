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

const supabase = require("../config/supabase");
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

async function getOrCreateCategorySubject(category, grade) {
  const g = Number(grade) === 11 ? 11 : 12;
  const cat = category === "practice" ? "practice" : "qa";
  const name = cat === "qa" ? "Q&A" : "Practise Questions";

  const { data: existing } = await supabase
    .from("subjects")
    .select("*")
    .eq("category", cat)
    .eq("grade", g)
    .maybeSingle();

  if (existing) return existing;

  const { data: created, error } = await supabase
    .from("subjects")
    .insert({
      name,
      grade: g,
      category: cat,
      order_index: 99,
      is_visible: true,
    })
    .select()
    .single();

  if (error && error.code === "23505") {
    const { data: retry } = await supabase
      .from("subjects")
      .select("*")
      .eq("category", cat)
      .eq("grade", g)
      .maybeSingle();
    if (retry) return retry;
  }
  if (error) throw error;
  return created;
}

async function getOrCreateUnitSubtopic(chapterId, unitName) {
  const { data: subtopics, error } = await supabase
    .from("subtopics")
    .select("*")
    .eq("chapter_id", chapterId)
    .order("order_index", { ascending: true });

  if (error) throw error;
  if (subtopics && subtopics.length > 0) return subtopics[0];

  const { data: created, error: subError } = await supabase
    .from("subtopics")
    .insert({
      chapter_id: chapterId,
      name: unitName || "General",
      order_index: 0,
      is_visible: true,
    })
    .select()
    .single();

  if (subError) throw subError;
  return created;
}

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

// ─── Unit-level operations (Subject → Unit) ───────────────────────────────

// GET /api/qa-content/units?category=qa|practice&grade=11|12
router.get(
  "/units",
  verifyToken,
  handle(async (req) => {
    const category = req.query.category === "practice" ? "practice" : "qa";
    const grade = Number(req.query.grade) === 11 ? 11 : 12;
    const subject = await getOrCreateCategorySubject(category, grade);

    const chapters = await chapterService.getChaptersBySubject(subject.id);
    const units = [];
    for (const ch of chapters) {
      const subtopic = await getOrCreateUnitSubtopic(ch.id, ch.name);
      const mcqs = await bank.listQuestionsForSubtopic(subtopic.id);
      const desc = await descriptive.listForSubtopic(subtopic.id);
      const resList = await resources.getResourcesBySubtopic(subtopic.id);

      units.push({
        id: ch.id,
        name: ch.name,
        subjectId: subject.id,
        subtopicId: subtopic.id,
        grade,
        category,
        mcqCount: (mcqs || []).length,
        descriptiveCount: (desc || []).length,
        resourcesCount: (resList || []).length,
        totalQuestions: (mcqs || []).length + (desc || []).length,
      });
    }
    return units;
  })
);

// POST /api/qa-content/units  (admin creates unit under Q&A / Practice)
router.post(
  "/units",
  verifyToken,
  adminOnly,
  handle(async (req) => {
    const category = req.body.category === "practice" ? "practice" : "qa";
    const grade = Number(req.body.grade) === 11 ? 11 : 12;
    const name = (req.body.name || "").trim();
    if (!name) throw Object.assign(new Error("Unit name is required"), { status: 400 });

    const subject = await getOrCreateCategorySubject(category, grade);
    const chapter = await chapterService.createChapter({
      name,
      subjectId: subject.id,
    });
    const subtopic = await getOrCreateUnitSubtopic(chapter.id, name);

    return {
      id: chapter.id,
      name: chapter.name,
      subjectId: subject.id,
      subtopicId: subtopic.id,
      grade,
      category,
      mcqCount: 0,
      descriptiveCount: 0,
      resourcesCount: 0,
      totalQuestions: 0,
    };
  })
);

// PATCH /api/qa-content/units/:unitId  (admin renames unit)
router.patch(
  "/units/:unitId",
  verifyToken,
  adminOnly,
  handle(async (req) => {
    const name = (req.body.name || "").trim();
    if (!name) throw Object.assign(new Error("Unit name is required"), { status: 400 });
    const updated = await chapterService.updateChapter(req.params.unitId, { name });
    return updated;
  })
);

// DELETE /api/qa-content/units/:unitId  (admin deletes unit)
router.delete(
  "/units/:unitId",
  verifyToken,
  adminOnly,
  handle(async (req) => {
    await chapterService.deleteChapter(req.params.unitId);
    return { success: true, id: req.params.unitId };
  })
);

// GET /api/qa-content/units/:unitId/content  (fetch all questions for a unit)
router.get(
  "/units/:unitId/content",
  verifyToken,
  handle(async (req) => {
    const chapter = await chapterService.getChapterById(req.params.unitId);
    if (!chapter) throw Object.assign(new Error("Unit not found"), { status: 404 });

    const subtopic = await getOrCreateUnitSubtopic(chapter.id, chapter.name);
    const mcqs = await bank.listQuestionsForSubtopic(subtopic.id);
    const desc = await descriptive.listForSubtopic(subtopic.id);
    const resList = await resources.getResourcesBySubtopic(subtopic.id);

    return {
      unit: chapter,
      subtopicId: subtopic.id,
      mcqs: mcqs || [],
      descriptive: desc || [],
      resources: resList || [],
    };
  })
);

// POST /api/qa-content/units/:unitId/mcq  (add MCQ question to unit)
router.post(
  "/units/:unitId/mcq",
  verifyToken,
  adminOnly,
  handle(async (req) => {
    const chapter = await chapterService.getChapterById(req.params.unitId);
    if (!chapter) throw Object.assign(new Error("Unit not found"), { status: 404 });
    const subtopic = await getOrCreateUnitSubtopic(chapter.id, chapter.name);

    return bank.createManual({
      questions: [req.body],
      label: chapter.name,
      createdBy: req.user.id,
      subtopicId: subtopic.id,
    });
  })
);

// POST /api/qa-content/units/:unitId/descriptive  (add descriptive question to unit)
router.post(
  "/units/:unitId/descriptive",
  verifyToken,
  adminOnly,
  handle(async (req) => {
    const chapter = await chapterService.getChapterById(req.params.unitId);
    if (!chapter) throw Object.assign(new Error("Unit not found"), { status: 404 });
    const subtopic = await getOrCreateUnitSubtopic(chapter.id, chapter.name);

    return descriptive.createItems({
      subtopicId: subtopic.id,
      items: [req.body],
      createdBy: req.user.id,
    });
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
