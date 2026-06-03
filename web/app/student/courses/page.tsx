'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { courses, lastWatched } from '@/lib/mockData'

type Course = typeof courses[0]
type Chapter = Course['chapters'][0]
type Topic = Chapter['subtopics'][0]

function VideoPlayer({ topic }: { topic: Topic | null }) {
  const [playing, setPlaying] = useState(false)

  if (!topic) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-muted gap-4 min-h-75">
        <svg className="w-16 h-16 opacity-30" viewBox="0 0 64 64" fill="none">
          <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="2" />
          <path d="M 24,22 L 44,32 L 24,42 Z" fill="currentColor" opacity="0.5" />
        </svg>
        <p className="text-[15px]">Select a topic to start watching</p>
      </div>
    )
  }

  return (
    <div className="flex-1">
      {/* Video */}
      <div className="relative aspect-video bg-linear-to-br from-primary to-[#3d2652] rounded-2xl overflow-hidden mb-4">
        {!playing ? (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer group"
            onClick={() => setPlaying(true)}
          >
            <div className="absolute inset-0 opacity-15">
              <svg viewBox="0 0 640 360" className="w-full h-full" fill="none">
                <circle cx="320" cy="180" r="100" stroke="white" strokeWidth="1.5" strokeDasharray="6 10" />
                <ellipse cx="320" cy="180" rx="98" ry="38" stroke="white" strokeWidth="1.5" transform="rotate(60 320 180)" />
                <ellipse cx="320" cy="180" rx="98" ry="38" stroke="white" strokeWidth="1.5" transform="rotate(-60 320 180)" />
              </svg>
            </div>
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mb-3"
            >
              <svg className="w-6 h-6 ml-1" viewBox="0 0 24 24" fill="white">
                <path d="M 7,5 L 20,12 L 7,19 Z" />
              </svg>
            </motion.div>
            <p className="text-white/80 text-[14px] line-clamp-1 max-w-xs px-4 text-center">{topic.title}</p>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80">
            <p className="text-white/60 text-[14px]">Video player — {topic.title}</p>
          </div>
        )}
        {/* Duration badge */}
        <div className="absolute bottom-3 right-3 px-2.5 py-1 bg-black/50 rounded-lg text-white text-[14px] font-mono">
          {topic.duration}
        </div>
      </div>

      {/* Topic info */}
      <div>
        <h3 className="text-primary text-base mb-1">{topic.title}</h3>
        <p className="text-muted text-[14px]">{topic.duration} · {topic.watched ? 'Watched' : 'Not watched'}</p>
      </div>
    </div>
  )
}

