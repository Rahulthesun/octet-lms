"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  IconPlay,
  IconDocument,
  IconClose,
  IconCheckCircle,
} from "@/components/ui/SvgIcons";

// ─── Types ────────────────────────────────────────────────────────────────────

type Grade = "11" | "12" | "jee" | "neet";

interface Folder {
  id: string;
  name: string;
}
interface Chapter {
  id: number;
  title: string;
  folders: Folder[];
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

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

const initialChapters: Record<Grade, Chapter[]> = {
  "11": [
    {
      id: 1,
      title: "Some Basic Concepts of Chemistry",
      folders: [
        { id: "11-1-vid", name: "Video Lectures" },
        { id: "11-1-notes", name: "Notes & PDFs" },
        { id: "11-1-qp", name: "Question Papers" },
      ],
    },
    {
      id: 2,
      title: "Structure of Atom",
      folders: [
        { id: "11-2-vid", name: "Video Lectures" },
        { id: "11-2-notes", name: "Notes & PDFs" },
      ],
    },
    {
      id: 3,
      title: "Chemical Bonding & Molecular Structure",
      folders: [
        { id: "11-3-vid", name: "Video Lectures" },
        { id: "11-3-notes", name: "Notes & PDFs" },
        { id: "11-3-sheets", name: "Cheat Sheets" },
      ],
    },
    {
      id: 4,
      title: "States of Matter",
      folders: [{ id: "11-4-vid", name: "Video Lectures" }],
    },
    {
      id: 5,
      title: "Thermodynamics",
      folders: [
        { id: "11-5-vid", name: "Video Lectures" },
        { id: "11-5-qp", name: "Question Papers" },
      ],
    },
    {
      id: 6,
      title: "Equilibrium",
      folders: [
        { id: "11-6-vid", name: "Video Lectures" },
        { id: "11-6-notes", name: "Notes & PDFs" },
      ],
    },
  ],
  "12": [
    {
      id: 1,
      title: "Solid State",
      folders: [
        { id: "12-1-vid", name: "Video Lectures" },
        { id: "12-1-notes", name: "Notes & PDFs" },
        { id: "12-1-qp", name: "Question Papers" },
      ],
    },
    {
      id: 2,
      title: "Solutions",
      folders: [
        { id: "12-2-vid", name: "Video Lectures" },
        { id: "12-2-notes", name: "Notes & PDFs" },
      ],
    },
    {
      id: 3,
      title: "Electrochemistry",
      folders: [
        { id: "12-3-vid", name: "Video Lectures" },
        { id: "12-3-qp", name: "Question Papers" },
      ],
    },
    {
      id: 4,
      title: "Chemical Kinetics",
      folders: [{ id: "12-4-vid", name: "Video Lectures" }],
    },
    {
      id: 5,
      title: "Surface Chemistry",
      folders: [
        { id: "12-5-vid", name: "Video Lectures" },
        { id: "12-5-notes", name: "Notes & PDFs" },
      ],
    },
  ],
  jee: [
    {
      id: 1,
      title: "Mole Concept",
      folders: [
        { id: "jee-1-vid", name: "Video Lectures" },
        { id: "jee-1-qp", name: "JEE Papers" },
        { id: "jee-1-notes", name: "Notes & PDFs" },
      ],
    },
    {
      id: 2,
      title: "Atomic Structure",
      folders: [
        { id: "jee-2-vid", name: "Video Lectures" },
        { id: "jee-2-qp", name: "JEE Papers" },
      ],
    },
    {
      id: 3,
      title: "Chemical Bonding",
      folders: [
        { id: "jee-3-vid", name: "Video Lectures" },
        { id: "jee-3-notes", name: "Notes & PDFs" },
      ],
    },
    {
      id: 4,
      title: "Thermodynamics",
      folders: [
        { id: "jee-4-vid", name: "Video Lectures" },
        { id: "jee-4-qp", name: "JEE Papers" },
      ],
    },
  ],
  neet: [
    {
      id: 1,
      title: "Basic Concepts",
      folders: [
        { id: "neet-1-vid", name: "Video Lectures" },
        { id: "neet-1-qp", name: "NEET Papers" },
      ],
    },
    {
      id: 2,
      title: "Structure of Atom",
      folders: [
        { id: "neet-2-vid", name: "Video Lectures" },
        { id: "neet-2-qp", name: "NEET Papers" },
      ],
    },
    {
      id: 3,
      title: "Chemical Bonding",
      folders: [
        { id: "neet-3-vid", name: "Video Lectures" },
        { id: "neet-3-notes", name: "Notes & PDFs" },
      ],
    },
    {
      id: 4,
      title: "States of Matter",
      folders: [{ id: "neet-4-vid", name: "Video Lectures" }],
    },
    {
      id: 5,
      title: "Thermodynamics",
      folders: [
        { id: "neet-5-vid", name: "Video Lectures" },
        { id: "neet-5-qp", name: "NEET Papers" },
      ],
    },
  ],
};

// ─── Storage bar ───────────────────────────────────────────────────────────────

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
  const [chapters, setChapters] =
    useState<Record<Grade, Chapter[]>>(initialChapters);
  const [selectedGrade, setSelectedGrade] = useState<Grade>("11");
  const [openChapterId, setOpenChapterId] = useState<number | null>(null);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  // New folder creation state
  const [addingFolderToChapter, setAddingFolderToChapter] = useState<
    number | null
  >(null);
  const [newFolderName, setNewFolderName] = useState("");

