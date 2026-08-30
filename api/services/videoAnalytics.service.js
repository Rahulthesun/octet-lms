/**
 * services/videoAnalytics.service.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Session-wise watch tracking, drop-off analysis, and a YouTube-style
 * "most replayed" engagement heatmap, on top of the existing
 * video_watch_sessions cumulative-summary table (resume position, total
 * watched seconds, completed flag — untouched here).
 *
 * Every video is normalized into 20 fixed percentage buckets (5% each) so
 * drop-off/heatmap data is directly comparable across videos regardless of
 * their actual duration.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const supabase = require("../config/supabase");

const BUCKET_COUNT = 20;

function notFound(message) {
  return Object.assign(new Error(message), { status: 404 });
}
function forbidden(message = "Forbidden") {
  return Object.assign(new Error(message), { status: 403 });
}

function bucketPct(bucketIndex) {
  return Math.round((bucketIndex / BUCKET_COUNT) * 100);
}
function clampBucket(n) {
  return Math.max(0, Math.min(BUCKET_COUNT - 1, Math.floor(n)));
}
function emptyBuckets() {
  return Array.from({ length: BUCKET_COUNT }, (_, i) => ({ bucketIndex: i, pctPosition: bucketPct(i), hitCount: 0 }));
}

// ─── Student-facing: start / update / end a watch "sitting" ────────────────

async function startWatchEvent({ videoId, userId, positionSecs = 0 }) {
  // Auto-close any previously open event for this (video, user) — covers a
  // crashed tab or closed browser gracefully; its last known update time
  // becomes its effective end.
  const { data: open, error: openErr } = await supabase
    .from("video_watch_events")
    .select("id, updated_at")
    .eq("video_id", videoId)
    .eq("user_id", userId)
    .is("ended_at", null);
  if (openErr) throw openErr;
  for (const row of open || []) {
    await supabase.from("video_watch_events").update({ ended_at: row.updated_at }).eq("id", row.id);
  }

  const { data, error } = await supabase
    .from("video_watch_events")
    .insert({
      video_id: videoId,
      user_id: userId,
      start_position_secs: positionSecs,
      last_position_secs: positionSecs,
      max_position_secs: positionSecs,
    })
    .select()
    .single();
  if (error) throw error;
  return { eventId: data.id };
}

async function _loadOwnedEvent(eventId, userId) {
  const { data, error } = await supabase
    .from("video_watch_events")
    .select("id, video_id, user_id")
    .eq("id", eventId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw notFound("Watch event not found");
  if (data.user_id !== userId) throw forbidden();
  return data;
}

async function _recordBucketHits(event, bucketsPlayed) {
  if (!Array.isArray(bucketsPlayed) || bucketsPlayed.length === 0) return;

  const counts = {};
  for (const b of bucketsPlayed) {
    const idx = clampBucket(Number(b));
    if (Number.isNaN(idx)) continue;
    counts[idx] = (counts[idx] || 0) + 1;
  }

  for (const [bucketIndexStr, addCount] of Object.entries(counts)) {
    const bucketIndex = Number(bucketIndexStr);
    const { data: existing, error: findErr } = await supabase
      .from("video_watch_bucket_hits")
      .select("id, hit_count")
      .eq("event_id", event.id)
      .eq("bucket_index", bucketIndex)
      .maybeSingle();
    if (findErr) throw findErr;

    if (existing) {
      await supabase
        .from("video_watch_bucket_hits")
        .update({ hit_count: existing.hit_count + addCount, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
    } else {
      await supabase.from("video_watch_bucket_hits").insert({
        event_id: event.id,
        video_id: event.video_id,
        user_id: event.user_id,
        bucket_index: bucketIndex,
        hit_count: addCount,
      });
    }
  }
}

async function updateWatchEvent({ eventId, userId, watchedSecs, lastPositionSecs, maxPositionSecs, completed, bucketsPlayed }) {
  const event = await _loadOwnedEvent(eventId, userId);

  const { error } = await supabase
    .from("video_watch_events")
    .update({
      watched_secs: watchedSecs,
      last_position_secs: lastPositionSecs,
      max_position_secs: maxPositionSecs,
      completed: !!completed,
      updated_at: new Date().toISOString(),
    })
    .eq("id", eventId);
  if (error) throw error;

  await _recordBucketHits(event, bucketsPlayed);
}

async function endWatchEvent({ eventId, userId, watchedSecs, lastPositionSecs, maxPositionSecs, completed, bucketsPlayed }) {
  const event = await _loadOwnedEvent(eventId, userId);

  const { error } = await supabase
    .from("video_watch_events")
    .update({
      watched_secs: watchedSecs,
      last_position_secs: lastPositionSecs,
      max_position_secs: maxPositionSecs,
      completed: !!completed,
      ended_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", eventId);
  if (error) throw error;

  await _recordBucketHits(event, bucketsPlayed);
}

// ─── Shared helpers ─────────────────────────────────────────────────────────

async function getVideoWithChapter(videoId) {
  const { data, error } = await supabase
    .from("videos")
    .select("id, title, chapter_id, duration_secs, chapters(id, name, subject_id, subjects(id, name))")
    .eq("id", videoId)
    .maybeSingle();
  if (error) throw error;
  if (!data) throw notFound("Video not found");
  return data;
}

async function getChapterWatchTimeForUser(chapterId, userId) {
  const { data: videos, error } = await supabase.from("videos").select("id").eq("chapter_id", chapterId);
  if (error) throw error;
  const ids = (videos || []).map((v) => v.id);
  if (ids.length === 0) return 0;

  const { data: sessions, error: sErr } = await supabase
    .from("video_watch_sessions")
    .select("watched_secs")
    .in("video_id", ids)
    .eq("user_id", userId);
  if (sErr) throw sErr;
  return (sessions || []).reduce((sum, s) => sum + (s.watched_secs || 0), 0);
}

/** Session-wise + drop-off + heatmap for one (video, user) pair. Shared by
 *  the student's own "Report" view and the admin's per-student view. */
