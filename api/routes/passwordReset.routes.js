/**
 * routes/passwordReset.routes.js
 * ─────────────────────────────────────────────────────────────
 * Mounted at: /api/auth
 *
 * Deliberately public — whoever is using these has, by definition, lost
 * access to their account and cannot carry a Bearer token. Enumeration and
 * abuse are guarded inside the service (generic responses, per-email rate
 * limit, single-use time-limited tokens), not by requiring login here.
 * ─────────────────────────────────────────────────────────────
 */

const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/passwordReset.controller");

// POST /api/auth/forgot-password        — request a reset link by email
router.post("/forgot-password", ctrl.requestReset);

// GET  /api/auth/reset-password/validate — lets the reset page confirm the link before showing the form
router.get("/reset-password/validate", ctrl.validateToken);

// POST /api/auth/reset-password          — set the new password
router.post("/reset-password", ctrl.resetPassword);

module.exports = router;
