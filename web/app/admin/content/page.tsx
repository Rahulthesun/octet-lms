"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  IconPlay,
  IconDocument,
  IconClose,
  IconCheckCircle,
} from "@/components/ui/SvgIcons";
import { useContentTree } from "@/hooks/useContentTree";

// ─── Backend shapes ────────────────────────────────────────────────────────────
// Adjust field names to match your actual API responses

interface BackendSubject  { id: string; name: string }
interface BackendChapter  { id: string; name: string }
interface BackendSubtopic { id: string; name: string; createdAt?: string }

// ─── Client-only shapes ────────────────────────────────────────────────────────
// Folders and files live in browser state only until you add those API endpoints

interface UploadedFile {
  id: string;
  name: string;
  description?: string;
  sizeBytes: number;
  uploadedAt: string;
  kind: "video" | "doc";
}

interface Folder {
  id: string;
  name: string;
  files: UploadedFile[];
}

type DeleteTarget =
  | { type: "folder"; subtopicId: string; folderId: string; name: string }
  | { type: "file"; subtopicId: string; folderId: string; fileId: string; name: string };

// ─── Constants ─────────────────────────────────────────────────────────────────

const DEFAULT_FOLDER_NAMES = ["Video Lectures", "PDF Notes"];

function fmt(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function isVidFolder(name: string) {
  return name.toLowerCase().includes("video");
}

function fmtSize(bytes: number) {
  const mb = bytes / 1024 / 1024;
  return mb >= 1
    ? `${mb.toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function makeDefaultFolders(subtopicId: string): Folder[] {
  return DEFAULT_FOLDER_NAMES.map((name, i) => ({
    id: `${subtopicId}-def-${i}`,
    name,
    files: [],
  }));
}

// ─── Icons ─────────────────────────────────────────────────────────────────────
// All unchanged — copy from original

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

function ChevronIcon({ open, className = "w-3.5 h-3.5" }: { open: boolean; className?: string }) {
  return (
    <svg className={`shrink-0 transition-transform ${open ? "rotate-180" : ""} ${className}`} viewBox="0 0 12 12" fill="none">
      <path d="M 2,4 L 6,8 L 10,4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function FolderIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none">
      <path d="M 1,5 Q 1,4 2,4 L 6.5,4 L 7.5,3 L 14,3 Q 15,3 15,4 L 15,12 Q 15,13 14,13 L 2,13 Q 1,13 1,12 Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
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

function KebabIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="3.5" r="1.4" fill="currentColor" />
      <circle cx="8" cy="8" r="1.4" fill="currentColor" />
      <circle cx="8" cy="12.5" r="1.4" fill="currentColor" />
    </svg>
  );
}

// ─── Storage bar (unchanged) ───────────────────────────────────────────────────

function StorageBar() {
  const used = 24.8, total = 50;
  const pct = (used / total) * 100;
  return (
    <div className="flex items-center gap-4 bg-white p-4 rounded-2xl">
      <div className="flex-1">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-600 text-base">Video Storage</span>
          <span className="font-inter font-bold text-primary">{used} / {total} GB</span>
        </div>
        <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
        </div>
      </div>
      <span className="text-sm text-gray-600 shrink-0">
        <span className="font-inter">{(total - used).toFixed(1)}</span> GB free
      </span>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function ContentPage() {
  // ── Backend data via hook ─────────────────────────────────────────────────
  const {
    subjects,
    chaptersMap,
    subtopicsMap,
    loading,
    error,
    loadChapters,
    loadSubtopics,
  } = useContentTree(); // grade drives the subjects fetch

  // ── Navigation state (IDs only) ────────────────────────────────────────────
  const [openSubjectId, setOpenSubjectId]   = useState<string | null>(null);
  const [openChapterId, setOpenChapterId]   = useState<string | null>(null);
  const [openSubtopicId, setOpenSubtopicId] = useState<string | null>(null);
  const [openFolderId, setOpenFolderId]     = useState<string | null>(null);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery]       = useState("");

  // ── Folders/files — client state, keyed by subtopicId ─────────────────────
  const [foldersMap, setFoldersMap] = useState<Record<string, Folder[]>>({});

  // ── Inline add inputs ──────────────────────────────────────────────────────
  const [addingFolderToSubtopic, setAddingFolderToSubtopic] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState("");

  // ── Delete confirmation ────────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  // ── Kebab menu + rename ────────────────────────────────────────────────────
  const [openMenuId, setOpenMenuId]     = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{ top: number; right: number } | null>(null);
  const menuRef                         = useRef<HTMLDivElement | null>(null);
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [renameValue, setRenameValue]   = useState("");

  // ── File edit state ────────────────────────────────────────────────────────
  const [editTitle, setEditTitle]         = useState("");
  const [editDesc, setEditDesc]           = useState("");
  const [replaceFile, setReplaceFile]     = useState<File | null>(null);
  const [replaceDragging, setReplaceDragging] = useState(false);
  const [editSaved, setEditSaved]         = useState(false);
  const replaceFileRef                    = useRef<HTMLInputElement>(null);

  // ── Upload state ───────────────────────────────────────────────────────────
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploadDesc, setUploadDesc]   = useState("");
  const [uploadFile, setUploadFile]   = useState<File | null>(null);
  const [dragging, setDragging]       = useState(false);
  const [uploaded, setUploaded]       = useState(false);
  const fileRef                       = useRef<HTMLInputElement>(null);

  // ── Click-outside for kebab menu ───────────────────────────────────────────
  useEffect(() => {
    if (!openMenuId) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node))
        setOpenMenuId(null);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [openMenuId]);

  // ── Derived: selected path (for breadcrumb + right panel) ─────────────────
  const selectedPath = (() => {
    if (!openFolderId || !openSubtopicId || !openChapterId || !openSubjectId)
      return null;
    const subject  = (subjects as BackendSubject[]).find((s) => s.id === openSubjectId) ?? null;
    const chapter  = (chaptersMap[openSubjectId] ?? []).find((c: BackendChapter) => c.id === openChapterId) ?? null;
    const subtopic = (subtopicsMap[openChapterId] ?? []).find((s: BackendSubtopic) => s.id === openSubtopicId) ?? null;
    const folder   = (foldersMap[openSubtopicId] ?? []).find((f) => f.id === openFolderId) ?? null;
    if (!subject || !chapter || !subtopic || !folder) return null;
    return { subject, chapter, subtopic, folder };
  })();

  const selectedFile = selectedPath
    ? selectedPath.folder.files.find((f) => f.id === selectedFileId) ?? null
    : null;

  // ── Derived: search visibility ─────────────────────────────────────────────
  // Note: only searches data that has already been lazy-loaded
  const visibility = (() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return null;

    const visibleSubjects  = new Set<string>();
    const visibleChapters  = new Set<string>();
    const visibleSubtopics = new Set<string>();
    const visibleFolders   = new Set<string>();
    const visibleFiles     = new Set<string>();

    for (const subject of (subjects as BackendSubject[])) {
      const subMatch = subject.name.toLowerCase().includes(q);
      for (const chapter of (chaptersMap[subject.id] ?? [])) {
        const chMatch = chapter.title.toLowerCase().includes(q);
        for (const subtopic of (subtopicsMap[chapter.id] ?? [])) {
          const stMatch = `${subtopic.title} ${fmt(subtopic.createdAt)}`.toLowerCase().includes(q);
          for (const folder of (foldersMap[subtopic.id] ?? [])) {
            const fMatch = folder.name.toLowerCase().includes(q);
            let anyFile = false;
            for (const file of folder.files) {
              if (file.name.toLowerCase().includes(q) || fMatch || stMatch || chMatch || subMatch) {
                visibleFiles.add(file.id);
                anyFile = true;
              }
            }
            if (fMatch || stMatch || chMatch || subMatch || anyFile) visibleFolders.add(folder.id);
          }
          const anyFolder = (foldersMap[subtopic.id] ?? []).some((f) => visibleFolders.has(f.id));
          if (stMatch || chMatch || subMatch || anyFolder) visibleSubtopics.add(subtopic.id);
        }
        const anyST = (subtopicsMap[chapter.id] ?? []).some((s: BackendSubtopic) => visibleSubtopics.has(s.id));
        if (chMatch || subMatch || anyST) visibleChapters.add(chapter.id);
      }
      const anyCh = (chaptersMap[subject.id] ?? []).some((c: BackendChapter) => visibleChapters.has(c.id));
      if (subMatch || anyCh) visibleSubjects.add(subject.id);
    }

    return { visibleSubjects, visibleChapters, visibleSubtopics, visibleFolders, visibleFiles };
  })();

  // ── Helpers ────────────────────────────────────────────────────────────────
  function clearMenus() {
    setOpenMenuId(null);
    setMenuPosition(null);
    setRenamingFolderId(null);
    setRenameValue("");
  }

  // Ensure a subtopic has folders initialized (default two on first open)
  function ensureFolders(subtopicId: string) {
    setFoldersMap((prev) => {
      if (prev[subtopicId]) return prev;
      return { ...prev, [subtopicId]: makeDefaultFolders(subtopicId) };
    });
  }

  function updateFolders(subtopicId: string, updater: (f: Folder[]) => Folder[]) {
    setFoldersMap((prev) => ({
      ...prev,
      [subtopicId]: updater(prev[subtopicId] ?? []),
    }));
  }

  // ── Navigation ─────────────────────────────────────────────────────────────
  function selectGrade(g: Grade) {
    setSelectedGrade(g);
    setOpenSubjectId(null);
    setOpenChapterId(null);
    setOpenSubtopicId(null);
    setOpenFolderId(null);
    setSelectedFileId(null);
    clearMenus();
  }

  function toggleSubject(subjectId: string) {
    const next = openSubjectId === subjectId ? null : subjectId;
    setOpenSubjectId(next);
    setOpenChapterId(null);
    setOpenSubtopicId(null);
    setOpenFolderId(null);
    setSelectedFileId(null);
    clearMenus();
    if (next) loadChapters(next); // lazy-load chapters
  }

  function toggleChapter(chapterId: string) {
    const next = openChapterId === chapterId ? null : chapterId;
    setOpenChapterId(next);
    setOpenSubtopicId(null);
    setOpenFolderId(null);
    setSelectedFileId(null);
    clearMenus();
    if (next) loadSubtopics(next); // lazy-load subtopics
  }

  function toggleSubtopic(subtopicId: string) {
    const next = openSubtopicId === subtopicId ? null : subtopicId;
    setOpenSubtopicId(next);
    setOpenFolderId(null);
    setSelectedFileId(null);
    clearMenus();
    if (next) ensureFolders(next); // create default folders if first visit
  }

  function toggleFolder(folderId: string) {
    if (openFolderId === folderId) {
      setOpenFolderId(null);
      setSelectedFileId(null);
    } else {
      setOpenFolderId(folderId);
      setSelectedFileId(null);
      setUploaded(false);
      setUploadFile(null);
      setUploadTitle("");
      setUploadDesc("");
    }
    clearMenus();
  }

  function selectFile(id: string, name: string, desc?: string) {
    setSelectedFileId(id);
    setEditTitle(name);
    setEditDesc(desc ?? "");
    setReplaceFile(null);
    setEditSaved(false);
  }

  // ── Folder mutations ───────────────────────────────────────────────────────
  function createFolder() {
    if (!newFolderName.trim() || !addingFolderToSubtopic) return;
    const sid = addingFolderToSubtopic;
    const newFolder: Folder = {
      id: `${sid}-folder-${Date.now()}`,
      name: newFolderName.trim(),
      files: [],
    };
    updateFolders(sid, (folders) => [...folders, newFolder]);
    setOpenFolderId(newFolder.id);
    setAddingFolderToSubtopic(null);
    setNewFolderName("");
  }

  function commitFolderRename(subtopicId: string, folderId: string) {
    const next = renameValue.trim();
    if (!next) { setRenamingFolderId(null); setRenameValue(""); return; }
    updateFolders(subtopicId, (folders) =>
      folders.map((f) => (f.id === folderId ? { ...f, name: next } : f)),
    );
    setRenamingFolderId(null);
    setRenameValue("");
  }

  // ── Upload ─────────────────────────────────────────────────────────────────
  function handleUpload() {
    if (!uploadTitle.trim() || !uploadFile || !selectedPath) return;
    const { subtopic, folder } = selectedPath;
    const newFile: UploadedFile = {
      id: `file-${Date.now()}`,
      name: uploadTitle.trim(),
      description: uploadDesc.trim() || undefined,
      sizeBytes: uploadFile.size,
      uploadedAt: new Date().toISOString(),
      kind: isVidFolder(folder.name) ? "video" : "doc",
    };
    updateFolders(subtopic.id, (folders) =>
      folders.map((f) =>
        f.id === folder.id ? { ...f, files: [...f.files, newFile] } : f,
      ),
    );
    setUploaded(true);
    setUploadFile(null);
    setUploadTitle("");
    setUploadDesc("");
    setTimeout(() => setUploaded(false), 4000);
  }

  // ── Save file edit ─────────────────────────────────────────────────────────
  function handleSaveFileEdit() {
    if (!selectedFile || !selectedPath || !editTitle.trim()) return;
    const { subtopic, folder } = selectedPath;
    updateFolders(subtopic.id, (folders) =>
      folders.map((f) =>
        f.id !== folder.id
          ? f
          : {
              ...f,
              files: f.files.map((file) =>
                file.id !== selectedFile.id
                  ? file
                  : {
                      ...file,
                      name: editTitle.trim(),
                      description: editDesc.trim() || undefined,
                      ...(replaceFile
                        ? { sizeBytes: replaceFile.size, uploadedAt: new Date().toISOString() }
                        : {}),
                    },
              ),
            },
      ),
    );
    setReplaceFile(null);
    setEditSaved(true);
    setTimeout(() => setEditSaved(false), 4000);
  }

  // ── Delete ─────────────────────────────────────────────────────────────────
  function confirmDelete() {
    if (!deleteTarget) return;
    updateFolders(deleteTarget.subtopicId, (folders) => {
      if (deleteTarget.type === "folder")
        return folders.filter((f) => f.id !== deleteTarget.folderId);
      return folders.map((f) =>
        f.id !== deleteTarget.folderId
          ? f
          : { ...f, files: f.files.filter((file) => file.id !== deleteTarget.fileId) },
      );
    });
    if (deleteTarget.type === "folder" && openFolderId === deleteTarget.folderId) {
      setOpenFolderId(null);
      setSelectedFileId(null);
    }
    if (deleteTarget.type === "file" && selectedFileId === deleteTarget.fileId)
      setSelectedFileId(null);
    setDeleteTarget(null);
  }

  // ── Render vars ────────────────────────────────────────────────────────────
  const isVideo   = selectedPath ? isVidFolder(selectedPath.folder.name) : false;
  const fileAccept = isVideo ? ".mp4,.mov,.mkv,.avi" : ".pdf,.pptx,.docx,.xlsx";
  const fileHint   = isVideo ? "MP4, MOV, MKV — max 4 GB" : "PDF, PPTX, DOCX — max 100 MB";

  const noMatches =
    visibility && (subjects as BackendSubject[]).every((s) => !visibility.visibleSubjects.has(s.id));

  const visibleSubjects = visibility
    ? (subjects as BackendSubject[]).filter((s) => visibility.visibleSubjects.has(s.id))
    : (subjects as BackendSubject[]);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full p-3">
      {/* ── Page header ── */}
      <div className="shrink-0 px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="shrink-0">
            <h1 className="text-3xl font-bold text-gray-900">Content Manager</h1>
            <p className="text-base text-gray-600 mt-1">
              Select a subject, chapter, session, and folder — then upload content.
            </p>
          </div>
          {/* 
          <div className="flex items-center gap-2">
            {grades.map((g) => (
              <button
                key={g.id}
                onClick={() => selectGrade(g.id)}
                className={`px-4 py-1.5 text-base rounded-full border transition-colors ${
                  selectedGrade === g.id
                    ? "bg-primary text-white border-primary"
                    : "border-gray-300 text-gray-600 hover:border-gray-400 hover:cursor-pointer"
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
          
          */}
          <div className="lg:w-80 shrink-0">
            <StorageBar />
          </div>
        </div>
      </div>

      {/* ── Search bar ── */}
      <div className="shrink-0 px-6 pb-3 flex justify-left">
        <div className="relative w-full max-w-xl">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search sessions, folders, or files…"
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

            {/* Loading / error states */}
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
                const chapters: BackendChapter[] = chaptersMap[subject.id] ?? [];

                return (
                  <div key={subject.id} className="border-b border-gray-100 last:border-0">

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
                      <ChevronIcon open={subjectOpen} className="w-3.5 h-3.5 text-gray-400" />
                    </button>

                    {/* Chapters */}
                    <AnimatePresence initial={false}>
                      {subjectOpen && (
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: "auto" }}
                          exit={{ height: 0 }}
                          transition={{ duration: 0.18 }}
                          className="overflow-hidden"
                        >
                          <div className="pb-1.5">
                            {/* Loading indicator while chapters fetch */}
                            {!chaptersMap[subject.id] && (
                              <div className="pl-8 py-3 text-sm text-gray-400 italic">
                                Loading chapters…
                              </div>
                            )}

                            {chapters
                              .filter((ch) => !visibility || visibility.visibleChapters.has(ch.id))
                              .map((chapter, idx) => {
                                const chapterOpen = openChapterId === chapter.id;
                                const subtopics: BackendSubtopic[] = subtopicsMap[chapter.id] ?? [];

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

                                    {/* Subtopics (sessions) */}
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
                                            {/* Loading indicator while subtopics fetch */}
                                            {!subtopicsMap[chapter.id] && (
                                              <div className="pl-12 py-2 text-sm text-gray-400 italic">
                                                Loading sessions…
                                              </div>
                                            )}

                                            {subtopics
                                              .filter((st) => !visibility || visibility.visibleSubtopics.has(st.id))
                                              .map((subtopic) => {
                                                const subtopicOpen = openSubtopicId === subtopic.id;
                                                const folders: Folder[] = foldersMap[subtopic.id] ?? [];

                                                return (
                                                  <div key={subtopic.id}>

                                                    {/* Subtopic (session) row */}
                                                    <div className={`flex items-stretch transition-colors ${subtopicOpen ? "bg-gray-50" : "hover:bg-gray-50"}`}>
                                                      <button
                                                        onClick={() => toggleSubtopic(subtopic.id)}
                                                        className="flex-1 flex items-center gap-2 pl-12 pr-2 py-2 text-left min-w-0"
                                                      >
                                                        <span className="flex-1 text-md text-gray-700 truncate">
                                                          {subtopic.name}
                                                          {subtopic.createdAt && (
                                                            <span className="text-gray-400"> — {fmt(subtopic.createdAt)}</span>
                                                          )}
                                                        </span>
                                                        <ChevronIcon open={subtopicOpen} className="w-3 h-3 text-gray-400" />
                                                      </button>

                                                      {/* Kebab for subtopic — only rename/delete if you add those API calls */}
                                                    </div>

                                                    {/* Folders */}
                                                    <AnimatePresence initial={false}>
                                                      {subtopicOpen && (
                                                        <motion.div
                                                          initial={{ height: 0 }}
                                                          animate={{ height: "auto" }}
                                                          exit={{ height: 0 }}
                                                          transition={{ duration: 0.18 }}
                                                          className="overflow-hidden"
                                                        >
                                                          <div>
                                                            {folders
                                                              .filter((f) => !visibility || visibility.visibleFolders.has(f.id))
                                                              .map((folder) => {
                                                                const folderOpen = openFolderId === folder.id;
                                                                const selected = openFolderId === folder.id;

                                                                return (
                                                                  <div key={folder.id}>

                                                                    {/* Folder row */}
                                                                    <div className={`flex items-stretch border-l-2 transition-colors ${selected ? "bg-[#f5f0fa] border-primary" : "border-transparent hover:bg-gray-50"}`}>
                                                                      {renamingFolderId === folder.id ? (
                                                                        <div className="flex-1 flex items-center gap-2 pl-16 pr-2 py-1.5 min-w-0">
                                                                          <input
                                                                            autoFocus
                                                                            value={renameValue}
                                                                            onChange={(e) => setRenameValue(e.target.value)}
                                                                            onKeyDown={(e) => {
                                                                              if (e.key === "Enter") commitFolderRename(subtopic.id, folder.id);
                                                                              if (e.key === "Escape") { setRenamingFolderId(null); setRenameValue(""); }
                                                                            }}
                                                                            className="flex-1 border border-gray-300 px-2 py-0.5 text-md text-gray-700 outline-none focus:border-primary bg-white"
                                                                          />
                                                                          <button onClick={() => commitFolderRename(subtopic.id, folder.id)} className="px-2 py-0.5 bg-primary text-white text-sm">✓</button>
                                                                          <button onClick={() => { setRenamingFolderId(null); setRenameValue(""); }} className="px-2 py-0.5 text-gray-400 hover:text-gray-600 text-sm">✕</button>
                                                                        </div>
                                                                      ) : (
                                                                        <button
                                                                          onClick={() => toggleFolder(folder.id)}
                                                                          className={`flex-1 flex items-center gap-2 pl-16 pr-2 py-1.5 text-left min-w-0 ${selected ? "text-primary" : "text-gray-600"}`}
                                                                        >
                                                                          <FolderIcon className="w-4 h-4 shrink-0" />
                                                                          <span className="flex-1 text-md truncate">{folder.name}</span>
                                                                          {folder.files.length > 0 && (
                                                                            <span className="text-xs text-gray-400 shrink-0">({folder.files.length})</span>
                                                                          )}
                                                                          <ChevronIcon open={folderOpen} className="w-3 h-3 text-gray-400" />
                                                                        </button>
                                                                      )}

                                                                      {/* Folder kebab menu */}
                                                                      <div className="flex items-center">
                                                                        <button
                                                                          onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            if (openMenuId === folder.id) {
                                                                              setOpenMenuId(null); setMenuPosition(null);
                                                                            } else {
                                                                              const rect = e.currentTarget.getBoundingClientRect();
                                                                              setMenuPosition({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
                                                                              setOpenMenuId(folder.id);
                                                                            }
                                                                          }}
                                                                          className="px-3 h-full text-gray-400 hover:text-gray-600 flex items-center"
                                                                        >
                                                                          <KebabIcon />
                                                                        </button>
                                                                        {openMenuId === folder.id && menuPosition && createPortal(
                                                                          <div
                                                                            ref={menuRef}
                                                                            style={{ position: "fixed", top: menuPosition.top, right: menuPosition.right, zIndex: 50 }}
                                                                            className="bg-white shadow-lg border border-gray-200 rounded-md py-1 w-32"
                                                                          >
                                                                            <button
                                                                              onClick={() => { setRenamingFolderId(folder.id); setRenameValue(folder.name); setOpenMenuId(null); setMenuPosition(null); }}
                                                                              className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                                                                            >
                                                                              Rename
                                                                            </button>
                                                                            <button
                                                                              onClick={() => { setDeleteTarget({ type: "folder", subtopicId: subtopic.id, folderId: folder.id, name: folder.name }); setOpenMenuId(null); setMenuPosition(null); }}
                                                                              className="w-full text-left px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                                                                            >
                                                                              Delete
                                                                            </button>
                                                                          </div>,
                                                                          document.body,
                                                                        )}
                                                                      </div>
                                                                    </div>

                                                                    {/* Files */}
                                                                    <AnimatePresence initial={false}>
                                                                      {folderOpen && (
                                                                        <motion.div
                                                                          initial={{ height: 0 }}
                                                                          animate={{ height: "auto" }}
                                                                          exit={{ height: 0 }}
                                                                          transition={{ duration: 0.18 }}
                                                                          className="overflow-hidden"
                                                                        >
                                                                          <div>
                                                                            {folder.files.length === 0 ? (
                                                                              <div className="pl-20 pr-4 py-1.5 text-sm text-gray-400 italic">No files uploaded yet</div>
                                                                            ) : (
                                                                              folder.files
                                                                                .filter((f) => !visibility || visibility.visibleFiles.has(f.id))
                                                                                .map((file) => {
                                                                                  const fileSelected = selectedFileId === file.id;
                                                                                  return (
                                                                                    <button
                                                                                      key={file.id}
                                                                                      onClick={() => selectFile(file.id, file.name, file.description)}
                                                                                      className={`w-full flex items-center gap-2 pl-20 pr-2 py-1.5 text-left border-l-2 transition-colors ${fileSelected ? "bg-[#f5f0fa] border-primary text-primary" : "border-transparent text-gray-700 hover:bg-gray-50"}`}
                                                                                    >
                                                                                      {file.kind === "video"
                                                                                        ? <IconPlay className="w-4 h-4 shrink-0 text-primary" />
                                                                                        : <IconDocument className={`w-4 h-4 shrink-0 ${fileSelected ? "text-primary" : "text-gray-400"}`} />
                                                                                      }
                                                                                      <span className="flex-1 text-sm truncate">{file.name}</span>
                                                                                      <span className={`text-xs shrink-0 ${fileSelected ? "text-primary/70" : "text-gray-400"}`}>{fmtSize(file.sizeBytes)}</span>
                                                                                    </button>
                                                                                  );
                                                                                })
                                                                            )}
                                                                          </div>
                                                                        </motion.div>
                                                                      )}
                                                                    </AnimatePresence>
                                                                  </div>
                                                                );
                                                              })}

                                                            {/* + New Folder */}
                                                            {!visibility && (
                                                              addingFolderToSubtopic === subtopic.id ? (
                                                                <div className="pl-16 pr-4 pt-1 pb-2 flex gap-2">
                                                                  <input
                                                                    autoFocus
                                                                    type="text"
                                                                    value={newFolderName}
                                                                    onChange={(e) => setNewFolderName(e.target.value)}
                                                                    onKeyDown={(e) => {
                                                                      if (e.key === "Enter") createFolder();
                                                                      if (e.key === "Escape") { setAddingFolderToSubtopic(null); setNewFolderName(""); }
                                                                    }}
                                                                    placeholder="Folder name…"
                                                                    className="flex-1 border border-gray-300 px-2 py-1 text-sm outline-none focus:border-primary bg-white"
                                                                  />
                                                                  <button onClick={createFolder} className="px-2 py-1 bg-primary text-white text-sm">✓</button>
                                                                  <button onClick={() => { setAddingFolderToSubtopic(null); setNewFolderName(""); }} className="px-2 py-1 text-gray-400 hover:text-gray-600">✕</button>
                                                                </div>
                                                              ) : (
                                                                <button
                                                                  onClick={() => { setAddingFolderToSubtopic(subtopic.id); setNewFolderName(""); }}
                                                                  className="w-full flex items-center gap-2 pl-16 pr-4 py-1.5 text-sm text-gray-400 hover:text-primary transition-colors"
                                                                >
                                                                  <PlusIcon /> New Folder
                                                                </button>
                                                              )
                                                            )}
                                                          </div>
                                                        </motion.div>
                                                      )}
                                                    </AnimatePresence>
                                                  </div>
                                                );
                                              })}
                                          </div>
                                        </motion.div>
                                      )}
                                    </AnimatePresence>
                                  </div>
                                );
                              })}
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

        {/* ── Right panel — unchanged structure, just updated variable names ── */}
        <div className="flex-1 h-full overflow-y-auto">
          {selectedFile && selectedPath ? (
            <div className="p-4">
              {/* Breadcrumb */}
              <div className="flex items-start justify-between gap-3 mb-6">
                <div className="flex items-center gap-1.5 text-sm text-gray-400 flex-wrap">
                  <Chevron />
                  <span>{selectedPath.subject.name}</span>
                  <Chevron />
                  <span className="truncate max-w-32">{selectedPath.chapter.title}</span>
                  <Chevron />
                  <span className="truncate max-w-32">{selectedPath.folder.name}</span>
                  <Chevron />
                  <span className="text-primary font-medium truncate max-w-40">{selectedFile.name}</span>
                </div>
                <button
                  onClick={() =>
                    selectedPath && setDeleteTarget({
                      type: "file",
                      subtopicId: selectedPath.subtopic.id,
                      folderId: selectedPath.folder.id,
                      fileId: selectedFile.id,
                      name: selectedFile.name,
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
                  {selectedFile.kind === "video"
                    ? <IconPlay className="w-8 h-8 text-primary shrink-0" />
                    : <IconDocument className="w-8 h-8 text-gray-400 shrink-0" />
                  }
                  <div className="flex-1 min-w-0">
                    <p className="text-base text-gray-800 truncate">{selectedFile.name}</p>
                    <p className="text-sm text-gray-400">
                      {fmtSize(selectedFile.sizeBytes)} · {selectedFile.kind === "video" ? "Video" : "Document"} · uploaded {fmt(selectedFile.uploadedAt)}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="text-sm text-gray-500 block mb-1">Title <span className="text-red-400">*</span></label>
                  <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="w-full border border-gray-200 px-4 py-2.5 text-base text-gray-800 outline-none focus:border-gray-400" />
                </div>

                <div>
                  <label className="text-sm text-gray-500 block mb-1">Description <span className="text-gray-300">(optional)</span></label>
                  <textarea value={editDesc} onChange={(e) => setEditDesc(e.target.value)} rows={2} placeholder="Brief description…" className="w-full border border-gray-200 px-4 py-2.5 text-base text-gray-800 placeholder-gray-300 outline-none focus:border-gray-400 resize-none" />
                </div>

                {/* Replace file dropzone */}
                <div>
                  <label className="text-sm text-gray-500 block mb-1">Replace file <span className="text-gray-300">(optional)</span></label>
                  {replaceFile ? (
                    <div className="border border-gray-200 px-4 py-3 flex items-center gap-3">
                      {selectedFile.kind === "video" ? <IconPlay className="w-5 h-5 text-primary shrink-0" /> : <IconDocument className="w-5 h-5 text-gray-400 shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-base text-gray-800 truncate">{replaceFile.name}</p>
                        <p className="text-sm text-gray-400">{(replaceFile.size / 1024 / 1024).toFixed(1)} MB</p>
                      </div>
                      <button onClick={() => setReplaceFile(null)} className="text-gray-400 hover:text-gray-600"><IconClose className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <div
                      onDragOver={(e) => { e.preventDefault(); setReplaceDragging(true); }}
                      onDragLeave={() => setReplaceDragging(false)}
                      onDrop={(e) => { e.preventDefault(); setReplaceDragging(false); const f = e.dataTransfer.files[0]; if (f) setReplaceFile(f); }}
                      onClick={() => replaceFileRef.current?.click()}
                      className={`border-2 border-dashed flex flex-col items-center justify-center gap-2 py-6 cursor-pointer transition-colors ${replaceDragging ? "border-primary bg-gray-50" : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"}`}
                    >
                      <p className="text-sm text-gray-500">Drag &amp; drop a new file or <span className="text-primary">browse</span></p>
                      <input ref={replaceFileRef} type="file" accept={selectedFile.kind === "video" ? ".mp4,.mov,.mkv,.avi" : ".pdf,.pptx,.docx,.xlsx"} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) setReplaceFile(f); e.target.value = ""; }} />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4 pt-1">
                  <button onClick={handleSaveFileEdit} disabled={!editTitle.trim()} className="px-6 py-2.5 bg-primary text-white text-base hover:bg-primary/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                    Save changes
                  </button>
                  <AnimatePresence>
                    {editSaved && (
                      <motion.div initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-2 text-green-700 text-base">
                        <IconCheckCircle className="w-4 h-4" /> Saved
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          ) : !selectedPath ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-4 px-8">
              <div className="w-16 h-16 bg-white border-2 border-gray-400 rounded-full flex items-center justify-center text-gray-400">
                <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none">
                  <path d="M 2,9 Q 2,8 3,8 L 10,8 L 12,6 L 21,6 Q 22,6 22,7 L 22,18 Q 22,19 21,19 L 3,19 Q 2,19 2,18 Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                  <path d="M 12,11 L 12,15.5 M 9.5,13 L 12,11 L 14.5,13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div>
                <p className="text-base text-gray-700">Select a folder from the left panel</p>
                <p className="text-md text-gray-600 mt-1">Then upload content with a title and file.</p>
              </div>
            </div>
          ) : (
            <div className="p-4">
              {/* Breadcrumb */}
              <div className="flex items-center gap-1.5 text-sm text-gray-400 mb-6 flex-wrap">
                <Chevron />
                <span>{selectedPath.subject.name}</span>
                <Chevron />
                <span className="truncate max-w-40">{selectedPath.chapter.name}</span>
                <Chevron />
                <span className="text-primary font-medium shrink-0">{selectedPath.folder.name}</span>
              </div>

              <div className="bg-white shadow-sm p-4 rounded-2xl space-y-5">
                <h2 className="text-base font-medium text-gray-800">Upload to {selectedPath.folder.name}</h2>

                <div>
                  <label className="text-sm text-gray-500 block mb-1">Title <span className="text-red-400">*</span></label>
                  <input type="text" value={uploadTitle} onChange={(e) => setUploadTitle(e.target.value)} placeholder={isVideo ? "e.g. Atomic Structure — Part 1" : "e.g. Chapter Notes — Electrochemistry"} className="w-full border border-gray-200 px-4 py-2.5 text-base text-gray-800 placeholder-gray-300 outline-none focus:border-gray-400" />
                </div>

                <div>
                  <label className="text-sm text-gray-500 block mb-1">Description <span className="text-gray-300">(optional)</span></label>
                  <textarea value={uploadDesc} onChange={(e) => setUploadDesc(e.target.value)} rows={2} placeholder="Brief description…" className="w-full border border-gray-200 px-4 py-2.5 text-base text-gray-800 placeholder-gray-300 outline-none focus:border-gray-400 resize-none" />
                </div>

                <div>
                  <label className="text-sm text-gray-500 block mb-1">File <span className="text-red-400">*</span></label>
                  {uploadFile ? (
                    <div className="border border-gray-200 px-4 py-3 flex items-center gap-3">
                      {isVideo ? <IconPlay className="w-5 h-5 text-primary shrink-0" /> : <IconDocument className="w-5 h-5 text-gray-400 shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-base text-gray-800 truncate">{uploadFile.name}</p>
                        <p className="text-sm text-gray-400">{(uploadFile.size / 1024 / 1024).toFixed(1)} MB</p>
                      </div>
                      <button onClick={() => setUploadFile(null)} className="text-gray-400 hover:text-gray-600"><IconClose className="w-4 h-4" /></button>
                    </div>
                  ) : (
                    <div
                      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                      onDragLeave={() => setDragging(false)}
                      onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files[0]; if (f) setUploadFile(f); }}
                      onClick={() => fileRef.current?.click()}
                      className={`border-2 border-dashed flex flex-col items-center justify-center gap-2 py-8 cursor-pointer transition-colors ${dragging ? "border-primary bg-gray-50" : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"}`}
                    >
                      <p className="text-sm text-gray-500">Drag &amp; drop or <span className="text-primary">browse</span></p>
                      <p className="text-xs text-gray-400">{fileHint}</p>
                      <input ref={fileRef} type="file" accept={fileAccept} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) setUploadFile(f); e.target.value = ""; }} />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4 pt-1">
                  <button onClick={handleUpload} disabled={!uploadTitle.trim() || !uploadFile} className="px-6 py-2.5 bg-primary text-white text-base hover:bg-primary/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                    Upload File
                  </button>
                  <AnimatePresence>
                    {uploaded && (
                      <motion.div initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="flex items-center gap-2 text-green-700 text-base">
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
              className="bg-white shadow-xl p-6 max-w-sm w-full mx-4"
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-medium text-gray-900">Delete &quot;{deleteTarget.name}&quot;?</h3>
              <p className="text-base text-gray-600 mt-2">
                This permanently deletes the {deleteTarget.type}
                {deleteTarget.type === "folder" && " and all files inside it"}.
              </p>
              <div className="flex justify-end gap-2 mt-5">
                <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 text-base text-gray-600 hover:text-gray-800">Cancel</button>
                <button onClick={confirmDelete} className="px-4 py-2 text-base bg-red-600 text-white hover:bg-red-700 font-medium">Delete</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Tiny inline breadcrumb arrow — avoids repeating the SVG 5 times
function Chevron() {
  return (
    <svg className="w-3 h-3 shrink-0" viewBox="0 0 8 8" fill="none">
      <path d="M 2,1 L 6,4 L 2,7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}