// hooks/useContentTree.js

import { useState, useEffect } from "react";

export function useContentTree() {
  const [subjects, setSubjects] = useState([]);
  const [chaptersMap, setChaptersMap] = useState({});
  const [subtopicsMap, setSubtopicsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // fetch subjects on mount
  useEffect(() => {
    fetch("http://localhost:8000/api/subjects")
      .then((r) => r.json())
      .then((data) => setSubjects(data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  // called when user opens a subject
  async function loadChapters(subjectId) {
    if (chaptersMap[subjectId]) return; // already loaded, skip
    const res = await fetch(`http://localhost:8000/api/chapters/${subjectId}`);
    const data = await res.json();
    setChaptersMap((prev) => ({ ...prev, [subjectId]: data }));
  }

  // called when user opens a chapter
  async function loadSubtopics(chapterId) {
    if (subtopicsMap[chapterId]) return;
    const res = await fetch(`http://localhost:8000/api/subtopics/${chapterId}`);
    const data = await res.json();
    setSubtopicsMap((prev) => ({ ...prev, [chapterId]: data }));
  }

  return {
    subjects,
    chaptersMap,
    subtopicsMap,
    loading,
    error,
    loadChapters,
    loadSubtopics,
  };
}