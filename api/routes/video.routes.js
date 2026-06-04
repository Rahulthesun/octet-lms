/**
 * routes/video.routes.js
 * ─────────────────────────────────────────────────────────────
 * Routes for video upload, streaming, and management.
 *
 * Mounted at: /api/content/video  (see server.js)
 * ─────────────────────────────────────────────────────────────
 */

const express = require("express");
const router  = express.Router();
const videoController = require("../controllers/video.controller");

// POST   /api/content/video/upload   → upload a new video
router.post("/upload", videoController.uploadVideo);

// GET    /api/content/video          → list all videos
router.get("/", videoController.getAllVideos);

// GET    /api/content/video/:id      → get video metadata
router.get("/:id", videoController.getVideoById);

// GET    /api/content/video/:id/stream → stream the video
// Kept as a separate route because streaming needs different
// response logic (Range headers, chunked transfer, etc.)
router.get("/:id/stream", videoController.streamVideo);

// PUT    /api/content/video/:id      → update video metadata
router.put("/:id", videoController.updateVideo);

// DELETE /api/content/video/:id      → delete a video
router.delete("/:id", videoController.deleteVideo);

module.exports = router;