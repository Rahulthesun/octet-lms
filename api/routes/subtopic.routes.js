/**
 * routes/subtopic.routes.js
 * ─────────────────────────────────────────────────────────────
 * Routes for Subtopics – always belong to a Chapter.
 * Subtopics are the leaf nodes that actually hold PDFs and Videos.
 *
 * Mounted at: /api/subtopics  (see server.js)
 * ─────────────────────────────────────────────────────────────
 */

const express = require("express");
const router  = express.Router();
const subtopicController = require("../controllers/subtopic.controller");

// POST  /api/subtopics                  → create a subtopic
//   body should include { chapterId, name, ... }
router.post("/", subtopicController.createSubtopic);

// GET   /api/subtopics/:chapterId       → get all subtopics for a chapter
router.get("/:chapterId", subtopicController.getSubtopicsByChapter);

// PUT   /api/subtopics/:id              → update a subtopic
router.put("/:id", subtopicController.updateSubtopic);

// DELETE /api/subtopics/:id             → delete a subtopic
router.delete("/:id", subtopicController.deleteSubtopic);

module.exports = router;