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

const csv = require('csv-parse');

exports.bulkImport = async (req, res) => {
    try {
        let studentsArray;

        // CASE 1: CSV file uploaded (multipart/form-data)
        if (req.file) {
            const csvData = req.file.buffer.toString('utf8');
            studentsArray = await new Promise((resolve, reject) => {
                csv.parse(csvData, { columns: true, skip_empty_lines: true }, (err, output) => {
                    if (err) reject(err);
                    else resolve(output);
                });
            });
            // Convert comma-separated subjects to array
            studentsArray = studentsArray.map(s => ({
                ...s,
                subjects: s.subjects ? s.subjects.split(',').map(sub => sub.trim()) : []
            }));
        } 
        // CASE 2: JSON body (application/json)
        else if (req.body && req.body.students) {
            studentsArray = req.body.students;
        } 
        else {
            return res.status(400).json({ success: false, error: 'Provide either a CSV file (field "file") or a JSON body with "students" array' });
        }

        const result = await studentService.bulkImportStudents(studentsArray);
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