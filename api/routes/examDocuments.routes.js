/**
 * routes/examDocuments.routes.js
 * ─────────────────────────────────────────────────────────────
 * Mounted at: /api/exam-documents
 *
 * Admin: manage exam events, open the hall-ticket / results windows,
 * see the per-student tracking table.
 * Student (/me/*): see what is asked of them and upload via presigned R2
 * URLs — the file bytes never pass through this server.
 * ─────────────────────────────────────────────────────────────
 */

const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/examDocuments.controller");
const { verifyToken, requireRole } = require("../middleware/auth");

const adminOnly = requireRole(["admin", "developer"]);

// ─── Student (any authenticated student; ownership enforced in the service) ───
router.get("/me/events", verifyToken, ctrl.myEvents);
router.get("/me/pending", verifyToken, ctrl.myPending);
router.get("/me/events/:id", verifyToken, ctrl.myEvent);
router.post("/me/events/:id/marksheet/manual", verifyToken, ctrl.manualMarks);
router.post("/me/events/:id/:kind/upload-url", verifyToken, ctrl.uploadUrl);
router.post("/me/events/:id/:kind/confirm", verifyToken, ctrl.confirmUpload);

// ─── Admin ────────────────────────────────────────────────────────────────────
router.get("/events", verifyToken, adminOnly, ctrl.listEvents);
router.post("/events", verifyToken, adminOnly, ctrl.createEvent);
router.put("/events/:id", verifyToken, adminOnly, ctrl.updateEvent);
router.post("/events/:id/open-hall-ticket", verifyToken, adminOnly, ctrl.openHallTicket);
router.post("/events/:id/open-results", verifyToken, adminOnly, ctrl.openResults);
router.get("/events/:id/tracking", verifyToken, adminOnly, ctrl.tracking);

module.exports = router;
