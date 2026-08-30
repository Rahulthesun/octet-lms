/**
 * controllers/video.controller.js
 * ─────────────────────────────────────────────────────────────
 * All video handlers. Thin layer — validation + service call only.
 * No business logic here, no R2/DB calls directly.
 *
 * Endpoints summary:
 *  POST   /upload              → admin: upload new video
 *  GET    /                    → admin: list all videos
 *  GET    /chapter/:chapterId  → auth: list videos for a chapter
 *  GET    /:id                 → auth: video metadata
 *  GET    /:id/stream          → auth: presigned URL (no bytes through Express)
 *  GET    /:id/session         → auth: student's resume position
 *  POST   /:id/heartbeat       → auth: upsert watch progress (called every ~15s)
 *  GET    /:id/analytics       → admin: per-video engagement stats
 *  PUT    /:id                 → admin: update metadata
 *  DELETE /:id                 → admin: delete video + R2 files
 * ─────────────────────────────────────────────────────────────
 */

const videoService = require("../services/video.service");
const videoAnalyticsService = require("../services/videoAnalytics.service");

// ─────────────────────────────────────────────────────────────
// uploadVideo
// ─────────────────────────────────────────────────────────────
const uploadVideo = async (req, res) => {
  try {
    const { title, chapterId, isVisible } = req.body;

    if (!title || !chapterId) {
      return res
        .status(400)
        .json({ error: "title and chapterId are required" });
    }

    const videoFile = req.files?.video?.[0];
    const thumbnailFile = req.files?.thumbnail?.[0];

    if (!videoFile) {
      return res.status(400).json({ error: "Video file is required" });
    }

    const newVideo = await videoService.createVideo({
      title,
      chapterId,
      // isVisible comes in as a form string ("true"/"false") from multipart
      isVisible:
        isVisible !== undefined
          ? isVisible === "true" || isVisible === true
          : true,
      uploadedBy: req.user.id,
      videoFile,
      thumbnailFile,
    });

    res.status(201).json(newVideo);
  } catch (err) {
    console.error("uploadVideo error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// getAllVideos
// ─────────────────────────────────────────────────────────────
const getAllVideos = async (req, res) => {
  try {
    const videos = await videoService.getAllVideos(req.query);
    res.status(200).json(videos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// getVideosByChapterId
// ─────────────────────────────────────────────────────────────
const getVideosByChapterId = async (req, res) => {
  try {
    const { chapterId } = req.params;
    const videos = await videoService.getVideosByChapterId(chapterId);
    res.status(200).json(videos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// getVideoById
// ─────────────────────────────────────────────────────────────
const getVideoById = async (req, res) => {
  try {
    const { id } = req.params;
    const video = await videoService.getVideoById(id);
    if (!video) return res.status(404).json({ error: "Video not found" });
    res.status(200).json(video);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// streamVideo
// ─────────────────────────────────────────────────────────────
/**
 * Returns { url, expiresIn } — a short-lived presigned R2 URL.
 *
 * The client sets <video src={url}> and the browser makes range
 * requests directly to R2. Zero video bytes touch Express.
 * The server's only cost per view is this one auth + presign call.
 *
 * Client should call this on player mount (not cache across sessions).
 * URL TTL is 10 minutes — enough for buffering, short enough to deter sharing.
 */
const streamVideo = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await videoService.getVideoStreamUrl(id);
    res.status(200).json(result);
  } catch (err) {
    if (err.message === "VIDEO_NOT_FOUND")
      return res.status(404).json({ error: "Video not found" });
    if (err.message === "VIDEO_NOT_VISIBLE")
      return res.status(403).json({ error: "Video is not available" });
    res.status(500).json({ error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// updateVideo
// ─────────────────────────────────────────────────────────────
const updateVideo = async (req, res) => {
  try {
    const { id } = req.params;
    const updated = await videoService.updateVideo(id, req.body);
    if (!updated) return res.status(404).json({ error: "Video not found" });
    res.status(200).json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// deleteVideo
// ─────────────────────────────────────────────────────────────
const deleteVideo = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await videoService.deleteVideo(id);
    if (!deleted) return res.status(404).json({ error: "Video not found" });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// heartbeat
// ─────────────────────────────────────────────────────────────
/**
 * Called by the video player every ~15 seconds while a student watches.
 * Also fires on pause and on page unload (navigator.sendBeacon).
 *
 * Body (JSON):
 *  watchedSecs       {number} — cumulative unique seconds watched so far
 *                               (client tracks this; scrubbing back doesn't
 *                                re-count already-watched segments)
 *  lastPositionSecs  {number} — current playback cursor (for resume)
 *  completed         {boolean} — true if student crossed the 90% mark
 *
 * Response is intentionally minimal — the client doesn't need the
 * full session object back, just confirmation the write succeeded.
 */
const heartbeat = async (req, res) => {
  try {
    const { id: videoId } = req.params;
    const userId = req.user.id;
    const {
      watchedSecs = 0,
      lastPositionSecs = 0,
      completed = false,
    } = req.body;

    await videoService.upsertWatchSession({
      videoId,
      userId,
      watchedSecs: Math.max(0, parseInt(watchedSecs, 10) || 0),
      lastPositionSecs: Math.max(0, parseInt(lastPositionSecs, 10) || 0),
      completed: Boolean(completed),
    });

    // 204 — success, no body needed. Keeps the response tiny for a
    // route that fires every 15 seconds from every active student.
    res.status(204).send();
  } catch (err) {
    // Don't let a failed heartbeat crash the player — log and swallow.
    console.error("heartbeat error:", err.message);
    res.status(500).json({ error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// getWatchSession
// ─────────────────────────────────────────────────────────────
/**
 * Returns the student's existing watch session for a video.
 * Called on player mount to restore resume position.
 *
 * If no session exists (first time watching), returns zeroed defaults
 * so the client doesn't need to handle null.
 */
const getWatchSession = async (req, res) => {
  try {
    const { id: videoId } = req.params;
    const userId = req.user.id;

    const session = await videoService.getWatchSession(videoId, userId);

    // Return zeroed defaults if no session exists yet
    res.status(200).json(
      session ?? {
        video_id: videoId,
        user_id: userId,
        watched_secs: 0,
        last_position_secs: 0,
        completed: false,
      }
    );
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// getVideoAnalytics
// ─────────────────────────────────────────────────────────────
/**
 * Admin-only: per-video engagement breakdown.
 * Powers the analytics dashboard cards and per-student table.
 */
const getVideoAnalytics = async (req, res) => {
  try {
    const { id: videoId } = req.params;
    const analytics = await videoService.getVideoAnalytics(videoId);
    res.status(200).json(analytics);
  } catch (err) {
    if (err.message === "VIDEO_NOT_FOUND")
      return res.status(404).json({ error: "Video not found" });
    res.status(500).json({ error: err.message });
  }
};

// ─────────────────────────────────────────────────────────────
// startWatchEvent / updateWatchEvent / endWatchEvent
// ─────────────────────────────────────────────────────────────
/**
 * A "watch event" is one discrete sitting of watching a video — separate
 * from the cumulative video_watch_sessions summary above. These three
 * endpoints are what power session-wise analytics, drop-off analysis, and
 * the engagement heatmap; they run alongside the existing heartbeat, not
 * instead of it.
 */
const startWatchEvent = async (req, res) => {
  try {
    const { id: videoId } = req.params;
    const { positionSecs = 0 } = req.body;
    const result = await videoAnalyticsService.startWatchEvent({
      videoId,
      userId: req.user.id,
      positionSecs: Math.max(0, Number(positionSecs) || 0),
    });
    res.status(201).json(result);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

const updateWatchEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { watchedSecs = 0, lastPositionSecs = 0, maxPositionSecs = 0, completed = false, bucketsPlayed = [] } = req.body;
    await videoAnalyticsService.updateWatchEvent({
      eventId,
      userId: req.user.id,
      watchedSecs: Math.max(0, Number(watchedSecs) || 0),
      lastPositionSecs: Math.max(0, Number(lastPositionSecs) || 0),
      maxPositionSecs: Math.max(0, Number(maxPositionSecs) || 0),
      completed: Boolean(completed),
      bucketsPlayed,
    });
    res.status(204).send();
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
};

const endWatchEvent = async (req, res) => {
  try {
    const { eventId } = req.params;
    const { watchedSecs = 0, lastPositionSecs = 0, maxPositionSecs = 0, completed = false, bucketsPlayed = [] } = req.body;
    await videoAnalyticsService.endWatchEvent({
      eventId,
      userId: req.user.id,
      watchedSecs: Math.max(0, Number(watchedSecs) || 0),
      lastPositionSecs: Math.max(0, Number(lastPositionSecs) || 0),
      maxPositionSecs: Math.max(0, Number(maxPositionSecs) || 0),
      completed: Boolean(completed),
      bucketsPlayed,
    });
    res.status(204).send();
  } catch (err) {
    // Fires from beforeunload via fetch(keepalive) — never worth a loud
    // error, the next session-start will auto-close this one anyway.
    res.status(err.status || 500).json({ error: err.message });
  }
};

module.exports = {
  uploadVideo,
  getAllVideos,
  getVideosByChapterId,
  getVideoById,
  streamVideo,
  updateVideo,
  deleteVideo,
  heartbeat,
  getWatchSession,
  getVideoAnalytics,
  startWatchEvent,
  updateWatchEvent,
  endWatchEvent,
};