  // New chapter creation state
  const [addingChapter, setAddingChapter] = useState(false);
  const [newChapterTitle, setNewChapterTitle] = useState("");

  // Upload form state
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const currentChapters = chapters[selectedGrade];
  const openChapter =
    currentChapters.find((c) => c.id === openChapterId) ?? null;
  const selectedFolder =
    openChapter?.folders.find((f) => f.id === selectedFolderId) ?? null;

  function selectGrade(g: Grade) {
    setSelectedGrade(g);
    setOpenChapterId(null);
    setSelectedFolderId(null);
    setAddingFolderToChapter(null);
    setAddingChapter(false);
    setNewChapterTitle("");
  }

  function createChapter() {
    if (!newChapterTitle.trim()) return;
    const newId = Date.now();
    const newChapter: Chapter = {
      id: newId,
      title: newChapterTitle.trim(),
      folders: [],
    };
    setChapters((prev) => ({
      ...prev,
      [selectedGrade]: [...prev[selectedGrade], newChapter],
    }));
    setOpenChapterId(newId);
    setSelectedFolderId(null);
    setAddingChapter(false);
    setNewChapterTitle("");
  }

  function toggleChapter(id: number) {
    if (openChapterId === id) {
      setOpenChapterId(null);
      setSelectedFolderId(null);
    } else {
      setOpenChapterId(id);
      setSelectedFolderId(null);
    }
    setAddingFolderToChapter(null);
    setNewFolderName("");
  }

  function selectFolder(folderId: string) {
    setSelectedFolderId(folderId);
    setUploaded(false);
    setFile(null);
    setTitle("");
    setDesc("");
  }

  function createFolder() {
    if (!newFolderName.trim() || addingFolderToChapter === null) return;
    const newFolder: Folder = {
      id: `${selectedGrade}-${addingFolderToChapter}-${Date.now()}`,
      name: newFolderName.trim(),
    };
    setChapters((prev) => ({
      ...prev,
      [selectedGrade]: prev[selectedGrade].map((ch) =>
        ch.id === addingFolderToChapter
          ? { ...ch, folders: [...ch.folders, newFolder] }
          : ch,
      ),
    }));
    setAddingFolderToChapter(null);
    setNewFolderName("");
    setSelectedFolderId(newFolder.id);
  }

