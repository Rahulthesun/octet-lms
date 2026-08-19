/**
 * routes/chapter.routes.js
 * ─────────────────────────────────────────────────────────────
 * Routes for Chapters – always belong to a Subject.
 *
 * Mounted at: /api/chapters  (see server.js)
 *
 * Reads are shared by admin (content manager) and students (browsing their
 * own notes) — any authenticated user. Writes (create/update/delete) are
 * admin/developer only.
 * ─────────────────────────────────────────────────────────────
 */

const express = require("express");
const router  = express.Router();
const chapterController = require("../controllers/chapter.controller");
const { verifyToken, requireRole } = require("../middleware/auth");

const adminOnly = requireRole(["admin", "developer"]);

// POST  /api/chapters                      → create a chapter (admin only)
//   body should include { subjectId, name, ... }
router.post("/", verifyToken, adminOnly, chapterController.createChapter);

// GET   /api/chapters/:id                  → get a single chapter by id
router.get("/:id", verifyToken, chapterController.getChapterById);

// GET   /api/chapters/subject/:subjectId   → get all chapters for a subject
router.get("/subject/:subjectId", verifyToken, chapterController.getChaptersBySubject);

// PATCH /api/chapters/:id                  → update a chapter (admin only)
router.patch("/:id", verifyToken, adminOnly, chapterController.updateChapter);

// DELETE /api/chapters/:id                 → delete a chapter (admin only)
router.delete("/:id", verifyToken, adminOnly, chapterController.deleteChapter);

module.exports = router;
