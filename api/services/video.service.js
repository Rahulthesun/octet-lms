/**
 * services/video.service.js
 * ─────────────────────────────────────────────────────────────
 * Mirrors pdf.service.js conventions exactly:
 *  - Same R2 client (../config/r2) and bucket env var
 *  - Same Supabase client (../config/supabase)
 *  - Same presigned URL pattern (GetObjectCommand + getSignedUrl)
 *
 * KEY DIFFERENCE from PDF service:
 *  PDFs use multer memoryStorage → file.buffer → PutObjectCommand(Body: buffer)
 *  Videos use multer diskStorage → file.path  → PutObjectCommand(Body: readStream)
 *
 *  Why: lecture videos are 200MB–2GB. Loading them into the 256MB
 *  Fly.io container RAM via memoryStorage = OOM crash under any load.
 *  Disk storage writes to /tmp first, we stream from there to R2,
 *  then delete the temp file. Peak RAM usage is a few KB of stream
 *  buffers regardless of video size.
 *
 * SCHEMA NOTE:
 *  The `videos` DB table uses `chapter_id` (legacy name for chapter).
 *  The frontend useContentTree hook expects `chapter_id` in the Video type.
 *  Every response from this service maps chapter_id → chapter_id so the
 *  frontend works without a DB rename. Do not spread raw DB rows to clients.
 * ─────────────────────────────────────────────────────────────
 */

const {
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");

const supabase = require("../config/supabase");
const r2 = require("../config/r2");
const notificationsService = require("./notifications.service");

const BUCKET = process.env.R2_BUCKET_NAME;

// ─────────────────────────────────────────────────────────────
// INTERNAL HELPERS
// ─────────────────────────────────────────────────────────────

/**
 * Generate a presigned GET URL for any R2 key.
 * Default TTL: 1 hour (matches pdf.service.js).
 * streamVideo uses a shorter 10-minute TTL — passed explicitly.
 */
const presign = async (r2Key, expiresIn = 3600) => {
  const command = new GetObjectCommand({ Bucket: BUCKET, Key: r2Key });
  return getSignedUrl(r2, command, { expiresIn });
};

/**
 * Upload a file from disk to R2 using a read stream.
 * `file` is a multer diskStorage file object:
 *   file.path         → temp path on disk (e.g. /tmp/1234567890-abc.mp4)
 *   file.originalname → original filename
 *   file.mimetype     → e.g. "video/mp4"
 *   file.size         → bytes (required by AWS SDK when Body is a stream)
 *
 * ContentLength is mandatory for stream uploads — without it the SDK
 * can't set the Content-Length header and the upload will fail or hang.
 */
const uploadTempFileTor2 = async (file, r2Key) => {
  const stream = fs.createReadStream(file.path);
  try {
    await r2.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: r2Key,
        Body: stream,
        ContentType: file.mimetype,
        ContentLength: file.size, // required for stream uploads
      })
    );
  } finally {
    // Always delete the temp file, whether upload succeeded or failed.
    // fs.unlink is fire-and-forget here — a leftover temp file is not
    // a correctness problem, just disk waste.
    fs.unlink(file.path, () => {});
  }
};

/**
 * Normalize a raw DB video row for API responses.
 * - Adds chapter_id alias (maps from chapter_id)
 * - Attaches fresh presigned signedUrl and thumbnailUrl
 * - Removes the raw chapter_id so the client only sees chapter_id
 */
const formatVideo = async (row, urlTtl = 3600) => {
  const { chapter_id, thumbnail_key, r2_key, ...rest } = row;
  return {
    ...rest,
    r2_key,           // keep for internal use, frontend ignores it
    chapter_id: chapter_id,
    signedUrl: await presign(r2_key, urlTtl),
    thumbnailUrl: thumbnail_key ? await presign(thumbnail_key, urlTtl) : null,
  };
};

