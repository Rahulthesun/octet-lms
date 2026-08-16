/**
 * routes/storage.routes.js
 * ─────────────────────────────────────────────────────────────
 * Routes for storage analytics and usage reporting. Admin only —
 * aggregate storage figures aren't needed by the student side.
 *
 * Mounted at: /api/storage  (see server.js)
 * ─────────────────────────────────────────────────────────────
 */

const express = require("express");
const router  = express.Router();
const storageController = require("../controllers/storage.controller");
const { verifyToken, requireRole } = require("../middleware/auth");

const adminOnly = requireRole(["admin", "developer"]);

// GET  /api/storage/usage          → total storage used (bytes, counts)
router.get("/usage", verifyToken, adminOnly, storageController.getStorageUsage);

// GET  /api/storage/content-stats  → breakdown by type, subject, user
router.get("/content-stats", verifyToken, adminOnly, storageController.getContentStats);

module.exports = router;
