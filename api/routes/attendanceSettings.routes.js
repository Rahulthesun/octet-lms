/**
 * routes/attendanceSettings.routes.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Mounted at /api/attendance-settings in server.js. Admin-only.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/attendanceSettings.controller");
const { verifyToken, requireRole } = require("../middleware/auth");

const adminOnly = requireRole(["admin", "developer"]);

router.get("/", verifyToken, adminOnly, ctrl.get);
router.patch("/", verifyToken, adminOnly, ctrl.update);

module.exports = router;
