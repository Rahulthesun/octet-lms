'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import Navbar from '@/components/landing/Navbar'
import Footer from '@/components/landing/Footer'
import {
  IconGlobe,
  IconBuilding,
  IconPlay,
  IconDocument,
  IconBarChart,
  IconCheckCircle,
  IconCheck,
} from '@/components/ui/SvgIcons'
import { AtomSVG, FlaskSVG, BeakerSVG, CompoundSVG } from '@/components/ui/PencilSVGs'

// ─── Data ────────────────────────────────────────────────────────────────────

const steps = [
  {
    num: '01',
    title: 'Concept Clarity',
    desc: 'Every session begins with the core idea — no shortcuts, no rote formulas. Students understand the "why" before the "how".',
  },
  {
    num: '02',
    title: 'Visual & Structural',
    desc: 'Diagrams, reaction maps, and 3D molecule models make abstract chemistry tangible and memorable.',
  },
  {
    num: '03',
    title: 'Guided Practice',
    desc: 'Problem-solving with full reasoning at every step. Students learn to think, not just calculate.',
  },
  {
    num: '04',
    title: 'Test & Refine',
    desc: 'Weekly assessments followed by individual gap analysis. We track exactly where each student needs more attention.',
  },
]

const onlineSchedule = [
  { day: 'Monday',    time: '5:00 PM – 7:00 PM', type: 'Lecture'        },
  { day: 'Wednesday', time: '5:00 PM – 7:00 PM', type: 'Lecture'        },
  { day: 'Friday',    time: '5:00 PM – 7:00 PM', type: 'Lecture'        },
  { day: 'Saturday',  time: '4:00 PM – 5:30 PM', type: 'Doubt Clearing' },
]

const offlineSchedule = [
  { day: 'Tuesday',  time: '4:30 PM – 6:30 PM',  type: 'Lecture'           },
  { day: 'Thursday', time: '4:30 PM – 6:30 PM',  type: 'Lecture'           },
  { day: 'Saturday', time: '9:00 AM – 12:00 PM', type: 'Intensive Session' },
  { day: 'Sunday',   time: '9:00 AM – 12:00 PM', type: 'Practice & Test'   },
]

const exams = [
  {
    badge: 'Engineering Entrance',
    title: 'JEE Mains + Advanced',
    accent: '#d4c5e2',
    stat: '~30%',
    statLabel: 'of JEE paper is Chemistry',
    points: [
      'Conceptual depth with multi-step numerical reasoning',
      'Physical Chemistry problem sets with full derivations',
      'Organic mechanism mastery for JEE Advanced',
    ],
  },
  {
    badge: 'Medical Entrance',
    title: 'NEET UG',
    accent: '#daeae4',
    stat: '45',
    statLabel: 'Chemistry questions out of 180',
    points: [
      'Complete NCERT mastery — every line, every example',
      'MCQ speed strategies and elimination techniques',
      'Inorganic Chemistry focus for high-scoring topics',
    ],
  },
  {
    badge: 'Central Board',
    title: 'CBSE Board (11 & 12)',
    accent: '#e9deb5',
    stat: '70',
    statLabel: 'marks per Chemistry paper',
    points: [
      'Board-pattern long answers with diagram practice',
      'All NCERT questions plus exemplar problems',
      'Reaction mechanisms and named reactions in depth',
    ],
  },
  {
    badge: 'State Board',
    title: 'TN State Board (11 & 12)',
    accent: '#c8e0da',
    stat: '150',
    statLabel: 'marks in State Board Chemistry',
    points: [
      'Full Samacheer Kalvi syllabus coverage',
      'Application-based questions with worked solutions',
      'Volume 1 & 2 chapter-wise revision sessions',
    ],
  },
]

const resources = [
  {
    Icon: IconPlay,
    title: 'Video Lectures',
    desc: 'Chapter-wise HD recordings of every session, structured for easy revision.',
    points: [
      'New videos added weekly as curriculum progresses',
      'Rewatch unlimited times — no expiry',
      'Organised by chapter, topic, and exam relevance',
    ],
  },
  {
    Icon: IconDocument,
    title: 'Study Notes',
    desc: 'Handcrafted PDF notes per chapter — clear, concise, and printable.',
    points: [
      'Written by our teachers, not copied from textbooks',
      'Includes solved examples and key observations',
      'Updated every academic year with new patterns',
    ],
  },
  {
    Icon: IconBarChart,
    title: 'Formula Sheets',
    desc: 'One-page quick-reference sheets for every topic — colour-coded by category.',
    points: [
      'Physical chemistry formulas with derivation hints',
      'Named reactions and reagents for organic chemistry',
      'Downloadable and printable for desk reference',
    ],
  },
  {
    Icon: IconCheckCircle,
    title: 'Practice Tests',
    desc: 'Chapter tests, unit tests, and full-length mocks — with detailed answer keys.',
    points: [
      'Chapter-wise tests after every major topic',
      'Full-length mocks in JEE / NEET / Board pattern',
      'Individual performance reports after each test',
    ],
  },
]

