/**
 * routes/progressReports.routes.js
 * ─────────────────────────────────────────────────────────────
 * Mounted at: /api/progress-reports — admin only.
 * ─────────────────────────────────────────────────────────────
 */

const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/progressReports.controller");
const { verifyToken, requireRole } = require("../middleware/auth");

const adminOnly = requireRole(["admin"]);

// GET /api/progress-reports/students/:studentId/pdf?year=YYYY → 12-month progress report PDF
router.get("/students/:studentId/pdf", verifyToken, adminOnly, ctrl.downloadStudentProgressReportPdf);

module.exports = router;
