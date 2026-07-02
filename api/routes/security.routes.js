/**
 * routes/security.routes.js
 * Mounted at:
 *   /api/watermark  → watermark token
 *   /api/security-log → incident logging
 */

const express = require("express");
const router  = express.Router();
const ctrl    = require("../controllers/security.controller");
const { verifyToken , requireRole} = require("../middleware/auth");

// GET  /api/security/watermark/token
router.get("/watermark/token", verifyToken, ctrl.getWatermarkToken);

// POST /api/security/watermark/lookup — admin looks up a watermark token
router.post(
  "/watermark/lookup",
  verifyToken,
  requireRole(["admin", "developer"]),
  ctrl.lookupWatermark
);

// POST /api/security/security-log  (called from PdfViewer — verifyToken is best-effort)
// We still run verifyToken so we can attach user_id, but the client
// fires this without waiting for the response, so don't enforce hard failures.
router.post("/security-log", verifyToken, ctrl.logSecurityEvent);

module.exports = router;