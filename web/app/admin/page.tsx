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

type UploadTab = "video" | "mcq" | "descriptive" | "answerkey";
type Grade = "11" | "12" | "jee" | "neet";

interface UploadedFile {
  name: string;
  size: string;
  date: string;
  chapter: string;
  type: UploadTab;
}

interface ChapterContent {
  id: number;
  title: string;
  videos: string[];
  mcq: string[];
  descriptive: string[];
  answerkeys: string[];
}

interface Playlist {
  id: string;
  name: string;
  items: string[];
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const uploadedFiles: UploadedFile[] = [
  {
    name: "Atomic Structure — Part 1.mp4",
    size: "428 MB",
    date: "22 May 2026",
    chapter: "Atomic Structure",
    type: "video",
  },
  {
    name: "Chemical Bonding — Introduction.mp4",
    size: "312 MB",
    date: "20 May 2026",
    chapter: "Chemical Bonding",
    type: "video",
  },
  {
    name: "Mole Concept — Full Lecture.mp4",
    size: "580 MB",
    date: "18 May 2026",
    chapter: "Mole Concept",
    type: "video",
  },
  {
    name: "States of Matter — Part 2.mp4",
    size: "395 MB",
    date: "15 May 2026",
    chapter: "States of Matter",
    type: "video",
  },
  {
    name: "Unit Test 1 — Atomic Structure.pdf",
    size: "1.2 MB",
    date: "21 May 2026",
    chapter: "Atomic Structure",
    type: "mcq",
  },
  {
    name: "Chapter Test — Chemical Bonding.pdf",
    size: "0.8 MB",
    date: "15 May 2026",
    chapter: "Chemical Bonding",
    type: "mcq",
  },
  {
    name: "Mock Test 1 — JEE Pattern.pdf",
    size: "1.8 MB",
    date: "10 May 2026",
    chapter: "Full Syllabus",
    type: "mcq",
  },
  {
    name: "Full Test — Inorganic Chemistry.pdf",
    size: "2.1 MB",
    date: "08 May 2026",
    chapter: "Inorganic",
    type: "descriptive",
  },
  {
    name: "Unit Test 1 — Key.pdf",
    size: "0.4 MB",
    date: "21 May 2026",
    chapter: "Atomic Structure",
    type: "answerkey",
  },
  {
    name: "Chapter Test Key — Bonding.pdf",
    size: "0.3 MB",
    date: "15 May 2026",
    chapter: "Chemical Bonding",
    type: "answerkey",
  },
];

const contentTree: Record<Grade, ChapterContent[]> = {
  "11": [
    {
      id: 1,
      title: "Some Basic Concepts of Chemistry",
      videos: ["Mole Concept — Full Lecture.mp4"],
      mcq: ["Unit Test 1 — Atomic Structure.pdf"],
      descriptive: [],
      answerkeys: ["Unit Test 1 — Key.pdf"],
    },
    {
      id: 2,
      title: "Structure of Atom",
      videos: [
        "Atomic Structure — Part 1.mp4",
        "Atomic Structure — Part 2.mp4",
      ],
      mcq: ["Chapter Test — Chemical Bonding.pdf"],
      descriptive: [],
      answerkeys: ["Chapter Test Key — Bonding.pdf"],
    },
    {
      id: 3,
      title: "Chemical Bonding & Molecular Structure",
      videos: [
        "Chemical Bonding — Introduction.mp4",
        "Hybridisation.mp4",
        "Molecular Orbital Theory.mp4",
      ],
      mcq: [],
      descriptive: [],
      answerkeys: [],
    },
    {
      id: 4,
      title: "States of Matter",
      videos: [
        "States of Matter — Part 1.mp4",
        "States of Matter — Part 2.mp4",
      ],
      mcq: [],
      descriptive: [],
      answerkeys: [],
    },
    {
      id: 5,
      title: "Thermodynamics",
      videos: [
        "Thermodynamics — Introduction.mp4",
        "First Law.mp4",
        "Second & Third Law.mp4",
        "Gibbs.mp4",
      ],
      mcq: ["Mock Test 1 — JEE Pattern.pdf"],
      descriptive: ["Full Test — Inorganic Chemistry.pdf"],
      answerkeys: [],
    },
    {
      id: 6,
      title: "Equilibrium",
      videos: ["Chemical Equilibrium.mp4", "Le Chatelier Principle.mp4"],
      mcq: [],
      descriptive: [],
      answerkeys: [],
    },
  ],
  "12": [
    {
      id: 1,
      title: "Solid State",
      videos: [
        "Crystal Lattice.mp4",
        "Defects.mp4",
        "Electrical Properties.mp4",
      ],
      mcq: ["Solid State MCQ Test.pdf"],
      descriptive: [],
      answerkeys: ["Solid State Key.pdf"],
    },
    {
      id: 2,
      title: "Solutions",
      videos: ["Colligative Properties.mp4", "Vapour Pressure.mp4"],
      mcq: [],
      descriptive: [],
      answerkeys: [],
    },
    {
      id: 3,
      title: "Electrochemistry",
      videos: ["Galvanic Cells.mp4", "Nernst Equation.mp4", "Corrosion.mp4"],
      mcq: ["Electrochemistry MCQ.pdf"],
      descriptive: [],
      answerkeys: [],
    },
    {
      id: 4,
      title: "Chemical Kinetics",
      videos: ["Rate of Reaction.mp4", "Order & Molecularity.mp4"],
      mcq: [],
      descriptive: [],
      answerkeys: [],
    },
    {
      id: 5,
      title: "Surface Chemistry",
      videos: ["Adsorption.mp4", "Colloids.mp4"],
      mcq: [],
      descriptive: [],
      answerkeys: [],
    },
  ],
  jee: [
    {
      id: 1,
      title: "Mole Concept (JEE)",
      videos: ["Mole Concept — JEE Advanced.mp4", "Stoichiometry.mp4"],
      mcq: ["Mole Concept MCQ.pdf"],
      descriptive: [],
      answerkeys: ["Mole Concept Key.pdf"],
    },
    {
      id: 2,
      title: "Atomic Structure (JEE)",
      videos: [
        "Bohr Model.mp4",
        "Quantum Numbers.mp4",
        "Electronic Config.mp4",
      ],
      mcq: ["Atomic Structure MCQ.pdf"],
      descriptive: [],
      answerkeys: [],
    },
    {
      id: 3,
      title: "Chemical Bonding (JEE)",
      videos: ["VSEPR Theory.mp4", "Hybridisation.mp4", "MOT.mp4"],
      mcq: [],
      descriptive: [],
      answerkeys: [],
    },
    {
      id: 4,
      title: "Thermodynamics (JEE)",
      videos: ["Laws of Thermo.mp4", "Hess Law.mp4", "Entropy & Gibbs.mp4"],
      mcq: ["Thermodynamics JEE MCQ.pdf"],
      descriptive: [],
      answerkeys: [],
    },
  ],
  neet: [
    {
      id: 1,
      title: "Basic Concepts (NEET)",
      videos: ["NEET — Basic Concepts.mp4", "NEET — Mole Concept.mp4"],
      mcq: ["NEET Basic Concepts MCQ.pdf"],
      descriptive: [],
      answerkeys: ["NEET Key 1.pdf"],
    },
    {
      id: 2,
      title: "Structure of Atom (NEET)",
      videos: ["NEET — Atomic Structure.mp4"],
      mcq: ["NEET Atomic MCQ.pdf"],
      descriptive: [],
      answerkeys: [],
    },
    {
      id: 3,
      title: "Chemical Bonding (NEET)",
      videos: ["NEET — Bonding.mp4", "NEET — Hybridisation.mp4"],
      mcq: [],
      descriptive: [],
      answerkeys: [],
    },
    {
      id: 4,
      title: "States of Matter (NEET)",
      videos: ["NEET — States of Matter.mp4"],
      mcq: [],
      descriptive: [],
      answerkeys: [],
    },
    {
      id: 5,
      title: "Thermodynamics (NEET)",
      videos: ["NEET — Thermodynamics.mp4", "NEET — Hess Law.mp4"],
      mcq: ["NEET Thermo MCQ.pdf"],
      descriptive: [],
      answerkeys: [],
    },
  ],
};

const initialPlaylists: Playlist[] = [
  {
    id: "pl1",
    name: "JEE Crash Course — Physical Chemistry",
    items: [
      "Mole Concept — JEE Advanced.mp4",
      "Atomic Structure — Part 1.mp4",
      "Thermodynamics — Introduction.mp4",
    ],
  },
  {
    id: "pl2",
    name: "NEET Revision Series",
    items: [
      "NEET — Basic Concepts.mp4",
      "NEET — Atomic Structure.mp4",
      "NEET — Bonding.mp4",
    ],
  },
];

const tabMeta: Record<
  UploadTab,
  { label: string; accept: string; hint: string }
> = {
  video: {
    label: "Video",
    accept: ".mp4,.mov,.mkv,.avi",
    hint: "MP4, MOV, MKV · max 4 GB per file",
  },
  mcq: {
    label: "MCQ Paper",
    accept: ".pdf",
    hint: "PDF only — MCQ question paper",
  },
  descriptive: {
    label: "Descriptive",
    accept: ".pdf",
    hint: "PDF only — Descriptive / subjective paper",
  },
  answerkey: {
    label: "Answer Key",
    accept: ".pdf",
    hint: "PDF only — Answer key or solution set",
  },
};

// ─── Storage Bar ──────────────────────────────────────────────────────────────

function StorageIndicator() {
  const used = 24.8;
  const total = 50;
  const pct = (used / total) * 100;

  return (
    <div className="flex items-center gap-4 bg-white shadow-sm px-5 py-3 w-full xl:w-[400px]">
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-base text-gray-600">Video Storage</span>
          <span className="text-base font-inter text-[#5e4075]">
            {used} GB / {total} GB
          </span>
        </div>
        <div className="h-1.5 bg-gray-200 overflow-hidden">
          <div className="h-full bg-[#5e4075]" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-sm text-gray-400 mt-1">
          {(total - used).toFixed(1)} GB free
        </p>
      </div>
    </div>
  );
}

// ─── Upload Panel ─────────────────────────────────────────────────────────────

function UploadPanel() {
  const [activeTab, setActiveTab] = useState<UploadTab>("video");
  const [files, setFiles] = useState<UploadedFile[]>(uploadedFiles);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingChapter, setPendingChapter] = useState("");
  const [dragging, setDragging] = useState(false);
  const [uploaded, setUploaded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const visibleFiles = files.filter((f) => f.type === activeTab);
  const meta = tabMeta[activeTab];

  const handleFileSelect = (f: File) => {
    setPendingFile(f);
    setUploaded(false);
  };

  const handleUpload = () => {
    if (!pendingFile) return;
    const sizeMB = pendingFile.size / (1024 * 1024);
    const sizeStr =
      sizeMB >= 1000
        ? `${(sizeMB / 1024).toFixed(1)} GB`
        : `${sizeMB.toFixed(1)} MB`;
    const today = new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
    setFiles((prev) => [
      {
        name: pendingFile.name,
        size: sizeStr,
        date: today,
        chapter: pendingChapter || "Unassigned",
        type: activeTab,
      },
      ...prev,
    ]);
    setPendingFile(null);
    setPendingChapter("");
    setUploaded(true);
    setTimeout(() => setUploaded(false), 3000);
  };

  return (
    <div className="bg-white shadow-sm flex flex-col">
      {/* Tab bar */}
      <div className="flex border-b border-gray-200 px-4 pt-3 gap-1">
        {(Object.keys(tabMeta) as UploadTab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              setPendingFile(null);
            }}
            className={`px-4 py-2 text-base transition-all duration-150 ${
              activeTab === tab
                ? "bg-[#5e4075] text-white"
                : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
            }`}
          >
            {tabMeta[tab].label}
          </button>
        ))}
      </div>

      <div className="p-5 flex flex-col gap-4">
        {/* Drop zone */}
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
            if (f) handleFileSelect(f);
          }}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed flex flex-col items-center justify-center gap-3 py-10 cursor-pointer transition-colors ${
            dragging
              ? "border-[#5e4075] bg-gray-50"
              : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
          }`}
        >
          <div className="w-12 h-12 bg-gray-100 flex items-center justify-center text-gray-500">
            {activeTab === "video" ? (
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                <rect
                  x="2"
                  y="4"
                  width="20"
                  height="16"
                  rx="2"
                  stroke="currentColor"
                  strokeWidth="1.5"
                />
                <path d="M 9,8.5 L 16,12 L 9,15.5 Z" fill="currentColor" />
              </svg>
            ) : (
              <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none">
                <path
                  d="M 6,3 L 15,3 L 21,9 L 21,21 Q 21,22 20,22 L 4,22 Q 3,22 3,21 L 3,4 Q 3,3 6,3 Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
                <path
                  d="M 15,3 L 15,9 L 21,9"
                  stroke="currentColor"
                  strokeWidth="1.3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </div>
          <div className="text-center">
            <p className="text-base text-gray-700">
              Drag &amp; drop or click to browse
            </p>
            <p className="text-sm text-gray-400 mt-0.5">{meta.hint}</p>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept={meta.accept}
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFileSelect(f);
              e.target.value = "";
            }}
          />
        </div>

        {/* Selected file */}
        <AnimatePresence>
          {pendingFile && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="border border-gray-200 p-4 flex flex-col gap-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-gray-100 flex items-center justify-center text-gray-500">
                  {activeTab === "video" ? (
                    <IconPlay className="w-4 h-4" />
                  ) : (
                    <IconDocument className="w-4 h-4" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-base text-gray-800 truncate">
                    {pendingFile.name}
                  </p>
                  <p className="text-sm text-gray-400">
                    {(pendingFile.size / (1024 * 1024)).toFixed(1)} MB · Ready
                    to upload
                  </p>
                </div>
                <button
                  onClick={() => setPendingFile(null)}
                  className="text-gray-400 hover:text-gray-700"
                >
                  <IconClose className="w-4 h-4" />
                </button>
              </div>
              <input
                type="text"
                placeholder="Chapter name (optional)"
                value={pendingChapter}
                onChange={(e) => setPendingChapter(e.target.value)}
                className="w-full border border-gray-200 px-4 py-2 text-base text-gray-700 placeholder-gray-400 outline-none focus:border-gray-400"
              />
              <button
                onClick={handleUpload}
                className="w-full py-2.5 bg-[#5e4075] text-white text-base hover:bg-[#3d2652] transition-colors"
              >
                Upload File
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {uploaded && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 px-4 py-3"
            >
              <IconCheckCircle className="w-4 h-4" />
              <span className="text-base">File uploaded successfully.</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Recent uploads */}
        {visibleFiles.length > 0 && (
          <div>
            <p className="text-sm text-gray-400 uppercase tracking-widest mb-3">
              Recent Uploads
            </p>
            <div className="space-y-1">
              {visibleFiles.slice(0, 6).map((f) => (
                <div
                  key={f.name}
                  className="flex items-center gap-3 px-3 py-3 hover:bg-gray-50 transition-colors group border border-transparent hover:border-gray-200"
                >
                  <div className="w-8 h-8 bg-gray-100 flex items-center justify-center text-gray-500 shrink-0">
                    {f.type === "video" ? (
                      <IconPlay className="w-4 h-4" />
                    ) : (
                      <IconDocument className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base text-gray-800 truncate">{f.name}</p>
                    <p className="text-sm text-gray-400">
                      {f.size} · {f.chapter} · {f.date}
                    </p>
                  </div>
                  <button
                    onClick={() =>
                      setFiles((prev) => prev.filter((x) => x.name !== f.name))
                    }
                    className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
                      <path
                        d="M 3,4 L 13,4 M 6,4 L 6,2 L 10,2 L 10,4 M 4,4 L 4,13 Q 4,14 5,14 L 11,14 Q 12,14 12,13 L 12,4"
                        stroke="currentColor"
                        strokeWidth="1.3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Content Organiser ────────────────────────────────────────────────────────

function ContentOrganiser() {
  const [grade, setGrade] = useState<Grade>("11");
  const [openChapter, setOpenChapter] = useState<number | null>(null);
  const [playlists, setPlaylists] = useState<Playlist[]>(initialPlaylists);
  const [newName, setNewName] = useState("");
  const [showNew, setShowNew] = useState(false);

  const grades: { id: Grade; label: string }[] = [
    { id: "11", label: "11th" },
    { id: "12", label: "12th" },
    { id: "jee", label: "JEE" },
    { id: "neet", label: "NEET" },
  ];
  const chapters = contentTree[grade];

  const create = () => {
    if (!newName.trim()) return;
    setPlaylists((prev) => [
      ...prev,
      { id: `pl${Date.now()}`, name: newName.trim(), items: [] },
    ]);
    setNewName("");
    setShowNew(false);
  };

  return (
    <div className="bg-white shadow-sm flex flex-col">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base text-gray-800 font-medium">
            Content Organiser
          </h3>
          <button
            onClick={() => setShowNew(!showNew)}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-600 text-sm hover:bg-gray-50 transition-colors"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 12 12" fill="none">
              <path
                d="M 6,1 L 6,11 M 1,6 L 11,6"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            New Playlist
          </button>
        </div>
        <div className="flex gap-1">
          {grades.map((g) => (
            <button
              key={g.id}
              onClick={() => {
                setGrade(g.id);
                setOpenChapter(null);
              }}
              className={`px-3 py-1.5 text-sm transition-colors ${
                grade === g.id
                  ? "bg-[#5e4075] text-white"
                  : "border border-gray-200 text-gray-500 hover:bg-gray-50"
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {/* New playlist input */}
      <AnimatePresence>
        {showNew && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-gray-200"
          >
            <div className="px-5 py-3 flex gap-2">
              <input
                autoFocus
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && create()}
                placeholder="Playlist name…"
                className="flex-1 border border-gray-200 px-3 py-2 text-base text-gray-700 placeholder-gray-400 outline-none focus:border-gray-400"
              />
              <button
                onClick={create}
                className="px-4 py-2 bg-[#5e4075] text-white text-base hover:bg-[#3d2652] transition-colors"
              >
                Create
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chapter list */}
      <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
        {chapters.map((ch) => {
          const total =
            ch.videos.length +
            ch.mcq.length +
            ch.descriptive.length +
            ch.answerkeys.length;
          const isOpen = openChapter === ch.id;
          return (
            <div key={ch.id}>
              <button
                onClick={() => setOpenChapter(isOpen ? null : ch.id)}
                className="w-full flex items-center gap-3 px-5 py-3.5 text-left hover:bg-gray-50 transition-colors"
              >
                <span className="w-6 h-6 bg-gray-100 flex items-center justify-center text-gray-600 text-sm shrink-0">
                  {ch.id}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-base text-gray-800 truncate">{ch.title}</p>
                  <p className="text-sm text-gray-400">
                    {ch.videos.length}V ·{" "}
                    {ch.mcq.length + ch.descriptive.length}Q ·{" "}
                    {ch.answerkeys.length}K
                  </p>
                </div>
                {total === 0 && (
                  <span className="text-sm text-gray-400 italic">Empty</span>
                )}
                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`}
                  viewBox="0 0 12 12"
                  fill="none"
                >
                  <path
                    d="M 2,4 L 6,8 L 10,4"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: "auto" }}
                    exit={{ height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden border-t border-gray-100 bg-gray-50"
                  >
                    <div className="px-5 py-3 space-y-1.5">
                      {ch.videos.map((v) => (
                        <div key={v} className="flex items-center gap-2.5 py-1">
                          <IconPlay className="w-4 h-4 text-[#5e4075] shrink-0" />
                          <span className="text-base text-gray-700 truncate">
                            {v}
                          </span>
                        </div>
                      ))}
                      {[...ch.mcq, ...ch.descriptive].map((q) => (
                        <div key={q} className="flex items-center gap-2.5 py-1">
                          <IconDocument className="w-4 h-4 text-gray-400 shrink-0" />
                          <span className="text-base text-gray-500 truncate">
                            {q}
                          </span>
                        </div>
                      ))}
                      {ch.answerkeys.map((k) => (
                        <div key={k} className="flex items-center gap-2.5 py-1">
                          <IconCheckCircle className="w-4 h-4 text-gray-400 shrink-0" />
                          <span className="text-base text-gray-500 truncate">
                            {k}
                          </span>
                        </div>
                      ))}
                      {total === 0 && (
                        <p className="text-sm text-gray-400 italic py-1">
                          No content yet.
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Playlists */}
      {playlists.length > 0 && (
        <div className="border-t border-gray-200 p-4">
          <p className="text-sm text-gray-400 uppercase tracking-widest mb-2">
            Custom Playlists
          </p>
          <div className="space-y-1">
            {playlists.map((pl) => (
              <div
                key={pl.id}
                className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 group border border-transparent hover:border-gray-200"
              >
                <svg
                  className="w-4 h-4 text-gray-400 shrink-0"
                  viewBox="0 0 16 16"
                  fill="none"
                >
                  <path
                    d="M 2,4 L 14,4 M 2,8 L 14,8 M 2,12 L 10,12"
                    stroke="currentColor"
                    strokeWidth="1.3"
                    strokeLinecap="round"
                  />
                </svg>
                <div className="flex-1 min-w-0">
                  <p className="text-base text-gray-700 truncate">{pl.name}</p>
                  <p className="text-sm text-gray-400">
                    {pl.items.length} items
                  </p>
                </div>
                <button
                  onClick={() =>
                    setPlaylists((prev) => prev.filter((p) => p.id !== pl.id))
                  }
                  className="opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-red-500"
                >
                  <IconClose className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  return (
    <div className="p-8 h-full">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Content Manager</h1>
          <p className="text-base text-gray-500 mt-1">
            Upload and organise your course content.
          </p>
        </div>
        <StorageIndicator />
      </div>

      {/* Two-panel layout — expands to fill full width */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-6">
        <UploadPanel />
        <ContentOrganiser />
      </div>
    </div>
  );
}
