/**
 * routes/subject.routes.js
 * ─────────────────────────────────────────────────────────────
 * Routes for the top level of the content hierarchy: Subjects.
 *
 * Hierarchy:  Subject → Chapter → Subtopic → (PDF | Video)
 *
 * Mounted at: /api/subjects  (see server.js)
 * ─────────────────────────────────────────────────────────────
 */

const express = require("express");
const router  = express.Router();
const subjectController = require("../controllers/subject.controller");

// POST  /api/subjects      → create a new subject
router.post("/", subjectController.createSubject);

// GET   /api/subjects      → list all subjects
router.get("/", subjectController.getAllSubjects);

// GET   /api/subjects/:id  → get a single subject
router.get("/:id", subjectController.getSubjectById);

// PUT   /api/subjects/:id  → update a subject
router.put("/:id", subjectController.updateSubject);

// DELETE /api/subjects/:id → delete a subject
router.delete("/:id", subjectController.deleteSubject);

module.exports = router;