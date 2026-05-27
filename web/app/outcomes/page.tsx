'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import Navbar from '@/components/landing/Navbar'
import Footer from '@/components/landing/Footer'
import { AtomSVG, FlaskSVG, CompoundSVG, MicroscopeSVG, TestTubeSVG } from '@/components/ui/PencilSVGs'

// ─── Types ────────────────────────────────────────────────────────────────────

type Slide = {
  initials: string
  name: string
  exam: string
  year: string
  achievement: string
  college: string
  accentBg: string
}

type Stat = { value: string; label: string }

type ChartBar = { year: string; value: number }

type QualifierBar = { year: string; jee: number; neet: number }

type Review = {
  initials: string
  name: string
  role: string
  text: string
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const slides: Slide[] = [
  { initials: 'AK', name: 'Arjun Kumar',           exam: 'JEE Advanced',  year: '2024', achievement: 'AIR 2847',         college: 'IIT Bombay — Chemical Engineering',       accentBg: '#d4c5e2' },
  { initials: 'SR', name: 'Sneha Rajan',            exam: 'NEET UG',       year: '2024', achievement: '698 / 720',         college: 'JIPMER Puducherry — MBBS',                accentBg: '#c8e0da' },
  { initials: 'KS', name: 'Karthik Subramanian',    exam: 'CBSE Board',    year: '2024', achievement: '98% in Chemistry',  college: 'NIT Trichy — B.Tech (CSE)',               accentBg: '#e9deb5' },
  { initials: 'PT', name: 'Priya Thiyagarajan',     exam: 'JEE Mains',     year: '2024', achievement: '99.2 Percentile',   college: 'NIT Surathkal — B.Tech',                  accentBg: '#daeae4' },
  { initials: 'MA', name: 'Meenakshi Arumugam',     exam: 'TN Board',      year: '2024', achievement: '197 / 200',         college: 'District Topper — Tamil Nadu State Board', accentBg: '#d4c5e2' },
  { initials: 'RV', name: 'Rahul Venkatesh',        exam: 'NEET UG',       year: '2023', achievement: 'Rank 3422',         college: 'Government Medical College, Chennai',     accentBg: '#c8e0da' },
  { initials: 'DK', name: 'Divya Krishnamurthy',    exam: 'JEE Advanced',  year: '2023', achievement: 'AIR 4100',          college: 'IIT Madras — B.Sc. Chemistry',            accentBg: '#e9deb5' },
  { initials: 'AL', name: 'Ananya Lakshmi',         exam: 'NEET UG',       year: '2023', achievement: '685 / 720',         college: 'Madras Medical College — MBBS',           accentBg: '#daeae4' },
  { initials: 'SP', name: 'Siva Prakash',           exam: 'CBSE Board',    year: '2023', achievement: '97% in Chemistry',  college: 'VIT Vellore — B.Tech (Biotech)',          accentBg: '#d4c5e2' },
  { initials: 'AS', name: 'Arun Selvaraj',          exam: 'JEE Mains',     year: '2022', achievement: '98.7 Percentile',   college: 'NIT Warangal — B.Tech',                  accentBg: '#c8e0da' },
]

const stats: Stat[] = [
  { value: '500+', label: 'Students Taught'            },
  { value: '92%',  label: 'Avg. Score Improvement'     },
  { value: '45+',  label: 'JEE Qualifiers'             },
  { value: '38+',  label: 'NEET Qualifiers'            },
  { value: '15+',  label: 'Years of Excellence'        },
  { value: '98%',  label: 'Board Exam Pass Rate'       },
]

const boardScores: ChartBar[] = [
  { year: '2020', value: 84 },
  { year: '2021', value: 87 },
  { year: '2022', value: 89 },
  { year: '2023', value: 91 },
  { year: '2024', value: 93 },
]

const qualifiers: QualifierBar[] = [
  { year: '2020', jee: 6,  neet: 5  },
  { year: '2021', jee: 8,  neet: 7  },
  { year: '2022', jee: 9,  neet: 8  },
  { year: '2023', jee: 11, neet: 10 },
  { year: '2024', jee: 14, neet: 12 },
]

const reviews: Review[] = [
  {
    initials: 'LM',
    name: 'Mrs. Lakshmi M.',
    role: 'Parent — Arjun, IIT Bombay',
    text: 'When my son struggled with Physical Chemistry, I was worried about his future. Mr. Raju didn\'t just teach him chemistry — he taught him how to think. The transformation in one year was remarkable.',
  },
  {
    initials: 'SP',
    name: 'Mr. Suresh P.',
    role: 'Parent — Sneha, JIPMER',
    text: 'My daughter was scoring 65% before joining. After one year with Chemistry@OCTET, she scored 698 in NEET. We are forever grateful to Mr. Raju\'s patient, conceptual method of teaching.',
  },
  {
    initials: 'IV',
    name: 'Mrs. Indira V.',
    role: 'Parent — Karthik, NIT Trichy',
    text: 'What impressed me most was how personally involved Mr. Raju was. Weekly progress updates, individual attention, and never letting a doubt go unanswered. This kind of dedication is rare.',
  },
  {
    initials: 'RT',
    name: 'Mr. Ramesh T.',
    role: 'Parent — Priya, NIT Surathkal',
    text: 'Both my children studied here at different times. The quality and commitment remained exactly the same. Chemistry@OCTET is not just a coaching centre — it feels like being part of a family.',
  },
  {
    initials: 'VK',
    name: 'Mrs. Vijaya K.',
    role: 'Parent — Divya, IIT Madras',
    text: 'My daughter was hesitant about JEE. Mr. Raju\'s calm approach built her confidence from scratch. Getting into IIT Madras was a dream we barely dared to have — and Chemistry@OCTET made it real.',
  },
  {
    initials: 'AN',
    name: 'Mr. Anand L.',
    role: 'Parent — Ananya, Madras Medical College',
    text: 'The Saturday doubt sessions were invaluable. My daughter never left with an unresolved question. That level of individual attention is something I have not seen in any other coaching centre.',
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

const BAR_H = 128 // px — max bar height for charts

function StarRow() {
  return (
    <div className="flex gap-1 mb-5">
      {[0, 1, 2, 3, 4].map((i) => (
        <svg key={i} viewBox="0 0 16 16" className="w-4 h-4" fill="#d4a030">
          <path d="M 8,1.2 L 9.8,5.8 L 14.8,5.8 L 10.9,8.9 L 12.4,13.8 L 8,11 L 3.6,13.8 L 5.1,8.9 L 1.2,5.8 L 6.2,5.8 Z" />
        </svg>
      ))}
    </div>
  )
}

// ─── Results Carousel ─────────────────────────────────────────────────────────

function ResultsCarousel() {
  const [current, setCurrent] = useState(0)
  const [direction, setDirection] = useState(1)

  const go = (index: number) => {
    setDirection(index > current ? 1 : -1)
    setCurrent(index)
  }

  useEffect(() => {
    const id = setInterval(() => {
      setDirection(1)
      setCurrent((c) => (c + 1) % slides.length)
    }, 5000)
    return () => clearInterval(id)
  }, [])

  const slide = slides[current]

  const variants = {
    enter:  (d: number) => ({ opacity: 0, x: d > 0 ? 48 : -48 }),
    center: { opacity: 1, x: 0 },
    exit:   (d: number) => ({ opacity: 0, x: d > 0 ? -48 : 48 }),
  }

  return (
    <section id="results" className="bg-[#3d2652] relative overflow-hidden">
      {/* Decorative */}
      <div className="absolute -top-10 -right-16 opacity-[0.07] pointer-events-none">
        <AtomSVG width={380} height={380} color="#ffffff" />
      </div>
      <div className="absolute bottom-0 left-0 opacity-[0.05] pointer-events-none">
        <CompoundSVG width={260} height={260} color="#ffffff" />
      </div>

      <div className="relative max-w-5xl mx-auto px-6 py-20">
        {/* Header */}
        <div className="text-center mb-14">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.5 }}
            className="text-[14px] tracking-[0.25em] text-accent1/60 uppercase mb-3"
          >
            Top Results
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 14 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl md:text-4xl text-white leading-tight"
          >
            Students Who Made It Happen
          </motion.h2>
        </div>

        {/* Slide */}
        <div className="relative overflow-hidden" style={{ minHeight: '200px' }}>
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={current}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.38, ease: 'easeOut' }}
            >
              <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12 p-8 md:p-10 rounded-3xl bg-white/[0.07] border border-white/10">
                {/* Initials avatar */}
                <div className="shrink-0">
                  <div
                    className="w-24 h-24 rounded-full flex items-center justify-center text-2xl font-mono text-primary"
                    style={{ backgroundColor: slide.accentBg }}
                  >
                    {slide.initials}
                  </div>
                </div>
                {/* Content */}
                <div className="flex-1 text-center md:text-left">
                  <p className="text-[14px] tracking-[0.15em] text-accent1/55 uppercase mb-1.5">
                    {slide.exam} &middot; {slide.year}
                  </p>
                  <h3 className="text-2xl md:text-3xl text-white mb-3">{slide.name}</h3>
                  <p
                    className="text-4xl md:text-5xl font-mono leading-none mb-3"
                    style={{ color: slide.accentBg }}
                  >
                    {slide.achievement}
                  </p>
                  <p className="text-base text-white/55">{slide.college}</p>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between mt-10">
          {/* Prev */}
          <button
            onClick={() => go((current - 1 + slides.length) % slides.length)}
            className="w-11 h-11 rounded-full border border-white/20 flex items-center justify-center text-white/50 hover:text-white hover:border-white/50 transition-all duration-200"
            aria-label="Previous"
          >
            <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5">
              <path d="M 12,5 L 7,10 L 12,15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          {/* Dot indicators */}
          <div className="flex items-center gap-2">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => go(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={`rounded-full transition-all duration-300 ${
                  i === current
                    ? 'w-6 h-1.5 bg-accent1'
                    : 'w-1.5 h-1.5 bg-white/25 hover:bg-white/50'
                }`}
              />
            ))}
          </div>

          {/* Next */}
          <button
            onClick={() => go((current + 1) % slides.length)}
            className="w-11 h-11 rounded-full border border-white/20 flex items-center justify-center text-white/50 hover:text-white hover:border-white/50 transition-all duration-200"
            aria-label="Next"
          >
            <svg viewBox="0 0 20 20" fill="none" className="w-5 h-5">
              <path d="M 8,5 L 13,10 L 8,15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        <p className="text-center text-[14px] text-white/25 mt-4">
          {current + 1} of {slides.length}
        </p>
      </div>
    </section>
  )
}