export default function CoursesPage() {
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [search, setSearch] = useState('')
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null)
  const [selectedChapter, setSelectedChapter] = useState<Chapter | null>(null)
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null)

  const filtered = courses.filter(
    (c) =>
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.chapters.some(
        (ch) =>
          ch.title.toLowerCase().includes(search.toLowerCase()) ||
          ch.subtopics.some((t) => t.title.toLowerCase().includes(search.toLowerCase()))
      )
  )

  if (selectedChapter) {
    return (
      <div className="p-8 lg:p-10 max-w-7xl mx-auto">
        {/* Back button */}
        <button
          onClick={() => { setSelectedChapter(null); setSelectedTopic(null) }}
          className="inline-flex items-center gap-2 text-muted text-base hover:text-primary transition-colors mb-6"
        >
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
            <path d="M 13,8 L 3,8 M 7,4 L 3,8 L 7,12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to Courses
        </button>

        <div className="flex gap-6 h-[calc(100vh-12rem)]">
          {/* Main video area */}
          <div className="flex-1 flex flex-col">
            <VideoPlayer topic={selectedTopic} />
          </div>

          {/* Right pane — topic list */}
          <div className="w-80 shrink-0 bg-white rounded-2xl border border-[#e2d5f0] shadow-[0_2px_12px_rgba(94,64,117,0.06)] overflow-hidden flex flex-col">
            <div className="p-4 border-b border-[#e2d5f0]">
              <p className="text-muted text-[14px] uppercase tracking-wider mb-1">Chapter</p>
              <h3 className="text-primary text-base leading-snug">{selectedChapter.title}</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {selectedChapter.subtopics.map((topic, i) => {
                const isSelected = selectedTopic?.id === topic.id
                return (
                  <button
                    key={topic.id}
                    onClick={() => setSelectedTopic(topic)}
                    className={`w-full flex items-start gap-3 p-3 rounded-xl text-left transition-all duration-150 mb-1 ${
                      isSelected ? 'bg-primary/8' : 'hover:bg-accent1/30'
                    }`}
                  >
                    {/* Progress line indicator */}
                    <div className="flex flex-col items-center shrink-0 pt-1">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[14px] ${
                        topic.watched
                          ? 'bg-primary text-bg'
                          : isSelected
                          ? 'border-2 border-primary text-primary'
                          : 'border border-border text-border'
                      }`}>
                        {topic.watched ? (
                          <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
                            <path d="M 2,6 L 5,9 L 10,3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        ) : i + 1}
                      </div>
                      {i < selectedChapter.subtopics.length - 1 && (
                        <div className={`w-0.5 h-6 mt-1 ${topic.watched ? 'bg-primary/30' : 'bg-accent1'}`} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[15px] leading-snug ${isSelected ? 'text-primary' : 'text-primary/80'}`}>
                        {topic.title}
                      </p>
                      <p className="text-muted text-[14px] mt-0.5 font-mono">{topic.duration}</p>
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

  return (
    <div className="p-8 lg:p-10 max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-6">
        <h1 className="text-2xl text-primary mb-1">Courses</h1>
        <p className="text-muted text-[14px]">All your chemistry courses in one place</p>
      </motion.div>

      {/* Search + view toggle */}
      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 relative">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" viewBox="0 0 16 16" fill="none">
            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M 11,11 L 14.5,14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search courses, chapters, or topics..."
            className="w-full pl-11 pr-4 py-3 rounded-full border border-border bg-[#fdfcf8] text-primary text-base placeholder:text-border focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10 transition-all"
          />
        </div>
        <div className="flex items-center gap-1 bg-[#f0e8f8] rounded-full p-1 border border-[#e2d5f0]">
          {(['grid', 'list'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1.5 rounded-lg text-[14px] transition-all duration-150 ${
                view === v ? 'bg-bg text-primary shadow-sm' : 'text-muted hover:text-primary'
              }`}
            >
              {v === 'grid' ? (
                <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
                  <rect x="1" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.3" />
                  <rect x="9" y="1" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.3" />
                  <rect x="1" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.3" />
                  <rect x="9" y="9" width="6" height="6" rx="1" stroke="currentColor" strokeWidth="1.3" />
                </svg>
              ) : (
                <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
                  <path d="M 2,4 L 14,4 M 2,8 L 14,8 M 2,12 L 14,12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Courses */}
      <div className={view === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-5' : 'space-y-4'}>
        {filtered.map((course, ci) => (
          <motion.div
            key={course.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: ci * 0.08 }}
            className="bg-white rounded-2xl border border-[#e2d5f0] shadow-[0_2px_12px_rgba(94,64,117,0.06)] overflow-hidden"
          >
            {/* Course header */}
            <div className="p-5 border-b border-[#e2d5f0]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[14px] px-3 py-1.5 rounded-full bg-accent1/60 text-muted">Grade {course.grade}</span>
                <span className="text-muted text-[14px]">{course.chapters.length} chapters</span>
              </div>
              <h3 className="text-primary text-base">{course.title}</h3>
            </div>

            {/* Chapters */}
            <div className="divide-y divide-[#f0e8f8]">
              {course.chapters.map((chapter) => (
                <button
                  key={chapter.id}
                  onClick={() => { setSelectedChapter(chapter); setSelectedTopic(chapter.subtopics[0] || null) }}
                  className="w-full flex items-center gap-4 p-4 hover:bg-[#f5f0fa] transition-colors duration-150 text-left group"
                >
                  {/* Progress circle */}
                  <div className="relative w-10 h-10 shrink-0">
                    <svg viewBox="0 0 40 40" className="w-full h-full -rotate-90">
                      <circle cx="20" cy="20" r="16" fill="none" stroke="#e9deb5" strokeWidth="3" />
                      <circle
                        cx="20" cy="20" r="16" fill="none"
                        stroke="#5e4075" strokeWidth="3"
                        strokeLinecap="round"
                        strokeDasharray={`${(chapter.progress / 100) * 100.5} 100.5`}
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-[14px] text-primary font-mono">
                      {chapter.progress}%
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-primary text-base group-hover:text-[#3d2652] transition-colors">{chapter.title}</p>
                    <p className="text-muted text-[14px] mt-0.5">
                      {chapter.subtopics.length} topics · {chapter.duration}
                    </p>
                  </div>

                  <svg className="w-4 h-4 text-border group-hover:text-primary transition-colors shrink-0" viewBox="0 0 16 16" fill="none">
                    <path d="M 6,4 L 10,8 L 6,12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-muted">
          <p className="text-[15px]">No courses match your search.</p>
        </div>
      )}
    </div>
  )
}
