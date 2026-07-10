'use client'

import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import SectionDecor from '@/components/landing/SectionDecor'

const iconWrap = {
  width: 30,
  height: 30,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: '#7e57ab',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
}

function PlaceIcon() {
  return (
    <svg {...iconWrap} aria-hidden="true">
      <path d="M12 3 L21 11 H3 Z" />
      <path d="M4 21 H20" />
      <path d="M5 21 V11 M9.7 21 V11 M14.3 21 V11 M19 21 V11" />
    </svg>
  )
}
function TeacherIcon() {
  return (
    <svg {...iconWrap} aria-hidden="true">
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5.5 20 C5.5 15.6 8.6 13.6 12 13.6 C15.4 13.6 18.5 15.6 18.5 20" />
    </svg>
  )
}
function BookIcon() {
  return (
    <svg {...iconWrap} aria-hidden="true">
      <path d="M12 6 C10 4.6 7 4.3 4.5 5 V19 C7 18.3 10 18.6 12 20 C14 18.6 17 18.3 19.5 19 V5 C17 4.3 14 4.6 12 6 Z" />
      <path d="M12 6 V20" />
    </svg>
  )
}
function FireIcon() {
  return (
    <svg {...iconWrap} aria-hidden="true">
      <path d="M12 3 C13 7 17 8 15.5 13 C15 15 13.8 16.5 12 21 C10.2 16.5 9 15 8.5 13 C7 8 11 7 12 3 Z" />
      <path d="M12 12.5 C12.6 14 13.5 14.7 13 16.6 C12.7 17.6 12.4 18.1 12 19 C11.6 18.1 11.3 17.6 11 16.6 C10.5 14.7 11.4 14 12 12.5 Z" />
    </svg>
  )
}

const principles: { Icon: () => ReactNode; title: string; desc: string }[] = [
  {
    Icon: PlaceIcon,
    title: 'Respect the Place',
    desc: 'OCTET is an adorable place — enter it with the respect you would give a temple, a church or a mosque.',
  },
  {
    Icon: TeacherIcon,
    title: 'Respect the Teacher',
    desc: 'A teacher is a potter who moulds your life — a sculptor carving you to fit into society.',
  },
  {
    Icon: BookIcon,
    title: 'Respect the Book',
    desc: 'Your book is the hard work of scientists across the world. Add your contribution, or hand it carefully to the next generation.',
  },
  {
    Icon: FireIcon,
    title: 'Education Is Fire',
    desc: 'Playing with education is like playing with fire — your future generations depend on the education you build today.',
  },
]

export default function ToStudents() {
  return (
    <section id="students" className="relative overflow-hidden section-fx" style={{ backgroundColor: '#e7dff0' }}>
      <SectionDecor variant={0} />
      <div className="relative z-10 max-w-6xl mx-auto px-6 py-24 md:py-28">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <p className="text-[14px] tracking-[0.25em] text-muted uppercase mb-3">A Word to Students</p>
          <h2 className="text-3xl md:text-4xl text-primary leading-tight">
            Respect the Place. <span className="text-muted">Respect the Journey.</span>
          </h2>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
          {principles.map(({ Icon, title, desc }, i) => (
            <motion.div
              key={title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.5, delay: 0.06 * i }}
              className="rounded-2xl bg-white border border-accent3/50 p-7 shadow-[0_2px_16px_rgba(94,64,117,0.06)] hover:shadow-[0_12px_36px_rgba(94,64,117,0.14)] hover:-translate-y-1.5 transition-all duration-300"
            >
              <div className="w-14 h-14 rounded-2xl mb-5 flex items-center justify-center" style={{ backgroundColor: '#efe7f8' }}>
                <Icon />
              </div>
              <h3 className="text-primary text-lg mb-2">{title}</h3>
              <p className="text-muted text-base leading-relaxed">{desc}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <p className="text-2xl md:text-4xl text-primary leading-tight max-w-3xl mx-auto">
            If you are not studying at OCTET, you are{' '}
            <span style={{ boxShadow: 'inset 0 -0.42em 0 rgba(233,222,181,0.7)' }}>missing something</span>{' '}
            in your life.
          </p>
          <p className="text-muted text-[14px] tracking-[0.22em] uppercase mt-6">Those who have ears, hear</p>
        </motion.div>
      </div>
    </section>
  )
}
