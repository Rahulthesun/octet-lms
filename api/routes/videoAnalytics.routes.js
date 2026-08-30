/**
 * routes/videoAnalytics.routes.js
 * ─────────────────────────────────────────────────────────────
 * Mounted at: /api/video-analytics
 *
 * Student routes are self-scoped (authenticated user's own data only,
 * enforced inside the service layer); everything about another student or
 * a batch is admin/developer-only.
 * ─────────────────────────────────────────────────────────────
 */

const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/videoAnalytics.controller");
const { verifyToken, requireRole } = require("../middleware/auth");

const adminOnly = requireRole(["admin", "developer"]);

// GET /api/video-analytics/me/watched          — every video I have watch data for
router.get("/me/watched", verifyToken, ctrl.getMyWatchedVideos);

// GET /api/video-analytics/videos/:videoId/me  — my own session/drop-off/heatmap report for one video
router.get("/videos/:videoId/me", verifyToken, ctrl.getMyVideoReport);

// GET /api/video-analytics/videos/:videoId     — admin: full report across every student
router.get("/videos/:videoId", verifyToken, adminOnly, ctrl.getVideoReportAdmin);

// GET /api/video-analytics/students/:studentId/watched            — admin: one student's watched-videos list
router.get("/students/:studentId/watched", verifyToken, adminOnly, ctrl.getStudentWatchedVideosAdmin);

// GET /api/video-analytics/students/:studentId/videos/:videoId    — admin: one student's report for one video
router.get("/students/:studentId/videos/:videoId", verifyToken, adminOnly, ctrl.getStudentVideoReportAdmin);

// GET /api/video-analytics/batches/:batchId    — admin: batch-wide report
router.get("/batches/:batchId", verifyToken, adminOnly, ctrl.getBatchVideoReport);

module.exports = router;