async function buildUserVideoReport(video, userId) {
  const { data: summary } = await supabase
    .from("video_watch_sessions")
    .select("watched_secs, last_position_secs, completed, last_heartbeat_at")
    .eq("video_id", video.id)
    .eq("user_id", userId)
    .maybeSingle();

  const { data: events, error: evErr } = await supabase
    .from("video_watch_events")
    .select("id, started_at, ended_at, watched_secs, start_position_secs, last_position_secs, max_position_secs, completed, updated_at")
    .eq("video_id", video.id)
    .eq("user_id", userId)
    .order("started_at", { ascending: false });
  if (evErr) throw evErr;

  const sessionCount = (events || []).length;
  const durationsSecs = (events || []).map((e) => {
    const endMs = e.ended_at ? new Date(e.ended_at).getTime() : new Date(e.updated_at).getTime();
    return Math.max(0, (endMs - new Date(e.started_at).getTime()) / 1000);
  });
  const avgSessionDurationSecs = durationsSecs.length > 0
    ? Math.round(durationsSecs.reduce((a, b) => a + b, 0) / durationsSecs.length)
    : 0;

  const eventIds = (events || []).map((e) => e.id);
  let bucketRows = [];
  if (eventIds.length > 0) {
    const { data, error } = await supabase
      .from("video_watch_bucket_hits")
      .select("event_id, bucket_index, hit_count")
      .in("event_id", eventIds);
    if (error) throw error;
    bucketRows = data || [];
  }

  const heatmap = emptyBuckets();
  const eventsReachingBucket = Array.from({ length: BUCKET_COUNT }, () => new Set());
  for (const row of bucketRows) {
    heatmap[row.bucket_index].hitCount += row.hit_count;
    eventsReachingBucket[row.bucket_index].add(row.event_id);
  }
  const dropOff = eventsReachingBucket.map((set, i) => ({ bucketIndex: i, pctPosition: bucketPct(i), sessionsReached: set.size }));

  const totalWatchedSecs = summary?.watched_secs || 0;
  const completionPct = video.duration_secs && video.duration_secs > 0
    ? Math.round(((summary?.watched_secs || 0) / video.duration_secs) * 100)
    : null;

  return {
    video: {
      id: video.id,
      title: video.title,
      chapterId: video.chapter_id,
      chapterTitle: video.chapters?.name || null,
      subjectTitle: video.chapters?.subjects?.name || null,
      durationSecs: video.duration_secs,
    },
    sessionCount,
    avgSessionDurationSecs,
    totalWatchedSecs,
    completionPct,
    completed: !!summary?.completed,
    lastPositionSecs: summary?.last_position_secs || 0,
    sessions: (events || []).slice(0, 25).map((e) => ({
      id: e.id,
      startedAt: e.started_at,
      endedAt: e.ended_at,
      watchedSecs: e.watched_secs,
      maxPositionSecs: e.max_position_secs,
      completed: e.completed,
    })),
    dropOff,
    heatmap,
  };
}

