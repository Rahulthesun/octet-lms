/**
 * routes/chapter.routes.js
 * ─────────────────────────────────────────────────────────────
 * Routes for Chapters – always belong to a Subject.
 *
 * Mounted at: /api/chapters  (see server.js)
 * ─────────────────────────────────────────────────────────────
 */

const express = require("express");
const router  = express.Router();
const chapterController = require("../controllers/chapter.controller");

// POST  /api/chapters                      → create a chapter
//   body should include { subjectId, name, ... }
router.post("/", chapterController.createChapter);

// GET   /api/chapters/:subjectId           → get all chapters for a subject
router.get("/:subjectId", chapterController.getChaptersBySubject);

// PUT   /api/chapters/:id                  → update a chapter
router.put("/:id", chapterController.updateChapter);

// DELETE /api/chapters/:id                 → delete a chapter
router.delete("/:id", chapterController.deleteChapter);

module.exports = router;