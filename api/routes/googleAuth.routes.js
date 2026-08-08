/**
 * routes/googleAuth.routes.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Mounted at /api/google in server.js. Admin-only — students never connect
 * a Google account; the admin's connection is the organizer for every class.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/googleAuth.controller");
const { verifyToken, requireRole } = require("../middleware/auth");

const adminOnly = requireRole(["admin", "developer"]);

router.get("/connect-url", verifyToken, adminOnly, ctrl.getConnectUrl);

// Google redirects the browser here directly (no Authorization header
// possible) — identity is recovered from the signed `state` param instead.
router.get("/callback", ctrl.callback);

router.get("/status", verifyToken, adminOnly, ctrl.status);
router.post("/disconnect", verifyToken, adminOnly, ctrl.disconnect);

module.exports = router;
