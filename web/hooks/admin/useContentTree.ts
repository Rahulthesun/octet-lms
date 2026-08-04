import { getSession } from "@/lib/auth";
import { useState, useEffect, useCallback } from "react";

// Add these type definitions at the top of the file
interface Subject {
  id: string;
  name: string;
}

interface Chapter {
  id: string;
  name: string;
}

interface Pdf {
  id: string;
  chapter_id: string;
  title: string;
  filename: string;
  r2_key: string;
  mime_type?: string;
  size_bytes: number;
  created_at?: string;
}
interface Video {
  id: string;
  chapter_id: string;
  title: string;
  filename: string;
  r2_key: string;
  thumbnail_key?: string;
  thumbnailUrl?: string;
  signedUrl?: string;
  mime_type?: string;
  size_bytes: number;
  duration_secs?: number;
  created_at?: string;
}

interface Storage {
  totalBytes: number;
  totalPdfs: number;
  totalVideos: number;
  totalPdfBytes: number;
  totalVideoBytes: number;
}

// Type for the maps
type ChaptersMap = Record<string, Chapter[]>;
type PdfsMap = Record<string, Pdf[]>;
type VideosMap = Record<string, Video[]>;

type ArrayResponse<T> =
  | T[]
  | {
      data?: unknown;
      subjects?: unknown;
      chapters?: unknown;
      error?: string;
      message?: string;
    };

function getResponseMessage(payload: unknown, fallback: string) {
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    if (typeof record.error === "string" && record.error.trim())
      return record.error;
    if (typeof record.message === "string" && record.message.trim())
      return record.message;
  }
  return fallback;
}

function toArray<T>(payload: ArrayResponse<T>): T[] {
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    if (Array.isArray(record.data)) return record.data as T[];
    if (Array.isArray(record.subjects)) return record.subjects as T[];
    if (Array.isArray(record.chapters)) return record.chapters as T[];
  }
  return [];
}

// Define-once auth header helper — only the video routes require this today.
async function authHeaders(): Promise<Record<string, string>> {
  const session = await getSession();
  return session?.access_token
    ? { Authorization: `Bearer ${session.access_token}` }
    : {};
}