// ─── Results Summary ──────────────────────────────────────────────────────────

function ResultsSummary() {
  const maxBoard = 100
  const maxQ = Math.max(...qualifiers.map((q) => Math.max(q.jee, q.neet)))

  return (
    <section id="analysis" className="py-24 px-6 bg-white">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <p className="text-[14px] tracking-[0.25em] text-muted uppercase mb-3">Our Numbers</p>
          <h2 className="text-3xl md:text-4xl text-primary leading-tight mb-4">
            Results That Speak for Themselves
          </h2>
          <p className="text-base text-muted max-w-xl mx-auto">
            Five years of consistent performance across board exams, JEE and NEET.
          </p>
        </motion.div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-16">
          {stats.map((stat, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-20px' }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              className="bg-bg border border-accent3/60 rounded-2xl p-7 text-center hover:-translate-y-1 hover:shadow-[0_8px_24px_rgba(94,64,117,0.09)] transition-all duration-300"
            >
              <div className="text-4xl text-primary mb-2">{stat.value}</div>
              <div className="text-base text-muted">{stat.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Charts */}
        <div className="grid md:grid-cols-2 gap-8">

          {/* Board score chart */}
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.5 }}
            className="bg-bg border border-accent3/60 rounded-2xl p-8"
          >
            <p className="text-[14px] tracking-widest text-muted uppercase mb-1">Year-wise Performance</p>
            <h3 className="text-xl text-primary mb-8 leading-snug">
              Avg. Chemistry Score — Board Exams
            </h3>

            {/* Bar chart */}
            <div className="flex items-end gap-4">
              {boardScores.map((bar, i) => {
                const barH = Math.round((bar.value / maxBoard) * BAR_H)
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2">
                    <span className="text-[14px] text-primary">{bar.value}%</span>
                    <div className="w-full flex items-end" style={{ height: `${BAR_H}px` }}>
                      <motion.div
                        className="w-full rounded-t-xl"
                        style={{ background: 'linear-gradient(to top, #5e4075, #8b6fa0)' }}
                        initial={{ height: 0 }}
                        whileInView={{ height: `${barH}px` }}
                        viewport={{ once: true, margin: '-40px' }}
                        transition={{ duration: 0.7, delay: i * 0.1, ease: 'easeOut' }}
                      />
                    </div>
                    <span className="text-[14px] text-muted">{bar.year}</span>
                  </div>
                )
              })}
            </div>

            <p className="text-[14px] text-muted/60 italic mt-6">
              Average across CBSE and TN Board students enrolled at Chemistry@OCTET.
            </p>
          </motion.div>

          {/* JEE + NEET qualifier chart */}
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.5 }}
            className="bg-bg border border-accent3/60 rounded-2xl p-8"
          >
            <p className="text-[14px] tracking-widest text-muted uppercase mb-1">Competitive Exams</p>
            <h3 className="text-xl text-primary mb-8 leading-snug">
              JEE &amp; NEET Qualifiers per Year
            </h3>

            {/* Grouped bar chart */}
            <div className="flex items-end gap-4">
              {qualifiers.map((q, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full flex items-end gap-1" style={{ height: `${BAR_H}px` }}>
                    <motion.div
                      className="flex-1 rounded-t-lg"
                      style={{ background: 'linear-gradient(to top, #5e4075, #8b6fa0)' }}
                      initial={{ height: 0 }}
                      whileInView={{ height: `${Math.round((q.jee / maxQ) * BAR_H)}px` }}
                      viewport={{ once: true, margin: '-40px' }}
                      transition={{ duration: 0.7, delay: i * 0.1, ease: 'easeOut' }}
                    />
                    <motion.div
                      className="flex-1 rounded-t-lg"
                      style={{ background: 'linear-gradient(to top, #2d7a5e, #5aaa8a)' }}
                      initial={{ height: 0 }}
                      whileInView={{ height: `${Math.round((q.neet / maxQ) * BAR_H)}px` }}
                      viewport={{ once: true, margin: '-40px' }}
                      transition={{ duration: 0.7, delay: i * 0.1 + 0.06, ease: 'easeOut' }}
                    />
                  </div>
                  <div className="text-center">
                    <p className="text-[14px] text-primary">{q.jee} / {q.neet}</p>
                    <p className="text-[14px] text-muted">{q.year}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="flex gap-6 mt-5">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm" style={{ background: 'linear-gradient(to top, #5e4075, #8b6fa0)' }} />
                <span className="text-[14px] text-muted">JEE Qualifiers</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-sm" style={{ background: 'linear-gradient(to top, #2d7a5e, #5aaa8a)' }} />
                <span className="text-[14px] text-muted">NEET Qualifiers</span>
              </div>
            </div>

            <p className="text-[14px] text-muted/60 italic mt-3">
              Students from Chemistry@OCTET who qualified JEE Mains or NEET UG each year.
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  )
}

// ─── Parent Reviews ───────────────────────────────────────────────────────────

function ParentReviews() {
  return (
    <section id="reviews" className="py-24 px-6 bg-bg">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <p className="text-[14px] tracking-[0.25em] text-muted uppercase mb-3">Parent Reviews</p>
          <h2 className="text-3xl md:text-4xl text-primary leading-tight mb-4">
            Heard from the Families
          </h2>
          <p className="text-base text-muted max-w-xl mx-auto">
            The trust of parents is our most valued recognition. Here is what they have shared about their experience.
          </p>
        </motion.div>

        {/* Review grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reviews.map((review, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-20px' }}
              transition={{ duration: 0.4, delay: Math.min(i * 0.07, 0.28) }}
              className="bg-white border border-accent3/60 rounded-2xl p-8 flex flex-col hover:-translate-y-1 hover:shadow-[0_8px_32px_rgba(94,64,117,0.09)] transition-all duration-300"
            >
              <StarRow />
              <p className="text-base text-muted leading-relaxed italic mb-6 flex-1">
                &ldquo;{review.text}&rdquo;
              </p>
              <div className="flex items-center gap-3 pt-5 border-t border-accent1/70">
                <div className="w-11 h-11 rounded-full bg-accent3 flex items-center justify-center text-[14px] text-primary font-mono shrink-0">
                  {review.initials}
                </div>
                <div>
                  <p className="text-base text-primary">{review.name}</p>
                  <p className="text-[14px] text-muted">{review.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OutcomesPage() {
  return (
    <main className="bg-bg min-h-screen">
      <Navbar />

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="pt-40 pb-20 px-6 text-center relative overflow-hidden bg-bg">
        <div className="absolute top-20 left-8 opacity-[0.07] pointer-events-none">
          <TestTubeSVG width={180} height={180} color="#5e4075" />
        </div>
        <div className="absolute bottom-8 right-10 opacity-[0.07] pointer-events-none">
          <MicroscopeSVG width={220} height={220} color="#5e4075" />
        </div>
        <div className="absolute top-48 right-[20%] opacity-[0.05] pointer-events-none">
          <FlaskSVG width={130} height={130} color="#5e4075" />
        </div>

        <div className="max-w-4xl mx-auto relative">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex items-center justify-center gap-2.5 mb-5"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-muted animate-pulse" />
            <span className="text-[14px] tracking-[0.25em] text-muted uppercase">
              Proven Outcomes
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-muted animate-pulse" />
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-5xl md:text-6xl text-primary leading-tight mb-6"
          >
            Our Students Succeed.
            <br />
            <span className="text-muted">Consistently.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="text-base text-muted max-w-2xl mx-auto leading-relaxed mb-10"
          >
            Over 500 students have walked through Chemistry@OCTET and walked into their dream
            colleges and careers. The results below are real — and they speak for themselves.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="flex flex-wrap justify-center gap-4"
          >
            {[
              { value: '500+', label: 'Students Taught'   },
              { value: '45+',  label: 'JEE Qualifiers'    },
              { value: '38+',  label: 'NEET Qualifiers'   },
            ].map((s) => (
              <div
                key={s.label}
                className="px-6 py-3.5 bg-white border border-accent1 rounded-2xl text-center shadow-[0_2px_12px_rgba(94,64,117,0.06)]"
              >
                <div className="text-xl text-primary">{s.value}</div>
                <div className="text-[14px] text-muted">{s.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      <ResultsCarousel />
      <ResultsSummary />
      <ParentReviews />

      {/* ── CTA ──────────────────────────────────────────────── */}
      <section className="py-20 px-6 bg-white">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5 }}
          className="max-w-3xl mx-auto text-center bg-accent1/30 border border-accent1 rounded-3xl p-12 relative overflow-hidden"
        >
          <div className="absolute top-4 right-6 opacity-[0.08] pointer-events-none">
            <FlaskSVG width={120} height={120} color="#5e4075" />
          </div>
          <h2 className="text-3xl md:text-4xl text-primary mb-4 relative">
            Be the Next Success Story.
          </h2>
          <p className="text-base text-muted mb-8 relative">
            Join Chemistry@OCTET and give yourself — or your child — the best possible foundation in chemistry.
          </p>
          <div className="flex flex-wrap gap-4 justify-center relative">
            <Link
              href="/register"
              className="px-8 py-3.5 bg-primary text-white text-base rounded-xl hover:bg-[#3d2652] transition-all duration-200 shadow-[0_2px_12px_rgba(94,64,117,0.25)] hover:shadow-[0_4px_20px_rgba(94,64,117,0.35)] hover:-translate-y-0.5"
            >
              Enroll Now
            </Link>
            <Link
              href="/courses"
              className="px-8 py-3 border border-primary/30 text-primary text-base rounded-xl hover:border-primary/60 transition-all duration-200"
            >
              View Courses
            </Link>
          </div>
        </motion.div>
      </section>

      <Footer />
    </main>
  )
}
