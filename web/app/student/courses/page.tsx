'use client'

import { useMemo, useRef, useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { videoSubjects } from '@/lib/mockData'
import type { VideoChapter, VideoTopic } from '@/lib/mockData'

// Per-subject accent — dusty-plum family (on-theme, lightly differentiated)
const SUBJECT_STYLE: Record<string, { text: string; border: string }> = {
  physical: { text: 'text-[#7A6B96]', border: 'border-l-[#7A6B96]' },
  organic: { text: 'text-[#8F7BA0]', border: 'border-l-[#8F7BA0]' },
  inorganic: { text: 'text-[#635580]', border: 'border-l-[#635580]' },
}

// ─── Video player (shown after a topic is selected) ──────────────────────────

function VideoPlayer({ topic }: { topic: VideoTopic | null }) {
  const [playing, setPlaying] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const stageRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  // Reset to the poster whenever the lesson changes.
  useEffect(() => setPlaying(false), [topic?.id])

  const toggleFullscreen = () => {
    const el = stageRef.current
    if (!el) return
    if (document.fullscreenElement) document.exitFullscreen()
    else el.requestFullscreen?.()
  }

  if (!topic) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted gap-4">
        <svg className="w-16 h-16 opacity-30" viewBox="0 0 64 64" fill="none">
          <rect x="6" y="16" width="36" height="32" rx="4" stroke="currentColor" strokeWidth="2" />
          <path d="M 42,28 L 58,20 L 58,44 L 42,36 Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        </svg>
        <p className="text-[15px]">Select a lesson to start watching</p>
      </div>
    )
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div
        ref={stageRef}
        className="relative flex-1 min-h-0 bg-linear-to-br from-brand to-brand-dark rounded-lg overflow-hidden group/stage"
      >
        {!playing ? (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer"
            onClick={() => setPlaying(true)}
          >
            <div className="absolute inset-0 opacity-15">
              <svg viewBox="0 0 640 360" className="w-full h-full" fill="none" preserveAspectRatio="xMidYMid slice">
                <circle cx="320" cy="180" r="100" stroke="white" strokeWidth="1.5" strokeDasharray="6 10" />
                <ellipse cx="320" cy="180" rx="98" ry="38" stroke="white" strokeWidth="1.5" transform="rotate(60 320 180)" />
                <ellipse cx="320" cy="180" rx="98" ry="38" stroke="white" strokeWidth="1.5" transform="rotate(-60 320 180)" />
              </svg>
            </div>
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mb-4"
            >
              <svg className="w-7 h-7 ml-1" viewBox="0 0 24 24" fill="white">
                <path d="M 7,5 L 20,12 L 7,19 Z" />
              </svg>
            </motion.div>
            <p className="text-white/85 text-base line-clamp-1 max-w-md px-4 text-center">{topic.title}</p>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-black/85">
            <p className="text-white/60 text-base">Video player — {topic.title}</p>
          </div>
        )}

        {/* Controls overlay */}
        <div className="absolute bottom-3 right-3 flex items-center gap-2">
          <span className="px-2.5 py-1 bg-black/50 rounded-md text-white text-[14px] font-data">{topic.duration}</span>
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
            className="w-8 h-8 rounded-md bg-black/50 hover:bg-black/70 flex items-center justify-center text-white transition-colors"
          >
            {isFullscreen ? (
              <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
                <path d="M 6,2 L 6,6 L 2,6 M 10,2 L 10,6 L 14,6 M 6,14 L 6,10 L 2,10 M 10,14 L 10,10 L 14,10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
                <path d="M 2,6 L 2,2 L 6,2 M 14,6 L 14,2 L 10,2 M 2,10 L 2,14 L 6,14 M 14,10 L 14,14 L 10,14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            )}
          </button>
        </div>
      </div>

      <div className="mt-4 shrink-0">
        <h3 className="text-primary text-lg mb-1">{topic.title}</h3>
        <p className="text-muted text-[14px]">{topic.duration} · {topic.watched ? 'Watched' : 'Not watched'}</p>
      </div>
    </div>
  )
}

// ─── Icons ───────────────────────────────────────────────────────────────────

function VideoIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none">
      <rect x="2" y="5" width="11" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M 13,9 L 18,6 L 18,14 L 13,11 Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
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

// ─── Page ──────────────────────────────────────────────────────────────────

export default function VideoLessonsPage() {
  const [search, setSearch] = useState('')
  const [openSubjects, setOpenSubjects] = useState<Set<string>>(new Set())
  const [openChapters, setOpenChapters] = useState<Set<string>>(new Set())
  const [selectedChapter, setSelectedChapter] = useState<VideoChapter | null>(null)
  const [selectedTopic, setSelectedTopic] = useState<VideoTopic | null>(null)

  const q = search.trim().toLowerCase()
  const searching = q.length > 0

  // Filtered tree: a chapter is kept if its title matches or any topic matches;
  // a subject is kept if its title matches or it has any kept chapter.
  const filtered = useMemo(() => {
    if (!searching) return videoSubjects
    return videoSubjects
      .map((subj) => {
        const subjMatch = subj.title.toLowerCase().includes(q)
        const chapters = subj.chapters.filter(
          (ch) =>
            subjMatch ||
            ch.title.toLowerCase().includes(q) ||
            ch.topics.some((t) => t.title.toLowerCase().includes(q)),
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
    openSubjects.size === videoSubjects.length &&
    openChapters.size === videoSubjects.reduce((n, s) => n + s.chapters.length, 0)

  const expandAll = () => {
    setOpenSubjects(new Set(videoSubjects.map((s) => s.id)))
    setOpenChapters(new Set(videoSubjects.flatMap((s) => s.chapters.map((c) => c.id))))
  }
  const collapseAll = () => {
    setOpenSubjects(new Set())
    setOpenChapters(new Set())
  }

  const openTopic = (chapter: VideoChapter, topic: VideoTopic) => {
    setSelectedChapter(chapter)
    setSelectedTopic(topic)
  }

  // ── Player view ────────────────────────────────────────────────────────────
  if (selectedChapter) {
    return (
      <div className="p-5 lg:p-6 h-screen flex flex-col">
        <button
          onClick={() => { setSelectedChapter(null); setSelectedTopic(null) }}
          className="inline-flex items-center gap-2 text-muted text-base hover:text-brand transition-colors mb-4 shrink-0 w-fit"
        >
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
            <path d="M 13,8 L 3,8 M 7,4 L 3,8 L 7,12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to Video Lessons
        </button>

        <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
          <div className="flex-1 flex flex-col">
            <VideoPlayer topic={selectedTopic} />
          </div>

          <div className="w-full lg:w-80 shrink-0 bg-white rounded-lg border border-[#e2e5ec] shadow-[0_2px_12px_rgba(15,23,42,0.06)] overflow-hidden flex flex-col max-h-72 lg:max-h-none">
            <div className="p-4 border-b border-[#e2e5ec]">
              <p className="text-muted text-[14px] uppercase tracking-wider mb-1">Chapter</p>
              <h3 className="text-primary text-base leading-snug">{selectedChapter.title}</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {selectedChapter.topics.map((topic, i) => {
                const isSelected = selectedTopic?.id === topic.id
                return (
                  <button
                    key={topic.id}
                    onClick={() => setSelectedTopic(topic)}
                    className={`w-full flex items-start gap-3 p-3 rounded-lg text-left transition-all duration-150 mb-1 ${
                      isSelected ? 'bg-brand/8' : 'hover:bg-accent1/30'
                    }`}
                  >
                    <div className="flex flex-col items-center shrink-0 pt-1">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[14px] ${
                        topic.watched
                          ? 'bg-brand text-white'
                          : isSelected
                          ? 'border-2 border-brand text-primary'
                          : 'border border-border text-border'
                      }`}>
                        {topic.watched ? (
                          <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
                            <path d="M 2,6 L 5,9 L 10,3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        ) : i + 1}
                      </div>
                      {i < selectedChapter.topics.length - 1 && (
                        <div className={`w-0.5 h-6 mt-1 ${topic.watched ? 'bg-brand/30' : 'bg-accent1'}`} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[15px] leading-snug ${isSelected ? 'text-primary' : 'text-primary/80'}`}>
                        {topic.title}
                      </p>
                      <p className="text-muted text-[14px] mt-0.5 font-data">{topic.duration}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Browse view (accordion) ──────────────────────────────────────────────
  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <span className="w-9 h-9 rounded-lg bg-brand/10 flex items-center justify-center text-primary">
            <VideoIcon className="w-5 h-5" />
          </span>
          <h1 className="text-3xl md:text-4xl text-primary">Video Lessons</h1>
        </div>
        <p className="text-muted text-base mt-1">Watch your chemistry lectures, organized by subject and chapter</p>
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
            placeholder="Search subjects, chapters, or lessons..."
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
              {/* Subject header */}
              <button
                onClick={() => toggleSubject(subject.id)}
                className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-[#F4F1F8] transition-colors"
              >
                <Chevron open={subjectOpen} className="w-4 h-4 text-muted shrink-0" />
                <span className={`${s.text} shrink-0`}><VideoIcon className="w-5 h-5" /></span>
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
                      {subject.chapters.map((chapter, ci) => {
                        const chapterOpen = isChapterOpen(chapter.id)
                        return (
                          <div key={chapter.id}>
                            {/* Chapter header */}
                            <button
                              onClick={() => toggleChapter(chapter.id)}
                              className="w-full flex items-center gap-3 pl-8 pr-5 py-3 text-left hover:bg-[#F4F1F8] transition-colors"
                            >
                              <Chevron open={chapterOpen} className="w-3.5 h-3.5 text-muted shrink-0" />
                              <span className="text-primary/70 shrink-0"><VideoIcon className="w-4 h-4" /></span>
                              <span className="text-muted text-[14px] w-16 shrink-0">Chap {ci + 1}</span>
                              <span className="flex-1 text-primary/90 text-[15px] leading-snug">{chapter.title}</span>
                              <span className="text-muted text-[14px] shrink-0">{chapter.topics.length} videos</span>
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
                                    {chapter.topics.map((topic) => (
                                      <button
                                        key={topic.id}
                                        onClick={() => openTopic(chapter, topic)}
                                        className="w-full flex items-center gap-3 pl-16 pr-5 py-2.5 text-left hover:bg-[#F4F1F8] transition-colors group"
                                      >
                                        <span className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                                          topic.watched ? 'bg-brand text-white' : 'border border-border text-transparent'
                                        }`}>
                                          <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
                                            <path d="M 2,6 L 5,9 L 10,3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                          </svg>
                                        </span>
                                        <span className="flex-1 text-primary/85 text-[15px] leading-snug group-hover:text-brand">{topic.title}</span>
                                        <span className="text-muted text-[14px] font-data shrink-0">{topic.duration}</span>
                                        <svg className="w-4 h-4 text-border group-hover:text-brand transition-colors shrink-0" viewBox="0 0 16 16" fill="none">
                                          <path d="M 6,4 L 10,8 L 6,12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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
          <p className="text-[15px]">No lessons match your search.</p>
        </div>
      )}
    </div>
  )
}