// ─── Sections ─────────────────────────────────────────────────────────────────

function LearnHero() {
  return (
    <section className="relative flex flex-col items-center justify-center bg-[#f8f9ed] overflow-hidden pt-40 pb-28 px-6 text-center">
      {/* Background decorations */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <svg
          className="absolute top-10 right-10"
          style={{ opacity: 0.06 }}
          width="220" height="220" viewBox="0 0 220 220" fill="none"
        >
          <circle cx="110" cy="110" r="100" stroke="#5e4075" strokeWidth="1" strokeDasharray="4 8" />
          <circle cx="110" cy="110" r="70"  stroke="#8b6fa0" strokeWidth="0.8" strokeDasharray="3 10" />
        </svg>
        <svg
          className="absolute bottom-16 left-8"
          style={{ opacity: 0.05 }}
          width="180" height="180" viewBox="0 0 180 180" fill="none"
        >
          <circle cx="90" cy="90" r="80" stroke="#5e4075" strokeWidth="1" strokeDasharray="5 9" />
        </svg>
        <svg
          className="absolute top-1/2 left-16"
          style={{ opacity: 0.04 }}
          width="140" height="140" viewBox="0 0 140 140" fill="none"
        >
          <ellipse cx="70" cy="70" rx="60" ry="24" stroke="#8b6fa0" strokeWidth="1" strokeDasharray="4 9" />
          <ellipse cx="70" cy="70" rx="60" ry="24" stroke="#8b6fa0" strokeWidth="1" strokeDasharray="4 9" transform="rotate(60 70 70)" />
          <ellipse cx="70" cy="70" rx="60" ry="24" stroke="#8b6fa0" strokeWidth="1" strokeDasharray="4 9" transform="rotate(120 70 70)" />
        </svg>
        <div className="absolute top-24 left-[7%]" style={{ opacity: 0.09, transform: 'rotate(-18deg)' }}>
          <AtomSVG width={130} height={130} color="#5e4075" />
        </div>
        <div className="absolute bottom-16 right-[6%]" style={{ opacity: 0.09, transform: 'rotate(14deg)' }}>
          <FlaskSVG width={110} height={110} color="#8b6fa0" />
        </div>
        <div className="absolute top-[48%] right-[11%]" style={{ opacity: 0.07, transform: 'rotate(-8deg)' }}>
          <BeakerSVG width={90} height={90} color="#5e4075" />
        </div>
      </div>

      <div className="relative z-10 max-w-3xl mx-auto">
        {/* Eyebrow badge */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-[#e9deb5]/60 border border-[#e9deb5] mb-8"
        >
          <span className="w-2 h-2 rounded-full bg-[#5e4075] animate-pulse" />
          <span className="text-[14px] tracking-[0.25em] text-[#8b6fa0] uppercase">The Learning Journey</span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25 }}
          className="text-5xl md:text-6xl text-[#5e4075] leading-tight mb-6"
        >
          Chemistry Understood.<br />
          <span className="text-[#8b6fa0] italic">Every Exam Conquered.</span>
        </motion.h1>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-base text-[#8b6fa0] max-w-2xl mx-auto mb-12 leading-relaxed"
        >
          From basic concepts to complex numericals, our structured approach takes every student from
          confusion to clarity — across all major examinations.
        </motion.p>

        {/* Stat badges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.55 }}
          className="flex items-center justify-center gap-3 flex-wrap"
        >
          {[
            { value: '500+', label: 'Students Enrolled'   },
            { value: '92%',  label: 'Score Improvement'   },
            { value: '4',    label: 'Exam Boards Covered' },
          ].map((s) => (
            <div key={s.label} className="px-5 py-2.5 rounded-full bg-white border border-[#d4c5e2]/60 flex items-center gap-2.5">
              <span className="text-xl font-mono text-[#5e4075]">{s.value}</span>
              <span className="text-[14px] text-[#8b6fa0]">{s.label}</span>
            </div>
          ))}
        </motion.div>
      </div>

      
    </section>
  )
}

function Approach() {
  return (
    <section id="approach" className="py-24 px-6 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">

          {/* Left: 4-step flow */}
          <div>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.5 }}
              className="text-[14px] tracking-[0.25em] text-[#8b6fa0] uppercase mb-3"
            >
              Our Methodology
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-3xl md:text-4xl text-[#5e4075] leading-tight mb-12"
            >
              Concepts Over Shortcuts
            </motion.h2>

            <div className="relative">
              {/* Vertical connector line */}
              <div className="absolute left-5 top-10 bottom-10 w-px bg-[#d4c5e2] hidden sm:block" />
              <div className="space-y-5">
                {steps.map((step, i) => (
                  <motion.div
                    key={step.num}
                    initial={{ opacity: 0, x: -24 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: '-40px' }}
                    transition={{ duration: 0.5, delay: i * 0.12 }}
                    className="relative flex gap-5"
                  >
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-[#5e4075] text-white text-[14px] flex items-center justify-center z-10">
                      {step.num}
                    </div>
                    <div className="flex-1 p-6 rounded-2xl border border-[#d4c5e2]/60 bg-[#f8f9ed] hover:border-[#5e4075]/25 hover:shadow-[0_4px_20px_rgba(94,64,117,0.08)] transition-all duration-300">
                      <h3 className="text-lg text-[#5e4075] mb-2">{step.title}</h3>
                      <p className="text-[15px] text-[#8b6fa0] leading-relaxed">{step.desc}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Philosophy text + quote */}
          <div className="lg:pt-24">
            <motion.div
              initial={{ opacity: 0, x: 24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <p className="text-base text-[#8b6fa0] leading-relaxed mb-6">
                At Chemistry@OCTET, every teacher is a guide first and a lecturer second. Our sessions
                are discussions, not monologues. Students ask questions, explore structures, and work
                through problems collaboratively — building real intuition for chemistry that lasts
                beyond the exam hall.
              </p>
              <p className="text-base text-[#8b6fa0] leading-relaxed mb-10">
                We believe the best preparation for JEE, NEET, or Board exams is deep understanding —
                not the volume of problems solved. One concept understood thoroughly beats a hundred
                problems solved mechanically.
              </p>

              <blockquote className="border-l-4 border-[#e9deb5] pl-6 py-2 mb-12">
                <p className="text-lg text-[#5e4075] leading-relaxed italic mb-3">
                  &ldquo;The moment a student stops asking &lsquo;what is the formula?&rsquo; and starts
                  asking &lsquo;why does this work?&rsquo; — that is when real learning begins.&rdquo;
                </p>
                <cite className="text-[14px] text-[#8b6fa0] not-italic">
                  — Chemistry@OCTET Teaching Philosophy
                </cite>
              </blockquote>

              <div style={{ opacity: 0.12 }}>
                <CompoundSVG width={160} height={160} color="#5e4075" />
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}

function Schedule() {
  const [mode, setMode] = useState<'online' | 'offline'>('online')
  const schedule = mode === 'online' ? onlineSchedule : offlineSchedule

  const badgeClass = (type: string) => {
    if (type === 'Lecture')           return 'bg-[#e9deb5] text-[#8b6fa0]'
    if (type === 'Doubt Clearing')    return 'bg-[#d4c5e2]/70 text-[#5e4075]'
    return 'bg-[#daeae4] text-[#3d7a5e]'
  }

  return (
    <section id="schedule" className="py-24 px-6 bg-[#f8f9ed]">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.5 }}
            className="text-[14px] tracking-[0.25em] text-[#8b6fa0] uppercase mb-3"
          >
            Programme Schedule
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl md:text-4xl text-[#5e4075] leading-tight mb-5"
          >
            Find Your Learning Mode
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-base text-[#8b6fa0] max-w-xl mx-auto"
          >
            Both modes follow the same curriculum and are taught by the same faculty.
          </motion.p>
        </div>

        {/* Toggle */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex justify-center mb-10"
        >
          <div className="inline-flex bg-white border border-[#d4c5e2]/60 rounded-xl p-1.5 gap-1">
            {(['online', 'offline'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex items-center gap-2.5 px-6 py-2.5 rounded-lg text-base transition-all duration-200 ${
                  mode === m
                    ? 'bg-[#5e4075] text-white shadow-[0_2px_12px_rgba(94,64,117,0.25)]'
                    : 'text-[#8b6fa0] hover:text-[#5e4075]'
                }`}
              >
                {m === 'online' ? <IconGlobe className="w-5 h-5" /> : <IconBuilding className="w-5 h-5" />}
                {m === 'online' ? 'Online' : 'Offline'}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Panel */}
        <AnimatePresence mode="wait">
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.22 }}
          >
            {/* Mode info bar */}
            <div className={`rounded-2xl p-5 mb-4 flex items-center gap-4 ${mode === 'online' ? 'bg-[#d4c5e2]/25' : 'bg-[#daeae4]/25'}`}>
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-white flex-shrink-0 ${mode === 'online' ? 'bg-[#5e4075]' : 'bg-[#3d7a5e]'}`}>
                {mode === 'online' ? <IconGlobe className="w-5 h-5" /> : <IconBuilding className="w-5 h-5" />}
              </div>
              <div>
                <p className="text-base text-[#5e4075]">
                  {mode === 'online' ? 'Live Online Classes' : 'In-Person Classes'}
                </p>
                <p className="text-[14px] text-[#8b6fa0]">
                  {mode === 'online'
                    ? 'Platform: Google Meet / Zoom · Sessions recorded and available for 30 days'
                    : 'Venue: OCTET Study Centre · Bring your notes and practice sheets'}
                </p>
              </div>
            </div>

            {/* Schedule table */}
            <div className="bg-white rounded-2xl border border-[#d4c5e2]/60 overflow-hidden">
              <div className="grid grid-cols-3 bg-[#f8f9ed] border-b border-[#d4c5e2]/60 px-6 py-3.5">
                <span className="text-[14px] text-[#8b6fa0] uppercase tracking-wide">Day</span>
                <span className="text-[14px] text-[#8b6fa0] uppercase tracking-wide">Time</span>
                <span className="text-[14px] text-[#8b6fa0] uppercase tracking-wide">Session Type</span>
              </div>
              {schedule.map((row, i) => (
                <div
                  key={row.day}
                  className={`grid grid-cols-3 px-6 py-4 items-center hover:bg-[#f8f9ed]/60 transition-colors ${
                    i < schedule.length - 1 ? 'border-b border-[#d4c5e2]/40' : ''
                  }`}
                >
                  <span className="text-base text-[#5e4075]">{row.day}</span>
                  <span className="text-base text-[#5e4075] font-mono">{row.time}</span>
                  <span className={`inline-flex w-fit px-3 py-1.5 rounded-full text-[14px] ${badgeClass(row.type)}`}>
                    {row.type}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Info badges */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="flex items-center justify-center gap-3 flex-wrap mt-8"
        >
          {[
            '2 hrs per lecture',
            'Weekly tests included',
            'Doubt sessions every week',
            `Max ${mode === 'online' ? '20' : '15'} students per batch`,
          ].map((badge) => (
            <span
              key={badge}
              className="px-4 py-2 rounded-full bg-white border border-[#d4c5e2]/60 text-[14px] text-[#8b6fa0]"
            >
              {badge}
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

function ExamPathways() {
  return (
    <section id="exams" className="py-24 px-6 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.5 }}
            className="text-[14px] tracking-[0.25em] text-[#8b6fa0] uppercase mb-3"
          >
            Exam Coverage
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl md:text-4xl text-[#5e4075] leading-tight mb-5"
          >
            One Chemistry. Every Exam.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-base text-[#8b6fa0] max-w-2xl mx-auto"
          >
            We teach the same chemistry — structured to meet the exact demands of each examination board.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {exams.map((exam, i) => (
            <motion.div
              key={exam.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="relative p-7 rounded-2xl border border-[#d4c5e2]/60 bg-[#f8f9ed] overflow-hidden hover:-translate-y-1 hover:shadow-[0_8px_32px_rgba(94,64,117,0.12)] transition-all duration-300"
            >
              {/* Coloured corner accent */}
              <div
                className="absolute top-0 right-0 w-28 h-28 rounded-bl-full opacity-60"
                style={{ backgroundColor: exam.accent }}
              />

              <div className="relative">
                <span
                  className="inline-block px-3 py-1.5 rounded-full text-[14px] text-[#5e4075] mb-4"
                  style={{ backgroundColor: exam.accent }}
                >
                  {exam.badge}
                </span>

                <h3 className="text-xl text-[#5e4075] mb-4">{exam.title}</h3>

                <div className="flex items-baseline gap-2.5 mb-5">
                  <span className="text-4xl font-mono text-[#5e4075]">{exam.stat}</span>
                  <span className="text-[14px] text-[#8b6fa0]">{exam.statLabel}</span>
                </div>

                <ul className="space-y-2.5">
                  {exam.points.map((pt) => (
                    <li key={pt} className="flex items-start gap-2.5 text-[15px] text-[#8b6fa0]">
                      <span className="mt-0.5 flex-shrink-0 text-[#5e4075]">
                        <IconCheck className="w-4 h-4" />
                      </span>
                      {pt}
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

function Resources() {
  return (
    <section id="resources" className="py-24 px-6 bg-[#f8f9ed]">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.5 }}
            className="text-[14px] tracking-[0.25em] text-[#8b6fa0] uppercase mb-3"
          >
            What You Get
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl md:text-4xl text-[#5e4075] leading-tight mb-5"
          >
            Built to Support Every Step
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-base text-[#8b6fa0] max-w-xl mx-auto"
          >
            Every resource is created in-house by our teachers — not sourced from third parties.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {resources.map((res, i) => (
            <motion.div
              key={res.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className="p-7 rounded-2xl bg-white border border-[#d4c5e2]/60 hover:border-[#5e4075]/25 hover:shadow-[0_8px_32px_rgba(94,64,117,0.1)] transition-all duration-300"
            >
              <div className="w-14 h-14 rounded-xl bg-[#e9deb5] flex items-center justify-center mb-5 text-[#5e4075]">
                <res.Icon className="w-7 h-7" />
              </div>
              <h3 className="text-xl text-[#5e4075] mb-2">{res.title}</h3>
              <p className="text-base text-[#8b6fa0] mb-5 leading-relaxed">{res.desc}</p>
              <ul className="space-y-2.5">
                {res.points.map((pt) => (
                  <li key={pt} className="flex items-start gap-2.5 text-[15px] text-[#8b6fa0]">
                    <span className="mt-0.5 flex-shrink-0 text-[#5e4075]">
                      <IconCheck className="w-4 h-4" />
                    </span>
                    {pt}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="text-center text-[14px] text-[#8b6fa0] mt-10"
        >
          All resources unlock immediately after enrollment.
        </motion.p>
      </div>
    </section>
  )
}

function EnrollCTA() {
  return (
    <section className="py-24 px-6 bg-white">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.6 }}
          className="relative bg-[#e9deb5]/30 border border-[#e9deb5] rounded-3xl p-16 max-w-3xl mx-auto text-center overflow-hidden"
        >
          {/* Decorative SVGs */}
          <div className="absolute top-4 right-4" style={{ opacity: 0.14 }}>
            <AtomSVG width={110} height={110} color="#5e4075" />
          </div>
          <div className="absolute bottom-4 left-4" style={{ opacity: 0.1 }}>
            <FlaskSVG width={95} height={95} color="#8b6fa0" />
          </div>

          <div className="relative z-10">
            <p className="text-[14px] tracking-[0.25em] text-[#8b6fa0] uppercase mb-4">Get Started</p>
            <h2 className="text-3xl md:text-4xl text-[#5e4075] leading-tight mb-4">Ready to Begin?</h2>
            <p className="text-base text-[#8b6fa0] mb-10 max-w-md mx-auto">
              Join 500+ students learning chemistry the right way — with clarity, confidence, and purpose.
            </p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Link
                href="/register"
                className="px-8 py-3.5 bg-[#5e4075] text-white text-base rounded-xl hover:bg-[#3d2652] hover:-translate-y-0.5 transition-all duration-200 shadow-[0_4px_20px_rgba(94,64,117,0.3)] hover:shadow-[0_6px_28px_rgba(94,64,117,0.4)]"
              >
                Enroll Now
              </Link>
              <Link
                href="/#courses"
                className="px-8 py-3 border border-[#5e4075]/30 text-[#5e4075] text-base rounded-xl hover:bg-[#e9deb5]/40 transition-all duration-200"
              >
                Explore Courses
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LearnPage() {
  return (
    <main className="bg-[#f8f9ed] min-h-screen">
      <Navbar />
      <LearnHero />
      <Approach />
      <Schedule />
      <ExamPathways />
      <Resources />
      <EnrollCTA />
      <Footer />
    </main>
  )
}
