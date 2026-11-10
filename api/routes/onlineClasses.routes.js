/**
 * routes/onlineClasses.routes.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Mounted at /api/online-classes in server.js.
 *
 * Admin-only scheduling permissions; students can only ever read their own
 * upcoming classes (GET /me/upcoming), never anyone else's list, never write.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/onlineClasses.controller");
const { verifyToken, requireRole } = require("../middleware/auth");

const adminOnly = requireRole(["admin"]);

// ─── Admin ──────────────────────────────────────────────────────────────────

router.post("/", verifyToken, adminOnly, ctrl.schedule);
router.get("/", verifyToken, adminOnly, ctrl.listAdmin);
router.get("/:classId", verifyToken, adminOnly, ctrl.getOne);
router.patch("/:classId", verifyToken, adminOnly, ctrl.reschedule);
router.post("/:classId/cancel", verifyToken, adminOnly, ctrl.cancel);
router.post("/:classId/sync-attendance", verifyToken, adminOnly, ctrl.syncAttendance);
router.get("/:classId/attendance", verifyToken, adminOnly, ctrl.getAttendance);

// ─── Student self-service ───────────────────────────────────────────────────

router.get("/me/upcoming", verifyToken, ctrl.listMine);

// ─── Likes & comments (students who can see the class, and admins) ──────────

router.get("/:classId/engagement", verifyToken, ctrl.getEngagement);
router.post("/:classId/like", verifyToken, ctrl.toggleLike);
router.post("/:classId/comments", verifyToken, ctrl.addComment);
router.delete("/:classId/comments/:commentId", verifyToken, ctrl.deleteComment);

module.exports = router;
