'use client'

// components/shared/AuthQuotePanel.tsx
//
// The right-hand decorative panel shared by every auth screen (login,
// forgot password, reset password) — same quote, same mint background, same
// chemistry motifs, so moving between these pages feels like one flow
// instead of three different designs.

import { motion } from 'framer-motion'
import { AtomSVG, FlaskSVG } from '@/components/ui/PencilSVGs'

export default function AuthQuotePanel() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.7, delay: 0.1 }}
      className="hidden lg:flex w-1/2 relative flex-col items-center justify-center p-16 overflow-hidden"
      style={{ backgroundColor: '#daeae4' }}
    >
      <div className="absolute top-8 right-8 opacity-20">
        <AtomSVG width={200} height={200} color="#5e4075" />
      </div>
      <div className="absolute bottom-8 left-8 opacity-15">
        <FlaskSVG width={150} height={170} color="#5e4075" />
      </div>

      <div className="relative z-10 max-w-md text-center">
        <div className="w-12 h-12 mx-auto mb-8 flex items-center justify-center">
          <svg className="w-12 h-12 opacity-25" viewBox="0 0 48 48" fill="none">
            <path d="M 8,32 Q 6,20 16,14 Q 20,12 22,14 L 20,20 Q 16,22 16,28 L 22,28 L 22,40 L 8,40 Z" fill="#5e4075" />
            <path d="M 28,32 Q 26,20 36,14 Q 40,12 42,14 L 40,20 Q 36,22 36,28 L 42,28 L 42,40 L 28,40 Z" fill="#5e4075" />
          </svg>
        </div>
        <blockquote className="text-primary text-xl md:text-2xl leading-relaxed mb-6">
          The art of chemistry is to understand the hidden order beneath apparent chaos.
        </blockquote>
        <p className="text-muted text-base tracking-wider">— Antoine Lavoisier</p>
        <div className="mt-12 flex flex-col items-center gap-3">
          <div className="w-px h-10 bg-primary/20" />
          <p className="text-muted text-[14px] tracking-[0.22em] uppercase">Spread True Science</p>
        </div>
      </div>
    </motion.div>
  )
}