// ─── Student-facing report endpoints ────────────────────────────────────────

async function getStudentVideoReport(videoId, userId) {
  const video = await getVideoWithChapter(videoId);
  const report = await buildUserVideoReport(video, userId);
  report.chapterWatchTimeSecs = await getChapterWatchTimeForUser(video.chapter_id, userId);
  return report;
}

/** Every video a user has any watch data for — powers the video picker in
 *  the student's own Report page and the admin's per-student view. */
async function listWatchedVideosForUser(userId) {
  const { data, error } = await supabase
    .from("video_watch_sessions")
    .select("video_id, watched_secs, completed, last_heartbeat_at, videos(id, title, chapter_id, duration_secs, chapters(name, subjects(name)))")
    .eq("user_id", userId)
    .order("last_heartbeat_at", { ascending: false });
  if (error) throw error;

  return (data || [])
    .filter((row) => row.videos)
    .map((row) => ({
      videoId: row.video_id,
      title: row.videos.title,
      chapterId: row.videos.chapter_id,
      chapterTitle: row.videos.chapters?.name || null,
      subjectTitle: row.videos.chapters?.subjects?.name || null,
      durationSecs: row.videos.duration_secs,
      watchedSecs: row.watched_secs,
      completed: row.completed,
      lastWatchedAt: row.last_heartbeat_at,
    }));
}

// ─── Admin-facing: one specific student's video report ─────────────────────

async function _resolveAuthUserId(studentId) {
  const { data, error } = await supabase.from("students").select("auth_user_id, name").eq("id", studentId).maybeSingle();
  if (error) throw error;
  if (!data) throw notFound("Student not found");
  if (!data.auth_user_id) throw notFound("This student has no linked login account yet");
  return data;
}

async function getStudentVideoReportForAdmin(videoId, studentId) {
  const student = await _resolveAuthUserId(studentId);
  const report = await getStudentVideoReport(videoId, student.auth_user_id);
  return { ...report, studentName: student.name };
}

async function listWatchedVideosForStudent(studentId) {
  const student = await _resolveAuthUserId(studentId);
  const videos = await listWatchedVideosForUser(student.auth_user_id);
  return { studentName: student.name, videos };
}

// ─── Admin-facing: full per-video analytics (all students) ─────────────────

