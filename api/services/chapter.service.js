/**
 * services/chapter.service.js
 * ─────────────────────────────────────────────────────────────
 * DB Model:
 *  Chapter {
 *    _id         : ObjectId
 *    name        : String (required)
 *    description : String
 *    order       : Number  (for sorting chapters within a subject)
 *    subjectId   : ref → Subject (required)
 *    createdAt   : Date
 *    updatedAt   : Date
 *  }
 * ─────────────────────────────────────────────────────────────
 */

// TODO: const Chapter = require('../models/chapter.model');

const createChapter = async ({ name, subjectId, description, order }) => {
  // TODO: Chapter.create({ name, subjectId, description, order })
  return { id: "stub-id", name, subjectId };
};

const getChaptersBySubject = async (subjectId) => {
  // TODO: Chapter.find({ subjectId }).sort({ order: 1 })
  return [];
};

const updateChapter = async (id, updates) => {
  // TODO: Chapter.findByIdAndUpdate(id, updates, { new: true })
  return null;
};

const deleteChapter = async (id) => {
  // TODO: Chapter.findByIdAndDelete(id)
  return null;
};

module.exports = { createChapter, getChaptersBySubject, updateChapter, deleteChapter };