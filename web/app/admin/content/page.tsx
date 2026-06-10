"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  IconPlay,
  IconDocument,
  IconClose,
  IconCheckCircle,
} from "@/components/ui/SvgIcons";
import { useContentTree } from "@/hooks/useContentTree";
import { PdfViewer } from "../../../components/admin/PDFViewer";

// ─── Backend shapes ────────────────────────────────────────────────────────────

interface BackendSubject { id: string; name: string }
interface BackendChapter { id: string; name: string }

interface BackendPdf {
  id: string;
  chapter_id: string;
  title: string;
  filename: string;
  r2_key: string;
  mime_type?: string;
  size_bytes: number;
  created_at?: string;
}

interface BackendVideo {
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

type ContentType = "pdf" | "video";
type AnyFile     = BackendPdf | BackendVideo;

type DeleteTarget = {
  type: ContentType;
  chapterId: string;
  itemId: string;
  name: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const BASE_URL = process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:8000";
const R2_BASE  = process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? "";

function fmt(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function fmtSize(bytes: number) {
  const mb = bytes / 1024 / 1024;
  return mb >= 1
    ? `${mb.toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function formatBytes(bytes: number, decimals = 2) {
  if (!bytes) return "0 Bytes";
  const k     = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i     = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + " " + sizes[i];
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function TrashIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none">
      <path d="M 3,4.5 H 13 M 6,4.5 V 3 Q 6,2.5 6.5,2.5 H 9.5 Q 10,2.5 10,3 V 4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M 4.5,4.5 L 5,13.5 Q 5,14 5.5,14 H 10.5 Q 11,14 11,13.5 L 11.5,4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M 7,7 V 11.5 M 9,7 V 11.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function SearchIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none">
      <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M 10.5,10.5 L 14,14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

function PlusIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 12 12" fill="none">
      <path d="M 6,1 L 6,11 M 1,6 L 11,6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function ChevronIcon({ open, className = "w-3.5 h-3.5" }: { open: boolean; className?: string }) {
  return (
    <svg
      className={`shrink-0 transition-transform ${open ? "rotate-180" : ""} ${className}`}
      viewBox="0 0 12 12" fill="none"
    >
      <path d="M 2,4 L 6,8 L 10,4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Storage bar — receives live values as props ───────────────────────────────

function StorageBar({ totalVideoBytes }: { totalVideoBytes: number }) {
  const TOTAL_GB  = 60;
  const totalBytes = TOTAL_GB * 1024 * 1024 * 1024;
  const usedPct    = Math.min((totalVideoBytes / totalBytes) * 100, 100);

  return (
    <div className="flex items-center gap-4 bg-white p-4 rounded-2xl">
      <div className="flex-1">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-600 text-base">Video Storage</span>
          <span className="font-inter font-bold text-primary">
            {formatBytes(totalVideoBytes)} / {formatBytes(totalBytes)}
          </span>
        </div>
        <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-700"
            style={{ width: `${usedPct}%` }}
          />
        </div>
      </div>
      <span className="text-sm text-gray-600 shrink-0">
        <span className="font-inter">{formatBytes(totalBytes - totalVideoBytes)}</span> free
      </span>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function ContentPage() {
  const {
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
    updatePdfs,
    updateVideos,
    getStorage,
  } = useContentTree();

  // Fetch storage on mount
  useEffect(() => { getStorage(); }, []);

  // ── Navigation state ───────────────────────────────────────────────────────
  const [openSubjectId, setOpenSubjectId]   = useState<string | null>(null);
  const [openChapterId, setOpenChapterId]   = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery]       = useState("");

  // ── Per-chapter PDF / Video toggle ────────────────────────────────────────
  const [chapterContentType, setChapterContentType] = useState<Record<string, ContentType>>({});

  // ── Add chapter inline form ────────────────────────────────────────────────
  const [addingChapterToSubject, setAddingChapterToSubject] = useState<string | null>(null);
  const [newChapterName, setNewChapterName]                 = useState("");
  const [addingChapter, setAddingChapter]                   = useState(false);

  // ── Delete confirmation ────────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  // ── File edit state ────────────────────────────────────────────────────────
  const [editTitle, setEditTitle]             = useState("");
  const [editDesc, setEditDesc]               = useState("");
  const [replaceFile, setReplaceFile]         = useState<File | null>(null);
  const [replaceDragging, setReplaceDragging] = useState(false);
  const [editSaved, setEditSaved]             = useState(false);
  const replaceFileRef                        = useRef<HTMLInputElement>(null);

  // ── Upload state ───────────────────────────────────────────────────────────
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDesc, setUploadDesc]   = useState("");
  const [uploadFile, setUploadFile]   = useState<File | null>(null);
  const [dragging, setDragging]       = useState(false);
  const [uploaded, setUploaded]       = useState(false);
  const [uploading, setUploading]     = useState(false);
  const fileRef                       = useRef<HTMLInputElement>(null);

  // ── Derived: selected path ─────────────────────────────────────────────────
  const selectedPath = (() => {
    if (!openChapterId || !openSubjectId) return null;
    const subject = (subjects as BackendSubject[]).find((s) => s.id === openSubjectId) ?? null;
    const chapter = ((chaptersMap[openSubjectId] ?? []) as BackendChapter[]).find((c) => c.id === openChapterId) ?? null;
    if (!subject || !chapter) return null;
    const contentType: ContentType = chapterContentType[openChapterId] ?? "pdf";
    return { subject, chapter, contentType };
  })();

  // ── Derived: selected file ─────────────────────────────────────────────────
  const selectedFile: AnyFile | null = (() => {
    if (!selectedItemId || !openChapterId) return null;
    const ct = chapterContentType[openChapterId] ?? "pdf";
    const list = ct === "pdf"
      ? ((pdfsMap[openChapterId] ?? []) as BackendPdf[])
      : ((videosMap[openChapterId] ?? []) as BackendVideo[]);
    return list.find((f) => f.id === selectedItemId) ?? null;
  })();

  // ── Derived: PDF preview URL ───────────────────────────────────────────────
  // Requires NEXT_PUBLIC_R2_PUBLIC_URL in .env.local
  // For private buckets, fetch a presigned URL from your backend instead.
  const pdfPreviewUrl: string | null =
    selectedPath?.contentType === "pdf" && selectedFile?.r2_key
      ? `${R2_BASE}/${(selectedFile as BackendPdf).r2_key}`
      : null;

  // ── Search visibility ──────────────────────────────────────────────────────
  const visibility = (() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return null;

    const visibleSubjects = new Set<string>();
    const visibleChapters = new Set<string>();
    const visiblePdfs     = new Set<string>();
    const visibleVideos   = new Set<string>();

    for (const subject of subjects as BackendSubject[]) {
      const subMatch = subject.name.toLowerCase().includes(q);
      for (const chapter of (chaptersMap[subject.id] ?? []) as BackendChapter[]) {
        const chMatch = chapter.name.toLowerCase().includes(q);
        let anyFile = false;
        for (const pdf of (pdfsMap[chapter.id] ?? []) as BackendPdf[]) {
          if (pdf.title.toLowerCase().includes(q) || chMatch || subMatch) {
            visiblePdfs.add(pdf.id); anyFile = true;
          }
        }
        for (const video of (videosMap[chapter.id] ?? []) as BackendVideo[]) {
          if (video.title.toLowerCase().includes(q) || chMatch || subMatch) {
            visibleVideos.add(video.id); anyFile = true;
          }
        }
        if (chMatch || subMatch || anyFile) visibleChapters.add(chapter.id);
      }
      const anyCh = ((chaptersMap[subject.id] ?? []) as BackendChapter[]).some((c) => visibleChapters.has(c.id));
      if (subMatch || anyCh) visibleSubjects.add(subject.id);
    }

    return { visibleSubjects, visibleChapters, visiblePdfs, visibleVideos };
  })();

  // ── Navigation ─────────────────────────────────────────────────────────────
  function toggleSubject(subjectId: string) {
    const next = openSubjectId === subjectId ? null : subjectId;
    setOpenSubjectId(next);
    setOpenChapterId(null);
    setSelectedItemId(null);
    setAddingChapterToSubject(null);
    setNewChapterName("");
    if (next) loadChapters(next);
  }

  function toggleChapter(chapterId: string) {
    const next = openChapterId === chapterId ? null : chapterId;
    setOpenChapterId(next);
    setSelectedItemId(null);
    setUploaded(false);
    setUploadFile(null);
    setUploadTitle("");
    setUploadDesc("");
    if (next) {
      loadChapterContent(next);
      setChapterContentType((prev) =>
        prev[next] !== undefined ? prev : { ...prev, [next]: "pdf" },
      );
    }
  }

  function switchContentType(chapterId: string, ct: ContentType) {
    setChapterContentType((prev) => ({ ...prev, [chapterId]: ct }));
    setSelectedItemId(null);
  }

  // Switch type AND clear file selection (so right panel shows upload form)
  function openUploadFor(chapterId: string, ct: ContentType) {
    if (openChapterId !== chapterId) {
      // Chapter isn't open — open it first
      toggleChapter(chapterId);
    }
    setChapterContentType((prev) => ({ ...prev, [chapterId]: ct }));
    setSelectedItemId(null);
  }

  function selectFile(id: string, title: string) {
    setSelectedItemId(id);
    setEditTitle(title);
    setEditDesc("");
    setReplaceFile(null);
    setEditSaved(false);
  }

  // ─── ⬇ YOUR API INTEGRATION — implement handleAddChapter ──────────────────
  async function handleAddChapter(
    subjectId: string,
    name: string,
  ): Promise<{ id: string; name: string } | null> {
    // Replace this block with your actual API call, e.g.:
    //
    // const res = await fetch(`${BASE_URL}/api/chapters`, {
    //   method:  "POST",
    //   headers: { "Content-Type": "application/json" },
    //   body:    JSON.stringify({ subject_id: subjectId, name }),
    // });
    // if (!res.ok) throw new Error("Failed to create chapter");
    // const data = await res.json();
    // return data.chapter ?? data; // adjust to your response shape
    //
    // ── Optimistic mock — remove when your API is wired up ─────────────────
    return { id: `local-ch-${Date.now()}`, name };
  }
  // ─── ⬆ YOUR API INTEGRATION ───────────────────────────────────────────────

  async function submitAddChapter(subjectId: string) {
    const name = newChapterName.trim();
    if (!name || addingChapter) return;
    setAddingChapter(true);
    try {
      const chapter = await handleAddChapter(subjectId, name);
      if (chapter) addChapter(subjectId, chapter);
      setNewChapterName("");
      setAddingChapterToSubject(null);
    } catch (e) {
      alert(e instanceof Error ? e.message : "Failed to add chapter");
    } finally {
      setAddingChapter(false);
    }
  }

  function cancelAddChapter() {
    setAddingChapterToSubject(null);
    setNewChapterName("");
  }

  // ── Upload ─────────────────────────────────────────────────────────────────
  async function handleUpload() {
    if (!uploadTitle.trim() || !uploadFile || !selectedPath || uploading) return;
    const { chapter, contentType } = selectedPath;

    setUploading(true);

    const formData = new FormData();
    formData.append("title",      uploadTitle.trim());
    formData.append("chapterId",  chapter.id);
    formData.append("file",       uploadFile);
    if (uploadDesc.trim()) formData.append("description", uploadDesc.trim());

    const endpoint = contentType === "pdf"
      ? "/api/content/pdf/upload"
      : "/api/content/video/upload";

    try {
      const res = await fetch(`${BASE_URL}${endpoint}`, {
        method: "POST",
        body:   formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.message ?? `Upload failed (${res.status})`);
      }

      const data    = await res.json();
      // Normalise response — adjust .pdf / .video key to match your backend shape
      const newItem = data?.pdf ?? data?.video ?? data;

      if (contentType === "pdf") {
        updatePdfs(chapter.id, (pdfs: BackendPdf[]) => [...pdfs, newItem as BackendPdf]);
      } else {
        updateVideos(chapter.id, (videos: BackendVideo[]) => [...videos, newItem as BackendVideo]);
      }

      // Refresh storage after upload
      getStorage();

      setUploaded(true);
      setUploadFile(null);
      setUploadTitle("");
      setUploadDesc("");
      setTimeout(() => setUploaded(false), 4000);
    } catch (err) {
      alert(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setUploading(false);
    }
  }

  // ── Save file edit ─────────────────────────────────────────────────────────
  function handleSaveFileEdit() {
    if (!selectedFile || !selectedPath || !editTitle.trim()) return;
    const { chapter, contentType } = selectedPath;
    if (contentType === "pdf") {
      updatePdfs(chapter.id, (pdfs: BackendPdf[]) =>
        pdfs.map((p) => p.id !== selectedFile.id ? p : {
          ...p,
          title: editTitle.trim(),
          ...(replaceFile ? { size_bytes: replaceFile.size } : {}),
        }),
      );
    } else {
      updateVideos(chapter.id, (videos: BackendVideo[]) =>
        videos.map((v) => v.id !== selectedFile.id ? v : {
          ...v,
          title: editTitle.trim(),
          ...(replaceFile ? { size_bytes: replaceFile.size } : {}),
        }),
      );
    }
    setReplaceFile(null);
    setEditSaved(true);
    setTimeout(() => setEditSaved(false), 4000);
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  function confirmDelete() {
    if (!deleteTarget) return;
    if (deleteTarget.type === "pdf") {
      updatePdfs(deleteTarget.chapterId, (pdfs: BackendPdf[]) =>
        pdfs.filter((p) => p.id !== deleteTarget.itemId),
      );
    } else {
      updateVideos(deleteTarget.chapterId, (videos: BackendVideo[]) =>
        videos.filter((v) => v.id !== deleteTarget.itemId),
      );
    }
    if (selectedItemId === deleteTarget.itemId) setSelectedItemId(null);
    setDeleteTarget(null);
    getStorage();
  }

  // ── Render vars ────────────────────────────────────────────────────────────
  const isVideo    = selectedPath?.contentType === "video";
  const fileAccept = isVideo ? ".mp4,.mov,.mkv,.avi" : ".pdf,.pptx,.docx,.xlsx";
  const fileHint   = isVideo ? "MP4, MOV, MKV — max 4 GB" : "PDF, PPTX, DOCX — max 100 MB";

  const noMatches =
    visibility &&
    (subjects as BackendSubject[]).every((s) => !visibility.visibleSubjects.has(s.id));

  const visibleSubjects = visibility
    ? (subjects as BackendSubject[]).filter((s) => visibility.visibleSubjects.has(s.id))
    : (subjects as BackendSubject[]);

  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full p-3">

      {/* ── Page header ── */}
      <div className="shrink-0 px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="shrink-0">
            <h1 className="text-3xl font-bold text-gray-900">Content Manager</h1>
            <p className="text-base text-gray-600 mt-1">
              Select a subject and chapter — then upload PDFs or videos.
            </p>
          </div>
          <div className="lg:w-80 shrink-0">
            <StorageBar totalVideoBytes={storage.totalBytes} />
          </div>
        </div>
      </div>

      {/* ── Search bar ── */}
      <div className="shrink-0 px-6 pb-3">
        <div className="relative w-full max-w-xl">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search chapters or files…"
            className="w-full bg-transparent border border-gray-300 rounded-full pl-10 pr-4 py-2 text-base text-gray-700 placeholder-gray-400 outline-none focus:border-primary"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
            >
              <IconClose className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ── Two-panel body ── */}
      <div className="flex flex-1 min-h-0 p-3">

        {/* ── Left rail ── */}
        <div className="w-[45%] shrink-0 border-r rounded-2xl border-gray-200 bg-white flex flex-col h-full overflow-hidden">
          <div className="flex-1 overflow-y-auto">

            {loading && (
              <div className="p-8 text-center text-gray-400 text-base">Loading subjects…</div>
            )}
            {error && (
              <div className="p-8 text-center text-red-400 text-base">Error: {error}</div>
            )}

            {noMatches ? (
              <div className="p-8 text-center text-gray-400 text-base">
                No matches for &quot;{searchQuery}&quot;
              </div>
            ) : (
              visibleSubjects.map((subject) => {
                const subjectOpen = openSubjectId === subject.id;
                const chapters    = (chaptersMap[subject.id] ?? []) as BackendChapter[];

                return (
                  <div key={subject.id} className="border-b border-gray-100 last:border-0">

                    {/* Subject row */}
                    <button
                      onClick={() => toggleSubject(subject.id)}
                      className={`w-full flex items-center gap-3 pl-4 pr-4 py-3 text-left transition-colors ${
                        subjectOpen ? "bg-gray-50" : "hover:bg-gray-50"
                      }`}
                    >
                      <span className="flex-1 text-lg text-gray-800 font-medium">{subject.name}</span>
                      <ChevronIcon open={subjectOpen} className="w-3.5 h-3.5 text-gray-400" />
                    </button>

                    {/* Chapters accordion */}
                    <AnimatePresence initial={false}>
                      {subjectOpen && (
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: "auto" }}
                          exit={{ height: 0 }}
                          transition={{ duration: 0.18 }}
                          className="overflow-hidden"
                        >
                          <div className="pb-2">

                            {/* Loading chapters */}
                            {!chaptersMap[subject.id] && (
                              <div className="pl-8 py-3 text-sm text-gray-400 italic">
                                Loading chapters…
                              </div>
                            )}

                            {/* Empty chapters state */}
                            {chaptersMap[subject.id] !== undefined && chapters.length === 0 && (
                              <div className="pl-8 py-3 text-sm text-gray-400 italic">
                                No chapters yet — add one below
                              </div>
                            )}

                            {/* Chapter rows */}
                            {chapters
                              .filter((ch) => !visibility || visibility.visibleChapters.has(ch.id))
                              .map((chapter, idx) => {
                                const chapterOpen   = openChapterId === chapter.id;
                                const contentType   = chapterContentType[chapter.id] ?? "pdf";
                                const pdfsLoaded    = pdfsMap[chapter.id] !== undefined;
                                const videosLoaded  = videosMap[chapter.id] !== undefined;
                                const anyLoaded     = pdfsLoaded || videosLoaded;
                                const currentLoaded = contentType === "pdf" ? pdfsLoaded : videosLoaded;
                                const currentFiles  =
                                  contentType === "pdf"
                                    ? ((pdfsMap[chapter.id] ?? []) as BackendPdf[])
                                    : ((videosMap[chapter.id] ?? []) as BackendVideo[]);

                                return (
                                  <div key={chapter.id}>

                                    {/* Chapter row */}
                                    <button
                                      onClick={() => toggleChapter(chapter.id)}
                                      className={`w-full flex items-center gap-2.5 pl-8 pr-4 py-2.5 text-left transition-colors ${
                                        chapterOpen ? "bg-gray-50" : "hover:bg-gray-50"
                                      }`}
                                    >
                                      <span className="text-sm text-gray-400 shrink-0 w-15">
                                        Chap - {idx + 1}
                                      </span>
                                      <span className="flex-1 text-md text-gray-700 leading-snug">
                                        {chapter.name}
                                      </span>
                                      <ChevronIcon open={chapterOpen} className="w-3 h-3 text-gray-400" />
                                    </button>

                                    {/* Chapter content */}
                                    <AnimatePresence initial={false}>
                                      {chapterOpen && (
                                        <motion.div
                                          initial={{ height: 0 }}
                                          animate={{ height: "auto" }}
                                          exit={{ height: 0 }}
                                          transition={{ duration: 0.18 }}
                                          className="overflow-hidden"
                                        >
                                          <div>
                                            {/* Loading */}
                                            {!anyLoaded && (
                                              <div className="pl-10 py-2 text-sm text-gray-400 italic">
                                                Loading content…
                                              </div>
                                            )}

                                            {/* PDF / Video toggle + Add content buttons */}
                                            {anyLoaded && (
                                              <div className="flex items-center gap-2 pl-10 pr-4 py-2">
                                                {/* Type toggle pills */}
                                                {(["pdf", "video"] as ContentType[]).map((ct) => (
                                                  <button
                                                    key={ct}
                                                    onClick={(e) => { e.stopPropagation(); switchContentType(chapter.id, ct); }}
                                                    className={`px-3 py-0.5 text-xs rounded-full border transition-colors cursor-pointer ${
                                                      contentType === ct
                                                        ? "bg-primary text-white border-primary"
                                                        : "border-gray-300 text-gray-500 hover:border-gray-400"
                                                    }`}
                                                  >
                                                    {ct === "pdf" ? "PDF Notes" : "Videos"}
                                                  </button>
                                                ))}

                                                {/* Spacer */}
                                                <span className="flex-1" />

                                                {/* Add PDF / Add Video buttons */}
                                                <button
                                                  onClick={(e) => { e.stopPropagation(); openUploadFor(chapter.id, "pdf"); }}
                                                  title="Upload PDF"
                                                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-primary transition-colors px-1.5 py-1 rounded hover:bg-gray-100 cursor-pointer"
                                                >
                                                  <PlusIcon className="w-3 h-3" />
                                                  <IconDocument className="w-3.5 h-3.5" />
                                                </button>
                                                <button
                                                  onClick={(e) => { e.stopPropagation(); openUploadFor(chapter.id, "video"); }}
                                                  title="Upload Video"
                                                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-primary transition-colors px-1.5 py-1 rounded hover:bg-gray-100 cursor-pointer"
                                                >
                                                  <PlusIcon className="w-3 h-3" />
                                                  <IconPlay className="w-3.5 h-3.5" />
                                                </button>
                                              </div>
                                            )}

                                            {/* Per-type loading */}
                                            {anyLoaded && !currentLoaded && (
                                              <div className="pl-10 py-1.5 text-sm text-gray-400 italic">Loading…</div>
                                            )}

                                            {/* Empty state */}
                                            {currentLoaded && currentFiles.length === 0 && (
                                              <div className="pl-10 pr-4 py-1.5 text-sm text-gray-400 italic">
                                                No {contentType === "pdf" ? "PDFs" : "videos"} uploaded yet
                                              </div>
                                            )}

                                            {/* File rows */}
                                            {currentLoaded &&
                                              currentFiles
                                                .filter((f) =>
                                                  !visibility ||
                                                  (contentType === "pdf"
                                                    ? visibility.visiblePdfs.has(f.id)
                                                    : visibility.visibleVideos.has(f.id)),
                                                )
                                                .map((file) => {
                                                  const fileSelected = selectedItemId === file.id;
                                                  return (
                                                    <button
                                                      key={file.id}
                                                      onClick={() => selectFile(file.id, file.title)}
                                                      className={`w-full flex items-center gap-2 pl-10 pr-4 py-1.5 text-left border-l-2 transition-colors ${
                                                        fileSelected
                                                          ? "bg-[#f5f0fa] border-primary text-primary"
                                                          : "border-transparent text-gray-700 hover:bg-gray-50"
                                                      }`}
                                                    >
                                                      {contentType === "video" ? (
                                                        <IconPlay className="w-4 h-4 shrink-0 text-primary" />
                                                      ) : (
                                                        <IconDocument className={`w-4 h-4 shrink-0 ${fileSelected ? "text-primary" : "text-gray-400"}`} />
                                                      )}
                                                      <span className="flex-1 text-sm truncate">{file.title}</span>
                                                      <span className={`text-xs shrink-0 ${fileSelected ? "text-primary/70" : "text-gray-400"}`}>
                                                        {fmtSize(file.size_bytes)}
                                                      </span>
                                                    </button>
                                                  );
                                                })}
                                          </div>
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
                                  </div>
                                );
                              })}

                            {/* ── Add Chapter ── */}
                            {!visibility && chaptersMap[subject.id] !== undefined && (
                              addingChapterToSubject === subject.id ? (
                                <div className="pl-8 pr-4 py-2 flex items-center gap-2">
                                  <input
                                    autoFocus
                                    type="text"
                                    value={newChapterName}
                                    onChange={(e) => setNewChapterName(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter")  submitAddChapter(subject.id);
                                      if (e.key === "Escape") cancelAddChapter();
                                    }}
                                    placeholder="Chapter name…"
                                    className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-primary text-gray-700"
                                  />
                                  <button
                                    onClick={() => submitAddChapter(subject.id)}
                                    disabled={addingChapter || !newChapterName.trim()}
                                    className="px-3 py-1.5 bg-primary text-white text-sm rounded-lg disabled:opacity-50 cursor-pointer"
                                  >
                                    {addingChapter ? "…" : "✓"}
                                  </button>
                                  <button
                                    onClick={cancelAddChapter}
                                    className="px-2 py-1.5 text-gray-400 hover:text-gray-600 text-sm cursor-pointer"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => {
                                    setAddingChapterToSubject(subject.id);
                                    setNewChapterName("");
                                  }}
                                  className="w-full flex items-center gap-2 pl-8 pr-4 py-2 text-sm text-gray-400 hover:text-primary transition-colors cursor-pointer"
                                >
                                  <PlusIcon className="w-3.5 h-3.5" />
                                  Add Chapter
                                </button>
                              )
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ── Right panel ── */}
        <div className="flex-1 h-full overflow-y-auto">

          {/* ── PDF selected: viewer + edit form ── */}
          {selectedFile && selectedPath && selectedPath.contentType === "pdf" ? (
            <div className="p-4 space-y-4">

              {/* Breadcrumb + Delete */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-1.5 text-sm text-gray-400 flex-wrap">
                  <Chevron />
                  <span>{selectedPath.subject.name}</span>
                  <Chevron />
                  <span className="truncate max-w-32">{selectedPath.chapter.name}</span>
                  <Chevron />
                  <span className="shrink-0">PDF Notes</span>
                  <Chevron />
                  <span className="text-primary font-medium truncate max-w-40">{selectedFile.title}</span>
                </div>
                <button
                  onClick={() => setDeleteTarget({
                    type: "pdf",
                    chapterId: selectedPath.chapter.id,
                    itemId: selectedFile.id,
                    name: selectedFile.title,
                  })}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded hover:bg-red-50 transition-colors"
                >
                  <TrashIcon className="w-3.5 h-3.5" /> Delete
                </button>
              </div>

              {/* PDF Viewer — height controlled here; adjust to taste */}
              <PdfViewer
                url={pdfPreviewUrl}
                filename={(selectedFile as BackendPdf).filename || selectedFile.title}
                className="h-[58vh]"
              />

              {/* Edit metadata card */}
              <div className="bg-white shadow-sm p-4 rounded-2xl space-y-5">
                <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wide">
                  Edit Metadata
                </h3>

                {/* Size / date pill */}
                <div className="flex items-center gap-3 text-sm text-gray-500 bg-gray-50 px-4 py-2.5 rounded-lg">
                  <IconDocument className="w-5 h-5 text-gray-400 shrink-0" />
                  <span>{fmtSize(selectedFile.size_bytes)} · Document · uploaded {fmt(selectedFile.created_at)}</span>
                </div>

                <div>
                  <label className="text-sm text-gray-500 block mb-1">
                    Title <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-base text-gray-800 outline-none focus:border-gray-400"
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-500 block mb-1">
                    Description <span className="text-gray-300">(optional)</span>
                  </label>
                  <textarea
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    rows={2}
                    placeholder="Brief description…"
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-base text-gray-800 placeholder-gray-300 outline-none focus:border-gray-400 resize-none"
                  />
                </div>

                {/* Replace file */}
                <div>
                  <label className="text-sm text-gray-500 block mb-1">
                    Replace file <span className="text-gray-300">(optional)</span>
                  </label>
                  {replaceFile ? (
                    <div className="border border-gray-200 rounded-lg px-4 py-3 flex items-center gap-3">
                      <IconDocument className="w-5 h-5 text-gray-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-base text-gray-800 truncate">{replaceFile.name}</p>
                        <p className="text-sm text-gray-400">{(replaceFile.size / 1024 / 1024).toFixed(1)} MB</p>
                      </div>
                      <button onClick={() => setReplaceFile(null)} className="text-gray-400 hover:text-gray-600">
                        <IconClose className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onDragOver={(e) => { e.preventDefault(); setReplaceDragging(true); }}
                      onDragLeave={() => setReplaceDragging(false)}
                      onDrop={(e) => { e.preventDefault(); setReplaceDragging(false); const f = e.dataTransfer.files[0]; if (f) setReplaceFile(f); }}
                      onClick={() => replaceFileRef.current?.click()}
                      className={`border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-2 py-6 cursor-pointer transition-colors ${
                        replaceDragging ? "border-primary bg-gray-50" : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                      }`}
                    >
                      <p className="text-sm text-gray-500">
                        Drag &amp; drop a new file or <span className="text-primary">browse</span>
                      </p>
                      <input
                        ref={replaceFileRef}
                        type="file"
                        accept=".pdf,.pptx,.docx,.xlsx"
                        className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) setReplaceFile(f); e.target.value = ""; }}
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4 pt-1">
                  <button
                    onClick={handleSaveFileEdit}
                    disabled={!editTitle.trim()}
                    className="px-6 py-2.5 bg-primary text-white text-base rounded-lg hover:bg-primary/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Save changes
                  </button>
                  <AnimatePresence>
                    {editSaved && (
                      <motion.div
                        initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                        className="flex items-center gap-2 text-green-700 text-base"
                      >
                        <IconCheckCircle className="w-4 h-4" /> Saved
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

          ) : selectedFile && selectedPath && selectedPath.contentType === "video" ? (
            /* ── Video selected: edit form (no viewer) ── */
            <div className="p-4">
              <div className="flex items-start justify-between gap-3 mb-6">
                <div className="flex items-center gap-1.5 text-sm text-gray-400 flex-wrap">
                  <Chevron />
                  <span>{selectedPath.subject.name}</span>
                  <Chevron />
                  <span className="truncate max-w-32">{selectedPath.chapter.name}</span>
                  <Chevron />
                  <span className="shrink-0">Videos</span>
                  <Chevron />
                  <span className="text-primary font-medium truncate max-w-40">{selectedFile.title}</span>
                </div>
                <button
                  onClick={() => setDeleteTarget({
                    type: "video",
                    chapterId: selectedPath.chapter.id,
                    itemId: selectedFile.id,
                    name: selectedFile.title,
                  })}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded hover:bg-red-50 transition-colors"
                >
                  <TrashIcon className="w-3.5 h-3.5" /> Delete
                </button>
              </div>

              <div className="bg-white shadow-sm p-4 rounded-2xl space-y-5">
                {/* Metadata card */}
                <div className="border border-gray-200 rounded-md p-4 flex items-center gap-3">
                  <IconPlay className="w-8 h-8 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-base text-gray-800 truncate">{selectedFile.title}</p>
                    <p className="text-sm text-gray-400">
                      {fmtSize(selectedFile.size_bytes)} · Video · uploaded {fmt(selectedFile.created_at)}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="text-sm text-gray-500 block mb-1">
                    Title <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full border border-gray-200 px-4 py-2.5 text-base text-gray-800 outline-none focus:border-gray-400"
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-500 block mb-1">
                    Description <span className="text-gray-300">(optional)</span>
                  </label>
                  <textarea
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    rows={2}
                    placeholder="Brief description…"
                    className="w-full border border-gray-200 px-4 py-2.5 text-base text-gray-800 placeholder-gray-300 outline-none focus:border-gray-400 resize-none"
                  />
                </div>

                {/* Replace file */}
                <div>
                  <label className="text-sm text-gray-500 block mb-1">
                    Replace file <span className="text-gray-300">(optional)</span>
                  </label>
                  {replaceFile ? (
                    <div className="border border-gray-200 px-4 py-3 flex items-center gap-3">
                      <IconPlay className="w-5 h-5 text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-base text-gray-800 truncate">{replaceFile.name}</p>
                        <p className="text-sm text-gray-400">{(replaceFile.size / 1024 / 1024).toFixed(1)} MB</p>
                      </div>
                      <button onClick={() => setReplaceFile(null)} className="text-gray-400 hover:text-gray-600">
                        <IconClose className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onDragOver={(e) => { e.preventDefault(); setReplaceDragging(true); }}
                      onDragLeave={() => setReplaceDragging(false)}
                      onDrop={(e) => { e.preventDefault(); setReplaceDragging(false); const f = e.dataTransfer.files[0]; if (f) setReplaceFile(f); }}
                      onClick={() => replaceFileRef.current?.click()}
                      className={`border-2 border-dashed flex flex-col items-center justify-center gap-2 py-6 cursor-pointer transition-colors ${
                        replaceDragging ? "border-primary bg-gray-50" : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                      }`}
                    >
                      <p className="text-sm text-gray-500">
                        Drag &amp; drop a new file or <span className="text-primary">browse</span>
                      </p>
                      <input
                        ref={replaceFileRef}
                        type="file"
                        accept=".mp4,.mov,.mkv,.avi"
                        className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) setReplaceFile(f); e.target.value = ""; }}
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4 pt-1">
                  <button
                    onClick={handleSaveFileEdit}
                    disabled={!editTitle.trim()}
                    className="px-6 py-2.5 bg-primary text-white text-base hover:bg-primary/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Save changes
                  </button>
                  <AnimatePresence>
                    {editSaved && (
                      <motion.div
                        initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                        className="flex items-center gap-2 text-green-700 text-base"
                      >
                        <IconCheckCircle className="w-4 h-4" /> Saved
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>

          ) : !selectedPath ? (
            /* ── Placeholder: no chapter selected ── */
            <div className="flex flex-col items-center justify-center h-full text-center gap-4 px-8">
              <div className="w-16 h-16 bg-white border-2 border-gray-300 rounded-full flex items-center justify-center text-gray-400">
                <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M 2,9 Q 2,8 3,8 L 10,8 L 12,6 L 21,6 Q 22,6 22,7 L 22,18 Q 22,19 21,19 L 3,19 Q 2,19 2,18 Z"
                    stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"
                  />
                  <path
                    d="M 12,11 L 12,15.5 M 9.5,13 L 12,11 L 14.5,13"
                    stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div>
                <p className="text-base text-gray-700">Select a chapter from the left panel</p>
                <p className="text-sm text-gray-400 mt-1">Then upload PDFs or videos.</p>
              </div>
            </div>

          ) : (
            /* ── Upload panel: chapter selected, no file selected ── */
            <div className="p-4">
              <div className="flex items-center gap-1.5 text-sm text-gray-400 mb-6 flex-wrap">
                <Chevron />
                <span>{selectedPath.subject.name}</span>
                <Chevron />
                <span className="truncate max-w-40">{selectedPath.chapter.name}</span>
                <Chevron />
                <span className="text-primary font-medium shrink-0">
                  {selectedPath.contentType === "pdf" ? "PDF Notes" : "Videos"}
                </span>
              </div>

              <div className="bg-white shadow-sm p-4 rounded-2xl space-y-5">
                <h2 className="text-base font-medium text-gray-800">
                  Upload {selectedPath.contentType === "pdf" ? "PDF" : "Video"} to {selectedPath.chapter.name}
                </h2>

                <div>
                  <label className="text-sm text-gray-500 block mb-1">
                    Title <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    placeholder={isVideo ? "e.g. Atomic Structure — Part 1" : "e.g. Chapter Notes — Electrochemistry"}
                    className="w-full border border-gray-200 px-4 py-2.5 text-base text-gray-800 placeholder-gray-300 outline-none focus:border-gray-400"
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-500 block mb-1">
                    Description <span className="text-gray-300">(optional)</span>
                  </label>
                  <textarea
                    value={uploadDesc}
                    onChange={(e) => setUploadDesc(e.target.value)}
                    rows={2}
                    placeholder="Brief description…"
                    className="w-full border border-gray-200 px-4 py-2.5 text-base text-gray-800 placeholder-gray-300 outline-none focus:border-gray-400 resize-none"
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-500 block mb-1">
                    File <span className="text-red-400">*</span>
                  </label>
                  {uploadFile ? (
                    <div className="border border-gray-200 px-4 py-3 flex items-center gap-3">
                      {isVideo
                        ? <IconPlay className="w-5 h-5 text-primary shrink-0" />
                        : <IconDocument className="w-5 h-5 text-gray-400 shrink-0" />
                      }
                      <div className="flex-1 min-w-0">
                        <p className="text-base text-gray-800 truncate">{uploadFile.name}</p>
                        <p className="text-sm text-gray-400">{(uploadFile.size / 1024 / 1024).toFixed(1)} MB</p>
                      </div>
                      <button onClick={() => setUploadFile(null)} className="text-gray-400 hover:text-gray-600">
                        <IconClose className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                      onDragLeave={() => setDragging(false)}
                      onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) setUploadFile(f); }}
                      onClick={() => fileRef.current?.click()}
                      className={`border-2 border-dashed flex flex-col items-center justify-center gap-2 py-8 cursor-pointer transition-colors ${
                        dragging ? "border-primary bg-gray-50" : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                      }`}
                    >
                      <p className="text-sm text-gray-500">
                        Drag &amp; drop or <span className="text-primary">browse</span>
                      </p>
                      <p className="text-xs text-gray-400">{fileHint}</p>
                      <input
                        ref={fileRef}
                        type="file"
                        accept={fileAccept}
                        className="hidden"
                        onChange={(e) => { const f = e.target.files?.[0]; if (f) setUploadFile(f); e.target.value = ""; }}
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4 pt-1">
                  <button
                    onClick={handleUpload}
                    disabled={!uploadTitle.trim() || !uploadFile || uploading}
                    className="px-6 py-2.5 bg-primary text-white text-base hover:bg-primary/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {uploading && (
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                    )}
                    {uploading ? "Uploading…" : "Upload File"}
                  </button>
                  <AnimatePresence>
                    {uploaded && (
                      <motion.div
                        initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                        className="flex items-center gap-2 text-green-700 text-base"
                      >
                        <IconCheckCircle className="w-4 h-4" /> Uploaded successfully
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Delete modal ── */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setDeleteTarget(null)}
          >
            <motion.div
              className="bg-white shadow-xl p-6 max-w-sm w-full mx-4 rounded-2xl"
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-medium text-gray-900">
                Delete &quot;{deleteTarget.name}&quot;?
              </h3>
              <p className="text-base text-gray-600 mt-2">
                This permanently deletes the {deleteTarget.type === "pdf" ? "PDF" : "video"}.
              </p>
              <div className="flex justify-end gap-2 mt-5">
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="px-4 py-2 text-base text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 text-base bg-red-600 text-white hover:bg-red-700 rounded-lg font-medium"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Inline breadcrumb arrow
function Chevron() {
  return (
    <svg className="w-3 h-3 shrink-0" viewBox="0 0 8 8" fill="none">
      <path d="M 2,1 L 6,4 L 2,7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}