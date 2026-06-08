/**
 * controllers/chapter.controller.js
 * ─────────────────────────────────────────────────────────────
 * CRUD for Chapters. Each chapter belongs to one Subject.
 *
 * Key difference from subject controller:
 *  - createChapter requires subjectId in the body
 *  - getChaptersBySubject uses req.params.subjectId (not :id)
 *    because we're fetching by *parent*, not by the chapter's own id
 * ─────────────────────────────────────────────────────────────
 */

const chapterService = require("../services/chapter.service");

/** POST /api/chapters */
const createChapter = async (req, res) => {
  try {
    const { name, subjectId, description, order } = req.body;
    if (!name || !subjectId) {
      return res.status(400).json({ error: "name and subjectId are required" });
    }
    const chapter = await chapterService.createChapter({ name, subjectId, description, order });
    res.status(201).json(chapter);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};



const getChapterById = async (req, res) => {
  try {
    const { id } = req.params;
    const chapter = await chapterService.getChapterById(id);
    if (!chapter) {
      return res.status(404).json({ error: "Chapter not found with ID: " + id });
    }

    res.status(200).json(chapter);
   }
    catch (err) { 
      res.status(500).json({ error: err.message });
    }
}

/**
 * GET /api/chapters/:subjectId
 *
 * Note: here :subjectId is the URL param, NOT the chapter's own id.
 * This reads "give me all chapters that belong to subjectId".
 */
const getChaptersBySubject = async (req, res) => {
  try {
    const { subjectId } = req.params;
    const chapters = await chapterService.getChaptersBySubject(subjectId);
    if (!chapters || chapters.length === 0) {
      return res.status(404).json({ error: `No chapters found for subject ID: ${subjectId}` });
    }
    res.status(200).json(chapters);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/** PUT /api/chapters/:id */
const updateChapter = async (req, res) => {
  try {
    const updated = await chapterService.updateChapter(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: "Chapter not found" });
    res.status(200).json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/** DELETE /api/chapters/:id */
const deleteChapter = async (req, res) => {
  try {
    const deleted = await chapterService.deleteChapter(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Chapter not found" });
    
    res.status(200).json({ message: "Chapter deleted successfully", id: deleted.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { createChapter, getChapterById, getChaptersBySubject, updateChapter, deleteChapter };