/**
 * routes/subtopic.routes.js
 * ─────────────────────────────────────────────────────────────
 * Routes for Subtopics – always belong to a Chapter.
 * Subtopics are the leaf nodes that actually hold PDFs and Videos.
 *
 * Mounted at: /api/subtopics  (see server.js)
 *
 * Reads: any authenticated user. Writes: admin/developer only.
 * ─────────────────────────────────────────────────────────────
 */

const express = require("express");
const router  = express.Router();
const subtopicController = require("../controllers/subtopic.controller");
const { verifyToken, requireRole } = require("../middleware/auth");

const adminOnly = requireRole(["admin", "developer"]);

// POST  /api/subtopics                  → create a subtopic (admin only)
//   body should include { chapterId, name, ... }
router.post("/", verifyToken, adminOnly, subtopicController.createSubtopic);

router.get("/:id", verifyToken, subtopicController.getSubtopicById);

// GET   /api/subtopics/chapter/:chapterId       → get all subtopics for a chapter
router.get("/chapter/:chapterId", verifyToken, subtopicController.getSubtopicsByChapter);

// PATCH /api/subtopics/:id              → update a subtopic (admin only)
router.patch("/:id", verifyToken, adminOnly, subtopicController.updateSubtopic);

// DELETE /api/subtopics/:id             → delete a subtopic (admin only)
router.delete("/:id", verifyToken, adminOnly, subtopicController.deleteSubtopic);

module.exports = router;
