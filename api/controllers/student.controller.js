// controllers/student.controller.js
const studentService = require("../services/student.service");

exports.getAllStudents = async (req, res) => {
  try {
    const { batch, mode, status, search, limit, offset } = req.query;
    const result = await studentService.getAllStudents({ batch, mode, status, search, limit, offset });
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getPendingStudents = async (req, res) => {
  try {
    const result = await studentService.getPendingStudents();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getStudentById = async (req, res) => {
  try {
    const result = await studentService.getStudentById(req.params.id);
    if (!result) return res.status(404).json({ success: false, error: "Student not found" });
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.createStudent = async (req, res) => {
  try {
    const result = await studentService.createStudent(req.body);
    res.status(201).json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateStudent = async (req, res) => {
  try {
    const result = await studentService.updateStudent(req.params.id, req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.deleteStudent = async (req, res) => {
  try {
    await studentService.deleteStudent(req.params.id);
    res.json({ success: true, message: "Student deleted" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.bulkImportStudents = async (req, res) => {
  try {
    const result = await studentService.bulkImportStudents(req.body.students);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.approveStudent = async (req, res) => {
  try {
    const result = await studentService.approveStudent(req.params.id);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.rejectStudent = async (req, res) => {
  try {
    const result = await studentService.rejectStudent(req.params.id, req.body.reason);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getStudentsByBatch = async (req, res) => {
  try {
    const result = await studentService.getStudentsByBatch(req.params.batchId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getDashboardStats = async (req, res) => {
  try {
    const result = await studentService.getDashboardStats();
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};