import { useState, useEffect } from "react";

export function useContentTree() {
  const [subjects, setSubjects] = useState([]);
  const [chaptersMap, setChaptersMap] = useState({});
  const [subtopicsMap, setSubtopicsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setSubjects([]);
    setChaptersMap({});
    setSubtopicsMap({});
    fetch(`http://localhost:8000/api/subjects/`)
      .then((r) => r.json())
      .then((data) => setSubjects(data))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []); // re-fetch when grade changes

    async function loadChapters(subjectId) {
    if (chaptersMap[subjectId]) return;
    const res  = await fetch(`http://localhost:8000/api/chapters/subject/${subjectId}`);
    const data = await res.json();
    // Normalise: bare array OR common envelope shapes
    const arr  = Array.isArray(data) ? data
                : Array.isArray(data?.chapters) ? data.chapters
                : Array.isArray(data?.data)     ? data.data
                : [];
    setChaptersMap((prev) => ({ ...prev, [subjectId]: arr }));
    }

    async function loadSubtopics(chapterId) {
    if (subtopicsMap[chapterId]) return;
    const res  = await fetch(`http://localhost:8000/api/subtopics/chapter/${chapterId}`);
    const data = await res.json();
    const arr  = Array.isArray(data) ? data
                : Array.isArray(data?.subtopics) ? data.subtopics
                : Array.isArray(data?.data)       ? data.data
                : [];
    setSubtopicsMap((prev) => ({ ...prev, [chapterId]: arr }));
    }

  return { subjects, chaptersMap, subtopicsMap, loading, error, loadChapters, loadSubtopics };
}