// ─────────────────────────────────────────────────────────────
// createVideo
// ─────────────────────────────────────────────────────────────
/**
 * Uploads video (and optional thumbnail) to R2, then saves
 * metadata to Supabase. Returns the full record + signedUrl.
 *
 * `videoFile` and `thumbnailFile` are multer diskStorage objects
 * (have .path, .size, .mimetype — NOT .buffer).
 */
const createVideo = async ({
  title,
  chapterId,
  isVisible = true,
  uploadedBy,
  videoFile,
  thumbnailFile,
}) => {
  if (!videoFile) throw new Error("No video file provided");

  const videoExt = videoFile.originalname.split(".").pop();
  const videoR2Key = `videos/${uuidv4()}.${videoExt}`;

  // ── 1. Upload video to R2 ────────────────────────────────
  await uploadTempFileTor2(videoFile, videoR2Key);

  // ── 2. Upload thumbnail if provided (non-fatal on failure) ──
  let thumbnailKey = null;
  if (thumbnailFile) {
    const thumbExt = thumbnailFile.originalname.split(".").pop();
    thumbnailKey = `thumbnails/${uuidv4()}.${thumbExt}`;
    try {
      await uploadTempFileTor2(thumbnailFile, thumbnailKey);
    } catch (thumbErr) {
      console.error("Thumbnail upload failed (non-fatal):", thumbErr.message);
      thumbnailKey = null;
    }
  }

  // ── 3. Save metadata to Supabase ────────────────────────
  // DB column is chapter_id — we receive chapterId from the API.
  const { data, error } = await supabase
    .from("videos")
    .insert({
      title,
      chapter_id: chapterId,
      filename: videoFile.originalname,
      r2_key: videoR2Key,
      thumbnail_key: thumbnailKey,
      mime_type: videoFile.mimetype,
      size_bytes: videoFile.size,
      uploaded_by: uploadedBy || null,
      is_visible: isVisible,
    })
    .select()
    .single();

  if (error) {
    // DB insert failed — delete the R2 objects we just created
    // so we don't accumulate orphaned files in the bucket.
    await r2
      .send(new DeleteObjectCommand({ Bucket: BUCKET, Key: videoR2Key }))
      .catch(() => {});
    if (thumbnailKey) {
      await r2
        .send(new DeleteObjectCommand({ Bucket: BUCKET, Key: thumbnailKey }))
        .catch(() => {});
    }
    throw new Error(error.message);
  }

  if (data.is_visible) {
    _notifyVideoUploaded(data).catch((err) => console.error("video_uploaded notification failed:", err.message));
  }

  return formatVideo(data);
};

/** Notifies every approved student in the video's grade (via chapter -> subject -> grade). Best-effort — a notification failure never undoes a successful upload. */
async function _notifyVideoUploaded(video) {
  const { data: chapter } = await supabase
    .from("chapters")
    .select("name, subjects(name, grade)")
    .eq("id", video.chapter_id)
    .maybeSingle();
  if (!chapter?.subjects?.grade) return;

  await notificationsService.createNotification({
    type: "video_uploaded",
    title: `New video: ${video.title}`,
    body: `A new lesson "${video.title}" was added to ${chapter.subjects.name} > ${chapter.name}.`,
    link: "/student/courses",
    gradeFilter: chapter.subjects.grade,
    createdBy: video.uploaded_by || null,
  });
}

// ─────────────────────────────────────────────────────────────
// getAllVideos
// ─────────────────────────────────────────────────────────────
const getAllVideos = async (filters = {}) => {
  let query = supabase
    .from("videos")
    .select("*")
    .order("created_at", { ascending: false });

  if (filters.chapterId) query = query.eq("chapter_id", filters.chapterId);
  if (filters.isVisible !== undefined)
    query = query.eq("is_visible", filters.isVisible === "true");

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return Promise.all(data.map((row) => formatVideo(row)));
};

