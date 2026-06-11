import { useState, useEffect } from "react";

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

export function useContentTree() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [chaptersMap, setChaptersMap] = useState<ChaptersMap>({});
  const [pdfsMap, setPdfsMap] = useState<PdfsMap>({});
  const [videosMap, setVideosMap] = useState<VideosMap>({});
  const [loading, setLoading] = useState(true);
  const [storage, setStorage] = useState<Storage>({
    totalBytes: 0, totalPdfs: 0, totalVideos: 0,
    totalPdfBytes: 0, totalVideoBytes: 0,
  });
  const [error, setError] = useState<string | null>(null);

  const BASE = process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:8000";

  // Fetch subjects on mount
  useEffect(() => {
    fetch(`${BASE}/api/subjects/`)
      .then((r) => r.json())
      .then((data) => setSubjects(data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // Lazy-load chapters for a subject (skips if already cached)
  async function loadChapters(subjectId: string) {
    if (chaptersMap[subjectId]) return;
    try {
      const res = await fetch(`${BASE}/api/chapters/subject/${subjectId}`);
      const data = await res.json();
      const arr: Chapter[] = Array.isArray(data) ? data
        : Array.isArray(data?.chapters) ? data.chapters
        : Array.isArray(data?.data) ? data.data
        : [];
      setChaptersMap((prev) => ({ ...prev, [subjectId]: arr }));
    } catch {
      setChaptersMap((prev) => ({ ...prev, [subjectId]: [] }));
    }
  }

  // Lazy-load both PDFs and videos for a chapter in parallel
  async function loadChapterContent(chapterId: string) {
    const fetches: Promise<void>[] = [];

    if (pdfsMap[chapterId] === undefined) {
      fetches.push(
        fetch(`${BASE}/api/content/pdf/chapter/${chapterId}`)
          .then((r) => r.json())
          .then((data) => {
            const arr: Pdf[] = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
            setPdfsMap((prev) => ({ ...prev, [chapterId]: arr }));
          })
          .catch(() => setPdfsMap((prev) => ({ ...prev, [chapterId]: [] })))
      );
    }

    if (videosMap[chapterId] === undefined) {
      fetches.push(
        fetch(`${BASE}/api/content/video/chapter/${chapterId}`)
          .then((r) => r.json())
          .then((data) => {
            const arr: Video[] = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
            setVideosMap((prev) => ({ ...prev, [chapterId]: arr }));
          })
          .catch(() => setVideosMap((prev) => ({ ...prev, [chapterId]: [] })))
      );
    }

    await Promise.all(fetches);
  }

  // Fetch storage usage
  async function getStorage() {
    try {
      const res = await fetch(`${BASE}/api/storage/usage`);
      const data = await res.json();
      setStorage(data);
      console.log("Storage usage:", data);
    } catch (e) {
      console.error("Failed to fetch storage:", e);
    }
  }

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
        throw new Error(`Failed to delete chapter: ${response.status} - ${errorText}`);
      }

      // Update local state - remove chapter from chaptersMap
      setChaptersMap((prev) => ({
        ...prev,
        [subjectId]: (prev[subjectId] || []).filter((ch) => ch.id !== chapterId),
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

  function updateVideos(chapterId: string, updater: (videos: Video[]) => Video[]) {
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