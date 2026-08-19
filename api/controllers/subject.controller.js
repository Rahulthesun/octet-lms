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

function handleError(res, err, fallbackMessage) {
  const status = err.status || 500;
  res.status(status).json({ error: err.message || fallbackMessage });
}

/** Accepts "11", 11, "12", 12 from the client and normalizes to a number. */
function parseGrade(value) {
  const n = Number(value);
  return Number.isInteger(n) ? n : null;
}

/** POST /api/subjects  →  create a subject */
const createSubject = async (req, res) => {
  try {
    const { name, description, grade } = req.body;
    if (!name) return res.status(400).json({ error: "Subject name is required" });

    const parsedGrade = parseGrade(grade);
    if (parsedGrade === null || ![11, 12].includes(parsedGrade)) {
      return res.status(400).json({ error: "Grade must be 11 or 12" });
    }

    const subject = await subjectService.createSubject({ name, description, grade: parsedGrade });
    res.status(201).json(subject);
  } catch (err) {
    handleError(res, err, "Failed to create subject");
  }
};

/** GET /api/subjects  →  list all subjects */
const getAllSubjects = async (req, res) => {
  try {
    const subjects = await subjectService.getAllSubjects();
    res.status(200).json(subjects);
  } catch (err) {
    handleError(res, err, "Failed to load subjects");
  }
};

/** GET /api/subjects/:id */
const getSubjectById = async (req, res) => {
  try {
    const subject = await subjectService.getSubjectById(req.params.id);
    if (!subject) return res.status(404).json({ error: "Subject not found" });
    res.status(200).json(subject);
  } catch (err) {
    handleError(res, err, "Failed to load subject");
  }
};

/** PATCH /api/subjects/:id */
const updateSubject = async (req, res) => {
  try {
    const updates = { ...req.body };
    if (updates.grade !== undefined) {
      const parsedGrade = parseGrade(updates.grade);
      if (parsedGrade === null || ![11, 12].includes(parsedGrade)) {
        return res.status(400).json({ error: "Grade must be 11 or 12" });
      }
      updates.grade = parsedGrade;
    }
    if (updates.name !== undefined && !String(updates.name).trim()) {
      return res.status(400).json({ error: "Subject name cannot be empty" });
    }

    const updated = await subjectService.updateSubject(req.params.id, updates);
    if (!updated) return res.status(404).json({ error: "Subject not found" });
    res.status(200).json(updated);
  } catch (err) {
    handleError(res, err, "Failed to update subject");
  }
};

/** DELETE /api/subjects/:id */
const deleteSubject = async (req, res) => {
  try {
    const deleted = await subjectService.deleteSubject(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Subject not found" });

    res.status(200).json({ message: "Subject deleted successfully", id: deleted.id });
  } catch (err) {
    handleError(res, err, "Failed to delete subject");
  }
};

module.exports = { createSubject, getAllSubjects, getSubjectById, updateSubject, deleteSubject };
