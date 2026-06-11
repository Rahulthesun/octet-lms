import { useState, useEffect } from "react";

export function useContentTree() {
  const [subjects, setSubjects]       = useState([]);
  const [chaptersMap, setChaptersMap] = useState({});
  const [pdfsMap, setPdfsMap]         = useState({});
  const [videosMap, setVideosMap]     = useState({});
  const [loading, setLoading]         = useState(true);
  const [storage, setStorage]         = useState({
    totalBytes: 0, totalPdfs: 0, totalVideos: 0,
    totalPdfBytes: 0, totalVideoBytes: 0, limitBytes:60 * 1024 * 1024 * 1024 // 60 GB default limit
  });
  const [error, setError] = useState(null);

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
  async function loadChapters(subjectId) {
    if (chaptersMap[subjectId]) return;
    try {
      const res  = await fetch(`${BASE}/api/chapters/subject/${subjectId}`);
      const data = await res.json();
      const arr  = Array.isArray(data)           ? data
                 : Array.isArray(data?.chapters) ? data.chapters
                 : Array.isArray(data?.data)     ? data.data
                 : [];
      setChaptersMap((prev) => ({ ...prev, [subjectId]: arr }));
    } catch {
      setChaptersMap((prev) => ({ ...prev, [subjectId]: [] }));
    }
  }

  // Lazy-load both PDFs and videos for a chapter in parallel
  async function loadChapterContent(chapterId) {
    const fetches = [];

    if (pdfsMap[chapterId] === undefined) {
      fetches.push(
        fetch(`${BASE}/api/content/pdf/chapter/${chapterId}`)
          .then((r) => r.json())
          .then((data) => {
            const arr = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
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
            const arr = Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : [];
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
      const res  = await fetch(`${BASE}/api/storage/usage`);
      const data = await res.json();
      setStorage(data);
      console.log("Storage usage:", data);
    } catch (e) {
      console.error("Failed to fetch storage:", e);
    }
  }

  // Add a chapter optimistically
  function addChapter(subjectId, chapter) {
    setChaptersMap((prev) => ({
      ...prev,
      [subjectId]: [...(prev[subjectId] ?? []), chapter],
    }));
    setPdfsMap((prev)   => ({ ...prev, [chapter.id]: [] }));
    setVideosMap((prev) => ({ ...prev, [chapter.id]: [] }));
  }

  // ✅ NEW: Delete a chapter
  async function deleteChapter(subjectId, chapterId) {
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

  function updatePdfs(chapterId, updater) {
    setPdfsMap((prev) => ({
      ...prev,
      [chapterId]: updater(prev[chapterId] ?? []),
    }));
  }

  function updateVideos(chapterId, updater) {
    setVideosMap((prev) => ({
      ...prev,
      [chapterId]: updater(prev[chapterId] ?? []),
    }));
  }

  return {
    subjects, chaptersMap, pdfsMap, videosMap,
    storage, loading, error,
    loadChapters, loadChapterContent,
    addChapter, deleteChapter, // ← Include deleteChapter here
    updatePdfs, updateVideos,
    getStorage,
  };
}