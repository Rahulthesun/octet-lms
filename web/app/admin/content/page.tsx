"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckIcon, XMarkIcon, TrashIcon } from "@heroicons/react/16/solid";
import {
  IconPlay,
  IconDocument,
  IconClose,
  IconCheckCircle,
} from "@/components/ui/SvgIcons";
import { useContentTree } from "../../../hooks/admin/useContentTree";
import { PdfViewer } from "../../../components/admin/PDFViewer";

// ─── Backend shapes ────────────────────────────────────────────────────────────

interface BackendSubject {
  id: string;
  name: string;
}
interface BackendChapter {
  id: string;
  name: string;
}

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
type AnyFile = BackendPdf | BackendVideo;
type NoticeType = "success" | "error" | "info";

const CONTENT_ACCEPT = ".pdf,.pptx";
const ALLOWED_CONTENT_MIME_TYPES = new Set([
  "application/pdf",
  //"application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);

type DeleteTarget = {
  type: ContentType;
  chapterId: string;
  itemId: string;
  name: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const BASE_URL = process.env.NEXT_PUBLIC_SERVER_URL ?? "http://localhost:8000";

function fmt(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
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
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (
    parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + " " + sizes[i]
  );
}

// ─── Icons ────────────────────────────────────────────────────────────────────

{
  /*
  function TrashIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none">
      <path d="M 3,4.5 H 13 M 6,4.5 V 3 Q 6,2.5 6.5,2.5 H 9.5 Q 10,2.5 10,3 V 4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M 4.5,4.5 L 5,13.5 Q 5,14 5.5,14 H 10.5 Q 11,14 11,13.5 L 11.5,4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M 7,7 V 11.5 M 9,7 V 11.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}
  */
}

function SearchIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none">
      <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.3" />
      <path
        d="M 10.5,10.5 L 14,14"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function PlusIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 12 12" fill="none">
      <path
        d="M 6,1 L 6,11 M 1,6 L 11,6"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ChevronIcon({
  open,
  className = "w-3.5 h-3.5",
}: {
  open: boolean;
  className?: string;
}) {
  return (
    <svg
      className={`shrink-0 transition-transform ${open ? "rotate-180" : ""} ${className}`}
      viewBox="0 0 12 12"
      fill="none"
    >
      <path
        d="M 2,4 L 6,8 L 10,4"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── Storage bar — receives live values as props ───────────────────────────────

function getResponseError(data: any, fallback: string) {
  return data?.message ?? data?.error ?? fallback;
}

function getContentFileError(file: File | null) {
  if (!file) return "Please choose a PDF or PPTX file.";
  const extension = file.name.split(".").pop()?.toLowerCase();
  const validByExtension = extension === "pdf"; //|| extension === "pptx";
  const validByMime = !file.type || ALLOWED_CONTENT_MIME_TYPES.has(file.type);

  if (!validByExtension || !validByMime) {
    return "Only PDF and PPTX files are supported right now. DOCX and video uploads are disabled.";
  }

  return null;
}

function isPreviewablePdf(file: AnyFile | null) {
  if (!file) return false;
  const extension = file.filename?.split(".").pop()?.toLowerCase();
  return file.mime_type === "application/pdf" || extension === "pdf";
}

function StorageBar({ totalBytes }: { totalBytes: number }) {
  const TOTAL_GB = 60;
  const limitBytes = TOTAL_GB * 1024 * 1024 * 1024;
  const usedPct = Math.min((totalBytes / limitBytes) * 100, 100);

  return (
    <div className="flex items-center gap-4 bg-white p-4 rounded-2xl">
      <div className="flex-1">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-600 text-base">Content Storage</span>
          <span className="font-inter font-bold text-primary">
            {formatBytes(totalBytes)} / {formatBytes(limitBytes)}
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
        <span className="font-inter">
          {formatBytes(limitBytes - totalBytes)}
        </span>{" "}
        free
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
    deleteChapter, // ← Add this line
    loadChapterContent,
    addChapter,
    updatePdfs,
    updateVideos,
    getStorage,
  } = useContentTree();

  // Fetch storage on mount
  useEffect(() => {
    getStorage();
  }, []);

  // ── Navigation state ───────────────────────────────────────────────────────
  const [openSubjectId, setOpenSubjectId] = useState<string | null>(null);
  const [openChapterId, setOpenChapterId] = useState<string | null>(null);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // ── Per-chapter PDF / Video toggle ────────────────────────────────────────
  const [chapterContentType, setChapterContentType] = useState<
    Record<string, ContentType>
  >({});

  // ── Add chapter inline form ────────────────────────────────────────────────
  const [addingChapterToSubject, setAddingChapterToSubject] = useState<
    string | null
  >(null);
  const [newChapterName, setNewChapterName] = useState("");
  const [addingChapter, setAddingChapter] = useState(false);

  // ── Delete confirmation ────────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [deletingChapter, setDeletingChapter] = useState<{
    id: string;
    name: string;
    subjectName: string;
    idx: number;
    files: { id: string; name: string; type: "pdf" | "video" }[];
  } | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  // ── File edit state ────────────────────────────────────────────────────────
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [replaceFile, setReplaceFile] = useState<File | null>(null);
  const [replaceDragging, setReplaceDragging] = useState(false);
  const [editSaved, setEditSaved] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const replaceFileRef = useRef<HTMLInputElement>(null);

  // ── Upload state ───────────────────────────────────────────────────────────
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDesc, setUploadDesc] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<{
    type: NoticeType;
    message: string;
  } | null>(null);
  const [deletingFile, setDeletingFile] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);


  // ── Derived: selected path ─────────────────────────────────────────────────
  const selectedPath = (() => {
    if (!openChapterId || !openSubjectId) return null;
    const subject =
      (subjects as BackendSubject[]).find((s) => s.id === openSubjectId) ??
      null;
    const chapter =
      ((chaptersMap[openSubjectId] ?? []) as BackendChapter[]).find(
        (c) => c.id === openChapterId,
      ) ?? null;
    if (!subject || !chapter) return null;
    const contentType: ContentType = chapterContentType[openChapterId] ?? "pdf";
    return { subject, chapter, contentType };
  })();

  // ── Derived: selected file ─────────────────────────────────────────────────
  const selectedFile: AnyFile | null = (() => {
    if (!selectedItemId || !openChapterId) return null;
    const ct = chapterContentType[openChapterId] ?? "pdf";
    const list =
      ct === "pdf"
        ? ((pdfsMap[openChapterId] ?? []) as BackendPdf[])
        : ((videosMap[openChapterId] ?? []) as BackendVideo[]);
    return list.find((f) => f.id === selectedItemId) ?? null;
  })();

  // ── Derived: PDF preview URL ───────────────────────────────────────────────
  // Requires NEXT_PUBLIC_R2_PUBLIC_URL in .env.local
  // Proxy through Express — avoids CORS and keeps the real R2 URL off the client.
  // Falls back to null for locally-optimistic files (id starts with "local-").

    useEffect(() => {
      if (
        selectedPath?.contentType !== "pdf" ||
        !selectedFile?.id ||
        !isPreviewablePdf(selectedFile) ||
        selectedFile.id.startsWith("local-")
      ) {
        setPdfPreviewUrl(null);
        return;
      }

      setPdfPreviewUrl(null);

      fetch(`${BASE_URL}/api/content/pdf/${selectedFile.id}/stream`)
        .then((res) => res.json())
        .then((data) => setPdfPreviewUrl(data.url))
        .catch(() => setPdfPreviewUrl(null));
    }, [selectedPath?.contentType, selectedFile]);

  // ── Search visibility ──────────────────────────────────────────────────────
  const visibility = (() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return null;

    const visibleSubjects = new Set<string>();
    const visibleChapters = new Set<string>();
    const visiblePdfs = new Set<string>();
    const visibleVideos = new Set<string>();

    for (const subject of subjects as BackendSubject[]) {
      const subMatch = subject.name.toLowerCase().includes(q);
      for (const chapter of (chaptersMap[subject.id] ??
        []) as BackendChapter[]) {
        const chMatch = chapter.name.toLowerCase().includes(q);
        let anyFile = false;
        for (const pdf of (pdfsMap[chapter.id] ?? []) as BackendPdf[]) {
          if (pdf.title.toLowerCase().includes(q) || chMatch || subMatch) {
            visiblePdfs.add(pdf.id);
            anyFile = true;
          }
        }
        for (const video of (videosMap[chapter.id] ?? []) as BackendVideo[]) {
          if (video.title.toLowerCase().includes(q) || chMatch || subMatch) {
            visibleVideos.add(video.id);
            anyFile = true;
          }
        }
        if (chMatch || subMatch || anyFile) visibleChapters.add(chapter.id);
      }
      const anyCh = ((chaptersMap[subject.id] ?? []) as BackendChapter[]).some(
        (c) => visibleChapters.has(c.id),
      );
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
    setEditError(null);
  }

  function showNotice(type: NoticeType, message: string) {
    setActionNotice({ type, message });
    window.setTimeout(() => setActionNotice(null), 6000);
  }

  // ─── ⬇ YOUR API INTEGRATION — implement handleAddChapter ──────────────────
  async function handleAddChapter(
    subjectId: string,
    name: string,
  ): Promise<{ id: string; name: string } | null> {
    const res = await fetch(`${BASE_URL}/api/chapters`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subjectId: subjectId, name: name }),
    });
    if (!res.ok) throw new Error("Failed to create chapter");
    const data = await res.json();

    return data.chapter ?? data;
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
    if (!uploadTitle.trim() || !uploadFile || !selectedPath || uploading)
      return;
    const { chapter, contentType } = selectedPath;

    setUploadError(null);
    setUploaded(false);

    if (contentType === "video") {
      setUploadError(
        "Video uploads are disabled right now. Please upload PDF or PPTX content only.",
      );
      return;
    }

    const validationError = getContentFileError(uploadFile);
    if (validationError) {
      setUploadError(validationError);
      return;
    }

    setUploading(true);

    const formData = new FormData();
    formData.append("title", uploadTitle.trim());
    formData.append("chapterId", chapter.id);
    formData.append("file", uploadFile);
    if (uploadDesc.trim()) formData.append("description", uploadDesc.trim());

    try {
      const res = await fetch(`${BASE_URL}/api/content/pdf/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(getResponseError(err, `Upload failed (${res.status})`));
      }

      const data = await res.json();
      const newItem = data?.pdf ?? data;

      updatePdfs(chapter.id, (pdfs: BackendPdf[]) => [
        ...pdfs,
        newItem as BackendPdf,
      ]);

      getStorage();

      setUploaded(true);
      setUploadFile(null);
      setUploadTitle("");
      setUploadDesc("");
      setTimeout(() => setUploaded(false), 4000);
    } catch (err) {
      setUploadError(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred while uploading.",
      );
    } finally {
      setUploading(false);
    }
  }

  // ── Save file edit ─────────────────────────────────────────────────────────
  async function handleSaveFileEdit() {
    if (!selectedFile || !selectedPath || !editTitle.trim() || savingEdit)
      return;
    const { chapter, contentType } = selectedPath;

    setEditError(null);
    setEditSaved(false);

    if (contentType === "video") {
      setEditError("Video management is disabled right now.");
      return;
    }

    const validationError = replaceFile
      ? getContentFileError(replaceFile)
      : null;
    if (validationError) {
      setEditError(validationError);
      return;
    }

    setSavingEdit(true);

    try {
      if (replaceFile) {
        const formData = new FormData();
        formData.append("title", editTitle.trim());
        formData.append("chapterId", chapter.id);
        formData.append("file", replaceFile);
        if (editDesc.trim()) formData.append("description", editDesc.trim());

        const uploadRes = await fetch(`${BASE_URL}/api/content/pdf/upload`, {
          method: "POST",
          body: formData,
        });

        if (!uploadRes.ok) {
          const err = await uploadRes.json().catch(() => null);
          throw new Error(
            getResponseError(
              err,
              `Replacement upload failed (${uploadRes.status})`,
            ),
          );
        }

        const uploadedData = await uploadRes.json();
        const replacement = (uploadedData?.pdf ?? uploadedData) as BackendPdf;

        const deleteRes = await fetch(
          `${BASE_URL}/api/content/pdf/${selectedFile.id}`,
          {
            method: "DELETE",
          },
        );

        if (!deleteRes.ok) {
          const err = await deleteRes.json().catch(() => null);
          throw new Error(
            getResponseError(
              err,
              "Replacement uploaded, but deleting the old file failed.",
            ),
          );
        }

        updatePdfs(chapter.id, (pdfs: BackendPdf[]) =>
          pdfs.map((p) => (p.id === selectedFile.id ? replacement : p)),
        );
        setSelectedItemId(replacement.id);
        getStorage();
      } else {
        const res = await fetch(
          `${BASE_URL}/api/content/pdf/${selectedFile.id}`,
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: editTitle.trim() }),
          },
        );

        if (!res.ok) {
          const err = await res.json().catch(() => null);
          throw new Error(
            getResponseError(err, `Failed to save changes (${res.status})`),
          );
        }

        const updated = (await res.json()) as BackendPdf;
        updatePdfs(chapter.id, (pdfs: BackendPdf[]) =>
          pdfs.map((p) =>
            p.id === selectedFile.id ? { ...p, ...updated } : p,
          ),
        );
      }

      setReplaceFile(null);
      setEditSaved(true);
      setTimeout(() => setEditSaved(false), 4000);
    } catch (err) {
      setEditError(
        err instanceof Error ? err.message : "Failed to save changes.",
      );
    } finally {
      setSavingEdit(false);
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  async function confirmDelete() {
    if (!deleteTarget || deletingFile) return;
    setDeletingFile(true);

    try {
      const endpoint = deleteTarget.type === "pdf" ? "pdf" : "video";
      const res = await fetch(
        `${BASE_URL}/api/content/${endpoint}/${deleteTarget.itemId}`,
        {
          method: "DELETE",
        },
      );

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(
          getResponseError(err, `Failed to delete ${deleteTarget.type}.`),
        );
      }

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
      showNotice(
        "info",
        "File deleted. Storage usage may take a few minutes to reflect Cloudflare R2 cleanup.",
      );
      window.setTimeout(() => getStorage(), 5000);
    } catch (err) {
      showNotice(
        "error",
        err instanceof Error ? err.message : "Failed to delete file.",
      );
    } finally {
      setDeletingFile(false);
    }
  }

  // ── Delete chapter ─────────────────────────────────────────────────────────

  const handleDeleteChapter = (chapter: {
    id: string;
    name: string;
    subjectName: string;
    idx: number;
    files: { id: string; name: string; type: "pdf" | "video" }[];
  }) => {
    setDeletingChapter(chapter);
  };

  // In your useContentTree hook file (hooks/admin/useContentTree.ts)
  const confirmDeleteChapter = async () => {
    if (!deletingChapter) return;
    setConfirmingDelete(true);

    try {
      // Find subjectId for this chapter
      let subjectId = null;
      for (const [sid, chapters] of Object.entries(chaptersMap)) {
        if (chapters.some((ch: any) => ch.id === deletingChapter.id)) {
          subjectId = sid;
          break;
        }
      }

      if (!subjectId) throw new Error("Subject not found for this chapter");

      // Call the deleteChapter method from your hook
      await deleteChapter(subjectId, deletingChapter.id);

      // If the deleted chapter was currently open, close it
      if (openChapterId === deletingChapter.id) {
        setOpenChapterId(null);
        setSelectedItemId(null);
      }

      // Close modal
      setDeletingChapter(null);
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Failed to delete chapter");
    } finally {
      setConfirmingDelete(false);
    }
  };
  // ── Render vars ────────────────────────────────────────────────────────────
  const isVideo = selectedPath?.contentType === "video";
  const fileAccept = isVideo ? "" : CONTENT_ACCEPT;
  const fileHint = isVideo
    ? "Video uploads are disabled right now"
    : "PDF or PPTX — max 50 MB";

  const noMatches =
    visibility &&
    (subjects as BackendSubject[]).every(
      (s) => !visibility.visibleSubjects.has(s.id),
    );

  const visibleSubjects = visibility
    ? (subjects as BackendSubject[]).filter((s) =>
        visibility.visibleSubjects.has(s.id),
      )
    : (subjects as BackendSubject[]);

  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full p-3">
      {/* ── Page header ── */}
      <div className="shrink-0 px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="shrink-0">
            <h1 className="text-3xl font-bold text-gray-900">
              Content Manager
            </h1>
            <p className="text-base text-gray-600 mt-1">
              Select a subject and chapter — then upload PDF or PPTX content.
            </p>
          </div>
          <div className="lg:w-100 shrink-0">
            <StorageBar totalBytes={storage.totalBytes} />
          </div>
        </div>
        {actionNotice && (
          <div
            className={`mt-3 rounded-xl border px-4 py-2 text-sm ${
              actionNotice.type === "error"
                ? "border-red-200 bg-red-50 text-red-700"
                : actionNotice.type === "success"
                  ? "border-green-200 bg-green-50 text-green-700"
                  : "border-primary/20 bg-primary/5 text-primary"
            }`}
          >
            {actionNotice.message}
          </div>
        )}
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
              <div className="p-8 text-center text-gray-400 text-base">
                Loading subjects…
              </div>
            )}
            {error && (
              <div className="p-8 text-center text-red-400 text-base">
                Error: {error}
              </div>
            )}

            {noMatches ? (
              <div className="p-8 text-center text-gray-400 text-base">
                No matches for &quot;{searchQuery}&quot;
              </div>
            ) : (
              visibleSubjects.map((subject) => {
                const subjectOpen = openSubjectId === subject.id;
                const chapters = (chaptersMap[subject.id] ??
                  []) as BackendChapter[];

                return (
                  <div
                    key={subject.id}
                    className="border-b border-gray-100 last:border-0"
                  >
                    {/* Subject row */}
                    <button
                      onClick={() => toggleSubject(subject.id)}
                      className={`w-full flex items-center gap-3 pl-4 pr-4 py-3 text-left transition-colors ${
                        subjectOpen ? "bg-gray-50" : "hover:bg-gray-50"
                      }`}
                    >
                      <span className="flex-1 text-lg text-gray-800 font-medium">
                        {subject.name}
                      </span>
                      <ChevronIcon
                        open={subjectOpen}
                        className="w-3.5 h-3.5 text-gray-400"
                      />
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
                            {chaptersMap[subject.id] !== undefined &&
                              chapters.length === 0 && (
                                <div className="pl-8 py-3 text-sm text-gray-400 italic">
                                  No chapters yet — add one below
                                </div>
                              )}

                            {/* Chapter rows */}
                            {chapters
                              .filter(
                                (ch) =>
                                  !visibility ||
                                  visibility.visibleChapters.has(ch.id),
                              )
                              .map((chapter, idx) => {
                                const chapterOpen =
                                  openChapterId === chapter.id;
                                const contentType =
                                  chapterContentType[chapter.id] ?? "pdf";
                                const pdfsLoaded =
                                  pdfsMap[chapter.id] !== undefined;
                                const videosLoaded =
                                  videosMap[chapter.id] !== undefined;
                                const anyLoaded = pdfsLoaded || videosLoaded;
                                const currentLoaded =
                                  contentType === "pdf"
                                    ? pdfsLoaded
                                    : videosLoaded;
                                const currentFiles =
                                  contentType === "pdf"
                                    ? ((pdfsMap[chapter.id] ??
                                        []) as BackendPdf[])
                                    : ((videosMap[chapter.id] ??
                                        []) as BackendVideo[]);

                                return (
                                  <div key={chapter.id}>
                                    {/* Chapter row */}
                                    <button
                                      onClick={() => toggleChapter(chapter.id)}
                                      className={`w-full flex items-center gap-2.5 pl-8 pr-4 py-2.5 text-left transition-colors ${
                                        chapterOpen
                                          ? "bg-gray-50"
                                          : "hover:bg-gray-50"
                                      }`}
                                    >
                                      <span className="text-sm text-gray-400 shrink-0 w-auto">
                                        Chap - {idx + 1}
                                      </span>
                                      <span className="flex-1 text-md text-gray-700 leading-snug">
                                        {chapter.name}
                                      </span>

                                      <ChevronIcon
                                        open={chapterOpen}
                                        className="w-3 h-3 text-gray-400"
                                      />
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
                                                {/* Type toggle pill. Videos remain hidden until the feature is enabled. */}
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    switchContentType(
                                                      chapter.id,
                                                      "pdf",
                                                    );
                                                  }}
                                                  className={`px-3 py-0.5 text-xs rounded-full border transition-colors cursor-pointer ${
                                                    contentType === "pdf"
                                                      ? "bg-primary text-white border-primary"
                                                      : "border-gray-300 text-gray-500 hover:border-gray-400"
                                                  }`}
                                                >
                                                  PDF Files
                                                </button>

                                                {/* Spacer */}
                                                <span className="flex-1" />

                                                {/* Add PDF / Add Video buttons */}
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    openUploadFor(
                                                      chapter.id,
                                                      "pdf",
                                                    );
                                                  }}
                                                  title="Upload PDF"
                                                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-primary transition-colors px-1.5 py-1 rounded hover:bg-gray-100 cursor-pointer"
                                                >
                                                  <PlusIcon className="w-3 h-3" />
                                                  <IconDocument className="w-3.5 h-3.5" />
                                                </button>

                                                {/* Delete chapter button */}
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteChapter({
                                                      id: chapter.id,
                                                      name: chapter.name,
                                                      subjectName: subject.name,
                                                      idx,
                                                      files: [
                                                        ...(
                                                          (pdfsMap[
                                                            chapter.id
                                                          ] ??
                                                            []) as BackendPdf[]
                                                        )
                                                          .filter(
                                                            (f) =>
                                                              !visibility ||
                                                              visibility.visiblePdfs.has(
                                                                f.id,
                                                              ),
                                                          )
                                                          .map((f) => ({
                                                            id: f.id,
                                                            name: f.title,
                                                            type: "pdf" as const,
                                                          })),
                                                        ...(
                                                          (videosMap[
                                                            chapter.id
                                                          ] ??
                                                            []) as BackendVideo[]
                                                        )
                                                          .filter(
                                                            (f) =>
                                                              !visibility ||
                                                              visibility.visibleVideos.has(
                                                                f.id,
                                                              ),
                                                          )
                                                          .map((f) => ({
                                                            id: f.id,
                                                            name: f.title,
                                                            type: "video" as const,
                                                          })),
                                                      ],
                                                    });
                                                  }}
                                                  className="shrink-0 rounded-lg p-1.5 bg-transparent transition-all
                                                  roup-hover:text-gray-300 text-red-400 hover:bg-red-100"
                                                  title="Delete chapter"
                                                >
                                                  <TrashIcon className="h-3.5 w-3.5" />
                                                </button>
                                              </div>
                                            )}

                                            {/* Per-type loading */}
                                            {anyLoaded && !currentLoaded && (
                                              <div className="pl-10 py-1.5 text-sm text-gray-400 italic">
                                                Loading…
                                              </div>
                                            )}

                                            {/* Empty state */}
                                            {currentLoaded &&
                                              currentFiles.length === 0 && (
                                                <div className="pl-10 pr-4 py-1.5 text-sm text-gray-400 italic">
                                                  No{" "}
                                                  {contentType === "pdf"
                                                    ? "content files"
                                                    : "videos"}{" "}
                                                  uploaded yet
                                                </div>
                                              )}

                                            {/* File rows */}
                                            {currentLoaded &&
                                              currentFiles
                                                .filter(
                                                  (f) =>
                                                    !visibility ||
                                                    (contentType === "pdf"
                                                      ? visibility.visiblePdfs.has(
                                                          f.id,
                                                        )
                                                      : visibility.visibleVideos.has(
                                                          f.id,
                                                        )),
                                                )
                                                .map((file) => {
                                                  const fileSelected =
                                                    selectedItemId === file.id;
                                                  return (
                                                    <button
                                                      key={file.id}
                                                      onClick={() =>
                                                        selectFile(
                                                          file.id,
                                                          file.title,
                                                        )
                                                      }
                                                      className={`w-full flex items-center gap-2 pl-10 pr-4 py-1.5 text-left border-l-2 transition-colors ${
                                                        fileSelected
                                                          ? "bg-[#f5f0fa] border-primary text-primary"
                                                          : "border-transparent text-gray-700 hover:bg-gray-50"
                                                      }`}
                                                    >
                                                      {contentType ===
                                                      "video" ? (
                                                        <IconPlay className="w-4 h-4 shrink-0 text-primary" />
                                                      ) : (
                                                        <IconDocument
                                                          className={`w-4 h-4 shrink-0 ${fileSelected ? "text-primary" : "text-gray-400"}`}
                                                        />
                                                      )}
                                                      <span className="flex-1 text-sm truncate">
                                                        {file.title}
                                                      </span>
                                                      <span
                                                        className={`text-xs shrink-0 ${fileSelected ? "text-primary/70" : "text-gray-400"}`}
                                                      >
                                                        {fmtSize(
                                                          file.size_bytes,
                                                        )}
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
                            {!visibility &&
                              chaptersMap[subject.id] !== undefined &&
                              (addingChapterToSubject === subject.id ? (
                                <div className="mx-4 mb-3 mt-1 rounded-xl border border-primary/30 bg-primary/5 p-3 shadow-sm ring-1 ring-primary/10">
                                  <p className="mb-2 text-xs font-medium tracking-wide text-primary/70 uppercase">
                                    New Chapter
                                  </p>
                                  <div className="flex items-center gap-2">
                                    <input
                                      autoFocus
                                      type="text"
                                      value={newChapterName}
                                      onChange={(e) =>
                                        setNewChapterName(e.target.value)
                                      }
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter")
                                          submitAddChapter(subject.id);
                                        if (e.key === "Escape")
                                          cancelAddChapter();
                                      }}
                                      placeholder="e.g. Atomic Structure"
                                      className="flex-1 rounded-lg border border-primary/30 bg-white px-3 py-2 text-sm text-gray-800 placeholder-gray-400 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                                    />
                                    <button
                                      onClick={() =>
                                        submitAddChapter(subject.id)
                                      }
                                      disabled={
                                        addingChapter || !newChapterName.trim()
                                      }
                                      className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                      {addingChapter ? (
                                        <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                                      ) : (
                                        <CheckIcon className="h-3.5 w-3.5" />
                                      )}
                                      Add
                                    </button>
                                    <button
                                      onClick={cancelAddChapter}
                                      className="rounded-lg border border-gray-200 p-2 text-gray-400 transition hover:border-gray-300 hover:bg-gray-50 hover:text-gray-600"
                                    >
                                      <XMarkIcon className="h-4 w-4" />
                                    </button>
                                  </div>
                                  <p className="mt-2 text-xs text-gray-400">
                                    Press{" "}
                                    <kbd className="rounded border border-gray-200 bg-white px-1 py-0.5 font-mono text-[10px] text-gray-500">
                                      Enter
                                    </kbd>{" "}
                                    to save ·{" "}
                                    <kbd className="rounded border border-gray-200 bg-white px-1 py-0.5 font-mono text-[10px] text-gray-500">
                                      Esc
                                    </kbd>{" "}
                                    to cancel
                                  </p>
                                </div>
                              ) : (
                                <button
                                  onClick={() => {
                                    setAddingChapterToSubject(subject.id);
                                    setNewChapterName("");
                                  }}
                                  className="mx-4 mb-3 mt-1 flex w-[calc(100%-2rem)] items-center justify-center gap-2 rounded-xl border border-dashed border-gray-200 py-2.5 text-sm text-gray-400 transition hover:border-primary/40 hover:bg-primary/5 hover:text-primary cursor-pointer"
                                >
                                  <PlusIcon className="h-4 w-4" />
                                  Add Chapter
                                </button>
                              ))}
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
          {selectedFile &&
          selectedPath &&
          selectedPath.contentType === "pdf" ? (
            <div className="p-4 space-y-4">
              {/* Breadcrumb + Delete */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-1.5 text-sm text-gray-400 flex-wrap">
                  <Chevron />
                  <span>{selectedPath.subject.name}</span>
                  <Chevron />
                  <span className="truncate max-w-32">
                    {selectedPath.chapter.name}
                  </span>
                  <Chevron />
                  <span className="shrink-0">Content Files</span>
                  <Chevron />
                  <span className="text-primary font-medium truncate max-w-40">
                    {selectedFile.title}
                  </span>
                </div>
                <button
                  onClick={() =>
                    setDeleteTarget({
                      type: "pdf",
                      chapterId: selectedPath.chapter.id,
                      itemId: selectedFile.id,
                      name: selectedFile.title,
                    })
                  }
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded hover:bg-red-50 transition-colors"
                >
                  <TrashIcon className="w-3.5 h-3.5" /> Delete
                </button>
              </div>

              {isPreviewablePdf(selectedFile) ? (
                <PdfViewer
                  url={pdfPreviewUrl}
                  filename={
                    (selectedFile as BackendPdf).filename || selectedFile.title
                  }
                  className="h-[68vh]"
                />
              ) : (
                <div className="flex h-48 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-gray-200 bg-white text-center">
                  <IconDocument className="h-8 w-8 text-gray-300" />
                  <p className="text-sm font-medium text-gray-600">
                    Preview not available
                  </p>
                  <p className="text-xs text-gray-400">
                    PPTX files can be uploaded and downloaded later, but inline
                    preview is currently only available for PDFs.
                  </p>
                </div>
              )}

              {/* Edit metadata card */}
              <div className="bg-white shadow-sm p-4 rounded-2xl space-y-5">
                <h3 className="text-sm font-medium text-gray-600 uppercase tracking-wide">
                  Edit Metadata
                </h3>

                {/* Size / date pill */}
                <div className="flex items-center gap-3 text-sm text-gray-500 bg-gray-50 px-4 py-2.5 rounded-lg">
                  <IconDocument className="w-5 h-5 text-gray-400 shrink-0" />
                  <span>
                    {fmtSize(selectedFile.size_bytes)} · Document · uploaded{" "}
                    {fmt(selectedFile.created_at)}
                  </span>
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
                    Description{" "}
                    <span className="text-gray-300">(optional)</span>
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
                    Replace file{" "}
                    <span className="text-gray-300">(optional)</span>
                  </label>
                  {replaceFile ? (
                    <div className="border border-gray-200 rounded-lg px-4 py-3 flex items-center gap-3">
                      <IconDocument className="w-5 h-5 text-gray-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-base text-gray-800 truncate">
                          {replaceFile.name}
                        </p>
                        <p className="text-sm text-gray-400">
                          {(replaceFile.size / 1024 / 1024).toFixed(1)} MB
                        </p>
                      </div>
                      <button
                        onClick={() => setReplaceFile(null)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <IconClose className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setReplaceDragging(true);
                      }}
                      onDragLeave={() => setReplaceDragging(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setReplaceDragging(false);
                        const f = e.dataTransfer.files[0];
                        if (f) setReplaceFile(f);
                      }}
                      onClick={() => replaceFileRef.current?.click()}
                      className={`border-2 border-dashed rounded-lg flex flex-col items-center justify-center gap-2 py-6 cursor-pointer transition-colors ${
                        replaceDragging
                          ? "border-primary bg-gray-50"
                          : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                      }`}
                    >
                      <p className="text-sm text-gray-500">
                        Drag &amp; drop a new file or{" "}
                        <span className="text-primary">browse</span>
                      </p>
                      <input
                        ref={replaceFileRef}
                        type="file"
                        accept={CONTENT_ACCEPT}
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) {
                            const err = getContentFileError(f);
                            setEditError(err);
                            if (!err) setReplaceFile(f);
                          }
                          e.target.value = "";
                        }}
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4 pt-1">
                  <button
                    onClick={handleSaveFileEdit}
                    disabled={!editTitle.trim() || savingEdit}
                    className="px-6 py-2.5 bg-primary text-white text-base rounded-lg hover:bg-primary/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {savingEdit ? "Saving…" : "Save changes"}
                  </button>
                  {editError && (
                    <p className="text-sm text-red-600">{editError}</p>
                  )}
                  <AnimatePresence>
                    {editSaved && (
                      <motion.div
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-2 text-green-700 text-base"
                      >
                        <IconCheckCircle className="w-4 h-4" /> Saved
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          ) : selectedFile &&
            selectedPath &&
            selectedPath.contentType === "video" ? (
            /* ── Video selected: edit form (no viewer) ── */
            <div className="p-4">
              <div className="flex items-start justify-between gap-3 mb-6">
                <div className="flex items-center gap-1.5 text-sm text-gray-400 flex-wrap">
                  <Chevron />
                  <span>{selectedPath.subject.name}</span>
                  <Chevron />
                  <span className="truncate max-w-32">
                    {selectedPath.chapter.name}
                  </span>
                  <Chevron />
                  <span className="shrink-0">Videos</span>
                  <Chevron />
                  <span className="text-primary font-medium truncate max-w-40">
                    {selectedFile.title}
                  </span>
                </div>
                <button
                  onClick={() =>
                    setDeleteTarget({
                      type: "video",
                      chapterId: selectedPath.chapter.id,
                      itemId: selectedFile.id,
                      name: selectedFile.title,
                    })
                  }
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
                    <p className="text-base text-gray-800 truncate">
                      {selectedFile.title}
                    </p>
                    <p className="text-sm text-gray-400">
                      {fmtSize(selectedFile.size_bytes)} · Video · uploaded{" "}
                      {fmt(selectedFile.created_at)}
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
                    Description{" "}
                    <span className="text-gray-300">(optional)</span>
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
                    Replace file{" "}
                    <span className="text-gray-300">(optional)</span>
                  </label>
                  {replaceFile ? (
                    <div className="border border-gray-200 px-4 py-3 flex items-center gap-3">
                      <IconPlay className="w-5 h-5 text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-base text-gray-800 truncate">
                          {replaceFile.name}
                        </p>
                        <p className="text-sm text-gray-400">
                          {(replaceFile.size / 1024 / 1024).toFixed(1)} MB
                        </p>
                      </div>
                      <button
                        onClick={() => setReplaceFile(null)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <IconClose className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setReplaceDragging(true);
                      }}
                      onDragLeave={() => setReplaceDragging(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setReplaceDragging(false);
                        const f = e.dataTransfer.files[0];
                        if (f) setReplaceFile(f);
                      }}
                      onClick={() => replaceFileRef.current?.click()}
                      className={`border-2 border-dashed flex flex-col items-center justify-center gap-2 py-6 cursor-pointer transition-colors ${
                        replaceDragging
                          ? "border-primary bg-gray-50"
                          : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                      }`}
                    >
                      <p className="text-sm text-gray-500">
                        Drag &amp; drop a new file or{" "}
                        <span className="text-primary">browse</span>
                      </p>
                      <input
                        ref={replaceFileRef}
                        type="file"
                        accept=".mp4,.mov,.mkv,.avi"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) setReplaceFile(f);
                          e.target.value = "";
                        }}
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
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0 }}
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
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M 12,11 L 12,15.5 M 9.5,13 L 12,11 L 14.5,13"
                    stroke="currentColor"
                    strokeWidth="1.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <div>
                <p className="text-base text-gray-700">
                  Select a chapter from the left panel
                </p>
                <p className="text-sm text-gray-400 mt-1">
                  Then upload PDF or PPTX content.
                </p>
              </div>
            </div>
          ) : (
            /* ── Upload panel: chapter selected, no file selected ── */
            <div className="p-4">
              <div className="flex items-center gap-1.5 text-sm text-gray-400 mb-6 flex-wrap">
                <Chevron />
                <span>{selectedPath.subject.name}</span>
                <Chevron />
                <span className="truncate max-w-40">
                  {selectedPath.chapter.name}
                </span>
                <Chevron />
                <span className="text-primary font-medium shrink-0">
                  {selectedPath.contentType === "pdf"
                    ? "Content Files"
                    : "Videos"}
                </span>
              </div>

              <div className="bg-white shadow-sm p-4 rounded-2xl space-y-5">
                <h2 className="text-base font-medium text-gray-800">
                  Upload{" "}
                  {selectedPath.contentType === "pdf" ? "PDF or PPTX" : "Video"}{" "}
                  to {selectedPath.chapter.name}
                </h2>

                <div>
                  <label className="text-sm text-gray-500 block mb-1">
                    Title <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={uploadTitle}
                    onChange={(e) => setUploadTitle(e.target.value)}
                    placeholder={
                      isVideo
                        ? "e.g. Atomic Structure — Part 1"
                        : "e.g. Chapter Notes — Electrochemistry"
                    }
                    className="w-full border border-gray-200 px-4 py-2.5 text-base text-gray-800 placeholder-gray-300 outline-none focus:border-gray-400"
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-500 block mb-1">
                    Description{" "}
                    <span className="text-gray-300">(optional)</span>
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
                      {isVideo ? (
                        <IconPlay className="w-5 h-5 text-primary shrink-0" />
                      ) : (
                        <IconDocument className="w-5 h-5 text-gray-400 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-base text-gray-800 truncate">
                          {uploadFile.name}
                        </p>
                        <p className="text-sm text-gray-400">
                          {(uploadFile.size / 1024 / 1024).toFixed(1)} MB
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          setUploadFile(null);
                          setUploadError(null);
                        }}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <IconClose className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setDragging(true);
                      }}
                      onDragLeave={() => setDragging(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setDragging(false);
                        const f = e.dataTransfer.files[0];
                        if (f) {
                          const err = getContentFileError(f);
                          setUploadError(err);
                          if (!err) setUploadFile(f);
                        }
                      }}
                      onClick={() => fileRef.current?.click()}
                      className={`border-2 border-dashed flex flex-col items-center justify-center gap-2 py-8 cursor-pointer transition-colors ${
                        dragging
                          ? "border-primary bg-gray-50"
                          : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                      }`}
                    >
                      <p className="text-sm text-gray-500">
                        Drag &amp; drop or{" "}
                        <span className="text-primary">browse</span>
                      </p>
                      <p className="text-xs text-gray-400">{fileHint}</p>
                      <input
                        ref={fileRef}
                        type="file"
                        accept={fileAccept}
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) {
                            const err = getContentFileError(f);
                            setUploadError(err);
                            if (!err) setUploadFile(f);
                          }
                          e.target.value = "";
                        }}
                      />
                    </div>
                  )}
                </div>

                {uploadError && (
                  <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {uploadError}
                  </p>
                )}

                <div className="flex items-center gap-4 pt-1">
                  <button
                    onClick={handleUpload}
                    disabled={
                      !uploadTitle.trim() || !uploadFile || uploading || isVideo
                    }
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
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-2 text-green-700 text-base"
                      >
                        <IconCheckCircle className="w-4 h-4" /> Uploaded
                        successfully
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setDeleteTarget(null)}
          >
            <motion.div
              className="bg-white shadow-xl p-6 max-w-sm w-full mx-4 rounded-2xl"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-medium text-gray-900">
                Delete &quot;{deleteTarget.name}&quot;?
              </h3>
              <p className="text-base text-gray-600 mt-2">
                This removes the content from the admin list immediately.
                Storage usage may take a few minutes to update after R2 cleanup.
              </p>
              <div className="flex justify-end gap-2 mt-5">
                <button
                  onClick={() => setDeleteTarget(null)}
                  disabled={deletingFile}
                  className="px-4 py-2 text-base text-gray-600 hover:text-gray-800 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  disabled={deletingFile}
                  className="px-4 py-2 text-base bg-red-600 text-white hover:bg-red-700 rounded-lg font-medium disabled:opacity-50"
                >
                  {deletingFile ? "Deleting…" : "Delete"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Chapter Modal */}

      {/* Delete Chapter Modal */}
      {deletingChapter && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity duration-200"
            onClick={() => !confirmingDelete && setDeletingChapter(null)}
          />

          {/* Modal Container */}
          <div className="relative mx-4 w-full max-w-md transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all duration-200 animate-in fade-in zoom-in-95">
            {/* Header Section */}
            <div className="p-6 pb-3">
              <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-red-50">
                <TrashIcon className="h-5 w-5 text-red-500" />
              </div>

              <h2 className="text-lg font-semibold text-gray-900">
                Delete Chapter?
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                This will permanently delete the chapter and all its files. This
                action cannot be undone.
              </p>
            </div>

            {/* Chapter Details Card */}
            <div className="mx-6 mb-4 overflow-hidden rounded-xl border border-gray-100 bg-gray-50">
              <div className="divide-y divide-gray-100">
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-sm text-gray-400">Subject</span>
                  <span className="text-sm font-medium text-gray-700">
                    {deletingChapter.subjectName}
                  </span>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-sm text-gray-400">Chapter</span>
                  <span className="text-sm font-medium text-gray-700">
                    Chap - {deletingChapter.idx + 1}
                  </span>
                </div>
                <div className="flex items-center justify-between px-4 py-2.5">
                  <span className="text-sm text-gray-400">Name</span>
                  <span className="text-sm font-medium text-gray-700">
                    {deletingChapter.name}
                  </span>
                </div>
              </div>
            </div>

            {/* Files List Section */}
            <div className="mx-6 mb-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                  Files in this chapter
                </p>
                <span className="text-xs text-gray-400">
                  {deletingChapter.files.length} file
                  {deletingChapter.files.length !== 1 ? "s" : ""}
                </span>
              </div>

              {deletingChapter.files.length === 0 ? (
                <div className="rounded-xl border border-dashed border-gray-200 py-3 text-center">
                  <p className="text-xs text-gray-400">
                    No files — chapter is empty
                  </p>
                </div>
              ) : (
                <div className="max-h-36 overflow-y-auto rounded-xl border border-red-100 bg-red-50/50">
                  <div className="divide-y divide-red-100">
                    {deletingChapter.files.map((file, idx) => (
                      <div
                        key={file.id}
                        className="flex items-center gap-2.5 px-3 py-2"
                      >
                        <span className="shrink-0 text-[10px] font-mono text-red-300">
                          {String(idx + 1).padStart(2, "0")}
                        </span>

                        {file.type === "pdf" ? (
                          <IconDocument className="h-3.5 w-3.5 shrink-0 text-red-300" />
                        ) : (
                          <IconPlay className="h-3.5 w-3.5 shrink-0 text-red-300" />
                        )}

                        <span className="flex-1 truncate text-sm text-red-700">
                          {file.name}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 border-t border-gray-100 bg-gray-50/50 px-6 py-4">
              <button
                onClick={() => setDeletingChapter(null)}
                disabled={confirmingDelete}
                className="rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition-all duration-200 hover:bg-gray-50 hover:border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>

              <button
                onClick={confirmDeleteChapter}
                disabled={confirmingDelete}
                className="flex items-center gap-2 rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white transition-all duration-200 hover:bg-red-600 focus:ring-2 focus:ring-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {confirmingDelete && (
                  <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                )}
                {confirmingDelete ? "Deleting…" : "Yes, Delete Chapter"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Inline breadcrumb arrow
function Chevron() {
  return (
    <svg className="w-3 h-3 shrink-0" viewBox="0 0 8 8" fill="none">
      <path
        d="M 2,1 L 6,4 L 2,7"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
}
