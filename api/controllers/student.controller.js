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
            studentsArray = studentsArray.map(row => ({
              name: row['Full Name *']?.trim(),
              email: row['Email Address *']?.trim().toLowerCase(),

              date_of_birth: row['Date of Birth'] || null,

              mobile_number: row['Mobile Number'] || null,
              whatsapp_number: row['WhatsApp Number'] || null,
              telegram_number: row['Telegram Number'] || null,

              tenth_school: row['10th School Name'] || null,
              tenth_score: row['10th Total Score (Marks / Percentage)'] || null,

              class_grade: row['Current Class / Grade (e.g., 12th, NEET, JEE)'] || null,
              school_college: row['Current School / College'] || null,

              subjects: row['Subjects Opted (in School)']
                  ? row['Subjects Opted (in School)']
                      .split(',')
                      .map(s => s.trim())
                  : [],

              maths_tuition: row['Maths Tuition (Teacher name, days, and timings)'] || null,
              physics_tuition: row['Physics Tuition (Teacher name, days, and timings)'] || null,
              other_tuition: row['Other Tuition Details (Subject, teacher, days, and timings)'] || null,

              neet_jee_details: row['NEET/JEE Details (Institute name and timings)'] || null,
              future_plan: row['Future Plan (Post-graduation career goals)'] || null,

              preferred_batch: row['Preferred Batch ']?.trim() || null,
              learning_mode: row['Learning Mode ']?.trim() || 'OFFLINE',

              father_name: row["Father's Full Name"] || null,
              father_mobile: row["Father's Mobile Number"] || null,
              father_whatsapp: row["Father's WhatsApp Number"] || null,
              father_telegram: row["Father's Telegram Number"] || null,
              father_email: row["Father's Email"] || null,
              father_profession: row["Father's Profession"] || null,

              mother_name: row["Mother's Full Name"] || null,
              mother_mobile: row["Mother's Mobile Number"] || null,
              mother_whatsapp: row["Mother's WhatsApp Number"] || null,
              mother_telegram: row["Mother's Telegram Number"] || null,
              mother_email: row["Mother's Email"] || null,
              mother_profession: row["Mother's Profession"] || null,

              address: row['Address (Street and Area)'] || null,
              landmark: row['Landmark'] || null,
              city: row['City'] || null,
              pincode: row['Pincode'] || null
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