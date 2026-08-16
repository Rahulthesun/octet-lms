/**
 * routes/student.routes.js
 * ─────────────────────────────────────────────────────────────
 * Defines all routes for student management (admission, approval,
 * profile updates, bulk import, etc.)
 *
 * Mounted at: /api/students  (see server.js)
 *
 * Only POST / (the public admission form) is unauthenticated — a
 * prospective student has no account yet when they submit it. Every other
 * route here deals with existing students' full PII (name, email, mobile,
 * parent details, address, uploaded documents) or admin actions on their
 * accounts (approve/reject/block/delete), so all of it is admin/developer
 * only, except GET /profile which is a student's own self-service lookup.
 * ─────────────────────────────────────────────────────────────
 */

const express = require("express");
const router = express.Router();
const studentController = require("../controllers/students.controller");

//FOR BULK IMPORT CSV UPLOAD
const multer = require('multer');
const { verifyToken, requireRole } = require("../middleware/auth");
const upload = multer({ storage: multer.memoryStorage() });

const adminOnly = requireRole(["admin", "developer"]);

// ======================== Student CRUD ========================

// GET    /api/students          → list all students (with filters: batch, mode, status, search) — admin only
router.get("/", verifyToken, adminOnly, studentController.getAllStudents);

// GET    /api/students/pending  → list all students with status = 'PENDING' — admin only
router.get("/pending", verifyToken, adminOnly, studentController.getPendingStudents);

// GET    /api/students/rejected → list all students with status = 'REJECTED' — admin only
router.get("/rejected", verifyToken, adminOnly, studentController.getRejectedStudents);

// GET /api/students/profile — the logged-in student's OWN profile (self-service)
router.get("/profile", verifyToken, studentController.getProfilebyUserID);


// GET    /api/students/:id      → get a single student by ID — admin only
router.get("/:id", verifyToken, adminOnly, studentController.getStudentById);

//CREATE + UPDATE + DELETE OPERATIONS

// POST   /api/students          → create a new student application (the public
// admission form — intentionally unauthenticated, this is how prospective
// students without an account yet submit their application)
router.post(
    "/",
    upload.fields([
        {
            name: "id_card",
            maxCount: 1,
        },
        {
            name: "marksheet",
            maxCount: 1,
        },
    ]),
    studentController.createStudent
);

// PUT    /api/students/:id      → update an existing student (admin only)
router.put("/:id", verifyToken, adminOnly, studentController.updateStudent);

// DELETE /api/students/:id      → delete a student (and optionally their auth user) — admin only
router.delete("/:id", verifyToken, adminOnly, studentController.deleteStudent);

// ======================== Bulk Operations ========================

// POST   /api/students/bulk-import   → import a list of pre‑approved students — admin only
// Request body: { students: [...] }
router.post("/bulk-import", verifyToken, adminOnly, upload.single('file'), studentController.bulkImport);

// ======================== Approval Flow ========================

// POST   /api/students/:id/approve   → approve a pending student (creates auth user, sends email) — admin only
router.post("/:id/approve", verifyToken, adminOnly, studentController.approveStudent);

// POST   /api/students/:id/reject    → reject a pending student (with optional reason) — admin only
router.post("/:id/reject", verifyToken, adminOnly, studentController.rejectStudent);

// ======================== Additional Utilities ========================

// GET    /api/students/batch/:batchId   → list students by batch (MORNING/EVENING/NIGHT) — admin only
router.get("/batch/:batchId", verifyToken, adminOnly, studentController.getStudentsByBatch);

// GET    /api/students/stats/dashboard  → get dashboard statistics (total, pending, batch counts, etc.) — admin only
router.get("/stats/dashboard", verifyToken, adminOnly, studentController.getDashboardStats);


module.exports = router;
