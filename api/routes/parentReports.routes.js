/**
 * routes/parentReports.routes.js
 * ─────────────────────────────────────────────────────────────
 * Mounted at: /api/parent-reports — admin/developer only. Manual controls
 * over a system that otherwise runs entirely on its own schedulers.
 * ─────────────────────────────────────────────────────────────
 */

const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/parentReports.controller");
const { verifyToken, requireRole } = require("../middleware/auth");

const adminOnly = requireRole(["admin", "developer"]);

router.post("/students/:studentId/send", verifyToken, adminOnly, ctrl.sendForStudent);
router.post("/run-monthly", verifyToken, adminOnly, ctrl.runMonthly);
router.post("/sessions/:sessionId/notify-absentees", verifyToken, adminOnly, ctrl.notifyAbsentees);
router.get("/log", verifyToken, adminOnly, ctrl.getLog);

module.exports = router;
