/**
 * routes/googleIdentity.routes.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Mounted at /api/google-identity in server.js. Open to any authenticated
 * student (or admin/both) — everyone links their OWN identity only; the
 * service layer always resolves the target student from the caller's own
 * JWT, never from a body/param the caller could tamper with.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/googleIdentity.controller");
const { verifyToken } = require("../middleware/auth");

router.get("/connect-url", verifyToken, ctrl.getConnectUrl);

// Google redirects the browser here directly (no Authorization header
// possible) — identity is recovered from the signed `state` param instead.
router.get("/callback", ctrl.callback);

router.get("/status", verifyToken, ctrl.status);
router.post("/unlink", verifyToken, ctrl.unlink);

module.exports = router;
