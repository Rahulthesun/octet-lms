/**
 * routes/student.routes.js
 * ─────────────────────────────────────────────────────────────
 * Defines all routes for student management (admission, approval,
 * profile updates, bulk import, etc.)
 *
 * Mounted at: /api/students  (see server.js)
 * ─────────────────────────────────────────────────────────────
 */

const express = require("express");
const router = express.Router();
const studentController = require("../controllers/students.controller");

//FOR BULK IMPORT CSV UPLOAD
const multer = require('multer');
const { verifyToken } = require("../middleware/auth");
const upload = multer({ storage: multer.memoryStorage() });


// ======================== Student CRUD ========================

// GET    /api/students          → list all students (with filters: batch, mode, status, search)
router.get("/", studentController.getAllStudents);

// GET    /api/students/pending  → list all students with status = 'PENDING'
router.get("/pending", studentController.getPendingStudents);

// GET /api/student/profile?studentId=:userId
router.get("/profile", verifyToken ,  studentController.getProfilebyUserID);

// GET    /api/students/:id      → get a single student by ID
router.get("/:id", studentController.getStudentById);

//CREATE + UPDATE + DELETE OPERATIONS (admin only)

// POST   /api/students          → create a new student application (direct, not via form)
router.post("/", studentController.createStudent);

// PUT    /api/students/:id      → update an existing student (admin only)
router.put("/:id", studentController.updateStudent);

// DELETE /api/students/:id      → delete a student (and optionally their auth user)
router.delete("/:id", studentController.deleteStudent);

// ======================== Bulk Operations ========================

// POST   /api/students/bulk-import   → import a list of pre‑approved students
// Request body: { students: [...] }
router.post("/bulk-import", upload.single('file'), studentController.bulkImport);

// ======================== Approval Flow ========================

// POST   /api/students/:id/approve   → approve a pending student (creates auth user, sends email)
router.post("/:id/approve", studentController.approveStudent);

// POST   /api/students/:id/reject    → reject a pending student (with optional reason)
router.post("/:id/reject", studentController.rejectStudent);

// ======================== Additional Utilities ========================

// GET    /api/students/batch/:batchId   → list students by batch (MORNING/EVENING/NIGHT)
router.get("/batch/:batchId", studentController.getStudentsByBatch);

// GET    /api/students/stats/dashboard  → get dashboard statistics (total, pending, batch counts, etc.)
router.get("/stats/dashboard", studentController.getDashboardStats);


module.exports = router;

