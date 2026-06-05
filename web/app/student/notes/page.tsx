'use client'

import { useMemo, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { noteSubjects } from '@/lib/mockData'
import type { NoteChapter, NoteClass } from '@/lib/mockData'

// Per-subject accent — dusty-plum family (on-theme, lightly differentiated)
const SUBJECT_STYLE: Record<string, { text: string; border: string }> = {
  physical: { text: 'text-[#7A6B96]', border: 'border-l-[#7A6B96]' },
  organic: { text: 'text-[#8F7BA0]', border: 'border-l-[#8F7BA0]' },
  inorganic: { text: 'text-[#635580]', border: 'border-l-[#635580]' },
}

// ─── Icons ───────────────────────────────────────────────────────────────────

function PdfIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none">
      <path d="M 5,2 L 12,2 L 16,6 L 16,18 Q 16,18 15,18 L 5,18 Q 4,18 4,17 L 4,3 Q 4,2 5,2 Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M 12,2 L 12,6 L 16,6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M 7,11 L 13,11 M 7,14 L 11,14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

function Chevron({ open, className = 'w-3.5 h-3.5' }: { open: boolean; className?: string }) {
  return (
    <svg className={`${className} transition-transform duration-200 ${open ? 'rotate-90' : ''}`} viewBox="0 0 16 16" fill="none">
      <path d="M 6,4 L 10,8 L 6,12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ─── PDF viewer modal ────────────────────────────────────────────────────────

// A single rendered "page" of the simulated PDF. Page 1 carries the title block.
function PdfPage({ doc, chapterTitle, index }: { doc: NoteClass; chapterTitle: string; index: number }) {
  const seed = (index + 1) * 7
  return (
    <div
      className="relative bg-white shadow-[0_4px_24px_rgba(0,0,0,0.14)] rounded-sm w-full overflow-hidden"
      style={{ aspectRatio: '1 / 1.414' }}
    >
      <div className="p-[8%] h-full flex flex-col">
        {index === 0 && (
          <div className="text-center mb-8 pb-6 border-b-2 border-brand/20">
            <div className="flex items-center justify-center gap-2 mb-3">
              <svg viewBox="0 0 36 36" fill="none" className="w-6 h-6">
                <circle cx="18" cy="18" r="16" stroke="#7A6B96" strokeWidth="1.8" />
                <ellipse cx="18" cy="18" rx="14" ry="6" stroke="#7A6B96" strokeWidth="1.5" transform="rotate(60 18 18)" />
                <ellipse cx="18" cy="18" rx="14" ry="6" stroke="#7A6B96" strokeWidth="1.5" transform="rotate(-60 18 18)" />
                <circle cx="18" cy="18" r="3" fill="#7A6B96" />
              </svg>
              <span className="text-primary text-[14px]">Chemistry@OCTET</span>
            </div>
            <h2 className="text-primary text-xl mb-1">{doc.title}</h2>
            <p className="text-muted text-[14px]">{chapterTitle} · {doc.label}</p>
          </div>
        )}

        <div className="flex-1 space-y-3">
          {index === 0 && <p className="text-primary text-[15px] mb-2">1. Introduction</p>}
          {index === 1 && <p className="text-primary text-[15px] mb-2">2. Key Concepts</p>}
          {index === 2 && <p className="text-primary text-[15px] mb-2">3. Important Formulas</p>}
          {Array.from({ length: 16 }).map((_, i) => (
            <div key={i} className="h-2.5 rounded-full bg-accent1/70" style={{ width: `${55 + ((i * 13 + seed) % 42)}%` }} />
          ))}
        </div>

        <div className="pt-4 mt-4 border-t border-accent1/60 flex items-center justify-between text-muted text-[12px]">
          <span>{doc.title}</span>
          <span className="font-data">Page {index + 1} of {doc.pages}</span>
        </div>
      </div>
    </div>
  )
}

function PDFViewer({ doc, chapterTitle, onClose }: { doc: NoteClass; chapterTitle: string; onClose: () => void }) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [page, setPage] = useState(1)
  const [zoom, setZoom] = useState(100)

  const onScroll = () => {
    const el = scrollRef.current
    if (!el) return
    const denom = el.scrollHeight - el.clientHeight
    const ratio = denom > 0 ? el.scrollTop / denom : 0
    setPage(Math.min(doc.pages, Math.max(1, Math.round(ratio * (doc.pages - 1)) + 1)))
  }

  const sheetWidth = Math.round((zoom / 100) * 720)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-2 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
        transition={{ duration: 0.25 }}
        className="bg-white rounded-lg w-full max-w-5xl h-[92vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-accent1 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-accent1/60 flex items-center justify-center text-brand shrink-0">
              <PdfIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-primary text-base truncate">{doc.label} : {doc.title}</p>
              <p className="text-muted text-[14px] font-data">{doc.pages} pages · {doc.size}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button className="hidden sm:flex items-center gap-1.5 px-4 py-2 text-[15px] text-primary hover:bg-accent1/40 rounded-md transition-colors">
              <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
                <path d="M 8,2 L 8,11 M 4,8 L 8,12 L 12,8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M 2,14 L 14,14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              Download
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-md hover:bg-accent1/40 flex items-center justify-center text-muted hover:text-brand transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
                <path d="M 4,4 L 12,12 M 12,4 L 4,12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        {/* Page / zoom bar */}
        <div className="flex items-center justify-center gap-4 py-2.5 border-b border-accent1/60 bg-accent1/20 shrink-0">
          <span className="text-primary text-[15px] font-data">Page {page} / {doc.pages}</span>
          <div className="w-px h-5 bg-accent1" />
          <button
            onClick={() => setZoom((z) => Math.max(60, z - 10))}
            className="w-8 h-8 rounded-md hover:bg-accent1/50 flex items-center justify-center text-muted hover:text-brand text-[18px] leading-none"
          >
            −
          </button>
          <span className="text-primary text-[15px] font-data w-12 text-center">{zoom}%</span>
          <button
            onClick={() => setZoom((z) => Math.min(180, z + 10))}
            className="w-8 h-8 rounded-md hover:bg-accent1/50 flex items-center justify-center text-muted hover:text-brand text-[18px] leading-none"
          >
            +
          </button>
        </div>

        {/* Full document — every page, continuous scroll */}
        <div ref={scrollRef} onScroll={onScroll} className="flex-1 overflow-auto bg-[#edeaf2] px-4 sm:px-6 py-6">
          <div className="mx-auto flex flex-col items-center gap-6" style={{ width: sheetWidth, maxWidth: '100%' }}>
            {Array.from({ length: doc.pages }).map((_, i) => (
              <PdfPage key={i} doc={doc} chapterTitle={chapterTitle} index={i} />
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function PdfNotesPage() {
  const [search, setSearch] = useState('')
  const [openSubjects, setOpenSubjects] = useState<Set<string>>(new Set())
  const [openChapters, setOpenChapters] = useState<Set<string>>(new Set())
  const [openDoc, setOpenDoc] = useState<{ doc: NoteClass; chapterTitle: string } | null>(null)

  const q = search.trim().toLowerCase()
  const searching = q.length > 0

  const filtered = useMemo(() => {
    if (!searching) return noteSubjects
    return noteSubjects
      .map((subj) => {
        const subjMatch = subj.title.toLowerCase().includes(q)
        const chapters = subj.chapters.filter(
          (ch) =>
            subjMatch ||
            ch.title.toLowerCase().includes(q) ||
            ch.classes.some((c) => c.title.toLowerCase().includes(q)),
        )
        return { ...subj, chapters }
      })
      .filter((subj) => subj.chapters.length > 0)
  }, [q, searching])

  const isSubjectOpen = (id: string) => searching || openSubjects.has(id)
  const isChapterOpen = (id: string) => searching || openChapters.has(id)

  const toggleSubject = (id: string) =>
    setOpenSubjects((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const toggleChapter = (id: string) =>
    setOpenChapters((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const allOpen =
    openSubjects.size === noteSubjects.length &&
    openChapters.size === noteSubjects.reduce((n, s) => n + s.chapters.length, 0)

  const expandAll = () => {
    setOpenSubjects(new Set(noteSubjects.map((s) => s.id)))
    setOpenChapters(new Set(noteSubjects.flatMap((s) => s.chapters.map((c) => c.id))))
  }
  const collapseAll = () => {
    setOpenSubjects(new Set())
    setOpenChapters(new Set())
  }

  return (
    <>
      <div className="p-6 lg:p-8 max-w-6xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-6">
          <div className="flex items-center gap-3 mb-1">
            <span className="w-9 h-9 rounded-lg bg-brand/10 flex items-center justify-center text-primary">
              <PdfIcon className="w-5 h-5" />
            </span>
            <h1 className="text-3xl md:text-4xl text-primary">PDF Notes</h1>
          </div>
          <p className="text-muted text-base mt-1">Open class-wise PDF notes, organized by subject and chapter</p>
        </motion.div>

        {/* Search + expand toggle */}
        <div className="flex items-center gap-4 mb-6">
          <div className="flex-1 relative">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" viewBox="0 0 16 16" fill="none">
              <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M 11,11 L 14.5,14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search subjects, chapters, or notes..."
              className="w-full pl-11 pr-4 py-3 rounded-lg border border-border bg-white text-primary text-base placeholder:text-border focus:outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/10 transition-all"
            />
          </div>
          <button
            onClick={() => (allOpen ? collapseAll() : expandAll())}
            disabled={searching}
            className="shrink-0 inline-flex items-center gap-2 px-4 py-3 rounded-md border border-border bg-white text-primary text-[15px] hover:bg-accent1/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
              {allOpen ? (
                <path d="M 4,9 L 8,5 L 12,9 M 4,13 L 8,9 L 12,13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              ) : (
                <path d="M 4,3 L 8,7 L 12,3 M 4,7 L 8,11 L 12,7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              )}
            </svg>
            {allOpen ? 'Collapse all' : 'Expand all'}
          </button>
        </div>

        {/* Subject accordions */}
        <div className="space-y-4">
          {filtered.map((subject) => {
            const subjectOpen = isSubjectOpen(subject.id)
            const s = SUBJECT_STYLE[subject.id] ?? SUBJECT_STYLE.physical
            return (
              <div
                key={subject.id}
                className={`bg-white rounded-lg border border-[#e2e5ec] border-l-4 ${s.border} shadow-[0_2px_12px_rgba(15,23,42,0.06)] overflow-hidden`}
              >
                <button
                  onClick={() => toggleSubject(subject.id)}
                  className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-[#F4F1F8] transition-colors"
                >
                  <Chevron open={subjectOpen} className="w-4 h-4 text-muted shrink-0" />
                  <span className={`${s.text} shrink-0`}><PdfIcon className="w-5 h-5" /></span>
                  <span className="flex-1 text-primary text-base">{subject.title}</span>
                  <span className="text-muted text-[14px] shrink-0 font-data">{subject.chapters.length} chapters</span>
                </button>

                <AnimatePresence initial={false}>
                  {subjectOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-[#F4F1F8] divide-y divide-[#F4F1F8]">
                        {subject.chapters.map((chapter: NoteChapter, ci) => {
                          const chapterOpen = isChapterOpen(chapter.id)
                          return (
                            <div key={chapter.id}>
                              <button
                                onClick={() => toggleChapter(chapter.id)}
                                className="w-full flex items-center gap-3 pl-8 pr-5 py-3 text-left hover:bg-[#F4F1F8] transition-colors"
                              >
                                <Chevron open={chapterOpen} className="w-3.5 h-3.5 text-muted shrink-0" />
                                <span className="text-primary/70 shrink-0"><PdfIcon className="w-4 h-4" /></span>
                                <span className="text-muted text-[14px] w-16 shrink-0">Chap {ci + 1}</span>
                                <span className="flex-1 text-primary/90 text-[15px] leading-snug">{chapter.title}</span>
                                <span className="text-muted text-[14px] shrink-0">{chapter.classes.length} classes</span>
                              </button>

                              <AnimatePresence initial={false}>
                                {chapterOpen && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                                    className="overflow-hidden bg-[#FAF9FB]"
                                  >
                                    <div className="py-1">
                                      {chapter.classes.map((doc) => (
                                        <button
                                          key={doc.id}
                                          onClick={() => setOpenDoc({ doc, chapterTitle: chapter.title })}
                                          className="w-full flex items-center gap-3 pl-16 pr-5 py-2.5 text-left hover:bg-[#F4F1F8] transition-colors group"
                                        >
                                          <span className="text-primary/60 shrink-0"><PdfIcon className="w-4 h-4" /></span>
                                          <span className="text-primary text-[15px] shrink-0">{doc.label} :</span>
                                          <span className="flex-1 text-primary/85 text-[15px] leading-snug group-hover:text-brand">{doc.title}</span>
                                          <span className="text-muted text-[14px] font-data shrink-0">{doc.pages}p · {doc.size}</span>
                                          <svg className="w-4 h-4 text-border group-hover:text-brand transition-colors shrink-0" viewBox="0 0 16 16" fill="none">
                                            <path d="M 4,9 L 4,12 L 12,12 L 12,9 M 8,2 L 8,9 M 5,6 L 8,9 L 11,6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                                          </svg>
                                        </button>
                                      ))}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          )
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-16 text-muted">
            <p className="text-[15px]">No notes match your search.</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {openDoc && <PDFViewer doc={openDoc.doc} chapterTitle={openDoc.chapterTitle} onClose={() => setOpenDoc(null)} />}
      </AnimatePresence>
    </>
  )
}
