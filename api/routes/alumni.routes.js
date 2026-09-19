/**
 * routes/alumni.routes.js
 * ─────────────────────────────────────────────────────────────
 * Mounted at: /api/alumni
 *
 * Admin only. Current students can never reach any of this — the whole
 * router sits behind verifyToken + adminOnly.
 * ─────────────────────────────────────────────────────────────
 */

const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/alumni.controller");
const { verifyToken, requireRole } = require("../middleware/auth");

const adminOnly = requireRole(["admin", "developer"]);

router.use(verifyToken, adminOnly);

// GET  /api/alumni?search=&batch=&year=&limit=&offset=
router.get("/", ctrl.list);

// GET  /api/alumni/filters  — distinct batch years / batches for the filter dropdowns
router.get("/filters", ctrl.filters);

// POST /api/alumni/run-archive — run the archive job on demand (also runs on a schedule)
router.post("/run-archive", ctrl.runArchive);

// GET  /api/alumni/:id — full record (profile, contacts, attendance, tests, documents)
router.get("/:id", ctrl.get);

// POST /api/alumni/:id/restore — clear graduation date and re-activate
router.post("/:id/restore", ctrl.restore);

module.exports = router;