// ─────────────────────────────────────────────────────────────
// getVideosByChapterId
// ─────────────────────────────────────────────────────────────
const getVideosByChapterId = async (chapterId) => {
  const { data, error } = await supabase
    .from("videos")
    .select("*")
    .eq("chapter_id", chapterId)
    .eq("is_visible", true)
    .order("created_at", { ascending: true });

  if (error?.code === "PGRST116") return [];
  if (error) throw new Error(error.message);

  return Promise.all(data.map((row) => formatVideo(row)));
};

// ─────────────────────────────────────────────────────────────
// getVideoById
// ─────────────────────────────────────────────────────────────
const getVideoById = async (id) => {
  const { data, error } = await supabase
    .from("videos")
    .select("*")
    .eq("id", id)
    .single();

  if (error?.code === "PGRST116") return null;
  if (error) throw new Error(error.message);

  return formatVideo(data);
};

// ─────────────────────────────────────────────────────────────
// getVideoStreamUrl
// ─────────────────────────────────────────────────────────────
/**
 * Returns a short-lived presigned URL for the video file.
 * The <video> element points its src directly at this URL.
 * Zero bytes flow through Express — R2 handles all range requests.
 *
 * TTL is 10 minutes (600s) so:
 *  - Students can't copy/share the URL and have it work long-term
 *  - The player has enough time to buffer without re-fetching
 *
 * The client should call this endpoint fresh on each player mount,
 * not cache the URL across sessions.
 */
const getVideoStreamUrl = async (id) => {
  const { data, error } = await supabase
    .from("videos")
    .select("r2_key, is_visible, title")
    .eq("id", id)
    .single();

  if (error?.code === "PGRST116" || !data) throw new Error("VIDEO_NOT_FOUND");
  if (error) throw new Error(error.message);
  if (!data.is_visible) throw new Error("VIDEO_NOT_VISIBLE");

  const url = await presign(data.r2_key, 600);
  return { url, expiresIn: 600 };
};

// ─────────────────────────────────────────────────────────────
// updateVideo
// ─────────────────────────────────────────────────────────────
const updateVideo = async (id, updates) => {
  const allowed = {};
  if (updates.title !== undefined) allowed.title = updates.title;
  if (updates.isVisible !== undefined) allowed.is_visible = updates.isVisible;
  if (updates.chapterId !== undefined) allowed.chapter_id = updates.chapterId;
  if (updates.durationSecs !== undefined)
    allowed.duration_secs = updates.durationSecs;
  allowed.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("videos")
    .update(allowed)
    .eq("id", id)
    .select()
    .single();

  if (error?.code === "PGRST116") return null;
  if (error) throw new Error(error.message);

  return formatVideo(data);
};

// ─────────────────────────────────────────────────────────────
// deleteVideo
// ─────────────────────────────────────────────────────────────
/**
 * Delete order: R2 video → R2 thumbnail → Supabase row.
 * If the DB delete fails after R2 deletes, the files are gone
 * but the row remains — an admin can clean it up manually.
 * The reverse (row deleted, files remain) is harder to recover from.
 */
const deleteVideo = async (id) => {
  const { data: video, error: fetchError } = await supabase
    .from("videos")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError?.code === "PGRST116") return null;
  if (fetchError) throw new Error(fetchError.message);

  await r2
    .send(new DeleteObjectCommand({ Bucket: BUCKET, Key: video.r2_key }))
    .catch((err) => console.error("R2 video delete failed:", err.message));

  if (video.thumbnail_key) {
    await r2
      .send(
        new DeleteObjectCommand({ Bucket: BUCKET, Key: video.thumbnail_key })
      )
      .catch((err) =>
        console.error("R2 thumbnail delete failed:", err.message)
      );
  }

  const { error: deleteError } = await supabase
    .from("videos")
    .delete()
    .eq("id", id);

  if (deleteError) throw new Error(deleteError.message);

  return video;
};

