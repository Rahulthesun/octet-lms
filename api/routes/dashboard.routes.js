/**
 * routes/dashboard.routes.js
 * ─────────────────────────────────────────────────────────────
 * Mounted at: /api/dashboard
 * ─────────────────────────────────────────────────────────────
 */

const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/dashboard.controller");
const { verifyToken, requireRole } = require("../middleware/auth");

const adminOnly = requireRole(["admin", "developer"]);

// GET /api/dashboard/admin — admin/developer only
router.get("/admin", verifyToken, adminOnly, ctrl.getAdminOverview);

// GET /api/dashboard/me — the logged-in student's own overview
router.get("/me", verifyToken, ctrl.getMyOverview);

module.exports = router;
