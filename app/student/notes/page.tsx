'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { notes } from '@/lib/mockData'

const categories = ['All', 'Lecture Notes', 'Cheat Sheet', 'Formula Sheet', 'Important Reactions']

function CategoryIcon({ category, className = 'w-6 h-6' }: { category: string; className?: string }) {
  if (category === 'Lecture Notes') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none">
        <path d="M 4,3 L 16,3 Q 20,3 20,7 L 20,21 Q 20,21 16,21 L 4,21 Q 4,21 4,17 L 4,3 Z" stroke="currentColor" strokeWidth="1.5" />
        <path d="M 8,9 L 16,9 M 8,13 L 16,13 M 8,17 L 12,17" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    )
  }
  if (category === 'Cheat Sheet') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none">
        <rect x="4" y="3" width="12" height="17" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M 9,3 Q 9,1.5 10,1.5 Q 11,1.5 11,3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M 7,9 L 13,9 M 7,12 L 13,12 M 7,15 L 10,15" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    )
  }
  if (category === 'Formula Sheet') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none">
        <path d="M 3,18 L 5,6 L 9,14 L 13,6 L 15,18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M 17,18 L 21,18 M 19,16 L 19,20" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    )
  }
  if (category === 'Important Reactions') {
    return (
      <svg className={className} viewBox="0 0 24 24" fill="none">
        <path d="M 8,4 L 8,12 L 5,18 L 19,18 L 16,12 L 16,4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M 7,4 L 17,4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M 11,9 Q 12,8 13,9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    )
  }
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M 6,3 L 18,3 L 18,21 L 6,21 Z" stroke="currentColor" strokeWidth="1.5" />
      <path d="M 14,3 L 14,7 L 18,7" stroke="currentColor" strokeWidth="1.3" />
      <path d="M 9,12 L 15,12 M 9,15 L 15,15" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

function PDFViewer({ note, onClose }: { note: typeof notes[0]; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 20 }}
        transition={{ duration: 0.25 }}
        className="bg-[#f8f9ed] rounded-2xl w-full max-w-3xl h-[85vh] flex flex-col shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* PDF Viewer Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#e9deb5]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#e9deb5]/60 flex items-center justify-center text-[#5e4075]">
              <CategoryIcon category={note.category} className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[#5e4075] text-base">{note.title}</p>
              <p className="text-[#8b6fa0] text-[14px]">{note.pages} pages · {note.size}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex items-center gap-1.5 px-4 py-2 text-[15px] text-[#5e4075] hover:bg-[#e9deb5]/40 rounded-lg transition-colors">
              <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
                <path d="M 8,2 L 8,11 M 4,8 L 8,12 L 12,8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M 2,14 L 14,14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              Download
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-lg hover:bg-[#e9deb5]/40 flex items-center justify-center text-[#8b6fa0] hover:text-[#5e4075] transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
                <path d="M 4,4 L 12,12 M 12,4 L 4,12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        {/* PDF Page navigation bar */}
        <div className="flex items-center justify-center gap-4 py-2.5 border-b border-[#e9deb5]/60 bg-[#f0ebe8]/30">
          <button className="w-8 h-8 rounded-lg hover:bg-[#e9deb5]/40 flex items-center justify-center text-[#8b6fa0] text-[15px]">←</button>
          <span className="text-[#5e4075] text-[15px] font-mono">Page 1 / {note.pages}</span>
          <button className="w-8 h-8 rounded-lg hover:bg-[#e9deb5]/40 flex items-center justify-center text-[#8b6fa0] text-[15px]">→</button>
          <div className="w-px h-5 bg-[#e9deb5]" />
          <button className="w-8 h-8 rounded-lg hover:bg-[#e9deb5]/40 flex items-center justify-center text-[#8b6fa0] text-[15px]">−</button>
          <span className="text-[#5e4075] text-[15px] font-mono">100%</span>
          <button className="w-8 h-8 rounded-lg hover:bg-[#e9deb5]/40 flex items-center justify-center text-[#8b6fa0] text-[15px]">+</button>
        </div>

        {/* Simulated PDF content */}
        <div className="flex-1 overflow-auto bg-[#e9e5e0] p-6">
          <div className="max-w-2xl mx-auto bg-white shadow-[0_4px_20px_rgba(0,0,0,0.12)] rounded-sm p-10 min-h-full" style={{ aspectRatio: '1/1.414' }}>
            {/* Header */}
            <div className="text-center mb-8 pb-6 border-b-2 border-[#5e4075]/20">
              <div className="flex items-center justify-center gap-2 mb-3">
                <svg viewBox="0 0 36 36" fill="none" className="w-6 h-6">
                  <circle cx="18" cy="18" r="16" stroke="#5e4075" strokeWidth="1.8" />
                  <ellipse cx="18" cy="18" rx="14" ry="6" stroke="#5e4075" strokeWidth="1.5" transform="rotate(60 18 18)" />
                  <ellipse cx="18" cy="18" rx="14" ry="6" stroke="#5e4075" strokeWidth="1.5" transform="rotate(-60 18 18)" />
                  <circle cx="18" cy="18" r="3" fill="#5e4075" />
                </svg>
                <span className="text-[#5e4075] text-[14px]">Chemistry@OCTET</span>
              </div>
              <h2 className="text-[#5e4075] text-xl mb-1">{note.title}</h2>
              <p className="text-[#8b6fa0] text-[14px]">{note.chapter} · {note.category}</p>
            </div>

            {/* Mock content lines */}
            {Array.from({ length: 18 }).map((_, i) => (
              <div key={i} className={`mb-3 ${i === 0 ? 'text-[#5e4075] text-[15px]' : 'text-[#5e4075]/70 text-[14px]'}`}>
                {i === 0 && <p className="mb-2">1. Introduction</p>}
                {i === 5 && <p className="text-[#5e4075] text-[15px] mt-5 mb-2">2. Key Concepts</p>}
                {i === 10 && <p className="text-[#5e4075] text-[15px] mt-5 mb-2">3. Important Formulas</p>}
                <div
                  className="h-2.5 rounded-full bg-[#e9deb5]/60"
                  style={{ width: `${60 + ((i * 17 + 23) % 40)}%` }}
                />
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

export default function NotesPage() {
  const [category, setCategory] = useState('All')
  const [openNote, setOpenNote] = useState<typeof notes[0] | null>(null)

  const filtered = category === 'All' ? notes : notes.filter((n) => n.category === category)

  return (
    <>
      <div className="p-6 lg:p-8 max-w-5xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-6">
          <h1 className="text-2xl text-[#5e4075] mb-1">Notes & Materials</h1>
          <p className="text-[#8b6fa0] text-[15px]">Access all your study materials in one place</p>
        </motion.div>

        {/* Category filter */}
        <div className="flex flex-wrap gap-2.5 mb-6">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[15px] transition-all duration-150 ${
                category === cat
                  ? 'bg-[#5e4075] text-[#f8f9ed] shadow-[0_2px_8px_rgba(94,64,117,0.2)]'
                  : 'bg-[#e9deb5]/40 text-[#5e4075] hover:bg-[#e9deb5]/70'
              }`}
            >
              {cat !== 'All' && (
                <span className="opacity-80">
                  <CategoryIcon category={cat} className="w-4 h-4" />
                </span>
              )}
              {cat}
            </button>
          ))}
        </div>

        {/* Notes grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((note, i) => (
            <motion.button
              key={note.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              onClick={() => setOpenNote(note)}
              className="relative flex items-start gap-4 bg-white rounded-2xl p-6 border border-[#e2d5f0] shadow-[0_2px_12px_rgba(94,64,117,0.06)] hover:shadow-[0_4px_20px_rgba(94,64,117,0.1)] hover:border-[#c8a8d8] transition-all duration-200 text-left group"
            >
              {note.isNew && (
                <div className="absolute top-4 right-4 px-2.5 py-1 bg-[#5e4075] text-[#f8f9ed] text-[14px] rounded-full">
                  New
                </div>
              )}

              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#e9deb5]/60 to-[#daeae4]/60 flex items-center justify-center text-[#5e4075] shrink-0">
                <CategoryIcon category={note.category} className="w-6 h-6" />
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-[#8b6fa0] text-[14px] uppercase tracking-wide mb-1">{note.category}</p>
                <p className="text-[#5e4075] text-base group-hover:text-[#3d2652] transition-colors leading-snug mb-1">
                  {note.title}
                </p>
                <p className="text-[#8b6fa0] text-[14px]">{note.chapter}</p>
                <div className="flex items-center gap-3 mt-2">
                  <span className="text-[#c8b8d8] text-[14px] font-mono">{note.pages} pages</span>
                  <span className="text-[#c8b8d8] text-[14px]">·</span>
                  <span className="text-[#c8b8d8] text-[14px] font-mono">{note.size}</span>
                </div>
              </div>

              <svg className="w-4 h-4 text-[#c8b8d8] group-hover:text-[#5e4075] transition-colors shrink-0 mt-1" viewBox="0 0 16 16" fill="none">
                <path d="M 6,4 L 10,8 L 6,12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </motion.button>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {openNote && <PDFViewer note={openNote} onClose={() => setOpenNote(null)} />}
      </AnimatePresence>
    </>
  )
}
