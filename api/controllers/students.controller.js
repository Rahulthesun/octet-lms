// controllers/student.controller.js
const studentService = require("../services/students.service");
const attendanceService = require("../services/attendance.service");


exports.getAllStudents = async (req, res) => {
  try {
    const { batch, mode, status, search, limit, offset } = req.query;
    const result = await studentService.getAllStudents({ batch, mode, status, search, limit, offset });

    // Real, database-backed attendance % per student (no mock/placeholder
    // data) — best-effort: if this lookup fails for any reason, the list
    // still returns with attendance_pct left null rather than failing the
    // whole request over a non-critical column.
    if (result?.data?.length) {
      try {
        const pctByStudent = await attendanceService.getAttendancePercentagesForStudents(
          result.data.map((s) => s.id)
        );
        result.data = result.data.map((s) => ({ ...s, attendance_pct: pctByStudent[s.id] ?? null }));
      } catch (attendanceErr) {
        console.error("[students] attendance % lookup failed:", attendanceErr.message);
        result.data = result.data.map((s) => ({ ...s, attendance_pct: null }));
      }
    }

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

exports.getRejectedStudents = async (req, res) => {
  try {
    const result = await studentService.getRejectedStudents();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
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
    const result = await studentService.createStudent(
    req.body,
    req.files
);
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
            // Convert Google Form / Excel CSV headers into database column names
studentsArray = studentsArray.map((row) => ({
    name: row["Full Name *"]?.trim(),
    email: row["Email Address *"]?.trim(),

    mobile_number: row["Mobile Number"]?.trim(),
    whatsapp_number: row["WhatsApp Number"]?.trim(),
    telegram_number: row["Telegram Number"]?.trim(),

    date_of_birth: row["Date of Birth"]?.trim(),

    tenth_school: row["10th School Name"]?.trim(),
    tenth_score: row["10th Total Score (Marks / Percentage)"]?.trim(),

    class_grade: row["Current Class / Grade (e.g., 12th, NEET, JEE)"]?.trim(),
    school_college: row["Current School / College"]?.trim(),

    subjects: row["Subjects Opted (in School)"]
        ? row["Subjects Opted (in School)"]
            .split(",")
            .map((s) => s.trim())
        : [],

    maths_tuition:
        row["Maths Tuition (Teacher name, days, and timings)"]?.trim(),

    physics_tuition:
        row["Physics Tuition (Teacher name, days, and timings)"]?.trim(),

    other_tuition:
        row["Other Tuition Details (Subject, teacher, days, and timings)"]?.trim(),

    neet_jee_details:
        row["NEET/JEE Details (Institute name and timings)"]?.trim(),

    future_plan:
        row["Future Plan (Post-graduation career goals)"]?.trim(),

    preferred_batch:
        (row["Preferred Batch"] || row["Preferred Batch "])?.trim(),

    learning_mode:
        (row["Learning Mode"] || row["Learning Mode "])?.trim(),

    father_name: row["Father's Full Name"]?.trim(),
    father_mobile: row["Father's Mobile Number"]?.trim(),
    father_whatsapp: row["Father's WhatsApp Number"]?.trim(),
    father_telegram: row["Father's Telegram Number"]?.trim(),
    father_email: row["Father's Email"]?.trim(),
    father_profession: row["Father's Profession"]?.trim(),

    mother_name: row["Mother's Full Name"]?.trim(),
    mother_mobile: row["Mother's Mobile Number"]?.trim(),
    mother_whatsapp: row["Mother's WhatsApp Number"]?.trim(),
    mother_telegram: row["Mother's Telegram Number"]?.trim(),
    mother_email: row["Mother's Email"]?.trim(),
    mother_profession: row["Mother's Profession"]?.trim(),

    address: row["Address (Street and Area)"]?.trim(),
    landmark: row["Landmark"]?.trim(),
    city: row["City"]?.trim(),
    pincode: row["Pincode"]?.trim(),
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


/**
 * GET /api/student/profile?studentId=:userId
 * 
 * Returns the authenticated student's profile information.
 */
exports.getProfilebyUserID = async (req, res) => {
  try {
    const authenticatedUserId = req.user?.id;
    const userRole = req.user?.app_metadata?.role;
    const userEmail = req.user?.email;
    const userMetadata = req.user?.user_metadata;

    console.log("1. User ID from JWT:", authenticatedUserId);
    console.log("2. User role:", userRole);
    console.log("3. Full req.user:", req.user);

    if (!authenticatedUserId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    // Admin / Developer — no student record needed, return admin profile
    if (userRole === "admin" || userRole === "developer" || userRole === "both") {
      return res.status(200).json({
        name: userMetadata?.full_name || userMetadata?.name || "Admin",
        email: userEmail,
        blocked: false,
        avatar: userMetadata?.avatar_url || null,
        role: userRole,
      });
    }

    // Regular student — fetch from students table
    const profile = await studentService.getStudentByUserId(authenticatedUserId);
    console.log("3. Profile returned:", profile);

    if (!profile) {
      return res.status(404).json({ error: "Student profile not found" });
    }

    return res.status(200).json(profile);

  } catch (error) {
    console.log("4. ERROR CAUGHT:", error.message);
    console.log("5. Full error:", error);
    
    if (error.message?.includes("No student profile found")) {
      return res.status(404).json({ error: "Student profile not found" });
    }
    
    return res.status(500).json({ error: "Internal server error" });
  }
};