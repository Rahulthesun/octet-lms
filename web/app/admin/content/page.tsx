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

// ─── Types ────────────────────────────────────────────────────────────────────

type Grade = "11" | "12" | "jee" | "neet";
type Subject = "physical" | "organic" | "inorganic";

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

interface Session {
  id: string;
  title: string;
  createdAt: string;
  folders: Folder[];
}

interface Chapter {
  id: number;
  title: string;
  sessions: Session[];
}

type ContentTree = Record<Grade, Record<Subject, Chapter[]>>;

type DeleteTarget =
  | {
      type: "session";
      subject: Subject;
      chapterId: number;
      sessionId: string;
      name: string;
    }
  | {
      type: "folder";
      subject: Subject;
      chapterId: number;
      sessionId: string;
      folderId: string;
      name: string;
    }
  | {
      type: "file";
      subject: Subject;
      chapterId: number;
      sessionId: string;
      folderId: string;
      fileId: string;
      name: string;
    };

// ─── Constants ────────────────────────────────────────────────────────────────

const gradeLabels: Record<Grade, string> = {
  "11": "Class 11",
  "12": "Class 12",
  jee: "JEE",
  neet: "NEET",
};

const grades: { id: Grade; label: string }[] = [
  { id: "11", label: "11th" },
  { id: "12", label: "12th" },
  { id: "jee", label: "JEE" },
  { id: "neet", label: "NEET" },
];

const subjects: Subject[] = ["physical", "organic", "inorganic"];

const subjectLabels: Record<Subject, string> = {
  physical: "Physical Chemistry",
  organic: "Organic Chemistry",
  inorganic: "Inorganic Chemistry",
};

function formatSessionDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function isVideoFolder(name: string): boolean {
  return name.toLowerCase().includes("video");
}