// ─────────────────────────────────────────────────────────────
// upsertWatchSession
// ─────────────────────────────────────────────────────────────
/**
 * Called by the heartbeat endpoint every ~15s while a student watches.
 * One row per (video_id, user_id) — updated in-place on every ping.
 *
 * watchedSecs:       cumulative unique seconds the student has watched
 *                    (client tracks this — scrubbing back doesn't add to it)
 * lastPositionSecs:  current playback cursor — used to restore resume point
 * completed:         true once the student has watched past 90% of duration
 *
 * Design: one upsert per 15s per student = ~240 writes/hr at full load
 * for 60 concurrent students. Negligible on Supabase's free tier.
 */
const upsertWatchSession = async ({
  videoId,
  userId,
  watchedSecs,
  lastPositionSecs,
  completed,
}) => {
  const { data, error } = await supabase
    .from("video_watch_sessions")
    .upsert(
      {
        video_id: videoId,
        user_id: userId,
        watched_secs: watchedSecs,
        last_position_secs: lastPositionSecs,
        completed,
        last_heartbeat_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "video_id,user_id" }
    )
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};

// ─────────────────────────────────────────────────────────────
// getWatchSession
// ─────────────────────────────────────────────────────────────
/**
 * Returns a student's existing session for a video.
 * Used to restore resume position when they open a video they've
 * partially watched. Returns null if no session exists yet.
 */
const getWatchSession = async (videoId, userId) => {
  const { data, error } = await supabase
    .from("video_watch_sessions")
    .select("*")
    .eq("video_id", videoId)
    .eq("user_id", userId)
    .single();

  if (error?.code === "PGRST116") return null;
  if (error) throw new Error(error.message);
  return data;
};

// ─────────────────────────────────────────────────────────────
// getVideoAnalytics
// ─────────────────────────────────────────────────────────────
/**
 * Aggregate engagement stats for a single video.
 * Used by the admin analytics dashboard.
 *
 * Returns:
 *  uniqueViewers      — number of students who watched anything
 *  completedCount     — students who crossed the 90% threshold
 *  completionRate     — completedCount / uniqueViewers as a percentage
 *  totalWatchedSecs   — sum of all students' watched_secs
 *  avgWatchedSecs     — average watched_secs per student
 *  avgCompletionPct   — avgWatchedSecs / duration_secs as a percentage
 *  sessions           — full per-student breakdown for the dashboard table
 */
const getVideoAnalytics = async (videoId) => {
  const { data: video, error: videoError } = await supabase
    .from("videos")
    .select("id, title, duration_secs")
    .eq("id", videoId)
    .single();

  if (videoError?.code === "PGRST116") throw new Error("VIDEO_NOT_FOUND");
  if (videoError) throw new Error(videoError.message);

  const { data: sessions, error: sessError } = await supabase
    .from("video_watch_sessions")
    .select("user_id, watched_secs, last_position_secs, completed, last_heartbeat_at, updated_at")
    .eq("video_id", videoId)
    .order("watched_secs", { ascending: false });

  if (sessError) throw new Error(sessError.message);

  const uniqueViewers = sessions.length;
  const completedCount = sessions.filter((s) => s.completed).length;
  const totalWatchedSecs = sessions.reduce(
    (sum, s) => sum + (s.watched_secs || 0),
    0
  );
  const avgWatchedSecs =
    uniqueViewers > 0 ? Math.round(totalWatchedSecs / uniqueViewers) : 0;
  const avgCompletionPct =
    video.duration_secs && video.duration_secs > 0
      ? Math.round((avgWatchedSecs / video.duration_secs) * 100)
      : null;

  return {
    videoId,
    title: video.title,
    durationSecs: video.duration_secs,
    uniqueViewers,
    completedCount,
    completionRate:
      uniqueViewers > 0
        ? Math.round((completedCount / uniqueViewers) * 100)
        : 0,
    totalWatchedSecs,
    avgWatchedSecs,
    avgCompletionPct,
    sessions,
  };
};

module.exports = {
  createVideo,
  getAllVideos,
  getVideosByChapterId,
  getVideoById,
  getVideoStreamUrl,
  updateVideo,
  deleteVideo,
  upsertWatchSession,
  getWatchSession,
  getVideoAnalytics,
};