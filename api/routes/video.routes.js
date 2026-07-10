/**
 * routes/video.routes.js
 * ─────────────────────────────────────────────────────────────
 * Mounted at: /api/content/video  (server.js)
 *
 * Add this line to server.js:
 *   const videoRoutes = require("./routes/video.routes");
 *   app.use("/api/content/video", videoRoutes);
 *
 * ── Multer storage decision ──────────────────────────────────
 * PDFs use memoryStorage (file.buffer) — fine, PDFs are small.
 * Videos use diskStorage (file.path)   — mandatory.
 *
 * Why: a 500MB lecture video loaded into memoryStorage on a 256MB
 * Fly.io instance will OOM-kill the process. diskStorage writes to
 * the OS temp dir (/tmp on Fly.io), then the service streams from
 * there directly to R2. Peak RAM usage stays in the KB range.
 *
 * ── Route ordering ───────────────────────────────────────────
 * Express matches routes top-to-bottom. Exact sub-paths like
 * /chapter/:chapterId and /:id/stream must be defined BEFORE /:id
 * or Express will try to match "chapter" or "stream" as a video UUID.
 * ─────────────────────────────────────────────────────────────
 */

const express = require("express");
const multer  = require("multer");
const path    = require("path");
const os      = require("os");

const router = express.Router();
const videoController = require("../controllers/video.controller");
const { verifyToken, requireRole } = require("../middleware/auth");

// ─────────────────────────────────────────────────────────────
// Multer: disk storage
// ─────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, os.tmpdir()),
  filename: (_req, file, cb) => {
    // Unique name to avoid collisions if two uploads run concurrently
    const uid = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${uid}${path.extname(file.originalname).toLowerCase()}`);
  },
});

const upload = multer({
  storage,
  // 4 GB hard ceiling — Fly.io /tmp has room, and lecture recordings
  // realistically top out around 2 GB even at 1080p.
  limits: { fileSize: 4 * 1024 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase().slice(1);
    const videoTypes = ["mp4", "webm", "mkv", "mov", "avi"];
    const imageTypes = ["jpg", "jpeg", "png", "webp"];

    if (file.fieldname === "video" && videoTypes.includes(ext))
      return cb(null, true);
    if (file.fieldname === "thumbnail" && imageTypes.includes(ext))
      return cb(null, true);

    cb(new Error(`Unsupported file type for field "${file.fieldname}": .${ext}`));
  },
});

// Accept one video file + one optional thumbnail in a single request
const uploadFields = upload.fields([
  { name: "video",     maxCount: 1 },
  { name: "thumbnail", maxCount: 1 },
]);

const ADMIN_ROLES = ["admin", "developer"];

// ─────────────────────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────────────────────

// POST  /api/content/video/upload
// Admin only — uploads video (+ optional thumbnail) to R2
router.post( "/upload",
  verifyToken,
  requireRole(ADMIN_ROLES),
  uploadFields,
  videoController.uploadVideo
);

// GET   /api/content/video
// Admin only — list all videos across all chapters
router.get("/",
  verifyToken,
  requireRole(ADMIN_ROLES),
  videoController.getAllVideos
);

// ── Sub-path routes BEFORE /:id ───────────────────────────────
// These must come first or Express matches "chapter"/"stream"/etc
// as a video UUID and routes to the wrong handler.

// GET   /api/content/video/chapter/:chapterId
// Any authenticated user — used by useContentTree.loadChapterContent
router.get(
  "/chapter/:chapterId",
  verifyToken,
  videoController.getVideosByChapterId
);

// GET   /api/content/video/:id/stream
// Any authenticated user — returns { url, expiresIn }, NO bytes through Express
router.get("/:id/stream",
  verifyToken,
  videoController.streamVideo
);

// GET   /api/content/video/:id/session
// Any authenticated user — returns student's resume position for this video
router.get("/:id/session",
  verifyToken,
  videoController.getWatchSession
);

// POST  /api/content/video/:id/heartbeat
// Any authenticated user — upserts watch progress, called every ~15s by player
router.post("/:id/heartbeat",
  verifyToken,
  videoController.heartbeat
);

// GET   /api/content/video/:id/analytics
// Admin only — per-video engagement stats for the dashboard
router.get("/:id/analytics",
  verifyToken,
  requireRole(ADMIN_ROLES),
  videoController.getVideoAnalytics
);

// ── Generic /:id routes LAST ──────────────────────────────────

// GET   /api/content/video/:id
// Any authenticated user — video metadata + signed URLs
router.get("/:id", verifyToken, videoController.getVideoById);

// PUT   /api/content/video/:id
// Admin only — update title, visibility, chapter, duration
router.put("/:id",
  verifyToken,
  requireRole(ADMIN_ROLES),
  videoController.updateVideo
);

// DELETE /api/content/video/:id
// Admin only — deletes from R2 (video + thumbnail) then Supabase
router.delete("/:id",
  verifyToken,
  requireRole(ADMIN_ROLES),
  videoController.deleteVideo
);

module.exports = router;