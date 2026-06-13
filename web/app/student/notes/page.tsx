'use client'

import { useMemo, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createPortal } from 'react-dom'
import { useContentTree } from '../../../hooks/admin/useContentTree'
import { PdfViewer } from '../../../components/student/PDFViewer'

const BASE_URL = process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:8000'

// ─── Subject accent colours (same as original) ────────────────────────────────
const SUBJECT_STYLES = [
  { text: 'text-[#7A6B96]', border: 'border-l-[#7A6B96]', dot: '#7A6B96' },
  { text: 'text-[#8F7BA0]', border: 'border-l-[#8F7BA0]', dot: '#8F7BA0' },
  { text: 'text-[#635580]', border: 'border-l-[#635580]', dot: '#635580' },
]
function subjectStyle(idx: number) {
  return SUBJECT_STYLES[idx % SUBJECT_STYLES.length]
}

function sName(s: any): string {
  return s?.name ?? s?.title ?? 'Subject'
}
function chName(c: any): string {
  return c?.name ?? c?.title ?? 'Chapter'
}

function formatSize(bytes: number | null | undefined): string | null {
  if (!bytes) return null
  if (bytes < 1048576) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / 1048576).toFixed(1)} MB`
}

// ─── Icons ────────────────────────────────────────────────────────────────────

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

// ─── Types ─────────────────────────────────────────────────────────────────────

interface OpenDoc { pdf: any; chapterTitle: string }

// ─── Fullscreen PDF Overlay Component ─────────────────────────────────────────
interface PdfOverlayProps {
  openDoc: OpenDoc | null
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  subjects: any[]
  chaptersMap: Record<string, any[]>
  pdfsMap: Record<string, any[]>
  openSubjects: Set<string>
  openChapters: Set<string>
  toggleSubject: (id: string) => void
  toggleChapter: (id: string) => void
  search: string
  setSearch: (s: string) => void
  onClose: () => void
  onSelectPdf: (pdf: any, chapterTitle: string, chapterId?: string, subjectId?: string) => void
}

function PdfOverlay({
  openDoc,
  sidebarOpen,
  setSidebarOpen,
  subjects,
  chaptersMap,
  pdfsMap,
  openSubjects,
  openChapters,
  toggleSubject,
  toggleChapter,
  search,
  setSearch,
  onClose,
  onSelectPdf,
}: PdfOverlayProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  if (!mounted || !openDoc) return null

  const pdfUrl = `${BASE_URL}/api/content/pdf/${openDoc.pdf.id}/stream`

  return createPortal(
    <div className="fixed inset-0 z-[9999] bg-black/50 backdrop-blur-sm flex items-center justify-center">
      {/* Floating container */}
      <div className="relative w-full h-full bg-white  shadow-2xl flex overflow-hidden">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-white/90 hover:bg-white shadow-lg flex items-center justify-center text-primary hover:text-red-500 transition-all duration-200 backdrop-blur-sm border border-gray-200"
          title="Close PDF viewer"
        >
          <svg className="w-5 h-5" viewBox="0 0 16 16" fill="none">
            <path d="M 3,3 L 13,13 M 13,3 L 3,13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>

        {/* Left sidebar */}
        <AnimatePresence initial={false}>
          {sidebarOpen && (
            <motion.aside
              initial={{ width: 0 }}
              animate={{ width: 280 }}
              exit={{ width: 0 }}
              transition={{ duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
              className="shrink-0 border-r border-[#E2E5EC] bg-white relative z-10 h-full overflow-hidden"
            >
              <CompactNav
                subjects={subjects}
                chaptersMap={chaptersMap}
                pdfsMap={pdfsMap}
                openSubjects={openSubjects}
                openChapters={openChapters}
                toggleSubject={toggleSubject}
                toggleChapter={toggleChapter}
                openDoc={openDoc}
                onSelectPdf={(pdf, ct) => onSelectPdf(pdf, ct, undefined, undefined)}
                search={search}
                onSearchChange={setSearch}
                onBack={onClose}
                onCollapse={() => setSidebarOpen(false)}
              />
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Sidebar re-open tab */}
        {!sidebarOpen && (
          <div className="shrink-0 w-8 border-r border-[#E2E5EC] bg-white flex flex-col relative z-10 h-full">
            <button
              onClick={() => setSidebarOpen(true)}
              title="Show navigation"
              className="flex-1 flex items-center justify-center hover:bg-[#F4F1F8] transition-colors text-muted hover:text-brand"
            >
              <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
                <path d="M 6,4 L 10,8 L 6,12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        )}

        {/* PDF Viewer container - THIS HANDLES SCROLLING */}
        <div className="flex-1 min-w-0 h-full flex flex-col">
          {/* Header with filename */}
          <div className="shrink-0 px-4 py-3 border-b border-gray-200 bg-white">
            <div className="flex items-center gap-2">
              <PdfIcon className="w-4 h-4 text-red-500" />
              <span className="text-sm font-medium text-gray-700 truncate">
                {openDoc.pdf.title}
              </span>
            </div>
          </div>
          
          {/* Fill the panel so the viewer's own scroll container handles the PDF */}
          <div className="flex-1 min-h-0">
            <PdfViewer
              url={pdfUrl}
              filename={openDoc.pdf.title}
              className="h-full min-h-0 !rounded-none !border-none"
            />
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
// ─── Compact sidebar navigation ───────────────────────────────────────────────
interface CompactNavProps {
  subjects: any[]
  chaptersMap: Record<string, any[]>
  pdfsMap: Record<string, any[]>
  openSubjects: Set<string>
  openChapters: Set<string>
  toggleSubject: (id: string) => void
  toggleChapter: (id: string) => void
  openDoc: OpenDoc | null
  onSelectPdf: (pdf: any, chapterTitle: string) => void
  search: string
  onSearchChange: (v: string) => void
  onBack: () => void
  onCollapse: () => void
}

function CompactNav({
  subjects, chaptersMap, pdfsMap,
  openSubjects, openChapters,
  toggleSubject, toggleChapter,
  openDoc, onSelectPdf,
  search, onSearchChange,
  onBack, onCollapse,
}: CompactNavProps) {
  const q         = search.trim().toLowerCase()
  const searching = q.length > 0

  const filtered = useMemo(() => {
    return subjects
      .map((subj, idx) => {
        const chapters  = chaptersMap[subj.id] ?? []
        const subjMatch = sName(subj).toLowerCase().includes(q)
        const matchedChapters = searching
          ? chapters.filter((ch: any) => {
              if (subjMatch) return true
              if (chName(ch).toLowerCase().includes(q)) return true
              return (pdfsMap[ch.id] ?? []).some((p: any) =>
                p.title.toLowerCase().includes(q)
              )
            })
          : chapters
        return { ...subj, _idx: idx, chapters: matchedChapters }
      })
      .filter((s) => !searching || s.chapters.length > 0)
  }, [subjects, chaptersMap, pdfsMap, q, searching])

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#EEEBF3] shrink-0 bg-white">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-muted hover:text-primary transition-colors text-[13px] font-medium leading-none"
        >
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
            <path d="M 10,4 L 6,8 L 10,12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          All notes
        </button>

        <div className="flex items-center gap-2">
          <PdfIcon className="w-4 h-4 text-brand" />
          <span className="text-[13px] font-semibold text-primary">PDF Notes</span>
        </div>

        <button
          onClick={onCollapse}
          title="Collapse sidebar"
          className="w-7 h-7 flex items-center justify-center rounded-md text-muted hover:text-primary hover:bg-accent1/40 transition-colors"
        >
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
            <path d="M 10,4 L 6,8 L 10,12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* Search */}
      <div className="px-4 py-3 border-b border-[#EEEBF3] shrink-0">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" viewBox="0 0 16 16" fill="none">
            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M 11,11 L 14,14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search notes…"
            className="w-full pl-9 pr-8 py-2 rounded-lg border border-border bg-[#FAF9FB] text-primary text-[13px] placeholder:text-muted/60 focus:outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/10 transition-all"
          />
          {search && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 flex items-center justify-center rounded-full bg-border/70 text-white hover:bg-muted transition-colors"
            >
              <svg className="w-3 h-3" viewBox="0 0 10 10" fill="none">
                <path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto py-2 min-h-0">
        {filtered.length === 0 && (
          <div className="px-4 py-12 text-center">
            <p className="text-muted text-[13px]">No results for "{search}"</p>
          </div>
        )}

        {filtered.map((subject) => {
          const isOpen = searching || openSubjects.has(subject.id)
          const s      = subjectStyle(subject._idx)

          return (
            <div key={subject.id} className="mb-1">
              <button
                onClick={() => toggleSubject(subject.id)}
                className={`w-full flex items-center gap-3 pl-3 pr-4 py-2.5 text-left hover:bg-[#F4F1F8] transition-colors border-l-3 ${s.border}`}
              >
                <Chevron open={isOpen} className="w-3.5 h-3.5 text-muted shrink-0" />
                <span className={`${s.text} shrink-0`}>
                  <PdfIcon className="w-4 h-4" />
                </span>
                <span className="flex-1 text-primary text-[13px] font-medium leading-snug truncate">
                  {sName(subject)}
                </span>
                <span className="text-muted text-[11px] font-mono tabular-nums shrink-0 bg-[#F4F1F8] px-1.5 py-0.5 rounded">
                  {subject.chapters.length}
                </span>
              </button>

              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    {subject.chapters.length === 0 && !chaptersMap[subject.id] && (
                      <div className="pl-11 pr-4 py-2 space-y-2">
                        <div className="h-3.5 w-3/4 rounded bg-accent1/50 animate-pulse" />
                        <div className="h-3.5 w-1/2 rounded bg-accent1/40 animate-pulse" />
                      </div>
                    )}

                    {subject.chapters.map((chapter: any, ci: number) => {
                      const chapOpen = searching || openChapters.has(chapter.id)
                      const pdfs     = pdfsMap[chapter.id] as any[] | undefined
                      const cn       = chName(chapter)

                      const displayPdfs = pdfs
                        ? searching && !cn.toLowerCase().includes(q)
                          ? pdfs.filter((p: any) => p.title.toLowerCase().includes(q))
                          : pdfs
                        : undefined

                      return (
                        <div key={chapter.id}>
                          <button
                            onClick={() => toggleChapter(chapter.id)}
                            className="w-full flex items-center gap-2 pl-10 pr-4 py-2 text-left hover:bg-[#F4F1F8] transition-colors"
                          >
                            <Chevron open={chapOpen} className="w-3 h-3 text-muted shrink-0" />
                            <span className="text-muted text-[11px] font-mono tabular-nums w-12 shrink-0">
                              Ch {ci + 1}
                            </span>
                            <span className="flex-1 text-primary/80 text-[13px] leading-snug truncate">
                              {cn}
                            </span>
                            <span className="text-muted text-[11px] font-mono tabular-nums shrink-0">
                              {pdfs ? pdfs.length : '—'}
                            </span>
                          </button>

                          <AnimatePresence initial={false}>
                            {chapOpen && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.15, ease: 'easeInOut' }}
                                className="overflow-hidden bg-[#FAF9FB]"
                              >
                                {!displayPdfs && (
                                  <div className="pl-20 pr-4 py-2 space-y-2">
                                    <div className="h-3 w-3/4 rounded bg-accent1/50 animate-pulse" />
                                    <div className="h-3 w-1/2 rounded bg-accent1/40 animate-pulse" />
                                  </div>
                                )}

                                {displayPdfs?.length === 0 && (
                                  <p className="pl-20 pr-4 py-2.5 text-muted text-[12px] italic">No PDFs available</p>
                                )}

                                {displayPdfs?.map((pdf: any) => {
                                  const isActive = openDoc?.pdf?.id === pdf.id
                                  return (
                                    <button
                                      key={pdf.id}
                                      onClick={() => onSelectPdf(pdf, cn)}
                                      className={`w-full flex items-center gap-2 pl-20 pr-4 py-2 text-left transition-colors ${
                                        isActive
                                          ? 'bg-brand/10 hover:bg-brand/15'
                                          : 'hover:bg-[#F4F1F8]'
                                      }`}
                                    >
                                      {isActive ? (
                                        <span className="w-1.5 h-1.5 rounded-full bg-brand shrink-0" />
                                      ) : (
                                        <PdfIcon className="w-3.5 h-3.5 text-muted/60 shrink-0" />
                                      )}
                                      <span
                                        className={`flex-1 text-[13px] leading-snug truncate ${
                                          isActive
                                            ? 'text-brand font-medium'
                                            : 'text-primary/70'
                                        }`}
                                      >
                                        {pdf.title}
                                      </span>
                                    </button>
                                  )
                                })}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="px-4 py-3 border-t border-[#EEEBF3] shrink-0 bg-white">
        <p className="text-[12px] text-muted text-center font-mono">
          {subjects.length} subject{subjects.length !== 1 ? 's' : ''} · {
            subjects.reduce((n, s) => n + (chaptersMap[s.id]?.length ?? 0), 0)
          } chapters
        </p>
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PdfNotesPage() {
  const {
    subjects,
    chaptersMap,
    pdfsMap,
    loading,
    error,
    loadChapters,
    loadChapterContent,
  } = useContentTree()

  const [search,       setSearch]       = useState('')
  const [openSubjects, setOpenSubjects] = useState<Set<string>>(new Set())
  const [openChapters, setOpenChapters] = useState<Set<string>>(new Set())
  const [openDoc,      setOpenDoc]      = useState<OpenDoc | null>(null)
  const [sidebarOpen,  setSidebarOpen]  = useState(true)
  const [initialLoading, setInitialLoading] = useState(true)

  // Simulate initial loading (or wait for content tree to be ready)
  useEffect(() => {
    if (!loading) {
      const timer = setTimeout(() => setInitialLoading(false), 500)
      return () => clearTimeout(timer)
    }
  }, [loading])

  // Pre-load first subject's chapters on mount
  useEffect(() => {
    if (subjects.length > 0) loadChapters(subjects[0].id)
  }, [subjects.length, loadChapters])

  // ── Filtering ────────────────────────────────────────────────────────────────
  const q         = search.trim().toLowerCase()
  const searching = q.length > 0

  const filtered = useMemo(() => {
    return subjects
      .map((subj, idx) => {
        const chapters  = chaptersMap[subj.id] ?? []
        const subjMatch = sName(subj).toLowerCase().includes(q)
        const matchedChapters = searching
          ? chapters.filter((ch: any) => {
              if (subjMatch) return true
              if (chName(ch).toLowerCase().includes(q)) return true
              return (pdfsMap[ch.id] ?? []).some((p: any) =>
                p.title.toLowerCase().includes(q)
              )
            })
          : chapters
        return { ...subj, _idx: idx, chapters: matchedChapters }
      })
      .filter((s) => !searching || s.chapters.length > 0)
  }, [subjects, chaptersMap, pdfsMap, q, searching])

  // ── Accordion toggles ─────────────────────────────────────────────────────
  const toggleSubject = (id: string) => {
    setOpenSubjects((prev) => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) }
      else              { next.add(id); loadChapters(id) }
      return next
    })
  }

  const toggleChapter = (id: string) => {
    setOpenChapters((prev) => {
      const next = new Set(prev)
      if (next.has(id)) { next.delete(id) }
      else              { next.add(id); loadChapterContent(id) }
      return next
    })
  }

  // When a PDF is selected, ensure its parent chapter + subject are expanded
  const handleSelectPdf = (pdf: any, chapterTitle: string, chapterId?: string, subjectId?: string) => {
    setOpenDoc({ pdf, chapterTitle })
    setSidebarOpen(true)
    if (subjectId) setOpenSubjects((prev) => new Set([...prev, subjectId]))
    if (chapterId) setOpenChapters((prev) => new Set([...prev, chapterId]))
  }

  const handleClosePdf = () => {
    setOpenDoc(null)
  }

  // ── Expand / collapse all ─────────────────────────────────────────────────
  const totalChapterCount = subjects.reduce(
    (n, s) => n + (chaptersMap[s.id]?.length ?? 0), 0
  )
  const allOpen =
    openSubjects.size === subjects.length &&
    openChapters.size === totalChapterCount

  const expandAll = () => {
    setOpenSubjects(new Set(subjects.map((s) => s.id)))
    subjects.forEach((s) =>
      loadChapters(s.id).then(() => {
        ;(chaptersMap[s.id] ?? []).forEach((ch: any) => loadChapterContent(ch.id))
      })
    )
    setOpenChapters(
      new Set(subjects.flatMap((s) => (chaptersMap[s.id] ?? []).map((c: any) => c.id)))
    )
  }
  
  const collapseAll = () => {
    setOpenSubjects(new Set())
    setOpenChapters(new Set())
  }

  // ── Initial Loading State ─────────────────────────────────────────────────
  if (initialLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-white to-gray-50 flex items-center justify-center">
        <div className="text-center space-y-6">
          {/* Animated logo */}
          <div className="relative w-20 h-20 mx-auto">
            <div className="absolute inset-0 bg-brand/10 rounded-2xl animate-pulse" />
            <div className="absolute inset-2 bg-brand/20 rounded-xl animate-pulse delay-100" />
            <div className="absolute inset-4 flex items-center justify-center">
              <PdfIcon className="w-8 h-8 text-brand animate-bounce" />
            </div>
          </div>
          
          {/* Loading text */}
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-primary">Loading PDF Notes</h2>
            <p className="text-sm text-muted">Preparing your study materials...</p>
          </div>
          
          {/* Progress bar */}
          <div className="w-64 mx-auto h-1 bg-gray-200 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-brand rounded-full"
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 lg:p-8 max-w-6xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <svg className="w-12 h-12 text-red-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24">
            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-red-600 font-medium">Failed to load notes</p>
          <p className="text-red-400 text-sm mt-1">{error}</p>
        </div>
      </div>
    )
  }

  // ── Full page view ─────────────────────────────────────────────────────
  return (
    <>
      {/* Main page content */}
      <div className="p-6 lg:p-8 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-6"
        >
          <div className="flex items-center gap-3 mb-1">
            <span className="w-9 h-9 rounded-lg bg-brand/10 flex items-center justify-center text-primary">
              <PdfIcon className="w-5 h-5" />
            </span>
            <h1 className="text-3xl md:text-4xl text-primary">PDF Notes</h1>
          </div>
          <p className="text-muted text-base mt-1">
            Open class-wise PDF notes, organised by subject and chapter
          </p>
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
            const subjectOpen = searching || openSubjects.has(subject.id)
            const s           = subjectStyle(subject._idx)

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
                  <span className={`${s.text} shrink-0`}>
                    <PdfIcon className="w-5 h-5" />
                  </span>
                  <span className="flex-1 text-primary text-base">{sName(subject)}</span>
                  <span className="text-muted text-[14px] shrink-0 font-data">
                    {subject.chapters.length} chapter{subject.chapters.length !== 1 ? 's' : ''}
                  </span>
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
                        {subject.chapters.length === 0 && !chaptersMap[subject.id] && (
                          <div className="pl-8 pr-5 py-4 space-y-2.5">
                            <div className="h-4 w-2/3 rounded bg-accent1/50 animate-pulse" />
                            <div className="h-4 w-1/2 rounded bg-accent1/40 animate-pulse" />
                          </div>
                        )}

                        {subject.chapters.map((chapter: any, ci: number) => {
                          const chapterOpen = searching || openChapters.has(chapter.id)
                          const pdfs        = pdfsMap[chapter.id] as any[] | undefined
                          const cn          = chName(chapter)

                          const displayPdfs = pdfs
                            ? searching && !cn.toLowerCase().includes(q)
                              ? pdfs.filter((p: any) => p.title.toLowerCase().includes(q))
                              : pdfs
                            : undefined

                          return (
                            <div key={chapter.id}>
                              <button
                                onClick={() => toggleChapter(chapter.id)}
                                className="w-full flex items-center gap-3 pl-8 pr-5 py-3 text-left hover:bg-[#F4F1F8] transition-colors"
                              >
                                <Chevron open={chapterOpen} className="w-3.5 h-3.5 text-muted shrink-0" />
                                <span className="text-primary/70 shrink-0"><PdfIcon className="w-4 h-4" /></span>
                                <span className="text-muted text-[14px] w-auto shrink-0">Unit {ci + 1}</span>
                                <span className="flex-1 text-primary/90 text-[15px] leading-snug">{cn}</span>
                                <span className="text-muted text-[14px] shrink-0">
                                  {pdfs ? `${pdfs.length} class${pdfs.length !== 1 ? 'es' : ''}` : '—'}
                                </span>
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
                                      {!displayPdfs && (
                                        <div className="pl-16 pr-5 py-3 space-y-2">
                                          <div className="h-3.5 w-3/4 rounded bg-accent1/50 animate-pulse" />
                                          <div className="h-3.5 w-1/2 rounded bg-accent1/40 animate-pulse" />
                                        </div>
                                      )}

                                      {displayPdfs?.length === 0 && (
                                        <p className="pl-16 pr-5 py-3 text-muted text-[14px]">
                                          No PDFs found.
                                        </p>
                                      )}

                                      {displayPdfs?.map((pdf: any) => {
                                        const size = formatSize(pdf.file_size)
                                        return (
                                          <button
                                            key={pdf.id}
                                            onClick={() =>
                                              handleSelectPdf(pdf, cn, chapter.id, subject.id)
                                            }
                                            className="w-full flex items-center gap-3 pl-16 pr-5 py-2.5 text-left hover:bg-[#F4F1F8] transition-colors group"
                                          >
                                            <span className="text-primary/60 shrink-0">
                                              <PdfIcon className="w-4 h-4" />
                                            </span>
                                            <span className="flex-1 text-primary/85 text-[15px] leading-snug group-hover:text-brand">
                                              {pdf.title}
                                            </span>
                                            {size && (
                                              <span className="text-muted text-[14px] font-data shrink-0">
                                                {size}
                                              </span>
                                            )}
                                            <svg className="w-4 h-4 text-border group-hover:text-brand transition-colors shrink-0" viewBox="0 0 16 16" fill="none">
                                              <path d="M 3,8 L 13,8 M 9,4 L 13,8 L 9,12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                          </button>
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

      {/* PDF Overlay */}
      <PdfOverlay
        openDoc={openDoc}
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        subjects={subjects}
        chaptersMap={chaptersMap}
        pdfsMap={pdfsMap}
        openSubjects={openSubjects}
        openChapters={openChapters}
        toggleSubject={toggleSubject}
        toggleChapter={toggleChapter}
        search={search}
        setSearch={setSearch}
        onClose={handleClosePdf}
        onSelectPdf={handleSelectPdf}
      />
    </>
  )
}