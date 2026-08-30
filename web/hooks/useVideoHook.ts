import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { getSession } from "../lib/auth";

// ── Types ──────────────────────────────────────────────────────
interface Subject { id: string; name: string; }
interface Chapter { id: string; name: string; }

interface RawVideo {
  id: string;
  chapter_id: string;
  title: string;
  filename: string;
  r2_key: string;
  thumbnail_key?: string;
  thumbnailUrl?: string;
  mime_type?: string;
  size_bytes: number;
  duration_secs?: number;
  created_at?: string;
}

// Shape matches lib/mockData's VideoTopic/VideoChapter/VideoSubject exactly,
// so page.tsx's rendering logic doesn't need to change — only the data source does.
export interface VideoTopic {
  id: string;
  title: string;
  duration: string; // formatted "MM:SS"
  watched: boolean;
  raw: RawVideo;
}
export interface VideoChapter {
  id: string;
  title: string;
  topics: VideoTopic[];
}
export interface VideoSubject {
  id: string;
  title: string;
  chapters: VideoChapter[];
}

// Field names match the real video_watch_sessions row / zeroed-default
// shape the backend actually returns (video.controller.js::getWatchSession)
// — watched_secs / last_position_secs / completed, not position_secs.
export interface WatchSession {
  watched_secs: number;
  last_position_secs: number;
  completed: boolean;
}

type ChaptersMap = Record<string, Chapter[]>;
type VideosMap = Record<string, RawVideo[]>;
type WatchedMap = Record<string, boolean>;

function getMsg(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object") {
    const r = payload as Record<string, unknown>;
    if (typeof r.error === "string" && r.error.trim()) return r.error;
    if (typeof r.message === "string" && r.message.trim()) return r.message;
  }
  return fallback;
}

function toArray<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") {
    const r = payload as Record<string, unknown>;
    if (Array.isArray(r.data)) return r.data as T[];
    if (Array.isArray(r.subjects)) return r.subjects as T[];
    if (Array.isArray(r.chapters)) return r.chapters as T[];
    if (Array.isArray(r.videos)) return r.videos as T[];
  }
  return [];
}