async function getVideoAnalyticsFull(videoId) {
  const video = await getVideoWithChapter(videoId);

  const { data: summaries, error: sumErr } = await supabase
    .from("video_watch_sessions")
    .select("user_id, watched_secs, last_position_secs, completed, last_heartbeat_at")
    .eq("video_id", videoId)
    .order("watched_secs", { ascending: false });
  if (sumErr) throw sumErr;

  const { data: events, error: evErr } = await supabase
    .from("video_watch_events")
    .select("id, user_id, started_at, ended_at, watched_secs, updated_at")
    .eq("video_id", videoId);
  if (evErr) throw evErr;

  const eventsByUser = {};
  for (const e of events || []) {
    (eventsByUser[e.user_id] ||= []).push(e);
  }

  const uniqueViewers = summaries.length;
  const completedCount = summaries.filter((s) => s.completed).length;
  const totalWatchedSecs = summaries.reduce((sum, s) => sum + (s.watched_secs || 0), 0);
  const avgWatchedSecs = uniqueViewers > 0 ? Math.round(totalWatchedSecs / uniqueViewers) : 0;
  const avgCompletionPct = video.duration_secs && video.duration_secs > 0
    ? Math.round((avgWatchedSecs / video.duration_secs) * 100)
    : null;

  const allDurations = (events || []).map((e) => {
    const endMs = e.ended_at ? new Date(e.ended_at).getTime() : new Date(e.updated_at).getTime();
    return Math.max(0, (endMs - new Date(e.started_at).getTime()) / 1000);
  });
  const avgSessionDurationSecs = allDurations.length > 0
    ? Math.round(allDurations.reduce((a, b) => a + b, 0) / allDurations.length)
    : 0;

  const eventIds = (events || []).map((e) => e.id);
  let bucketRows = [];
  if (eventIds.length > 0) {
    const { data, error } = await supabase
      .from("video_watch_bucket_hits")
      .select("event_id, bucket_index, hit_count")
      .in("event_id", eventIds);
    if (error) throw error;
    bucketRows = data || [];
  }
  const heatmap = emptyBuckets();
  const eventsReachingBucket = Array.from({ length: BUCKET_COUNT }, () => new Set());
  for (const row of bucketRows) {
    heatmap[row.bucket_index].hitCount += row.hit_count;
    eventsReachingBucket[row.bucket_index].add(row.event_id);
  }
  const dropOff = eventsReachingBucket.map((set, i) => ({ bucketIndex: i, pctPosition: bucketPct(i), sessionsReached: set.size }));

  // Resolve names for the per-student breakdown table.
  const userIds = summaries.map((s) => s.user_id);
  const nameByAuthId = {};
  if (userIds.length > 0) {
    const { data: studentRows } = await supabase
      .from("students")
      .select("auth_user_id, name, admission_number, class_grade, preferred_batch")
      .in("auth_user_id", userIds);
    for (const s of studentRows || []) nameByAuthId[s.auth_user_id] = s;
  }

  const perStudent = summaries.map((s) => {
    const stu = nameByAuthId[s.user_id];
    const userEvents = eventsByUser[s.user_id] || [];
    const durations = userEvents.map((e) => {
      const endMs = e.ended_at ? new Date(e.ended_at).getTime() : new Date(e.updated_at).getTime();
      return Math.max(0, (endMs - new Date(e.started_at).getTime()) / 1000);
    });
    return {
      userId: s.user_id,
      studentName: stu?.name || "Unknown",
      admissionNumber: stu?.admission_number || null,
      grade: stu?.class_grade || null,
      batch: stu?.preferred_batch || null,
      watchedSecs: s.watched_secs,
      lastPositionSecs: s.last_position_secs,
      completed: s.completed,
      sessionCount: userEvents.length,
      avgSessionDurationSecs: durations.length > 0 ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length) : 0,
      lastActivityAt: s.last_heartbeat_at,
    };
  });

  return {
    videoId,
    title: video.title,
    chapterTitle: video.chapters?.name || null,
    subjectTitle: video.chapters?.subjects?.name || null,
    durationSecs: video.duration_secs,
    uniqueViewers,
    completedCount,
    completionRate: uniqueViewers > 0 ? Math.round((completedCount / uniqueViewers) * 100) : 0,
    totalWatchedSecs,
    avgWatchedSecs,
    avgCompletionPct,
    sessionCount: (events || []).length,
    avgSessionDurationSecs,
    dropOff,
    heatmap,
    perStudent,
  };
}

// ─── Admin-facing: batch-wide report ────────────────────────────────────────

