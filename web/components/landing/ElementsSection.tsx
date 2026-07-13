'use client'

import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import PeriodicTable from '@/components/landing/PeriodicTable'
import SectionDecor from '@/components/landing/SectionDecor'
import { AtomSVG } from '@/components/ui/PencilSVGs'

/* ---- custom line-icons for the four meanings of "OCTET" ------------------ */
const iconProps = {
  width: 26,
  height: 26,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: '#7e57ab',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

function StabilityIcon() {
  return (
    <svg {...iconProps} aria-hidden="true">
      <path d="M12 4 V20" />
      <path d="M8 20 H16" />
      <path d="M5 7 H19" />
      <path d="M5 7 l-2.2 4.6 a2.6 2.6 0 0 0 4.4 0 z" />
      <path d="M19 7 l-2.2 4.6 a2.6 2.6 0 0 0 4.4 0 z" />
    </svg>
  )
}
function CompletenessIcon() {
  return (
    <svg {...iconProps} aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8 12.2 l2.6 2.6 L16 9" />
    </svg>
  )
}
function FulfilmentIcon() {
  return (
    <svg {...iconProps} aria-hidden="true">
      <path d="M12 3.2 l2.6 5.27 5.82.85 -4.21 4.1 .99 5.8 -5.2-2.74 -5.2 2.74 .99-5.8 -4.21-4.1 5.82-.85 z" />
    </svg>
  )
}
function SatisfactionIcon() {
  return (
    <svg {...iconProps} aria-hidden="true">
      <path d="M12 20.5 C6 15.5 3.5 12 5.6 8.9 C7.2 6.5 10.7 6.9 12 9.3 C13.3 6.9 16.8 6.5 18.4 8.9 C20.5 12 18 15.5 12 20.5 Z" />
    </svg>
  )
}

const meanings: { word: string; Icon: () => ReactNode }[] = [
  { word: 'Stability', Icon: StabilityIcon },
  { word: 'Completeness', Icon: CompletenessIcon },
  { word: 'Fulfilment', Icon: FulfilmentIcon },
  { word: 'Satisfaction', Icon: SatisfactionIcon },
]

export default function ElementsSection() {
  // NO section-fx here: this section carries no gradient of its own, so the
  // banner's below-the-rope wash flows into it seamlessly. Only #e6eeeb + the
  // matching dot grid.
  return (
    <section
      id="elements"
      className="relative overflow-hidden dots-fx"
      style={{ backgroundColor: '#e6eeeb' }}
    >
      <SectionDecor variant={1} />
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-20 md:py-24">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left — the story behind the name (the octet rule) */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-[14px] tracking-[0.25em] uppercase mb-4" style={{ color: '#7e57ab' }}>
              The Meaning Behind the Name
            </p>

            <h2 className="text-3xl md:text-4xl text-primary leading-tight mb-6">
              Why We Call It <span className="text-muted">OCTET</span>
            </h2>

            <p className="text-muted text-base md:text-lg leading-relaxed mb-4">
              The name comes straight from the <span className="text-primary">octet rule</span> in
              chemistry: atoms combine so they can attain an octet — eight electrons — in their
              outermost shell. The moment an atom completes its octet, it becomes stable.
            </p>
            <p className="text-muted text-base md:text-lg leading-relaxed mb-7">
              So <span className="text-primary">OCTET</span> stands for everything we want every
              student to feel about chemistry:
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
              {meanings.map(({ word, Icon }, i) => (
                <motion.div
                  key={word}
                  initial={{ opacity: 0, y: 12 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.4, delay: 0.1 + i * 0.08 }}
                  className="flex flex-col items-center gap-2 rounded-xl bg-white border border-accent3/50 px-3 py-4 text-center shadow-[0_2px_10px_rgba(94,64,117,0.05)]"
                >
                  <Icon />
                  <span className="text-primary text-[15px]">{word}</span>
                </motion.div>
              ))}
            </div>

            {/* OCTET promise — plum card, styled like a spotlight panel */}
            <div
              className="relative overflow-hidden rounded-2xl px-6 py-5 shadow-[0_16px_40px_rgba(94,64,117,0.25)]"
              style={{ backgroundColor: '#5e4075' }}
            >
              <div className="absolute -top-6 -right-6 opacity-15 pointer-events-none">
                <AtomSVG width={130} height={130} color="#ffffff" />
              </div>
              <p className="relative text-white text-base md:text-lg leading-relaxed">
                That&apos;s the OCTET promise — a comfortable, interest-driven,
                <span className="text-accent1"> fear-free and error-free </span>
                zone to learn chemistry.
              </p>
            </div>
          </motion.div>

          {/* Right — the interactive periodic table */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="relative"
          >
            <PeriodicTable />
            <p className="text-center text-muted text-[13px] mt-4">
              Hover any element — all 118, taught with clarity.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
