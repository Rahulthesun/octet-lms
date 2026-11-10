/**
 * routes/feedback.routes.js
 * ─────────────────────────────────────────────────────────────
 * Mounted at: /api/feedback
 *
 *  Students (any signed-in user):
 *    POST   /                     submit Bug / Suggestion / General (+ rating)
 *
 *  Public (no login — landing page footer "Parent's Feedback"):
 *    POST   /parents              submit a parent review (rate limited per IP)
 *
 *  Admin:
 *    GET    /                     all student feedback with name/batch/grade
 *    PATCH  /:id                  { status: "new" | "reviewed" }
 *    DELETE /:id
 *    GET    /parents              all parent feedback
 *    PATCH  /parents/:id          { status }
 *    DELETE /parents/:id
 * ─────────────────────────────────────────────────────────────
 */

const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/feedback.controller");
const { verifyToken, requireRole } = require("../middleware/auth");
const { parentFeedbackLimiter } = require("../middleware/rateLimit");

const adminOnly = requireRole(["admin"]);

// ─── Parents (public submit, admin manage) ──────────────────────────────────
router.post("/parents", parentFeedbackLimiter, ctrl.createParent);
router.get("/parents", verifyToken, adminOnly, ctrl.listParent);
router.patch("/parents/:id", verifyToken, adminOnly, ctrl.setParentStatus);
router.delete("/parents/:id", verifyToken, adminOnly, ctrl.deleteParent);

// ─── Students ───────────────────────────────────────────────────────────────
router.post("/", verifyToken, ctrl.createStudent);
router.get("/", verifyToken, adminOnly, ctrl.listStudent);
router.patch("/:id", verifyToken, adminOnly, ctrl.setStudentStatus);
router.delete("/:id", verifyToken, adminOnly, ctrl.deleteStudent);

module.exports = router;