async function getBatchVideoReport(batchId) {
  const { data: batch, error: batchErr } = await supabase.from("batches").select("id, name").eq("id", batchId).maybeSingle();
  if (batchErr) throw batchErr;
  if (!batch) throw notFound("Batch not found");

  const { data: enrollments, error: enrErr } = await supabase
    .from("batch_enrollments")
    .select("students(id, name, admission_number, auth_user_id)")
    .eq("batch_id", batchId);
  if (enrErr) throw enrErr;

  const students = (enrollments || []).map((e) => e.students).filter((s) => s && s.auth_user_id);
  const authIds = students.map((s) => s.auth_user_id);

  if (authIds.length === 0) {
    return {
      batch: { id: batch.id, name: batch.name },
      totalStudents: students.length,
      totalWatchedSecs: 0,
      avgWatchedSecsPerStudent: 0,
      avgCompletionPct: null,
      topVideos: [],
      perStudent: [],
    };
  }

  const { data: summaries, error: sumErr } = await supabase
    .from("video_watch_sessions")
    .select("user_id, video_id, watched_secs, completed, videos(title, duration_secs, chapters(name))")
    .in("user_id", authIds);
  if (sumErr) throw sumErr;

  const totalWatchedSecs = (summaries || []).reduce((sum, s) => sum + (s.watched_secs || 0), 0);

  const byVideo = {};
  for (const s of summaries || []) {
    if (!s.videos) continue;
    const key = s.video_id;
    if (!byVideo[key]) {
      byVideo[key] = {
        videoId: key,
        title: s.videos.title,
        chapterTitle: s.videos.chapters?.name || null,
        durationSecs: s.videos.duration_secs,
        totalWatchedSecs: 0,
        uniqueViewers: 0,
        completedCount: 0,
      };
    }
    byVideo[key].totalWatchedSecs += s.watched_secs || 0;
    byVideo[key].uniqueViewers += 1;
    if (s.completed) byVideo[key].completedCount += 1;
  }
  const topVideos = Object.values(byVideo)
    .map((v) => ({
      ...v,
      avgCompletionPct: v.durationSecs > 0 && v.uniqueViewers > 0
        ? Math.round((v.totalWatchedSecs / v.uniqueViewers / v.durationSecs) * 100)
        : null,
    }))
    .sort((a, b) => b.totalWatchedSecs - a.totalWatchedSecs)
    .slice(0, 15);

  const byUser = {};
  for (const s of summaries || []) {
    (byUser[s.user_id] ||= { watchedSecs: 0, videos: 0, completed: 0, completionSum: 0 });
    byUser[s.user_id].watchedSecs += s.watched_secs || 0;
    byUser[s.user_id].videos += 1;
    if (s.completed) byUser[s.user_id].completed += 1;
    if (s.videos?.duration_secs > 0) {
      byUser[s.user_id].completionSum += Math.min(100, Math.round(((s.watched_secs || 0) / s.videos.duration_secs) * 100));
    }
  }

  const perStudent = students.map((stu) => {
    const agg = byUser[stu.auth_user_id];
    return {
      studentId: stu.id,
      name: stu.name,
      admissionNumber: stu.admission_number,
      totalWatchedSecs: agg?.watchedSecs || 0,
      videosWatchedCount: agg?.videos || 0,
      avgCompletionPct: agg && agg.videos > 0 ? Math.round(agg.completionSum / agg.videos) : null,
    };
  }).sort((a, b) => b.totalWatchedSecs - a.totalWatchedSecs);

  const withData = perStudent.filter((s) => s.videosWatchedCount > 0);
  const avgCompletionPct = withData.length > 0
    ? Math.round(withData.reduce((sum, s) => sum + (s.avgCompletionPct || 0), 0) / withData.length)
    : null;

  return {
    batch: { id: batch.id, name: batch.name },
    totalStudents: students.length,
    totalWatchedSecs,
    avgWatchedSecsPerStudent: students.length > 0 ? Math.round(totalWatchedSecs / students.length) : 0,
    avgCompletionPct,
    topVideos,
    perStudent,
  };
}

module.exports = {
  BUCKET_COUNT,
  startWatchEvent,
  updateWatchEvent,
  endWatchEvent,
  getStudentVideoReport,
  listWatchedVideosForUser,
  getStudentVideoReportForAdmin,
  listWatchedVideosForStudent,
  getVideoAnalyticsFull,
  getBatchVideoReport,
};
