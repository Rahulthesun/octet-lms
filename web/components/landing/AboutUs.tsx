'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import SectionDecor from '@/components/landing/SectionDecor'

/* "Why choose us" reframed as an FAQ — the reasons become questions a parent
   would actually ask, answered from the client's content document. The six
   questions are grouped into three topic tabs; only the active tab's dropdowns
   show, so the section reads like a proper help-centre instead of a flat list. */
type Faq = { q: string; a: string }
type Category = { label: string; kind: 'learn' | 'materials' | 'progress'; faqs: Faq[] }

const categories: Category[] = [
  {
    label: 'Learning & Doubts',
    kind: 'learn',
    faqs: [
      {
        q: 'What if my child gets a doubt after class?',
        a: 'Doubts are welcome round the clock — during class, after class, or any time through the day. Clearing small doubts then and there is how a student really gets into the subject.',
      },
      {
        q: 'Can my child revise just one topic quickly?',
        a: 'Yes. Even with only half an hour, they can search a single topic — electrolysis, fuel cells, batteries — and revise exactly what they need, without hunting through a whole chapter.',
      },
    ],
  },
  {
    label: 'Materials & Course',
    kind: 'materials',
    faqs: [
      {
        q: 'How reliable are the study materials?',
        a: 'Every material is screened, authenticated and proof-read before it is uploaded — true science, spread without errors.',
      },
      {
        q: 'What is included with the course?',
        a: 'Chapter-wise PDFs, quick-revision notes, question papers with keys, practice sets and video classes — plus a doubt-clearing platform, all in one place.',
      },
    ],
  },
  {
    label: 'Progress & Enrolment',
    kind: 'progress',
    faqs: [
      {
        q: 'How will I know my child is improving?',
        a: 'Periodic tests with clear bar-diagram progress reports, followed by a parents’ meet on the first Sunday of every month.',
      },
      {
        q: 'Do you teach subjects other than chemistry?',
        a: 'No — we focus only on chemistry for CBSE 11th & 12th, taught fully in English medium and geared for the board exams, with NEET chemistry coaching coming soon.',
      },
    ],
  },
]

/* small, legible line-icons for the three tabs (semantic, not the detailed
   calligraphy glyphs which turn muddy at this size) */
function TabIcon({ kind }: { kind: Category['kind'] }) {
  const common = {
    width: 17,
    height: 17,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.6,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }
  if (kind === 'learn') {
    // lightbulb — an idea / doubt cleared
    return (
      <svg {...common}>
        <path d="M9 18h6" />
        <path d="M10 21h4" />
        <path d="M12 3a6 6 0 0 0-4 10.5c.7.6 1 1.3 1 2.1V16h6v-.4c0-.8.3-1.5 1-2.1A6 6 0 0 0 12 3Z" />
      </svg>
    )
  }
  if (kind === 'materials') {
    // stacked layers — study materials
    return (
      <svg {...common}>
        <path d="M12 3 3 7l9 4 9-4-9-4Z" />
        <path d="M3 12l9 4 9-4" />
        <path d="M3 17l9 4 9-4" />
      </svg>
    )
  }
  // trending-up — progress
  return (
    <svg {...common}>
      <path d="M3 17l6-6 4 4 7-7" />
      <path d="M17 7h4v4" />
    </svg>
  )
}

export default function AboutUs() {
  const [tab, setTab] = useState(0)
  const [open, setOpen] = useState<number | null>(null)
  const active = categories[tab]

  return (
    <section id="about" className="relative py-24 px-6 overflow-hidden section-fx" style={{ backgroundColor: '#e6eeeb' }}>
      <SectionDecor variant={0} />
      <div className="relative z-10 max-w-3xl mx-auto">
        {/* header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6 }}
          className="text-center mb-9"
        >
          <p className="text-[14px] tracking-[0.25em] text-muted uppercase mb-3">Frequently Asked Questions</p>
          <h2 className="text-3xl md:text-4xl text-primary leading-tight mb-3">
            The Questions Parents <span className="text-muted">Ask Us</span>
          </h2>
          <p className="text-muted text-base">Pick a topic to see what other parents asked.</p>
        </motion.div>

        {/* topic tabs */}
        <motion.div
          role="tablist"
          aria-label="FAQ topics"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5, delay: 0.08 }}
          className="flex flex-wrap justify-center gap-2.5 mb-9"
        >
          {categories.map((c, i) => {
            const on = tab === i
            return (
              <button
                key={c.label}
                role="tab"
                aria-selected={on}
                onClick={() => {
                  setTab(i)
                  setOpen(null)
                }}
                className={`relative inline-flex items-center rounded-full border px-5 py-2.5 text-[15px] transition-colors duration-200 ${
                  on
                    ? 'text-white border-primary'
                    : 'bg-white/50 text-muted border-accent3/70 hover:text-primary hover:border-primary/40'
                }`}
              >
                {on && (
                  <motion.span
                    layoutId="faqTabBg"
                    className="absolute inset-0 rounded-full bg-primary shadow-[0_6px_18px_rgba(94,64,117,0.28)]"
                    transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-2">
                  <TabIcon kind={c.kind} />
                  {c.label}
                </span>
              </button>
            )
          })}
        </motion.div>

        {/* active tab's accordion */}
        <motion.div
          role="tabpanel"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5, delay: 0.14 }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="space-y-3"
            >
              {active.faqs.map((f, i) => {
                const isOpen = open === i
                return (
                  <div
                    key={f.q}
                    className={`relative bg-white rounded-2xl overflow-hidden border transition-colors duration-200 shadow-[0_2px_14px_rgba(94,64,117,0.05)] ${
                      isOpen ? 'border-primary/25' : 'border-accent3/50'
                    }`}
                  >
                    {isOpen && <span className="absolute left-0 top-0 bottom-0 w-1 bg-primary" aria-hidden="true" />}
                    <button
                      onClick={() => setOpen(isOpen ? null : i)}
                      aria-expanded={isOpen}
                      className="w-full flex items-center gap-4 text-left px-6 py-5"
                    >
                      <span
                        className={`font-data text-lg w-7 shrink-0 tabular-nums transition-colors duration-200 ${
                          isOpen ? 'text-primary' : 'text-muted/60'
                        }`}
                      >
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span className="flex-1 text-primary text-lg leading-snug">{f.q}</span>
                      <span
                        className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center border transition-all duration-300 ${
                          isOpen ? 'rotate-45 bg-primary text-white border-primary' : 'text-primary border-primary/30'
                        }`}
                      >
                        <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
                          <path d="M8 3 V13 M3 8 H13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                        </svg>
                      </span>
                    </button>
                    <AnimatePresence initial={false}>
                      {isOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: 'easeInOut' }}
                          className="overflow-hidden"
                        >
                          <p className="pl-17 pr-6 pb-5 text-muted text-base leading-relaxed">{f.a}</p>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  )
}
