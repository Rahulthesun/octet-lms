/**
 * controllers/subtopic.controller.js
 * ─────────────────────────────────────────────────────────────
 * CRUD for Subtopics. Each subtopic belongs to one Chapter
 * and directly owns PDFs and Videos.
 * ─────────────────────────────────────────────────────────────
 */

const subtopicService = require("../services/subtopic.service");

/** POST /api/subtopics */
const createSubtopic = async (req, res) => {
  try {
    const { name, chapterId, description, order } = req.body;
    if (!name || !chapterId) {
      return res.status(400).json({ error: "name and chapterId are required" });
    }
    const subtopic = await subtopicService.createSubtopic({ name, chapterId, description, order });
    res.status(201).json(subtopic);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/** GET /api/subtopics/:chapterId */
const getSubtopicsByChapter = async (req, res) => {
  try {
    const { chapterId } = req.params;
    const subtopics = await subtopicService.getSubtopicsByChapter(chapterId);
    res.status(200).json(subtopics);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/** PUT /api/subtopics/:id */
const updateSubtopic = async (req, res) => {
  try {
    const updated = await subtopicService.updateSubtopic(req.params.id, req.body);
    if (!updated) return res.status(404).json({ error: "Subtopic not found" });
    res.status(200).json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/** DELETE /api/subtopics/:id */
const deleteSubtopic = async (req, res) => {
  try {
    const deleted = await subtopicService.deleteSubtopic(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Subtopic not found" });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { createSubtopic, getSubtopicsByChapter, updateSubtopic, deleteSubtopic };