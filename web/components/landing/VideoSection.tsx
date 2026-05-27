'use client'

import { motion } from 'framer-motion'
import { useState } from 'react'

export default function VideoSection() {
  const [playing, setPlaying] = useState(false)

  return (
    <section id="video" className="py-24 px-6 bg-bg">
      <div className="max-w-5xl mx-auto">
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
            A 3-minute demo of a live lecture. No memorisation, pure understanding.
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
            <path d="M 8,56 L 8,8 L 56,8" stroke="#e9deb5" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
          <svg className="absolute -bottom-4 -right-4 w-16 h-16 opacity-70" viewBox="0 0 64 64" fill="none">
            <path d="M 56,8 L 56,56 L 8,56" stroke="#daeae4" strokeWidth="2.5" strokeLinecap="round" />
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
                  <span className="text-white/80 text-base tracking-wide">Watch 3-min Demo</span>
                </motion.div>
                <div className="absolute bottom-5 left-6 right-6 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                    <span className="text-white/70 text-[14px]">LIVE LECTURE EXCERPT</span>
                  </div>
                  <span className="text-white/60 text-[14px]">Physical Chemistry — Atomic Structure</span>
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

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="grid grid-cols-3 gap-6 mt-12"
        >
          {[
            { num: '500+', label: 'Video Lectures' },
            { num: '2000+', label: 'Students Taught' },
            { num: '92%', label: 'Score 85+ in Boards' },
          ].map(({ num, label }) => (
            <div key={label} className="text-center">
              <p className="text-3xl md:text-4xl text-primary font-mono">{num}</p>
              <p className="text-muted text-base mt-1">{label}</p>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