function formatSize(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  return mb >= 1
    ? `${mb.toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

// ─── Seed Data ────────────────────────────────────────────────────────────────

const seedDate = "2026-06-01T10:00:00.000Z";

function makeSeededSession(
  idPrefix: string,
  title: string,
  files: {
    video?: { name: string; sizeMB: number }[];
    docs?: { name: string; sizeMB: number }[];
  } = {},
): Session {
  const folders: Folder[] = [
    {
      id: `${idPrefix}-vid`,
      name: "Video Lectures",
      files: (files.video ?? []).map((f, i) => ({
        id: `${idPrefix}-vid-f${i}`,
        name: f.name,
        sizeBytes: Math.round(f.sizeMB * 1024 * 1024),
        uploadedAt: seedDate,
        kind: "video",
      })),
    },
    {
      id: `${idPrefix}-notes`,
      name: "Notes & PDFs",
      files: (files.docs ?? []).map((f, i) => ({
        id: `${idPrefix}-notes-f${i}`,
        name: f.name,
        sizeBytes: Math.round(f.sizeMB * 1024 * 1024),
        uploadedAt: seedDate,
        kind: "doc",
      })),
    },
  ];
  return { id: idPrefix, title, createdAt: seedDate, folders };
}

function emptySession(idPrefix: string, title: string): Session {
  return makeSeededSession(idPrefix, title);
}

const initialTree: ContentTree = {
  "11": {
    physical: [
      { id: 101, title: "Some Basic Concepts of Chemistry", sessions: [] },
      {
        id: 102,
        title: "Structure of Atom",
        sessions: [
          makeSeededSession("s-11-102-1", "Lecture 1", {
            video: [
              { name: "Atomic Structure — Part 1", sizeMB: 142 },
              { name: "Atomic Structure — Part 2", sizeMB: 168 },
            ],
            docs: [{ name: "Atomic Structure — Notes", sizeMB: 3 }],
          }),
        ],
      },
      { id: 103, title: "States of Matter", sessions: [] },
      {
        id: 104,
        title: "Thermodynamics",
        sessions: [
          makeSeededSession("s-11-104-1", "Intro Lecture", {
            video: [{ name: "Thermodynamics — Introduction", sizeMB: 156 }],
          }),
        ],
      },
      { id: 105, title: "Equilibrium", sessions: [] },
    ],
    organic: [
      { id: 106, title: "Organic Chemistry — Basic Principles", sessions: [] },
      { id: 107, title: "Hydrocarbons", sessions: [] },
    ],
    inorganic: [
      {
        id: 108,
        title: "Chemical Bonding & Molecular Structure",
        sessions: [],
      },
      { id: 109, title: "Hydrogen", sessions: [] },
      { id: 110, title: "s-Block Elements", sessions: [] },
    ],
  },
  "12": {
    physical: [
      {
        id: 201,
        title: "Solid State",
        sessions: [
          makeSeededSession("s-12-201-1", "Crystal Lattices", {
            docs: [{ name: "Solid State — Cheat Sheet", sizeMB: 2 }],
          }),
        ],
      },
      { id: 202, title: "Solutions", sessions: [] },
      { id: 203, title: "Electrochemistry", sessions: [] },
      { id: 204, title: "Chemical Kinetics", sessions: [] },
      { id: 205, title: "Surface Chemistry", sessions: [] },
    ],
    organic: [
      { id: 206, title: "Haloalkanes & Haloarenes", sessions: [] },
      { id: 207, title: "Alcohols, Phenols & Ethers", sessions: [] },
      {
        id: 208,
        title: "Aldehydes, Ketones & Carboxylic Acids",
        sessions: [],
      },
    ],
    inorganic: [
      { id: 209, title: "p-Block Elements", sessions: [] },
      { id: 210, title: "d- and f-Block Elements", sessions: [] },
      { id: 211, title: "Coordination Compounds", sessions: [] },
    ],
  },
  jee: {
    physical: [
      { id: 301, title: "Mole Concept", sessions: [] },
      { id: 302, title: "Atomic Structure", sessions: [] },
      { id: 303, title: "Thermodynamics", sessions: [] },
    ],
    organic: [
      { id: 304, title: "Reaction Mechanisms", sessions: [] },
      { id: 305, title: "Stereochemistry", sessions: [] },
    ],
    inorganic: [
      { id: 306, title: "Chemical Bonding", sessions: [] },
      { id: 307, title: "Coordination Compounds", sessions: [] },
    ],
  },
  neet: {
    physical: [
      { id: 401, title: "Basic Concepts", sessions: [] },
      { id: 402, title: "Structure of Atom", sessions: [] },
      { id: 403, title: "Thermodynamics", sessions: [] },
    ],
    organic: [
      { id: 404, title: "General Organic Chemistry", sessions: [] },
      { id: 405, title: "Biomolecules", sessions: [] },
    ],
    inorganic: [
      { id: 406, title: "Chemical Bonding", sessions: [] },
      { id: 407, title: "p-Block Elements", sessions: [] },
    ],
  },
};

// ─── Icons ────────────────────────────────────────────────────────────────────

function TrashIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none">
      <path
        d="M 3,4.5 H 13 M 6,4.5 V 3 Q 6,2.5 6.5,2.5 H 9.5 Q 10,2.5 10,3 V 4.5"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      <path
        d="M 4.5,4.5 L 5,13.5 Q 5,14 5.5,14 H 10.5 Q 11,14 11,13.5 L 11.5,4.5"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M 7,7 V 11.5 M 9,7 V 11.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
      />
    </svg>
  );
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

function FolderIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none">
      <path
        d="M 1,5 Q 1,4 2,4 L 6.5,4 L 7.5,3 L 14,3 Q 15,3 15,4 L 15,12 Q 15,13 14,13 L 2,13 Q 1,13 1,12 Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
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

function KebabIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="3.5" r="1.4" fill="currentColor" />
      <circle cx="8" cy="8" r="1.4" fill="currentColor" />
      <circle cx="8" cy="12.5" r="1.4" fill="currentColor" />
    </svg>
  );
}

// ─── Storage bar ──────────────────────────────────────────────────────────────

function StorageBar() {
  const used = 24.8,
    total = 50;
  const pct = (used / total) * 100;
  return (
    <div className="flex items-center gap-4 bg-white p-4 rounded-2xl">
      <div className="flex-1">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-600 text-base">Video Storage</span>
          <span className="font-inter font-bold text-primary">
            {used} / {total} GB
          </span>
        </div>
        <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <span className="text-sm text-gray-600 shrink-0">
        <span className="font-inter">{(total - used).toFixed(1)}</span> GB free
      </span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ContentPage() {
  const [tree, setTree] = useState<ContentTree>(initialTree);
  const [selectedGrade, setSelectedGrade] = useState<Grade>("11");
  const [openSubject, setOpenSubject] = useState<Subject | null>(null);
  const [openChapterId, setOpenChapterId] = useState<number | null>(null);
  const [openSessionId, setOpenSessionId] = useState<string | null>(null);
  const [openFolderId, setOpenFolderId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Inline add inputs
  const [addingChapterToSubject, setAddingChapterToSubject] =
    useState<Subject | null>(null);
  const [newChapterTitle, setNewChapterTitle] = useState("");
  const [addingSessionToChapter, setAddingSessionToChapter] = useState<
    number | null
  >(null);
  const [newSessionTitle, setNewSessionTitle] = useState("");
  const [addingFolderToSession, setAddingFolderToSession] = useState<
    string | null
  >(null);
  const [newFolderName, setNewFolderName] = useState("");

  // Delete confirmation
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);

  // Kebab menu + inline rename
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPosition, setMenuPosition] = useState<{
    top: number;
    right: number;
  } | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [renamingSessionId, setRenamingSessionId] = useState<string | null>(
    null,
  );
  const [renamingFolderId, setRenamingFolderId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  // File selection (right panel)
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [replaceFile, setReplaceFile] = useState<File | null>(null);
  const [replaceDragging, setReplaceDragging] = useState(false);
  const [editSaved, setEditSaved] = useState(false);
  const replaceFileRef = useRef<HTMLInputElement>(null);

  // Upload form
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Click-outside for kebab menu ──
  useEffect(() => {
    if (!openMenuId) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (menuRef.current && !menuRef.current.contains(target)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [openMenuId]);

  // ── Derived: selected path ──
  const selectedPath = (() => {
    if (!openFolderId) return null;
    for (const subject of subjects) {
      for (const ch of tree[selectedGrade][subject]) {
        for (const s of ch.sessions) {
          for (const f of s.folders) {
            if (f.id === openFolderId) {
              return { subject, chapter: ch, session: s, folder: f };
            }
          }
        }
      }
    }
    return null;
  })();

  // ── Derived: selected file ──
  const selectedFile = (() => {
    if (!selectedFileId || !selectedPath) return null;
    return (
      selectedPath.folder.files.find((f) => f.id === selectedFileId) ?? null
    );
  })();

  // ── Derived: search visibility ──
  const visibility = (() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return null;

    const visibleSubjects = new Set<Subject>();
    const visibleChapters = new Set<number>();
    const visibleSessions = new Set<string>();
    const visibleFolders = new Set<string>();
    const visibleFiles = new Set<string>();

    for (const subject of subjects) {
      const subjectSelfMatch = subjectLabels[subject].toLowerCase().includes(q);
      for (const ch of tree[selectedGrade][subject]) {
        const chapterSelfMatch = ch.title.toLowerCase().includes(q);
        const chapterAncestor = subjectSelfMatch;
        for (const s of ch.sessions) {
          const sessionLabel = `${s.title} ${formatSessionDate(s.createdAt)}`;
          const sessionSelfMatch = sessionLabel.toLowerCase().includes(q);
          const sessionAncestor = chapterAncestor || chapterSelfMatch;
          for (const f of s.folders) {
            const folderSelfMatch = f.name.toLowerCase().includes(q);
            const folderAncestor = sessionAncestor || sessionSelfMatch;
            let anyFileVisible = false;
            for (const file of f.files) {
              const fileSelfMatch = file.name.toLowerCase().includes(q);
              if (fileSelfMatch || folderSelfMatch || folderAncestor) {
                visibleFiles.add(file.id);
                anyFileVisible = true;
              }
            }
            if (folderSelfMatch || folderAncestor || anyFileVisible) {
              visibleFolders.add(f.id);
            }
          }
          const anyFolderVisible = s.folders.some((f) =>
            visibleFolders.has(f.id),
          );
          if (sessionSelfMatch || sessionAncestor || anyFolderVisible) {
            visibleSessions.add(s.id);
          }
        }
        const anySessionVisible = ch.sessions.some((s) =>
          visibleSessions.has(s.id),
        );
        if (chapterSelfMatch || chapterAncestor || anySessionVisible) {
          visibleChapters.add(ch.id);
        }
      }
      const anyChapterVisible = tree[selectedGrade][subject].some((ch) =>
        visibleChapters.has(ch.id),
      );
      if (subjectSelfMatch || anyChapterVisible) {
        visibleSubjects.add(subject);
      }
    }

    return {
      visibleSubjects,
      visibleChapters,
      visibleSessions,
      visibleFolders,
      visibleFiles,
    };
  })();

  // ── State helpers ──
  function resetInlineAdds() {
    setAddingChapterToSubject(null);
    setNewChapterTitle("");
    setAddingSessionToChapter(null);
    setNewSessionTitle("");
    setAddingFolderToSession(null);
    setNewFolderName("");
  }

  function clearMenusAndRenames() {
    setOpenMenuId(null);
    setMenuPosition(null);
    setRenamingSessionId(null);
    setRenamingFolderId(null);
    setRenameValue("");
  }

  function selectGrade(g: Grade) {
    setSelectedGrade(g);
    setOpenSubject(null);
    setOpenChapterId(null);
    setOpenSessionId(null);
    setOpenFolderId(null);
    setSelectedFileId(null);
    clearMenusAndRenames();
    resetInlineAdds();
  }

  function toggleSubject(sub: Subject) {
    if (openSubject === sub) {
      setOpenSubject(null);
    } else {
      setOpenSubject(sub);
    }
    setOpenChapterId(null);
    setOpenSessionId(null);
    setOpenFolderId(null);
    setSelectedFileId(null);
    clearMenusAndRenames();
    resetInlineAdds();
  }

  function toggleChapter(id: number) {
    if (openChapterId === id) {
      setOpenChapterId(null);
    } else {
      setOpenChapterId(id);
    }
    setOpenSessionId(null);
    setOpenFolderId(null);
    setSelectedFileId(null);
    setAddingSessionToChapter(null);
    setNewSessionTitle("");
    setAddingFolderToSession(null);
    setNewFolderName("");
    clearMenusAndRenames();
  }

  function toggleSession(id: string) {
    if (openSessionId === id) {
      setOpenSessionId(null);
    } else {
      setOpenSessionId(id);
    }
    setOpenFolderId(null);
    setSelectedFileId(null);
    setAddingFolderToSession(null);
    setNewFolderName("");
    clearMenusAndRenames();
  }

  function toggleFolder(folderId: string) {
    if (openFolderId === folderId) {
      setOpenFolderId(null);
      setSelectedFileId(null);
    } else {
      setOpenFolderId(folderId);
      setSelectedFileId(null);
      setUploaded(false);
      setFile(null);
      setTitle("");
      setDesc("");
    }
    clearMenusAndRenames();
  }

  function selectFile(
    fileId: string,
    fileName: string,
    fileDesc: string | undefined,
  ) {
    setSelectedFileId(fileId);
    setEditTitle(fileName);
    setEditDesc(fileDesc ?? "");
    setReplaceFile(null);
    setEditSaved(false);
  }

  function commitSessionRename(
    subject: Subject,
    chapterId: number,
    sessionId: string,
  ) {
    const next = renameValue.trim();
    if (!next) {
      setRenamingSessionId(null);
      setRenameValue("");
      return;
    }
    setTree((prev) => ({
      ...prev,
      [selectedGrade]: {
        ...prev[selectedGrade],
        [subject]: prev[selectedGrade][subject].map((ch) =>
          ch.id !== chapterId
            ? ch
            : {
                ...ch,
                sessions: ch.sessions.map((s) =>
                  s.id !== sessionId ? s : { ...s, title: next },
                ),
              },
        ),
      },
    }));
    setRenamingSessionId(null);
    setRenameValue("");
  }

  function commitFolderRename(
    subject: Subject,
    chapterId: number,
    sessionId: string,
    folderId: string,
  ) {
    const next = renameValue.trim();
    if (!next) {
      setRenamingFolderId(null);
      setRenameValue("");
      return;
    }
    setTree((prev) => ({
      ...prev,
      [selectedGrade]: {
        ...prev[selectedGrade],
        [subject]: prev[selectedGrade][subject].map((ch) =>
          ch.id !== chapterId
            ? ch
            : {
                ...ch,
                sessions: ch.sessions.map((s) =>
                  s.id !== sessionId
                    ? s
                    : {
                        ...s,
                        folders: s.folders.map((f) =>
                          f.id !== folderId ? f : { ...f, name: next },
                        ),
                      },
                ),
              },
        ),
      },
    }));
    setRenamingFolderId(null);
    setRenameValue("");
  }

  function handleSaveFileEdit() {
    if (!selectedFile || !selectedPath || !editTitle.trim()) return;
    const { subject, chapter, session, folder } = selectedPath;
    setTree((prev) => ({
      ...prev,
      [selectedGrade]: {
        ...prev[selectedGrade],
        [subject]: prev[selectedGrade][subject].map((ch) =>
          ch.id !== chapter.id
            ? ch
            : {
                ...ch,
                sessions: ch.sessions.map((s) =>
                  s.id !== session.id
                    ? s
                    : {
                        ...s,
                        folders: s.folders.map((f) =>
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
                                        description:
                                          editDesc.trim() || undefined,
                                        ...(replaceFile
                                          ? {
                                              sizeBytes: replaceFile.size,
                                              uploadedAt:
                                                new Date().toISOString(),
                                            }
                                          : {}),
                                      },
                                ),
                              },
                        ),
                      },
                ),
              },
        ),
      },
    }));
    setReplaceFile(null);
    setEditSaved(true);
    setTimeout(() => setEditSaved(false), 4000);
  }

  // ── Create handlers ──
  function createChapter() {
    if (!newChapterTitle.trim() || !addingChapterToSubject) return;
    const subject = addingChapterToSubject;
    const newId = Date.now();
    const newChapter: Chapter = {
      id: newId,
      title: newChapterTitle.trim(),
      sessions: [],
    };
    setTree((prev) => ({
      ...prev,
      [selectedGrade]: {
        ...prev[selectedGrade],
        [subject]: [...prev[selectedGrade][subject], newChapter],
      },
    }));
    setOpenSubject(subject);
    setOpenChapterId(newId);
    setOpenSessionId(null);
    setOpenFolderId(null);
    setAddingChapterToSubject(null);
    setNewChapterTitle("");
  }

  function createSession() {
    if (
      !newSessionTitle.trim() ||
      addingSessionToChapter === null ||
      !openSubject
    )
      return;
    const subject = openSubject;
    const chapterId = addingSessionToChapter;
    const newId = `s-${Date.now()}`;
    const newSession: Session = emptySession(newId, newSessionTitle.trim());
    newSession.createdAt = new Date().toISOString();
    setTree((prev) => ({
      ...prev,
      [selectedGrade]: {
        ...prev[selectedGrade],
        [subject]: prev[selectedGrade][subject].map((ch) =>
          ch.id === chapterId
            ? { ...ch, sessions: [...ch.sessions, newSession] }
            : ch,
        ),
      },
    }));
    setOpenSessionId(newId);
    setOpenFolderId(null);
    setAddingSessionToChapter(null);
    setNewSessionTitle("");
  }

  function createFolder() {
    if (
      !newFolderName.trim() ||
      !addingFolderToSession ||
      !openSubject ||
      openChapterId === null
    )
      return;
    const subject = openSubject;
    const chapterId = openChapterId;
    const sessionId = addingFolderToSession;
    const newFolder: Folder = {
      id: `${sessionId}-f-${Date.now()}`,
      name: newFolderName.trim(),
      files: [],
    };
    setTree((prev) => ({
      ...prev,
      [selectedGrade]: {
        ...prev[selectedGrade],
        [subject]: prev[selectedGrade][subject].map((ch) =>
          ch.id === chapterId
            ? {
                ...ch,
                sessions: ch.sessions.map((s) =>
                  s.id === sessionId
                    ? { ...s, folders: [...s.folders, newFolder] }
                    : s,
                ),
              }
            : ch,
        ),
      },
    }));
    setOpenFolderId(newFolder.id);
    setAddingFolderToSession(null);
    setNewFolderName("");
  }

  // ── Upload ──
  function handleUpload() {
    if (!title.trim() || !file || !selectedPath) return;
    const { subject, chapter, session, folder } = selectedPath;
    const isVid = isVideoFolder(folder.name);
    const newFile: UploadedFile = {
      id: `f-${Date.now()}`,
      name: title.trim(),
      sizeBytes: file.size,
      uploadedAt: new Date().toISOString(),
      kind: isVid ? "video" : "doc",
    };
    setTree((prev) => ({
      ...prev,
      [selectedGrade]: {
        ...prev[selectedGrade],
        [subject]: prev[selectedGrade][subject].map((ch) =>
          ch.id === chapter.id
            ? {
                ...ch,
                sessions: ch.sessions.map((s) =>
                  s.id === session.id
                    ? {
                        ...s,
                        folders: s.folders.map((f) =>
                          f.id === folder.id
                            ? { ...f, files: [...f.files, newFile] }
                            : f,
                        ),
                      }
                    : s,
                ),
              }
            : ch,
        ),
      },
    }));
    setUploaded(true);
    setFile(null);
    setTitle("");
    setDesc("");
    setTimeout(() => setUploaded(false), 4000);
  }

  // ── Delete ──
  function confirmDelete() {
    if (!deleteTarget) return;
    const subject = deleteTarget.subject;
    setTree((prev) => {
      const updatedChapters = prev[selectedGrade][subject].map((ch) => {
        if (ch.id !== deleteTarget.chapterId) return ch;
        if (deleteTarget.type === "session") {
          return {
            ...ch,
            sessions: ch.sessions.filter((s) => s.id !== deleteTarget.sessionId),
          };
        }
        return {
          ...ch,
          sessions: ch.sessions.map((s) => {
            if (s.id !== deleteTarget.sessionId) return s;
            if (deleteTarget.type === "folder") {
              return {
                ...s,
                folders: s.folders.filter(
                  (f) => f.id !== deleteTarget.folderId,
                ),
              };
            }
            return {
              ...s,
              folders: s.folders.map((f) => {
                if (f.id !== deleteTarget.folderId) return f;
                return {
                  ...f,
                  files: f.files.filter(
                    (file) => file.id !== deleteTarget.fileId,
                  ),
                };
              }),
            };
          }),
        };
      });
      return {
        ...prev,
        [selectedGrade]: {
          ...prev[selectedGrade],
          [subject]: updatedChapters,
        },
      };
    });

    if (
      deleteTarget.type === "session" &&
      openSessionId === deleteTarget.sessionId
    ) {
      setOpenSessionId(null);
      setOpenFolderId(null);
      setSelectedFileId(null);
    }
    if (
      deleteTarget.type === "folder" &&
      openFolderId === deleteTarget.folderId
    ) {
      setOpenFolderId(null);
      setSelectedFileId(null);
    }
    if (
      deleteTarget.type === "file" &&
      selectedFileId === deleteTarget.fileId
    ) {
      setSelectedFileId(null);
    }
    setDeleteTarget(null);
  }

  // ── Expansion ──
  const isSubjectOpen = (s: Subject) =>
    visibility ? visibility.visibleSubjects.has(s) : openSubject === s;
  const isChapterOpen = (id: number) =>
    visibility ? visibility.visibleChapters.has(id) : openChapterId === id;
  const isSessionOpen = (id: string) =>
    visibility ? visibility.visibleSessions.has(id) : openSessionId === id;
  const isFolderOpen = (id: string) =>
    visibility ? visibility.visibleFolders.has(id) : openFolderId === id;

  const isVideo = selectedPath ? isVideoFolder(selectedPath.folder.name) : false;
  const fileAccept = isVideo ? ".mp4,.mov,.mkv,.avi" : ".pdf,.pptx,.docx,.xlsx";
  const fileHint = isVideo
    ? "MP4, MOV, MKV — max 4 GB"
    : "PDF, PPTX, DOCX — max 100 MB";

  const noMatches = visibility && visibility.visibleSubjects.size === 0;

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
              Select a subject, chapter, session, and folder — then upload
              content.
            </p>
          </div>
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
          <div className="lg:w-80 shrink-0">
            <StorageBar />
          </div>
        </div>
      </div>

      {/* ── Global search bar ── */}
      <div className="shrink-0 px-6 pb-3 flex justify-center">
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
              title="Clear search"
            >
              <IconClose className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ── Two-panel body ── */}
      <div className="flex flex-1 min-h-0 p-3">
        {/* Left rail */}
        <div className="w-[45%] shrink-0 border-r rounded-2xl border-gray-200 bg-white flex flex-col h-full overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            {noMatches ? (
              <div className="p-8 text-center text-gray-400 text-base">
                No matches for &quot;{searchQuery}&quot;
              </div>
            ) : (
              subjects
                .filter(
                  (sub) => !visibility || visibility.visibleSubjects.has(sub),
                )
                .map((sub) => {
                  const subjectOpen = isSubjectOpen(sub);
                  const chapters = tree[selectedGrade][sub];
                  return (
                    <div
                      key={sub}
                      className="border-b border-gray-100 last:border-0"
                    >
                      {/* Subject row */}
                      <button
                        onClick={() => toggleSubject(sub)}
                        className={`w-full flex items-center gap-3 pl-4 pr-4 py-3 text-left transition-colors ${
                          subjectOpen ? "bg-gray-50" : "hover:bg-gray-50"
                        }`}
                      >
                        <span className="flex-1 text-lg text-gray-800 font-medium">
                          {subjectLabels[sub]}
                        </span>
                        <ChevronIcon
                          open={subjectOpen}
                          className="w-3.5 h-3.5 text-gray-400"
                        />
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
                              {chapters
                                .map((ch, idx) => ({ ch, idx }))
                                .filter(
                                  ({ ch }) =>
                                    !visibility ||
                                    visibility.visibleChapters.has(ch.id),
                                )
                                .map(({ ch, idx }) => {
                                  const chapterOpen = isChapterOpen(ch.id);
                                  return (
                                    <div key={ch.id}>
                                      {/* Chapter row */}
                                      <button
                                        onClick={() => toggleChapter(ch.id)}
                                        className={`w-full flex items-center gap-2.5 pl-8 pr-4 py-2.5 text-left transition-colors ${
                                          chapterOpen
                                            ? "bg-gray-50"
                                            : "hover:bg-gray-50"
                                        }`}
                                      >
                                        <span className="text-sm text-gray-400 shrink-0 w-15">
                                          Chap - {idx + 1}
                                        </span>
                                        <span className="flex-1 text-md text-gray-700 leading-snug">
                                          {ch.title}
                                        </span>
                                        <ChevronIcon
                                          open={chapterOpen}
                                          className="w-3 h-3 text-gray-400"
                                        />
                                      </button>

                                      {/* Sessions */}
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
                                              {ch.sessions
                                                .filter(
                                                  (s) =>
                                                    !visibility ||
                                                    visibility.visibleSessions.has(
                                                      s.id,
                                                    ),
                                                )
                                                .map((session) => {
                                                  const sessionOpen =
                                                    isSessionOpen(session.id);
                                                  return (
                                                    <div key={session.id}>
                                                      {/* Session row */}
                                                      <div
                                                        className={`flex items-stretch transition-colors ${
                                                          sessionOpen
                                                            ? "bg-gray-50"
                                                            : "hover:bg-gray-50"
                                                        }`}
                                                      >
                                                        {renamingSessionId ===
                                                        session.id ? (
                                                          <div className="flex-1 flex items-center gap-2 pl-12 pr-2 py-2 min-w-0">
                                                            <input
                                                              autoFocus
                                                              value={
                                                                renameValue
                                                              }
                                                              onChange={(e) =>
                                                                setRenameValue(
                                                                  e.target
                                                                    .value,
                                                                )
                                                              }
                                                              onKeyDown={(
                                                                e,
                                                              ) => {
                                                                if (
                                                                  e.key ===
                                                                  "Enter"
                                                                )
                                                                  commitSessionRename(
                                                                    sub,
                                                                    ch.id,
                                                                    session.id,
                                                                  );
                                                                if (
                                                                  e.key ===
                                                                  "Escape"
                                                                ) {
                                                                  setRenamingSessionId(
                                                                    null,
                                                                  );
                                                                  setRenameValue(
                                                                    "",
                                                                  );
                                                                }
                                                              }}
                                                              onClick={(e) =>
                                                                e.stopPropagation()
                                                              }
                                                              className="flex-1 border border-gray-300 px-2 py-0.5 text-md text-gray-700 outline-none focus:border-primary bg-white"
                                                            />
                                                            <button
                                                              onClick={() =>
                                                                commitSessionRename(
                                                                  sub,
                                                                  ch.id,
                                                                  session.id,
                                                                )
                                                              }
                                                              className="px-2 py-0.5 bg-primary text-white text-sm"
                                                            >
                                                              ✓
                                                            </button>
                                                            <button
                                                              onClick={() => {
                                                                setRenamingSessionId(
                                                                  null,
                                                                );
                                                                setRenameValue(
                                                                  "",
                                                                );
                                                              }}
                                                              className="px-2 py-0.5 text-gray-400 hover:text-gray-600 text-sm"
                                                            >
                                                              ✕
                                                            </button>
                                                          </div>
                                                        ) : (
                                                          <button
                                                            onClick={() =>
                                                              toggleSession(
                                                                session.id,
                                                              )
                                                            }
                                                            className="flex-1 flex items-center gap-2 pl-12 pr-2 py-2 text-left min-w-0"
                                                          >
                                                            <span className="flex-1 text-md text-gray-700 truncate">
                                                              {session.title}{" "}
                                                              <span className="text-gray-400">
                                                                —{" "}
                                                                {formatSessionDate(
                                                                  session.createdAt,
                                                                )}
                                                              </span>
                                                            </span>
                                                            <ChevronIcon
                                                              open={
                                                                sessionOpen
                                                              }
                                                              className="w-3 h-3 text-gray-400"
                                                            />
                                                          </button>
                                                        )}
                                                        <div className="flex items-center">
                                                          <button
                                                            onClick={(e) => {
                                                              e.stopPropagation();
                                                              if (
                                                                openMenuId ===
                                                                session.id
                                                              ) {
                                                                setOpenMenuId(
                                                                  null,
                                                                );
                                                                setMenuPosition(
                                                                  null,
                                                                );
                                                              } else {
                                                                const rect =
                                                                  e.currentTarget.getBoundingClientRect();
                                                                setMenuPosition(
                                                                  {
                                                                    top:
                                                                      rect.bottom +
                                                                      4,
                                                                    right:
                                                                      window.innerWidth -
                                                                      rect.right,
                                                                  },
                                                                );
                                                                setOpenMenuId(
                                                                  session.id,
                                                                );
                                                              }
                                                            }}
                                                            className="px-3 h-full text-gray-400 hover:text-gray-600 flex items-center"
                                                            title="Options"
                                                          >
                                                            <KebabIcon />
                                                          </button>
                                                          {openMenuId ===
                                                            session.id &&
                                                            menuPosition &&
                                                            createPortal(
                                                              <div
                                                                ref={menuRef}
                                                                style={{
                                                                  position:
                                                                    "fixed",
                                                                  top: menuPosition.top,
                                                                  right:
                                                                    menuPosition.right,
                                                                  zIndex: 50,
                                                                }}
                                                                className="bg-white shadow-lg border border-gray-200 rounded-md py-1 w-32"
                                                              >
                                                                <button
                                                                  onClick={() => {
                                                                    setRenamingSessionId(
                                                                      session.id,
                                                                    );
                                                                    setRenameValue(
                                                                      session.title,
                                                                    );
                                                                    setOpenMenuId(
                                                                      null,
                                                                    );
                                                                    setMenuPosition(
                                                                      null,
                                                                    );
                                                                  }}
                                                                  className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                                                                >
                                                                  Edit
                                                                </button>
                                                                <button
                                                                  onClick={() => {
                                                                    setDeleteTarget(
                                                                      {
                                                                        type: "session",
                                                                        subject:
                                                                          sub,
                                                                        chapterId:
                                                                          ch.id,
                                                                        sessionId:
                                                                          session.id,
                                                                        name: `${session.title} — ${formatSessionDate(session.createdAt)}`,
                                                                      },
                                                                    );
                                                                    setOpenMenuId(
                                                                      null,
                                                                    );
                                                                    setMenuPosition(
                                                                      null,
                                                                    );
                                                                  }}
                                                                  className="w-full text-left px-3 py-1.5 text-sm text-red-600 hover:bg-red-50"
                                                                >
                                                                  Delete
                                                                </button>
                                                              </div>,
                                                              document.body,
                                                            )}
                                                        </div>
                                                      </div>

                                                      {/* Folders */}
                                                      <AnimatePresence
                                                        initial={false}
                                                      >
                                                        {sessionOpen && (
                                                          <motion.div
                                                            initial={{
                                                              height: 0,
                                                            }}
                                                            animate={{
                                                              height: "auto",
                                                            }}
                                                            exit={{
                                                              height: 0,
                                                            }}
                                                            transition={{
                                                              duration: 0.18,
                                                            }}
                                                            className="overflow-hidden"
                                                          >
                                                            <div>
                                                              {session.folders
                                                                .filter(
                                                                  (f) =>
                                                                    !visibility ||
                                                                    visibility.visibleFolders.has(
                                                                      f.id,
                                                                    ),
                                                                )
                                                                .map(
                                                                  (folder) => {
                                                                    const folderOpen =
                                                                      isFolderOpen(
                                                                        folder.id,
                                                                      );
                                                                    const selected =
                                                                      openFolderId ===
                                                                      folder.id;
                                                                    return (
                                                                      <div
                                                                        key={
                                                                          folder.id
                                                                        }
                                                                      >
                                                                        {/* Folder row */}
                                                                        <div
                                                                          className={`flex items-stretch border-l-2 transition-colors ${
                                                                            selected
                                                                              ? "bg-[#f5f0fa] border-primary"
                                                                              : "border-transparent hover:bg-gray-50"
                                                                          }`}
                                                                        >
                                                                          {renamingFolderId ===
                                                                          folder.id ? (
                                                                            <div className="flex-1 flex items-center gap-2 pl-16 pr-2 py-1.5 min-w-0">
                                                                              <input
                                                                                autoFocus
                                                                                value={
                                                                                  renameValue
                                                                                }
                                                                                onChange={(
                                                                                  e,
                                                                                ) =>
                                                                                  setRenameValue(
                                                                                    e
                                                                                      .target
                                                                                      .value,
                                                                                  )
                                                                                }
                                                                                onKeyDown={(
                                                                                  e,
                                                                                ) => {
                                                                                  if (
                                                                                    e.key ===
                                                                                    "Enter"
                                                                                  )
                                                                                    commitFolderRename(
                                                                                      sub,
                                                                                      ch.id,
                                                                                      session.id,
                                                                                      folder.id,
                                                                                    );
                                                                                  if (
                                                                                    e.key ===
                                                                                    "Escape"
                                                                                  ) {
                                                                                    setRenamingFolderId(
                                                                                      null,
                                                                                    );
                                                                                    setRenameValue(
                                                                                      "",
                                                                                    );
                                                                                  }
                                                                                }}
                                                                                onClick={(
                                                                                  e,
                                                                                ) =>
                                                                                  e.stopPropagation()
                                                                                }
                                                                                className="flex-1 border border-gray-300 px-2 py-0.5 text-md text-gray-700 outline-none focus:border-primary bg-white"
                                                                              />
                                                                              <button
                                                                                onClick={() =>
                                                                                  commitFolderRename(
                                                                                    sub,
                                                                                    ch.id,
                                                                                    session.id,
                                                                                    folder.id,
                                                                                  )
                                                                                }
                                                                                className="px-2 py-0.5 bg-primary text-white text-sm"
                                                                              >
                                                                                ✓
                                                                              </button>
                                                                              <button
                                                                                onClick={() => {
                                                                                  setRenamingFolderId(
                                                                                    null,
                                                                                  );
                                                                                  setRenameValue(
                                                                                    "",
                                                                                  );
                                                                                }}
                                                                                className="px-2 py-0.5 text-gray-400 hover:text-gray-600 text-sm"
                                                                              >
                                                                                ✕
                                                                              </button>
                                                                            </div>
                                                                          ) : (
                                                                            <button
                                                                              onClick={() =>
                                                                                toggleFolder(
                                                                                  folder.id,
                                                                                )
                                                                              }
                                                                              className={`flex-1 flex items-center gap-2 pl-16 pr-2 py-1.5 text-left min-w-0 ${
                                                                                selected
                                                                                  ? "text-primary"
                                                                                  : "text-gray-600"
                                                                              }`}
                                                                            >
                                                                              <FolderIcon className="w-4 h-4 shrink-0" />
                                                                              <span className="flex-1 text-md truncate">
                                                                                {
                                                                                  folder.name
                                                                                }
                                                                              </span>
                                                                              {folder
                                                                                .files
                                                                                .length >
                                                                                0 && (
                                                                                <span className="text-xs text-gray-400 shrink-0">
                                                                                  (
                                                                                  {
                                                                                    folder
                                                                                      .files
                                                                                      .length
                                                                                  }
                                                                                  )
                                                                                </span>
                                                                              )}
                                                                              <ChevronIcon
                                                                                open={
                                                                                  folderOpen
                                                                                }
                                                                                className="w-3 h-3 text-gray-400"
                                                                              />
                                                                            </button>
                                                                          )}
                                                                          <div className="flex items-center">
                                                                            <button
                                                                              onClick={(
                                                                                e,
                                                                              ) => {
                                                                                e.stopPropagation();
                                                                                if (
                                                                                  openMenuId ===
                                                                                  folder.id
                                                                                ) {
                                                                                  setOpenMenuId(
                                                                                    null,
                                                                                  );
                                                                                  setMenuPosition(
                                                                                    null,
                                                                                  );
                                                                                } else {
                                                                                  const rect =
                                                                                    e.currentTarget.getBoundingClientRect();
                                                                                  setMenuPosition(
                                                                                    {
                                                                                      top:
                                                                                        rect.bottom +
                                                                                        4,
                                                                                      right:
                                                                                        window.innerWidth -
                                                                                        rect.right,
                                                                                    },
                                                                                  );
                                                                                  setOpenMenuId(
                                                                                    folder.id,
                                                                                  );
                                                                                }
                                                                              }}
                                                                              className="px-3 h-full text-gray-400 hover:text-gray-600 flex items-center"
                                                                              title="Options"
                                                                            >
                                                                              <KebabIcon />
                                                                            </button>
                                                                            {openMenuId ===
                                                                              folder.id &&
                                                                              menuPosition &&
                                                                              createPortal(
                                                                                <div
                                                                                  ref={
                                                                                    menuRef
                                                                                  }
                                                                                  style={{
                                                                                    position:
                                                                                      "fixed",
                                                                                    top: menuPosition.top,
                                                                                    right:
                                                                                      menuPosition.right,
                                                                                    zIndex: 50,
                                                                                  }}
                                                                                  className="bg-white shadow-lg border border-gray-200 rounded-md py-1 w-32"
                                                                                >
                                                                                  <button
                                                                                    onClick={() => {
                                                                                      setRenamingFolderId(
                                                                                        folder.id,
                                                                                      );
                                                                                      setRenameValue(
                                                                                        folder.name,
                                                                                      );
                                                                                      setOpenMenuId(
                                                                                        null,
                                                                                      );
                                                                                      setMenuPosition(
                                                                                        null,
                                                                                      );
                                                                                    }}
                                                                                    className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                                                                                  >
                                                                                    Edit
                                                                                  </button>
                                                                                  <button
                                                                                    onClick={() => {
                                                                                      setDeleteTarget(
                                                                                        {
                                                                                          type: "folder",
                                                                                          subject:
                                                                                            sub,
                                                                                          chapterId:
                                                                                            ch.id,
                                                                                          sessionId:
                                                                                            session.id,
                                                                                          folderId:
                                                                                            folder.id,
                                                                                          name: folder.name,
                                                                                        },
                                                                                      );
                                                                                      setOpenMenuId(
                                                                                        null,
                                                                                      );
                                                                                      setMenuPosition(
                                                                                        null,
                                                                                      );
                                                                                    }}
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
                                                                        <AnimatePresence
                                                                          initial={
                                                                            false
                                                                          }
                                                                        >
                                                                          {folderOpen && (
                                                                            <motion.div
                                                                              initial={{
                                                                                height: 0,
                                                                              }}
                                                                              animate={{
                                                                                height:
                                                                                  "auto",
                                                                              }}
                                                                              exit={{
                                                                                height: 0,
                                                                              }}
                                                                              transition={{
                                                                                duration: 0.18,
                                                                              }}
                                                                              className="overflow-hidden"
                                                                            >
                                                                              <div>
                                                                                {folder
                                                                                  .files
                                                                                  .length ===
                                                                                0 ? (
                                                                                  <div className="pl-20 pr-4 py-1.5 text-sm text-gray-400 italic">
                                                                                    No
                                                                                    files
                                                                                    uploaded
                                                                                    yet
                                                                                  </div>
                                                                                ) : (
                                                                                  folder.files
                                                                                    .filter(
                                                                                      (
                                                                                        f,
                                                                                      ) =>
                                                                                        !visibility ||
                                                                                        visibility.visibleFiles.has(
                                                                                          f.id,
                                                                                        ),
                                                                                    )
                                                                                    .map(
                                                                                      (
                                                                                        f,
                                                                                      ) => {
                                                                                        const fileSelected =
                                                                                          selectedFileId ===
                                                                                          f.id;
                                                                                        return (
                                                                                          <button
                                                                                            key={
                                                                                              f.id
                                                                                            }
                                                                                            onClick={() =>
                                                                                              selectFile(
                                                                                                f.id,
                                                                                                f.name,
                                                                                                f.description,
                                                                                              )
                                                                                            }
                                                                                            className={`w-full flex items-center gap-2 pl-20 pr-2 py-1.5 text-left border-l-2 transition-colors ${
                                                                                              fileSelected
                                                                                                ? "bg-[#f5f0fa] border-primary text-primary"
                                                                                                : "border-transparent text-gray-700 hover:bg-gray-50"
                                                                                            }`}
                                                                                          >
                                                                                            {f.kind ===
                                                                                            "video" ? (
                                                                                              <IconPlay
                                                                                                className={`w-4 h-4 shrink-0 ${fileSelected ? "text-primary" : "text-primary"}`}
                                                                                              />
                                                                                            ) : (
                                                                                              <IconDocument
                                                                                                className={`w-4 h-4 shrink-0 ${fileSelected ? "text-primary" : "text-gray-400"}`}
                                                                                              />
                                                                                            )}
                                                                                            <span className="flex-1 text-sm truncate">
                                                                                              {
                                                                                                f.name
                                                                                              }
                                                                                            </span>
                                                                                            <span
                                                                                              className={`text-xs shrink-0 ${fileSelected ? "text-primary/70" : "text-gray-400"}`}
                                                                                            >
                                                                                              {formatSize(
                                                                                                f.sizeBytes,
                                                                                              )}
                                                                                            </span>
                                                                                          </button>
                                                                                        );
                                                                                      },
                                                                                    )
                                                                                )}
                                                                              </div>
                                                                            </motion.div>
                                                                          )}
                                                                        </AnimatePresence>
                                                                      </div>
                                                                    );
                                                                  },
                                                                )}

                                                              {/* + New Folder */}
                                                              {!visibility &&
                                                                (addingFolderToSession ===
                                                                session.id ? (
                                                                  <div className="pl-16 pr-4 pt-1 pb-2 flex gap-2">
                                                                    <input
                                                                      autoFocus
                                                                      type="text"
                                                                      value={
                                                                        newFolderName
                                                                      }
                                                                      onChange={(
                                                                        e,
                                                                      ) =>
                                                                        setNewFolderName(
                                                                          e
                                                                            .target
                                                                            .value,
                                                                        )
                                                                      }
                                                                      onKeyDown={(
                                                                        e,
                                                                      ) => {
                                                                        if (
                                                                          e.key ===
                                                                          "Enter"
                                                                        )
                                                                          createFolder();
                                                                        if (
                                                                          e.key ===
                                                                          "Escape"
                                                                        ) {
                                                                          setAddingFolderToSession(
                                                                            null,
                                                                          );
                                                                          setNewFolderName(
                                                                            "",
                                                                          );
                                                                        }
                                                                      }}
                                                                      placeholder="Folder name…"
                                                                      className="flex-1 border border-gray-300 px-2 py-1 text-sm outline-none focus:border-primary bg-white"
                                                                    />
                                                                    <button
                                                                      onClick={
                                                                        createFolder
                                                                      }
                                                                      className="px-2 py-1 bg-primary text-white text-sm"
                                                                    >
                                                                      ✓
                                                                    </button>
                                                                    <button
                                                                      onClick={() => {
                                                                        setAddingFolderToSession(
                                                                          null,
                                                                        );
                                                                        setNewFolderName(
                                                                          "",
                                                                        );
                                                                      }}
                                                                      className="px-2 py-1 text-gray-400 hover:text-gray-600"
                                                                    >
                                                                      ✕
                                                                    </button>
                                                                  </div>
                                                                ) : (
                                                                  <button
                                                                    onClick={() => {
                                                                      setAddingFolderToSession(
                                                                        session.id,
                                                                      );
                                                                      setNewFolderName(
                                                                        "",
                                                                      );
                                                                    }}
                                                                    className="w-full flex items-center gap-2 pl-16 pr-4 py-1.5 text-sm text-gray-400 hover:text-primary transition-colors"
                                                                  >
                                                                    <PlusIcon />
                                                                    New Folder
                                                                  </button>
                                                                ))}
                                                            </div>
                                                          </motion.div>
                                                        )}
                                                      </AnimatePresence>
                                                    </div>
                                                  );
                                                })}

                                              {/* + New Session */}
                                              {!visibility &&
                                                (addingSessionToChapter ===
                                                ch.id ? (
                                                  <div className="pl-12 pr-4 pt-1 pb-2 flex gap-2">
                                                    <input
                                                      autoFocus
                                                      type="text"
                                                      value={newSessionTitle}
                                                      onChange={(e) =>
                                                        setNewSessionTitle(
                                                          e.target.value,
                                                        )
                                                      }
                                                      onKeyDown={(e) => {
                                                        if (e.key === "Enter")
                                                          createSession();
                                                        if (e.key === "Escape") {
                                                          setAddingSessionToChapter(
                                                            null,
                                                          );
                                                          setNewSessionTitle("");
                                                        }
                                                      }}
                                                      placeholder="Session title…"
                                                      className="flex-1 border border-gray-300 px-2 py-1 text-sm outline-none focus:border-primary bg-white"
                                                    />
                                                    <button
                                                      onClick={createSession}
                                                      className="px-2 py-1 bg-primary text-white text-sm"
                                                    >
                                                      ✓
                                                    </button>
                                                    <button
                                                      onClick={() => {
                                                        setAddingSessionToChapter(
                                                          null,
                                                        );
                                                        setNewSessionTitle("");
                                                      }}
                                                      className="px-2 py-1 text-gray-400 hover:text-gray-600"
                                                    >
                                                      ✕
                                                    </button>
                                                  </div>
                                                ) : (
                                                  <button
                                                    onClick={() => {
                                                      setAddingSessionToChapter(
                                                        ch.id,
                                                      );
                                                      setNewSessionTitle("");
                                                    }}
                                                    className="w-full flex items-center gap-2 pl-12 pr-4 py-1.5 text-sm text-gray-400 hover:text-primary transition-colors"
                                                  >
                                                    <PlusIcon />
                                                    New Session
                                                  </button>
                                                ))}
                                            </div>
                                          </motion.div>
                                        )}
                                      </AnimatePresence>
                                    </div>
                                  );
                                })}

                              {/* + New Chapter */}
                              {!visibility &&
                                (addingChapterToSubject === sub ? (
                                  <div className="pl-8 pr-4 pt-1 pb-2 flex gap-2">
                                    <input
                                      autoFocus
                                      type="text"
                                      value={newChapterTitle}
                                      onChange={(e) =>
                                        setNewChapterTitle(e.target.value)
                                      }
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") createChapter();
                                        if (e.key === "Escape") {
                                          setAddingChapterToSubject(null);
                                          setNewChapterTitle("");
                                        }
                                      }}
                                      placeholder="Chapter title…"
                                      className="flex-1 border border-gray-300 px-2 py-1 text-sm outline-none focus:border-primary bg-white"
                                    />
                                    <button
                                      onClick={createChapter}
                                      className="px-2 py-1 bg-primary text-white text-sm"
                                    >
                                      ✓
                                    </button>
                                    <button
                                      onClick={() => {
                                        setAddingChapterToSubject(null);
                                        setNewChapterTitle("");
                                      }}
                                      className="px-2 py-1 text-gray-400 hover:text-gray-600"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setAddingChapterToSubject(sub);
                                      setNewChapterTitle("");
                                    }}
                                    className="w-full flex items-center gap-2 pl-8 pr-4 py-1.5 text-base text-gray-500 hover:text-primary transition-colors"
                                  >
                                    <PlusIcon />
                                    New Chapter
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

        {/* Right panel */}
        <div className="flex-1 h-full overflow-y-auto">
          {selectedFile && selectedPath ? (
            <div className="p-4">
              {/* Breadcrumb + Delete */}
              <div className="flex items-start justify-between gap-3 mb-6">
                <div className="flex items-center gap-1.5 text-sm text-gray-400 flex-wrap">
                  <span>{gradeLabels[selectedGrade]}</span>
                  <svg className="w-3 h-3" viewBox="0 0 8 8" fill="none">
                    <path
                      d="M 2,1 L 6,4 L 2,7"
                      stroke="currentColor"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                    />
                  </svg>
                  <span>{subjectLabels[selectedPath.subject]}</span>
                  <svg className="w-3 h-3" viewBox="0 0 8 8" fill="none">
                    <path
                      d="M 2,1 L 6,4 L 2,7"
                      stroke="currentColor"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="truncate max-w-32">
                    {selectedPath.chapter.title}
                  </span>
                  <svg className="w-3 h-3" viewBox="0 0 8 8" fill="none">
                    <path
                      d="M 2,1 L 6,4 L 2,7"
                      stroke="currentColor"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="truncate max-w-32">
                    {selectedPath.folder.name}
                  </span>
                  <svg className="w-3 h-3" viewBox="0 0 8 8" fill="none">
                    <path
                      d="M 2,1 L 6,4 L 2,7"
                      stroke="currentColor"
                      strokeWidth="1.2"
                      strokeLinecap="round"
                    />
                  </svg>
                  <span className="text-primary font-medium truncate max-w-40">
                    {selectedFile.name}
                  </span>
                </div>
                <button
                  onClick={() =>
                    setDeleteTarget({
                      type: "file",
                      subject: selectedPath.subject,
                      chapterId: selectedPath.chapter.id,
                      sessionId: selectedPath.session.id,
                      folderId: selectedPath.folder.id,
                      fileId: selectedFile.id,
                      name: selectedFile.name,
                    })
                  }
                  className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded hover:bg-red-50 transition-colors"
                >
                  <TrashIcon className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>

              <div className="bg-white shadow-sm p-4 rounded-2xl space-y-5">
                {/* Metadata card */}
                <div className="border border-gray-200 rounded-md p-4 flex items-center gap-3">
                  {selectedFile.kind === "video" ? (
                    <IconPlay className="w-8 h-8 text-primary shrink-0" />
                  ) : (
                    <IconDocument className="w-8 h-8 text-gray-400 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-base text-gray-800 truncate">
                      {selectedFile.name}
                    </p>
                    <p className="text-sm text-gray-400">
                      {formatSize(selectedFile.sizeBytes)} ·{" "}
                      {selectedFile.kind === "video" ? "Video" : "Document"} ·
                      uploaded {formatSessionDate(selectedFile.uploadedAt)}
                    </p>
                  </div>
                </div>

                {/* Title */}
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

                {/* Description */}
                <div>
                  <label className="text-sm text-gray-500 block mb-1">
                    Description{" "}
                    <span className="text-gray-300">(optional)</span>
                  </label>
                  <textarea
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    rows={2}
                    placeholder="Brief description of the content…"
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
                      {selectedFile.kind === "video" ? (
                        <IconPlay className="w-5 h-5 text-primary shrink-0" />
                      ) : (
                        <IconDocument className="w-5 h-5 text-gray-400 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-base text-gray-800 truncate">
                          {replaceFile.name}
                        </p>
                        <p className="text-sm text-gray-400">
                          {(replaceFile.size / (1024 * 1024)).toFixed(1)} MB
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
                      <svg
                        className="w-7 h-7 text-gray-300"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <path
                          d="M 12,16 L 12,8 M 8,12 L 12,8 L 16,12"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M 4,18 Q 4,20 12,20 Q 20,20 20,18"
                          stroke="currentColor"
                          strokeWidth="1.3"
                          strokeLinecap="round"
                        />
                      </svg>
                      <p className="text-sm text-gray-500">
                        Drag &amp; drop a new file or{" "}
                        <span className="text-primary">browse</span>
                      </p>
                      <input
                        ref={replaceFileRef}
                        type="file"
                        accept={
                          selectedFile.kind === "video"
                            ? ".mp4,.mov,.mkv,.avi"
                            : ".pdf,.pptx,.docx,.xlsx"
                        }
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

                {/* Save */}
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
                        <IconCheckCircle className="w-4 h-4" />
                        Saved
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
                  Select a folder from the left panel
                </p>
                <p className="text-md text-gray-600 mt-1">
                  Then upload content with a title and file.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-4">
              {/* Breadcrumb */}
              <div className="flex items-center gap-1.5 text-sm text-gray-400 mb-6 flex-wrap">
                <span>{gradeLabels[selectedGrade]}</span>
                <svg className="w-3 h-3" viewBox="0 0 8 8" fill="none">
                  <path
                    d="M 2,1 L 6,4 L 2,7"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                </svg>
                <span>{subjectLabels[selectedPath.subject]}</span>
                <svg className="w-3 h-3" viewBox="0 0 8 8" fill="none">
                  <path
                    d="M 2,1 L 6,4 L 2,7"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                </svg>
                <span className="truncate max-w-40">
                  {selectedPath.chapter.title}
                </span>
                <svg className="w-3 h-3" viewBox="0 0 8 8" fill="none">
                  <path
                    d="M 2,1 L 6,4 L 2,7"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                </svg>
                <span className="truncate max-w-40">
                  {selectedPath.session.title} —{" "}
                  {formatSessionDate(selectedPath.session.createdAt)}
                </span>
                <svg
                  className="w-3 h-3 shrink-0"
                  viewBox="0 0 8 8"
                  fill="none"
                >
                  <path
                    d="M 2,1 L 6,4 L 2,7"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                </svg>
                <span className="text-primary font-medium shrink-0">
                  {selectedPath.folder.name}
                </span>
              </div>

              <div className="bg-white shadow-sm p-4 rounded-2xl space-y-5">
                <h2 className="text-base font-medium text-gray-800">
                  Upload to {selectedPath.folder.name}
                </h2>

                <div>
                  <label className="text-sm text-gray-500 block mb-1">
                    Title <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
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
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    rows={2}
                    placeholder="Brief description of the content…"
                    className="w-full border border-gray-200 px-4 py-2.5 text-base text-gray-800 placeholder-gray-300 outline-none focus:border-gray-400 resize-none"
                  />
                </div>

                <div>
                  <label className="text-sm text-gray-500 block mb-1">
                    File <span className="text-red-400">*</span>
                  </label>
                  {file ? (
                    <div className="border border-gray-200 px-4 py-3 flex items-center gap-3">
                      {isVideo ? (
                        <IconPlay className="w-5 h-5 text-primary shrink-0" />
                      ) : (
                        <IconDocument className="w-5 h-5 text-gray-400 shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-base text-gray-800 truncate">
                          {file.name}
                        </p>
                        <p className="text-sm text-gray-400">
                          {(file.size / (1024 * 1024)).toFixed(1)} MB
                        </p>
                      </div>
                      <button
                        onClick={() => setFile(null)}
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
                        if (f) setFile(f);
                      }}
                      onClick={() => fileRef.current?.click()}
                      className={`border-2 border-dashed flex flex-col items-center justify-center gap-2 py-8 cursor-pointer transition-colors ${
                        dragging
                          ? "border-primary bg-gray-50"
                          : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                      }`}
                    >
                      <svg
                        className="w-8 h-8 text-gray-300"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <path
                          d="M 12,16 L 12,8 M 8,12 L 12,8 L 16,12"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                        <path
                          d="M 4,18 Q 4,20 12,20 Q 20,20 20,18"
                          stroke="currentColor"
                          strokeWidth="1.3"
                          strokeLinecap="round"
                        />
                      </svg>
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
                          if (f) setFile(f);
                          e.target.value = "";
                        }}
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-4 pt-1">
                  <button
                    onClick={handleUpload}
                    disabled={!title.trim() || !file}
                    className="px-6 py-2.5 bg-primary text-white text-base hover:bg-primary/80 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Upload File
                  </button>
                  <AnimatePresence>
                    {uploaded && (
                      <motion.div
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-2 text-green-700 text-base"
                      >
                        <IconCheckCircle className="w-4 h-4" />
                        Uploaded successfully
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Delete confirmation modal ── */}
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
              className="bg-white shadow-xl p-6 max-w-sm w-full mx-4"
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-medium text-gray-900">
                Delete &quot;{deleteTarget.name}&quot;?
              </h3>
              <p className="text-base text-gray-600 mt-2">
                This permanently deletes the {deleteTarget.type}
                {deleteTarget.type !== "file" && " and everything inside it"}.
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
                  className="px-4 py-2 text-base bg-red-600 text-white hover:bg-red-700 font-medium"
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
