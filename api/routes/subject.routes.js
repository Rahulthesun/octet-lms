/**
 * routes/subject.routes.js
 * ─────────────────────────────────────────────────────────────
 * Routes for the top level of the content hierarchy: Subjects.
 *
 * Hierarchy:  Subject → Chapter → Subtopic → (PDF | Video)
 *
 * Mounted at: /api/subjects  (see server.js)
 *
 * Reads are shared by admin (content manager) and students (browsing their
 * own notes) — any authenticated user. Writes (create/rename/delete) are
 * admin/developer only.
 * ─────────────────────────────────────────────────────────────
 */

const express = require("express");
const router  = express.Router();
const subjectController = require("../controllers/subject.controller");
const { verifyToken, requireRole } = require("../middleware/auth");

const adminOnly = requireRole(["admin", "developer"]);

// POST  /api/subjects      → create a new subject (admin only)
router.post("/", verifyToken, adminOnly, subjectController.createSubject);

// GET   /api/subjects      → list all subjects (any authenticated user)
router.get("/", verifyToken, subjectController.getAllSubjects);

// GET   /api/subjects/:id  → get a single subject (any authenticated user)
router.get("/:id", verifyToken, subjectController.getSubjectById);

// PATCH /api/subjects/:id  → update a subject (admin only)
router.patch("/:id", verifyToken, adminOnly, subjectController.updateSubject);

// DELETE /api/subjects/:id → delete a subject (admin only)
router.delete("/:id", verifyToken, adminOnly, subjectController.deleteSubject);

module.exports = router;
