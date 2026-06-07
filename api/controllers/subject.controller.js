/**
 * controllers/subject.controller.js
 * ─────────────────────────────────────────────────────────────
 * CRUD for Subjects – the top of the content hierarchy.
 *
 * Subject → Chapter → Subtopic → (PDF | Video)
 *
 * Since subjects only have a name + optional metadata, these
 * handlers are simpler than pdf/video – great for learning the
 * pattern before adding complexity.
 * ─────────────────────────────────────────────────────────────
 */

const subjectService = require("../services/subject.service");

/** POST /api/subjects  →  create a subject */
const createSubject = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: "Subject name is required" });

    const subject = await subjectService.createSubject({ name, description });
    res.status(201).json(subject);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/** GET /api/subjects  →  list all subjects */
const getAllSubjects = async (req, res) => {
  try {
    const subjects = await subjectService.getAllSubjects();
    res.status(200).json(subjects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/** GET /api/subjects/:id */
const getSubjectById = async (req, res) => {
  try {
    const subject = await subjectService.getSubjectById(req.params.id);
    if (!subject) return res.status(404).json({ error: "Subject not found" });
    res.status(200).json(subject);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/** PUT /api/subjects/:id */
const updateSubject = async (req, res) => {
  try {
    const updated = await subjectService.updateSubject(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: "Subject not found" });
    res.status(200).json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/** DELETE /api/subjects/:id */
const deleteSubject = async (req, res) => {
  try {
    const deleted = await subjectService.deleteSubject(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Subject not found" });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { createSubject, getAllSubjects, getSubjectById, updateSubject, deleteSubject };