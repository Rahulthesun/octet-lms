/**
 * routes/storage.routes.js
 * ─────────────────────────────────────────────────────────────
 * Routes for storage analytics and usage reporting.
 *
 * Mounted at: /api/storage  (see server.js)
 * ─────────────────────────────────────────────────────────────
 */

const express = require("express");
const router  = express.Router();
const storageController = require("../controllers/storage.controller");

// GET  /api/storage/usage          → total storage used (bytes, counts)
router.get("/usage", storageController.getStorageUsage);

// GET  /api/storage/content-stats  → breakdown by type, subject, user
router.get("/content-stats", storageController.getContentStats);

module.exports = router;