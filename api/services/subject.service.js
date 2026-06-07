/**
 * services/subject.service.js
 * ─────────────────────────────────────────────────────────────
 * DB Model:
 *  Subject {
 *    _id         : ObjectId
 *    name        : String (required, unique)
 *    description : String
 *    createdAt   : Date
 *    updatedAt   : Date
 *  }
 * ─────────────────────────────────────────────────────────────
 */

// TODO: const Subject = require('../models/subject.model');

const createSubject = async ({ name, description }) => {
  // TODO: Subject.create({ name, description })
  return { id: "stub-id", name, description };
};

const getAllSubjects = async () => {
  // TODO: Subject.find()
  return [];
};

const getSubjectById = async (id) => {
  // TODO: Subject.findById(id)
  return null;
};

const updateSubject = async (id, updates) => {
  // TODO: Subject.findByIdAndUpdate(id, updates, { new: true })
  return null;
};

const deleteSubject = async (id) => {
  // TODO: Subject.findByIdAndDelete(id)
  return null;
};

module.exports = { createSubject, getAllSubjects, getSubjectById, updateSubject, deleteSubject };