/**
 * controllers/video.controller.js
 * ─────────────────────────────────────────────────────────────
 * Handles video upload, metadata, and streaming.
 *
 * Key concept — video streaming:
 *  Unlike a regular file download, video streaming sends the file
 *  in chunks so the browser can start playing before the full
 *  download finishes. This requires:
 *
 *  1. Reading the Range header from the request
 *     (the browser says "give me bytes 0–999999")
 *  2. Responding with status 206 Partial Content (not 200)
 *  3. Setting Content-Range and Accept-Ranges headers
 *  4. Piping just that byte range from the file/storage
 *
 *  The streamVideo handler below shows the skeleton for this.
 * ─────────────────────────────────────────────────────────────
 */

const videoService = require("../services/video.service");

/**
 * POST /api/content/video/upload
 *
 * Expects: multipart/form-data
 *   file fields  : video file + thumbnail image
 *   body fields  : title, subtopicId, duration, isVisible
 *
 * duration: ideally extracted server-side using ffprobe (fluent-ffmpeg)
 * thumbnail: can be auto-generated from a video frame or uploaded manually
 */
const uploadVideo = async (req, res) => {
  try {
    const { title, subtopicId, isVisible } = req.body;

    if (!title || !subtopicId) {
      return res.status(400).json({ error: "title and subtopicId are required" });
    }

    // req.files (plural) when using multer's .fields() – lets you
    // accept multiple named file inputs in one request
    const videoFile     = req.files?.video?.[0];
    const thumbnailFile = req.files?.thumbnail?.[0];

    const newVideo = await videoService.createVideo({
      title,
      subtopicId,
      isVisible,
      videoFile,
      thumbnailFile,
    });

    res.status(201).json(newVideo);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/content/video
 * Returns all videos, optionally filtered by query params.
 */
const getAllVideos = async (req, res) => {
  try {
    const filters = req.query;
    const videos = await videoService.getAllVideos(filters);
    res.status(200).json(videos);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * GET /api/content/video/:id
 * Returns video metadata (NOT the video file itself – use /stream for that).
 */
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

/**
 * GET /api/content/video/:id/stream
 *
 * Streams the video file to the browser with Range support.
 *
 * How HTTP Range requests work:
 *  → Browser sends:  Range: bytes=0-999999
 *  ← Server replies: 206 Partial Content
 *                    Content-Range: bytes 0-999999/5000000
 *                    (the file chunk)
 *
 *  This lets the browser seek, pause, and buffer efficiently.
 *  Without Range support, seeking would require re-downloading
 *  the entire video from the start.
 */
const streamVideo = async (req, res) => {
  try {
    const { id } = req.params;
    const video = await videoService.getVideoById(id);

    if (!video) return res.status(404).json({ error: "Video not found" });

    // TODO: add access control check here
    // e.g. verify JWT token, check if user has permission to view

    const fileSize = video.sizeBytes; // total bytes of the video file
    const range    = req.headers.range; // e.g. "bytes=0-1000000"

    if (!range) {
      // If no Range header, the client wants the whole file.
      // Fine for small files, but for large videos prefer range.
      return res.status(400).json({ error: "Range header required for video streaming" });
    }

    // Parse range string: "bytes=START-END"
    const [startStr, endStr] = range.replace(/bytes=/, "").split("-");
    const start = parseInt(startStr, 10);
    // If no end specified, send up to 1MB chunk at a time
    const end   = endStr ? parseInt(endStr, 10) : Math.min(start + 1024 * 1024, fileSize - 1);
    const chunkSize = end - start + 1;

    // Set response headers for partial content
    res.writeHead(206, {
      "Content-Range":  `bytes ${start}-${end}/${fileSize}`,
      "Accept-Ranges":  "bytes",
      "Content-Length": chunkSize,
      "Content-Type":   "video/mp4", // adjust based on actual mime type
    });

    // TODO: pipe the actual file stream from your storage solution
    // e.g. from local disk:
    //   const fileStream = fs.createReadStream(video.filePath, { start, end });
    //   fileStream.pipe(res);
    // or from S3:
    //   const s3Stream = s3.getObject({ Bucket, Key, Range: `bytes=${start}-${end}` }).createReadStream();
    //   s3Stream.pipe(res);

    res.end(); // placeholder – remove when you plug in real streaming
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * PUT /api/content/video/:id
 * Update video metadata: title, visibility, thumbnail, etc.
 */
const updateVideo = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const updated = await videoService.updateVideo(id, updates);
    if (!updated) return res.status(404).json({ error: "Video not found" });
    res.status(200).json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * DELETE /api/content/video/:id
 * Removes video record + file from storage.
 */
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

module.exports = {
  uploadVideo,
  getAllVideos,
  getVideoById,
  streamVideo,
  updateVideo,
  deleteVideo,
};