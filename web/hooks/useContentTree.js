import { useState, useEffect } from "react";

export function useContentTree() {
  const [subjects, setSubjects]     = useState([]);
  const [chaptersMap, setChaptersMap] = useState({});
  const [pdfsMap, setPdfsMap]       = useState({});
  const [videosMap, setVideosMap]   = useState({});
  const [loading, setLoading]       = useState(true);
  const [storage, setStorage]       = useState({
    totalBytes: 0, totalPdfs: 0, totalVideos: 0,
    totalPdfBytes: 0, totalVideoBytes: 0,
  });
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`http://localhost:8000/api/subjects/`)
      .then((r) => r.json())
      .then((data) => setSubjects(data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function loadChapters(subjectId) {
    if (chaptersMap[subjectId]) return;
    try {
      const res  = await fetch(`http://localhost:8000/api/chapters/subject/${subjectId}`);
      const data = await res.json();
      const arr  = Array.isArray(data)            ? data
                 : Array.isArray(data?.chapters)  ? data.chapters
                 : Array.isArray(data?.data)      ? data.data
                 : [];
      setChaptersMap((prev) => ({ ...prev, [subjectId]: arr }));
    } catch {
      setChaptersMap((prev) => ({ ...prev, [subjectId]: [] }));
    }
  }

  // Fetches both PDFs and videos for a chapter in parallel (skips if already cached)
  async function loadChapterContent(chapterId) {
    const fetches = [];

    if (pdfsMap[chapterId] === undefined) {
      fetches.push(
        fetch(`http://localhost:8000/api/pdfs/content/chapter/${chapterId}`)
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
        fetch(`http://localhost:8000/api/videos/chapter/${chapterId}`)
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

  // Optimistic updaters — let ContentPage splice items in/out without a refetch
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

  async function getStorage() {
    const res  = await fetch(`http://localhost:8000/api/storage/usage`);
    const data = await res.json();
    setStorage(data);
  }

  return {
    subjects, chaptersMap, pdfsMap, videosMap,
    storage, loading, error,
    loadChapters, loadChapterContent,
    updatePdfs, updateVideos,
    getStorage,
  };
}