function formatDuration(secs?: number): string {
  if (!secs || secs <= 0) return "0:00";
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

async function authHeader(): Promise<Record<string, string>> {
  const session = await getSession();
  const token = session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function useVideoHook() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chaptersMap, setChaptersMap] = useState<ChaptersMap>({});
  const [videosMap, setVideosMap] = useState<VideosMap>({});
  const [watchedMap, setWatchedMap] = useState<WatchedMap>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const BASE = process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:8000";

  // presigned URL cache: videoId -> { url, expiresAt }
  const streamCache = useRef<Record<string, { url: string; expiresAt: number }>>({});

  // ── Initial load: subjects + chapters (no PDFs, no videos yet) ─
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const headers = await authHeader();
        const res = await fetch(`${BASE}/api/subjects/`, { headers });
        const data = await res.json();
        if (!res.ok) throw new Error(getMsg(data, "Failed to load subjects"));

        const subjectsList = toArray<Subject>(data);
        if (cancelled) return;
        setSubjects(subjectsList);
        setError(null);

        const results = await Promise.all(
          subjectsList.map(async (s) => {
            try {
              const r = await fetch(`${BASE}/api/chapters/subject/${s.id}`, { headers });
              const d = await r.json();
              return { subjectId: s.id, chapters: r.ok ? toArray<Chapter>(d) : [] };
            } catch {
              return { subjectId: s.id, chapters: [] as Chapter[] };
            }
          }),
        );
        if (cancelled) return;
        const map: ChaptersMap = {};
        for (const { subjectId, chapters } of results) map[subjectId] = chapters;
        setChaptersMap(map);
      } catch (e) {
        if (!cancelled) {
          setSubjects([]);
          setError(e instanceof Error ? e.message : "Failed to load subjects");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [BASE]);

  // ── Lazy-load videos for a chapter, plus per-video "watched" existence check ─
  const loadChapterVideos = useCallback(
    async (chapterId: string) => {
      if (videosMap[chapterId] !== undefined) return; // already loaded
      const headers = await authHeader();
      try {
        const res = await fetch(`${BASE}/api/content/video/chapter/${chapterId}`, { headers });
        const data = await res.json();
        const vids = res.ok ? toArray<RawVideo>(data) : [];
        setVideosMap((prev) => ({ ...prev, [chapterId]: vids }));

        // Watched = a session row exists for this video/student.
        // NOTE: assumes GET /:id/session returns 404 (or empty/null) when no
        // session exists yet, and a truthy object when one does. Confirm against
        // video.controller.js — if it 200s with an empty shell instead of 404,
        // this will mis-flag every video as watched.
        const checks = await Promise.all(
          vids.map(async (v) => {
            try {
              const r = await fetch(`${BASE}/api/content/video/${v.id}/session`, { headers });
              if (r.status === 404) return { id: v.id, watched: false };
              if (!r.ok) return { id: v.id, watched: false };
              const d = await r.json();
              const exists = d && typeof d === "object" && Object.keys(d).length > 0;
              return { id: v.id, watched: Boolean(exists) };
            } catch {
              return { id: v.id, watched: false };
            }
          }),
        );
        setWatchedMap((prev) => {
          const next = { ...prev };
          for (const c of checks) next[c.id] = c.watched;
          return next;
        });
      } catch {
        setVideosMap((prev) => ({ ...prev, [chapterId]: [] }));
      }
    },
    [BASE, videosMap],
  );

  // ── Presigned stream URL (short-lived, cached until near-expiry) ─
  const getStreamUrl = useCallback(
    async (videoId: string): Promise<string | null> => {
      const cached = streamCache.current[videoId];
      if (cached && cached.expiresAt > Date.now() + 5000) return cached.url;

      const headers = await authHeader();
      try {
        const res = await fetch(`${BASE}/api/content/video/${videoId}/stream`, { headers });
        const data = await res.json();
        if (!res.ok) throw new Error(getMsg(data, "Failed to get stream URL"));
        // Assumes { url, expiresIn } per video.service.js streamVideo() contract.
        const url: string = data.url;
        const expiresIn: number = data.expiresIn ?? 300;
        streamCache.current[videoId] = { url, expiresAt: Date.now() + expiresIn * 1000 };
        return url;
      } catch (e) {
        console.error("Failed to get stream URL:", e);
        return null;
      }
    },
    [BASE],
  );

  // ── Resume position / session lookup for the player ──
  // Field names match the real video_watch_sessions row / zeroed-default
  // shape the backend actually returns (video.controller.js::getWatchSession)
  // — watched_secs / last_position_secs / completed, not position_secs.
  const getWatchSession = useCallback(
    async (videoId: string): Promise<WatchSession | null> => {
      const headers = await authHeader();
      try {
        const res = await fetch(`${BASE}/api/content/video/${videoId}/session`, { headers });
        if (res.status === 404) return null;
        if (!res.ok) return null;
        const data = await res.json();
        return data && typeof data === "object" ? data : null;
      } catch {
        return null;
      }
    },
    [BASE],
  );

  // ── Heartbeat: reports cumulative watch progress for the resume point /
  // "watched" flag / completed threshold. keepalive:true so it survives
  // beforeunload/tab-close (sendBeacon can't carry the Bearer header this
  // route needs, so we use fetch with keepalive instead — that's the
  // honest tradeoff, not a true sendBeacon). ──
  const sendHeartbeat = useCallback(
    async (videoId: string, progress: { watchedSecs: number; lastPositionSecs: number; completed: boolean }) => {
      const headers = await authHeader();
      try {
        await fetch(`${BASE}/api/content/video/${videoId}/heartbeat`, {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          keepalive: true,
          body: JSON.stringify({
            watchedSecs: Math.floor(progress.watchedSecs),
            lastPositionSecs: Math.floor(progress.lastPositionSecs),
            completed: progress.completed,
          }),
        });
        setWatchedMap((prev) => ({ ...prev, [videoId]: true }));
      } catch {
        // best-effort; a missed heartbeat isn't worth surfacing to the student
      }
    },
    [BASE],
  );

  // ── Watch-event lifecycle: session-wise/drop-off/heatmap tracking ──
  // Runs alongside sendHeartbeat above, not instead of it.
  const startWatchEvent = useCallback(
    async (videoId: string, positionSecs: number): Promise<string | null> => {
      const headers = await authHeader();
      try {
        const res = await fetch(`${BASE}/api/content/video/${videoId}/watch-events/start`, {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          body: JSON.stringify({ positionSecs: Math.floor(positionSecs) }),
        });
        if (!res.ok) return null;
        const data = await res.json();
        return data?.eventId ?? null;
      } catch {
        return null;
      }
    },
    [BASE],
  );

  interface WatchEventProgress {
    watchedSecs: number;
    lastPositionSecs: number;
    maxPositionSecs: number;
    completed: boolean;
    bucketsPlayed: number[];
  }

  const updateWatchEvent = useCallback(
    async (videoId: string, eventId: string, progress: WatchEventProgress) => {
      const headers = await authHeader();
      try {
        await fetch(`${BASE}/api/content/video/${videoId}/watch-events/${eventId}`, {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          keepalive: true,
          body: JSON.stringify(progress),
        });
      } catch {
        // best-effort
      }
    },
    [BASE],
  );

  const endWatchEvent = useCallback(
    async (videoId: string, eventId: string, progress: WatchEventProgress) => {
      const headers = await authHeader();
      try {
        await fetch(`${BASE}/api/content/video/${videoId}/watch-events/${eventId}/end`, {
          method: "POST",
          headers: { ...headers, "Content-Type": "application/json" },
          keepalive: true,
          body: JSON.stringify(progress),
        });
      } catch {
        // best-effort
      }
    },
    [BASE],
  );

  // ── Computed tree matching the old mockData shape ─
  const videoSubjects: VideoSubject[] = useMemo(
    () =>
      subjects.map((s) => ({
        id: s.id,
        title: s.name,
        chapters: (chaptersMap[s.id] ?? []).map((c) => ({
          id: c.id,
          title: c.name,
          topics: (videosMap[c.id] ?? []).map((v) => ({
            id: v.id,
            title: v.title,
            duration: formatDuration(v.duration_secs),
            watched: Boolean(watchedMap[v.id]),
            raw: v,
          })),
        })),
      })),
    [subjects, chaptersMap, videosMap, watchedMap],
  );

  return {
    videoSubjects,
    loading,
    error,
    loadChapterVideos,
    getStreamUrl,
    getWatchSession,
    sendHeartbeat,
    startWatchEvent,
    updateWatchEvent,
    endWatchEvent,
  };
}