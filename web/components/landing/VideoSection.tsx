'use client'

import { motion } from 'framer-motion'
import { useState } from 'react'
import SectionDecor from '@/components/landing/SectionDecor'

const features = [
  {
    label: 'XI–XII CBSE Chemistry',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none">
        <path d="M 3,6 L 10,3 L 17,6 L 10,9 Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
        <path d="M 6,7.5 L 6,12 Q 10,14 14,12 L 14,7.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    label: 'English Medium',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none">
        <path d="M 4,15 L 8,5 L 12,15 M 5.5,11.5 L 10.5,11.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M 13,15 Q 13,8 16,8 Q 17.5,8 17.5,10 Q 17.5,12 13,12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },
  {
    label: '24/7 Doubt Support',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none">
        <path d="M 3,14 L 3,7 Q 3,4 10,4 Q 17,4 17,7 L 17,11 Q 17,14 10,14 L 7,14 L 4,16.5 Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
        <path d="M 8,8.5 Q 8,7 10,7 Q 12,7 12,8.7 Q 12,10 10,10.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" fill="none" />
        <circle cx="10" cy="12" r="0.7" fill="currentColor" />
      </svg>
    ),
  },
]

export default function VideoSection() {
  const [playing, setPlaying] = useState(false)

  return (
    <section id="video" className="relative py-18 px-6 overflow-hidden section-fx" style={{ backgroundColor: '#f8f9ed' }}>
      <SectionDecor variant={3} />
      <div className="relative z-10 max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <p className="text-[14px] tracking-[0.25em] text-muted uppercase mb-3">See It in Action</p>
          <h2 className="text-3xl md:text-4xl text-primary mb-4">
            Watch How We Teach Chemistry
            <br />
            <span className="text-muted">Differently</span>
          </h2>
          <p className="text-muted text-base max-w-md mx-auto">
            A demo of a live lecture. No memorisation, pure understanding.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 32, scale: 0.96 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="relative"
        >
          {/* Decorative corners */}
          <svg className="absolute -top-4 -left-4 w-16 h-16 opacity-70" viewBox="0 0 64 64" fill="none">
            <path d="M 8,56 L 8,8 L 56,8" stroke="#bab291" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <svg className="absolute -bottom-4 -right-4 w-16 h-16 opacity-70" viewBox="0 0 64 64" fill="none">
            <path d="M 56,8 L 56,56 L 8,56" stroke="#aebbb6" strokeWidth="2.5" strokeLinecap="round" />
          </svg>

          <div className="relative rounded-2xl overflow-hidden shadow-[0_20px_60px_rgba(94,64,117,0.18)] border border-accent3/50">
            {!playing ? (
              <div
                className="relative aspect-video bg-linear-to-br from-primary to-[#3d2652] flex items-center justify-center cursor-pointer group"
                onClick={() => setPlaying(true)}
              >
                <div className="absolute inset-0 opacity-15">
                  <svg viewBox="0 0 600 340" className="w-full h-full" fill="none">
                    <circle cx="300" cy="170" r="120" stroke="white" strokeWidth="1.5" strokeDasharray="8 12" />
                    <ellipse cx="300" cy="170" rx="118" ry="48" stroke="white" strokeWidth="1.5" transform="rotate(60 300 170)" />
                    <ellipse cx="300" cy="170" rx="118" ry="48" stroke="white" strokeWidth="1.5" transform="rotate(-60 300 170)" />
                    <circle cx="300" cy="170" r="15" fill="white" opacity="0.8" />
                    <text x="60" y="60" fontSize="18" fill="white" fontFamily="monospace">C₆H₁₂O₆</text>
                    <text x="460" y="60" fontSize="18" fill="white" fontFamily="monospace">H₂O</text>
                    <text x="80" y="290" fontSize="16" fill="white" fontFamily="monospace">NaCl</text>
                    <text x="440" y="290" fontSize="16" fill="white" fontFamily="monospace">H₂SO₄</text>
                  </svg>
                </div>
                <motion.div
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.96 }}
                  className="relative z-10 flex flex-col items-center gap-4"
                >
                  <div className="w-20 h-20 rounded-full bg-bg/90 flex items-center justify-center shadow-[0_8px_32px_rgba(0,0,0,0.3)] group-hover:bg-white transition-colors duration-200">
                    <svg className="w-8 h-8 ml-1" viewBox="0 0 32 32" fill="none">
                      <path d="M 10,7 L 26,16 L 10,25 Z" fill="#5e4075" />
                    </svg>
                  </div>
                  <span className="text-white/80 text-base tracking-wide">Watch Demo Video</span>
                </motion.div>
                <div className="absolute bottom-5 left-6 right-6 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                    <span className="text-white/70 text-[14px]">LIVE LECTURE EXCERPT</span>
                  </div>
                  <span className="hidden sm:inline text-white/60 text-[14px]">Physical Chemistry — Atomic Structure</span>
                </div>
              </div>
            ) : (
              <div className="aspect-video">
                <iframe
                  className="w-full h-full"
                  src="https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1"
                  title="Chemistry@OCTET Demo"
                  allow="autoplay; encrypted-media"
                  allowFullScreen
                />
              </div>
            )}
          </div>
        </motion.div>

        {/* Feature row — qualitative, no fabricated numbers */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex flex-wrap items-center justify-center gap-3 md:gap-4 mt-12"
        >
          {features.map((f) => (
            <div
              key={f.label}
              className="flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-white border border-accent3/50 text-primary shadow-[0_2px_10px_rgba(94,64,117,0.06)]"
            >
              <span className="text-muted shrink-0">{f.icon}</span>
              <span className="text-[15px]">{f.label}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