  function handleUpload() {
    if (!title.trim() || !file) return;
    setUploaded(true);
    setFile(null);
    setTitle("");
    setDesc("");
    setTimeout(() => setUploaded(false), 4000);
  }

  const isVideo = selectedFolder?.name.toLowerCase().includes("video");
  const fileAccept = isVideo ? ".mp4,.mov,.mkv,.avi" : ".pdf,.pptx,.docx,.xlsx";
  const fileHint = isVideo
    ? "MP4, MOV, MKV — max 4 GB"
    : "PDF, PPTX, DOCX — max 100 MB";

  return (
    <div className="flex flex-col h-full p-3">
      {/* Page header */}
      <div className="shrink-0 px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="shrink-0">
            <h1 className="text-3xl font-bold text-gray-900">
              Content Manager
            </h1>
            <p className="text-base text-gray-600 mt-1">
              Select a chapter and folder — then upload content.
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

      {/* Two-panel body */}
      <div className="flex flex-1 min-h-0 p-3">
        {/* ── Left rail ── */}
        <div className="w-[45%] shrink-0 border-r rounded-2xl border-gray-200 bg-white flex flex-col h-full overflow-hidden">
          {/* Chapter + folder tree */}
          <div className="flex-1 overflow-y-auto flex flex-col">
            <div className="flex-1">
              {currentChapters.map((ch) => {
                const isOpen = openChapterId === ch.id;
                return (
                  <div
                    key={ch.id}
                    className="border-b border-gray-100 last:border-0"
                  >
                    {/* Chapter row */}
                    <button
                      onClick={() => toggleChapter(ch.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
                        isOpen ? "bg-gray-50" : "hover:bg-gray-50"
                      }`}
                    >
                      <span className="text-sm text-gray-400 w-15 shrink-0">
                        chap - {ch.id}
                      </span>
                      <span className="flex-1 text-lg text-gray-700 leading-snug">
                        {ch.title}
                      </span>
                      <svg
                        className={`w-3.5 h-3.5 text-gray-400 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
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
                    </button>

                    {/* Folder list */}
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: "auto" }}
                          exit={{ height: 0 }}
                          transition={{ duration: 0.18 }}
                          className="overflow-hidden bg-gray-50"
                        >
                          <div className="pb-1.5">
                            {ch.folders.map((f) => (
                              <button
                                key={f.id}
                                onClick={() => selectFolder(f.id)}
                                className={`w-full flex items-center gap-2.5 pl-10 pr-4 py-2 text-left text-md transition-colors ${
                                  selectedFolderId === f.id
                                    ? "text-primary bg-[#f5f0fa] border-l-2 border-primary"
                                    : "text-gray-600 hover:bg-gray-100"
                                }`}
                              >
                                <svg
                                  className="w-4 h-4 shrink-0"
                                  viewBox="0 0 16 16"
                                  fill="none"
                                >
                                  <path
                                    d="M 1,5 Q 1,4 2,4 L 6.5,4 L 7.5,3 L 14,3 Q 15,3 15,4 L 15,12 Q 15,13 14,13 L 2,13 Q 1,13 1,12 Z"
                                    stroke="currentColor"
                                    strokeWidth="1.2"
                                    strokeLinejoin="round"
                                  />
                                </svg>
                                <span className="truncate">{f.name}</span>
                              </button>
                            ))}

                            {/* New folder row */}
                            {addingFolderToChapter === ch.id ? (
                              <div className="pl-10 pr-4 pt-1 pb-2 flex gap-2">
                                <input
                                  autoFocus
                                  type="text"
                                  value={newFolderName}
                                  onChange={(e) =>
                                    setNewFolderName(e.target.value)
                                  }
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") createFolder();
                                    if (e.key === "Escape") {
                                      setAddingFolderToChapter(null);
                                      setNewFolderName("");
                                    }
                                  }}
                                  placeholder="Folder name…"
                                  className="flex-1 border border-gray-300 px-2 py-1 text-sm outline-none focus:border-primary bg-white"
                                />
                                <button
                                  onClick={createFolder}
                                  className="px-2 py-1 bg-primary text-white text-sm"
                                >
                                  ✓
                                </button>
                                <button
                                  onClick={() => {
                                    setAddingFolderToChapter(null);
                                    setNewFolderName("");
                                  }}
                                  className="px-2 py-1 text-gray-400 hover:text-gray-600"
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setAddingFolderToChapter(ch.id);
                                  setNewFolderName("");
                                }}
                                className="w-full flex items-center gap-2 pl-10 pr-4 py-1.5 text-sm text-gray-400 hover:text-primary transition-colors"
                              >
                                <svg
                                  className="w-3.5 h-3.5"
                                  viewBox="0 0 12 12"
                                  fill="none"
                                >
                                  <path
                                    d="M 6,1 L 6,11 M 1,6 L 11,6"
                                    stroke="currentColor"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                  />
                                </svg>
                                New Folder
                              </button>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>

            {/* New Chapter */}
            <div className="shrink-0 border-t border-gray-200 p-3">
              {addingChapter ? (
                <div className="flex gap-2">
                  <input
                    autoFocus
                    type="text"
                    value={newChapterTitle}
                    onChange={(e) => setNewChapterTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") createChapter();
                      if (e.key === "Escape") {
                        setAddingChapter(false);
                        setNewChapterTitle("");
                      }
                    }}
                    placeholder="Chapter title…"
                    className="flex-1 border border-gray-300 px-2 py-1.5 text-sm outline-none focus:border-primary bg-white"
                  />
                  <button
                    onClick={createChapter}
                    className="px-2.5 py-1.5 bg-primary text-white text-sm"
                  >
                    ✓
                  </button>
                  <button
                    onClick={() => {
                      setAddingChapter(false);
                      setNewChapterTitle("");
                    }}
                    className="px-2.5 py-1.5 text-gray-400 hover:text-gray-600 text-sm"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setAddingChapter(true)}
                  className="w-full flex items-center gap-2 px-2 py-1.5 text-base hover:cursor-pointer text-gray-600 hover:text-primary transition-colors"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 12 12" fill="none">
                    <path
                      d="M 6,1 L 6,11 M 1,6 L 11,6"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                  New Chapter
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Right panel ── */}
        <div className="flex-1 h-full overflow-y-auto">
          {!selectedFolder ? (
            /* Empty state */
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
                  Select a chapter and folder from the left panel
                </p>
                <p className="text-md text-gray-600 mt-1">
                  Then upload content with a title and file.
                </p>
              </div>
            </div>
          ) : (
            /* Upload form */
            <div className="p-4">
              {/* Breadcrumb */}
              <div className="flex items-center gap-1.5 text-sm text-gray-400 mb-6">
                <span>{gradeLabels[selectedGrade]}</span>
                <svg className="w-3 h-3" viewBox="0 0 8 8" fill="none">
                  <path
                    d="M 2,1 L 6,4 L 2,7"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                </svg>
                <span className="truncate max-w-40">{openChapter?.title}</span>
                <svg className="w-3 h-3 shrink-0" viewBox="0 0 8 8" fill="none">
                  <path
                    d="M 2,1 L 6,4 L 2,7"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                </svg>
                <span className="text-primary font-medium shrink-0">
                  {selectedFolder.name}
                </span>
              </div>

              <div className="bg-white shadow-sm p-4 rounded-2xl space-y-5">
                <h2 className="text-base font-medium text-gray-800">
                  Upload to {selectedFolder.name}
                </h2>

                {/* Title */}
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

                {/* Description */}
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

                {/* Drop zone */}
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

                {/* Submit */}
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
    </div>
  );
}
