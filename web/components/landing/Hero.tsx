'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'

export default function Hero() {
  return (
    <section className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden pt-20 pb-16 px-6">
      {/* Background subtle pattern */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <svg className="absolute top-20 left-10 opacity-8" width="260" height="260" viewBox="0 0 260 260" fill="none">
          <circle cx="130" cy="130" r="110" stroke="#5e4075" strokeWidth="0.8" strokeDasharray="4 8" />
          <circle cx="130" cy="130" r="70" stroke="#5e4075" strokeWidth="0.6" strokeDasharray="3 6" />
        </svg>
        <svg className="absolute bottom-20 right-10 opacity-8" width="220" height="220" viewBox="0 0 220 220" fill="none">
          <ellipse cx="110" cy="110" rx="100" ry="40" stroke="#5e4075" strokeWidth="0.8" strokeDasharray="4 8" />
          <ellipse cx="110" cy="110" rx="100" ry="40" stroke="#5e4075" strokeWidth="0.8" strokeDasharray="4 8" transform="rotate(60 110 110)" />
          <ellipse cx="110" cy="110" rx="100" ry="40" stroke="#5e4075" strokeWidth="0.8" strokeDasharray="4 8" transform="rotate(120 110 110)" />
        </svg>
        <svg className="absolute top-40 right-20 opacity-6" width="180" height="180" viewBox="0 0 180 180" fill="none">
          <circle cx="90" cy="90" r="75" stroke="#8b6fa0" strokeWidth="0.6" strokeDasharray="3 9" />
        </svg>
      </div>

      {/* Center content */}
      <div className="max-w-4xl mx-auto w-full flex flex-col items-center text-center gap-6">
        {/* Enrollment badge */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="inline-flex items-center gap-2.5 px-5 py-2 rounded-full bg-accent1/60 border border-accent1"
        >
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse shrink-0" />
          <span className="text-base text-primary">Now Enrolling — 11th & 12th Grade</span>
        </motion.div>

        {/* Headline — 3 lines */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.25 }}
          className="text-5xl md:text-6xl text-primary leading-tight tracking-tight"
        >
          {/* Line 1 with yellow underline on "Isn't Hard." */}
          <span className="block pb-1">
            Chemistry{' '}
            <span className="relative inline-block">
              Isn&apos;t Hard.
              <svg className="absolute -bottom-2 left-0 w-full" height="6" viewBox="0 0 320 6" fill="none">
                <path d="M 2,4 Q 40,2 80,4 Q 120,6 160,3 Q 200,1 240,4 Q 275,6 318,3" stroke="#e9deb5" strokeWidth="5" strokeLinecap="round" />
              </svg>
            </span>
          </span>
          {/* Line 2 */}
          <span className="font-normal">It Just Hasn&apos;t Been</span>
          {/* Line 3 — "Taught Right." italic bold purple with oval, "Until Now." normal */}
          <span className="block">
            <span className="relative inline-block">
              <span className="italic font-semi-bold text-muted">Taught Right.</span>
              {/* Oval whose ends cross at the right side — same yellow as the underline */}
              <svg
                className="absolute pointer-events-none"
                style={{ top: '-2px', left: '-24px', right: '-14px', bottom: '-20px' }}
                viewBox="0 0 320 82"
                fill="none"
                preserveAspectRatio="none"
              >
                <path
                  d="M 300,48 C 305,30 300,8 252,3 C 204,-2 138,0 86,4 C 42,8 10,20 6,40 C 2,58 26,74 84,78 C 142,82 224,76 272,64 C 298,56 314,44 300,30"
                  stroke="#e9deb5"
                  strokeWidth="5"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            </span>
            {' '}<span className="not-italic font-normal">Until Now.</span>
          </span>
        </motion.h1>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.4 }}
          className="text-muted text-base md:text-lg leading-relaxed max-w-xl"
        >
          We transform chemistry from a subject of dread into the science your child can&apos;t stop thinking about.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.55 }}
          className="flex flex-col sm:flex-row items-center gap-4"
        >
          <Link
            href="/register"
            className="px-8 py-3 bg-primary text-white text-base rounded-xl shadow-[0_4px_20px_rgba(94,64,117,0.3)] hover:bg-[#3d2652] hover:shadow-[0_6px_28px_rgba(94,64,117,0.4)] hover:-translate-y-0.5 transition-all duration-200"
          >
            Start Learning Today
          </Link>
          <a
            href="#video"
            className="px-8 py-3 border border-primary/30 text-primary text-base rounded-xl hover:bg-accent1/40 transition-all duration-200 flex items-center gap-2.5"
          >
            <svg className="w-5 h-5 shrink-0" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="10" r="9" stroke="#5e4075" strokeWidth="1.5" />
              <path d="M 8,7 L 14,10 L 8,13 Z" fill="#5e4075" />
            </svg>
            Watch a Demo
          </a>
        </motion.div>

        {/* Tagline with stars */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.7, delay: 0.7 }}
          className="text-muted text-[14px] tracking-[0.25em] uppercase"
        >
          ✦ Spread True Science ✦
        </motion.p>
      </div>
    </section>
  )
}
