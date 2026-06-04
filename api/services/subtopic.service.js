/**
 * services/subtopic.service.js
 * ─────────────────────────────────────────────────────────────
 * DB Model:
 *  Subtopic {
 *    _id         : ObjectId
 *    name        : String (required)
 *    description : String
 *    order       : Number
 *    chapterId   : ref → Chapter (required)
 *    createdAt   : Date
 *    updatedAt   : Date
 *  }
 *
 *  PDFs and Videos reference subtopicId in their own collection
 *  rather than being embedded – this keeps documents small and
 *  makes it easy to query "all PDFs in this subtopic".
 * ─────────────────────────────────────────────────────────────
 */

// TODO: const Subtopic = require('../models/subtopic.model');

const createSubtopic = async ({ name, chapterId, description, order }) => {
  // TODO: Subtopic.create({ name, chapterId, description, order })
  return { id: "stub-id", name, chapterId };
};

const getSubtopicsByChapter = async (chapterId) => {
  // TODO: Subtopic.find({ chapterId }).sort({ order: 1 })
  return [];
};

const updateSubtopic = async (id, updates) => {
  // TODO: Subtopic.findByIdAndUpdate(id, updates, { new: true })
  return null;
};

const deleteSubtopic = async (id) => {
  // TODO: Subtopic.findByIdAndDelete(id)
  return null;
};

module.exports = { createSubtopic, getSubtopicsByChapter, updateSubtopic, deleteSubtopic };