export function useContentTree(autoLoadChapters = true) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chaptersMap, setChaptersMap] = useState<ChaptersMap>({});
  const [pdfsMap, setPdfsMap] = useState<PdfsMap>({});
  const [videosMap, setVideosMap] = useState<VideosMap>({});
  const [loading, setLoading] = useState(true);
  const [storage, setStorage] = useState<Storage>({
    totalBytes: 0,
    totalPdfs: 0,
    totalVideos: 0,
    totalPdfBytes: 0,
    totalVideoBytes: 0,
  });
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<Awaited<ReturnType<typeof getSession>> | null>(null);
  const BASE = process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:8000";

  console.log("BASE =", BASE);
  console.log("window.origin =", window.location.origin);
  // Fetch subjects on mount
  useEffect(() => {
    let cancelled = false;
      
    async function fetchSubjects() {
      try {
        const res = await fetch(`${BASE}/api/subjects/`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(getResponseMessage(data, "Failed to load subjects"));
        }

        if (!cancelled) {
          const subjectsList = toArray<Subject>(data);
          setSubjects(subjectsList);
          setError(null);

          // Auto‑load chapters for all subjects if enabled
          if (autoLoadChapters && subjectsList.length > 0) {
            // Load chapters for each subject in parallel
            const loadAllChapters = subjectsList.map((subject) =>
              fetch(`${BASE}/api/chapters/subject/${subject.id}`)
                .then(async (res) => {
                  const data = await res.json();
                  const chapters = res.ok ? toArray<Chapter>(data) : [];
                  return { subjectId: subject.id, chapters };
                })
                .catch(() => ({ subjectId: subject.id, chapters: [] }))
            );

            const results = await Promise.all(loadAllChapters);
            if (!cancelled) {
              const newChaptersMap: ChaptersMap = {};
              for (const { subjectId, chapters } of results) {
                newChaptersMap[subjectId] = chapters;
              }
              setChaptersMap(newChaptersMap);
            }
          }
        }
      } catch (e) {
        if (!cancelled) {
          setSubjects([]);
          setError(e instanceof Error ? e.message : "Failed to load subjects");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchSubjects();

    return () => {
      cancelled = true;
    };

  }, [BASE, autoLoadChapters]);

  // ... the rest of your hook (loadChapters, loadChapterContent, etc.) remains unchanged
  // But we need to modify `loadChapters` so it doesn't refetch if already loaded
  const loadChapters = useCallback(
    async (subjectId: string) => {
      // If chapters already exist (either from auto‑load or previous manual load), skip
      if (chaptersMap[subjectId]) return;
      try {
        const res = await fetch(`${BASE}/api/chapters/subject/${subjectId}`);
        const data = await res.json();
        const arr = res.ok ? toArray<Chapter>(data) : [];
        setChaptersMap((prev) => ({ ...prev, [subjectId]: arr }));
      } catch {
        setChaptersMap((prev) => ({ ...prev, [subjectId]: [] }));
      }
    },
    [BASE, chaptersMap],
  );


  // Lazy-load both PDFs and videos for a chapter in parallel
  const loadChapterContent = useCallback(
    async (chapterId: string) => {
      const fetches: Promise<void>[] = [];

      if (pdfsMap[chapterId] === undefined) {
        fetches.push(
          fetch(`${BASE}/api/content/pdf/chapter/${chapterId}`)
            .then(async (r) => ({ ok: r.ok, data: await r.json() }))
            .then(({ ok, data }) => {
              const arr = ok ? toArray<Pdf>(data) : [];
              setPdfsMap((prev) => ({ ...prev, [chapterId]: arr }));
            })
            .catch(() => setPdfsMap((prev) => ({ ...prev, [chapterId]: [] }))),
        );
      }

      {/* ------- VIDEO LOAD -------- */}

      if (videosMap[chapterId] === undefined) {
        fetches.push(
          authHeaders().then((headers) =>
            fetch(`${BASE}/api/content/video/chapter/${chapterId}`, { headers })
              .then(async (r) => ({ ok: r.ok, data: await r.json() }))
              .then(({ ok, data }) => {
                const arr = ok ? toArray<Video>(data) : [];
                setVideosMap((prev) => ({ ...prev, [chapterId]: arr }));
              })
              .catch(() => setVideosMap((prev) => ({ ...prev, [chapterId]: [] }))),
          ),
        );
      }

      

      await Promise.all(fetches);
    },
    [BASE, pdfsMap, videosMap],
  );

  // Fetch storage usage
  const getStorage = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}/api/storage/usage`);
      const data = await res.json();

      if (!res.ok) {
        const message = getResponseMessage(data, "Failed to fetch storage");

        // Some deployed backends still do not expose storage analytics.
        // Keep the UI usable and fall back to zeroed totals instead of
        // surfacing a noisy console error for an optional dashboard metric.
        if (res.status === 404 || message === "Route not found") {
          setStorage({
            totalBytes: 0,
            totalPdfs: 0,
            totalVideos: 0,
            totalPdfBytes: 0,
            totalVideoBytes: 0,
          });
          return;
        }

        throw new Error(message);
      }

      if (!data || typeof data !== "object") {
        return;
      }

      setStorage((prev) => ({ ...prev, ...(data as Partial<Storage>) }));
    } catch (e) {
      console.error("Failed to fetch storage:", e);
    }
  }, [BASE]);

  // Add a chapter optimistically
  function addChapter(subjectId: string, chapter: Chapter) {
    setChaptersMap((prev) => ({
      ...prev,
      [subjectId]: [...(prev[subjectId] ?? []), chapter],
    }));
    setPdfsMap((prev) => ({ ...prev, [chapter.id]: [] }));
    setVideosMap((prev) => ({ ...prev, [chapter.id]: [] }));
  }

  // Delete a chapter
  async function deleteChapter(subjectId: string, chapterId: string) {
    try {
      const response = await fetch(`${BASE}/api/chapters/${chapterId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Failed to delete chapter: ${response.status} - ${errorText}`,
        );
      }

      // Update local state - remove chapter from chaptersMap
      setChaptersMap((prev) => ({
        ...prev,
        [subjectId]: (prev[subjectId] || []).filter(
          (ch) => ch.id !== chapterId,
        ),
      }));

      // Clean up PDFs and videos maps for this chapter
      setPdfsMap((prev) => {
        const newMap = { ...prev };
        delete newMap[chapterId];
        return newMap;
      });

      setVideosMap((prev) => {
        const newMap = { ...prev };
        delete newMap[chapterId];
        return newMap;
      });

      return true;
    } catch (error) {
      console.error("Error deleting chapter:", error);
      throw error;
    }
  }

  function updatePdfs(chapterId: string, updater: (pdfs: Pdf[]) => Pdf[]) {
    setPdfsMap((prev) => ({
      ...prev,
      [chapterId]: updater(prev[chapterId] ?? []),
    }));
  }

  function updateVideos(
    chapterId: string,
    updater: (videos: Video[]) => Video[],
  ) {
    setVideosMap((prev) => ({
      ...prev,
      [chapterId]: updater(prev[chapterId] ?? []),
    }));
  }

  return {
    subjects,
    chaptersMap,
    pdfsMap,
    videosMap,
    storage,
    loading,
    error,
    loadChapters,
    loadChapterContent,
    addChapter,
    deleteChapter,
    updatePdfs,
    updateVideos,
    getStorage,
  };
}