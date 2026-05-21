'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import Navbar from '@/components/landing/Navbar'
import Footer from '@/components/landing/Footer'
import { IconCheck, IconStar, IconGlobe } from '@/components/ui/SvgIcons'
import {
  AtomSVG,
  FlaskSVG,
  BeakerSVG,
  TestTubeSVG,
  MicroscopeSVG,
  CompoundSVG,
} from '@/components/ui/PencilSVGs'

// ─── Data ────────────────────────────────────────────────────────────────────

const milestones = [
  { year: '2010', text: 'Founded with a single batch of 12 students in Tamil Nadu' },
  { year: '2014', text: 'Expanded to a full-time 11th & 12th grade programme' },
  { year: '2018', text: 'Launched online classes, reaching students across the state' },
  { year: '2024', text: '500+ students enrolled, 92% average score improvement recorded' },
]

const credentials = ['M.Sc. Chemistry', '15+ Years Teaching', 'JEE / NEET Specialist']

const values = [
  'Conceptual First',
  'Student-Centred',
  'Continuous Improvement',
  'Accessibility',
]

const galleryCards = [
  {
    label: 'Class in Progress',
    sub: 'Daily sessions, live and in-person',
    accent: '#d4c5e2',
    Svg: AtomSVG,
    Icon: null,
  },
  {
    label: 'Annual Function',
    sub: 'Celebrating student milestones',
    accent: '#e9deb5',
    Svg: null,
    Icon: IconStar,
  },
  {
    label: 'Study Centre',
    sub: 'The heart of Chemistry@OCTET',
    accent: '#daeae4',
    Svg: BeakerSVG,
    Icon: null,
  },
  {
    label: 'Online Session',
    sub: 'Live classes via Google Meet / Zoom',
    accent: '#c8e0da',
    Svg: null,
    Icon: IconGlobe,
  },
  {
    label: 'Lab Visit',
    sub: 'Chemistry in the real world',
    accent: '#d4c5e2',
    Svg: FlaskSVG,
    Icon: null,
  },
  {
    label: 'Student Achievement',
    sub: 'JEE, NEET & Board toppers',
    accent: '#e9deb5',
    Svg: null,
    Icon: IconStar,
  },
]

// ─── Sections ─────────────────────────────────────────────────────────────────

function AboutHero() {
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
        <div className="absolute top-24 left-[6%]" style={{ opacity: 0.08, transform: 'rotate(-14deg)' }}>
          <TestTubeSVG width={120} height={120} color="#5e4075" />
        </div>
        <div className="absolute bottom-16 right-[5%]" style={{ opacity: 0.08, transform: 'rotate(12deg)' }}>
          <MicroscopeSVG width={130} height={130} color="#8b6fa0" />
        </div>
        <div className="absolute top-[46%] right-[12%]" style={{ opacity: 0.07, transform: 'rotate(-7deg)' }}>
          <AtomSVG width={95} height={95} color="#5e4075" />
        </div>
      </div>

      <div className="relative z-10 max-w-3xl mx-auto">
        {/* Eyebrow */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-[#e9deb5]/60 border border-[#e9deb5] mb-8"
        >
          <span className="w-2 h-2 rounded-full bg-[#5e4075] animate-pulse" />
          <span className="text-[14px] tracking-[0.25em] text-[#8b6fa0] uppercase">Our Institute</span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25 }}
          className="text-5xl md:text-6xl text-[#5e4075] leading-tight mb-6"
        >
          Built on Passion.<br />
          <span className="text-[#8b6fa0] italic">Driven by Purpose.</span>
        </motion.h1>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-base text-[#8b6fa0] max-w-2xl mx-auto mb-12 leading-relaxed"
        >
          Chemistry@OCTET was founded with a single belief — that every student deserves to
          understand chemistry, not just memorise it.
        </motion.p>

        {/* Stat badges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.55 }}
          className="flex items-center justify-center gap-3 flex-wrap"
        >
          {[
            { value: '15+',  label: 'Years of Teaching' },
            { value: '500+', label: 'Students Enrolled'  },
            { value: '2010', label: 'Year Founded'        },
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

function OurStory() {
  return (
    <section id="story" className="py-24 px-6 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">

          {/* Left: Story text */}
          <div>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.5 }}
              className="text-[14px] tracking-[0.25em] text-[#8b6fa0] uppercase mb-3"
            >
              How It Began
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-3xl md:text-4xl text-[#5e4075] leading-tight mb-8"
            >
              A Classroom That Changed Everything
            </motion.h2>

            {[
              `Mr. A. Raju started Chemistry@OCTET in 2010 from a single classroom in Tamil Nadu. Frustrated by how textbooks reduced chemistry to formulas to memorise, he set out to teach it differently — through logic, structure, and genuine curiosity.`,
              `What began as a weekend coaching batch of 12 students grew into one of the most sought-after chemistry institutes in the region. Students who once dreaded the periodic table began to see beauty in molecular structure and elegance in chemical reactions.`,
              `The name "OCTET" is deliberate — chemistry's octet rule describes how atoms achieve stability by completing their outer shell. Chemistry@OCTET exists to help every student reach that same completeness in understanding.`,
            ].map((para, i) => (
              <motion.p
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.5, delay: 0.15 + i * 0.12 }}
                className="text-base text-[#8b6fa0] leading-relaxed mb-5 last:mb-0"
              >
                {para}
              </motion.p>
            ))}
          </div>

          {/* Right: Milestone timeline */}
          <div className="lg:pt-20">
            <motion.p
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.5 }}
              className="text-[14px] tracking-[0.25em] text-[#8b6fa0] uppercase mb-8"
            >
              Our Milestones
            </motion.p>

            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-[38px] top-5 bottom-5 w-px bg-[#d4c5e2] hidden sm:block" />

              <div className="space-y-6">
                {milestones.map((m, i) => (
                  <motion.div
                    key={m.year}
                    initial={{ opacity: 0, x: 24 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true, margin: '-40px' }}
                    transition={{ duration: 0.5, delay: i * 0.12 }}
                    className="flex items-start gap-5"
                  >
                    <span className="flex-shrink-0 px-3 py-1.5 text-[14px] rounded-full bg-[#e9deb5] text-[#5e4075] font-mono z-10">
                      {m.year}
                    </span>
                    <div className="flex-1 pt-1.5 pb-2">
                      <p className="text-[15px] text-[#8b6fa0] leading-relaxed">{m.text}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>

            {/* Decorative SVG */}
            <div className="mt-14" style={{ opacity: 0.1 }}>
              <CompoundSVG width={150} height={150} color="#5e4075" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

function Founder() {
  return (
    <section id="founder" className="py-24 px-6 bg-[#f8f9ed]">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">

          {/* Left: Avatar + credentials */}
          <div className="flex flex-col items-center lg:items-start">
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.5 }}
              className="text-[14px] tracking-[0.25em] text-[#8b6fa0] uppercase mb-10 self-start"
            >
              The Founder
            </motion.p>

            {/* Avatar */}
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="flex flex-col items-center mb-8"
            >
              {/* Dashed outer ring (SVG) */}
              <div className="relative flex items-center justify-center">
                <svg
                  width="260" height="260"
                  viewBox="0 0 260 260"
                  fill="none"
                  className="absolute"
                >
                  <circle
                    cx="130" cy="130" r="126"
                    stroke="#d4c5e2"
                    strokeWidth="1.2"
                    strokeDasharray="5 8"
                  />
                </svg>
                {/* Cream gap ring */}
                <div className="w-[220px] h-[220px] rounded-full border-4 border-[#e9deb5] flex items-center justify-center bg-[#f8f9ed]">
                  {/* Purple avatar circle */}
                  <div
                    className="w-[196px] h-[196px] rounded-full flex items-center justify-center"
                    style={{
                      background: 'radial-gradient(circle at 35% 35%, #7a5498 0%, #5e4075 55%, #3d2652 100%)',
                    }}
                  >
                    <span className="text-6xl font-mono text-white select-none">AR</span>
                  </div>
                </div>
              </div>

              {/* Name + role */}
              <h3 className="text-xl text-[#5e4075] mt-6 mb-1">Mr. A. Raju</h3>
              <p className="text-[15px] text-[#8b6fa0]">Founder &amp; Lead Educator</p>

              {/* Credential badges */}
              <div className="flex flex-wrap justify-center gap-2 mt-5">
                {credentials.map((c) => (
                  <span
                    key={c}
                    className="px-4 py-2 rounded-full bg-white border border-[#d4c5e2]/60 text-[14px] text-[#8b6fa0]"
                  >
                    {c}
                  </span>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Right: Biography + quote */}
          <div className="lg:pt-16">
            <motion.h2
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-3xl md:text-4xl text-[#5e4075] leading-tight mb-8"
            >
              The Man Behind<br />Chemistry@OCTET
            </motion.h2>

            {[
              `Mr. A. Raju holds an M.Sc. in Chemistry and spent his early career teaching at prominent coaching institutes across Tamil Nadu. He observed that the students who excelled were almost always the ones who asked "why" — and that the broader education system rarely made space for that curiosity.`,
              `In 2010, he left institutional teaching to build something from scratch: a place where chemistry was explained, not just delivered. Where a student's confusion was treated as a question worth answering, not a sign of weakness.`,
              `Today, Mr. Raju leads every batch personally. His teaching style — calm, methodical, and deeply conceptual — has become the defining identity of Chemistry@OCTET, and the reason hundreds of students have walked into their exams with genuine confidence.`,
            ].map((para, i) => (
              <motion.p
                key={i}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.5, delay: 0.15 + i * 0.12 }}
                className="text-base text-[#8b6fa0] leading-relaxed mb-5 last:mb-0"
              >
                {para}
              </motion.p>
            ))}

            {/* Quote */}
            <motion.blockquote
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="border-l-4 border-[#e9deb5] pl-6 py-2 mt-10"
            >
              <p className="text-lg text-[#5e4075] leading-relaxed italic mb-3">
                &ldquo;Chemistry is not a collection of facts. It is a language — and I want every
                student to become fluent in it.&rdquo;
              </p>
              <cite className="text-[14px] text-[#8b6fa0] not-italic">
                — Mr. A. Raju, Founder
              </cite>
            </motion.blockquote>
          </div>
        </div>
      </div>
    </section>
  )
}

function VisionMission() {
  return (
    <section id="vision" className="py-24 px-6 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.5 }}
            className="text-[14px] tracking-[0.25em] text-[#8b6fa0] uppercase mb-3"
          >
            Our Purpose
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl md:text-4xl text-[#5e4075] leading-tight"
          >
            What Drives Us Every Day
          </motion.h2>
        </div>

        {/* Vision + Mission cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">

          {/* Vision — dark card */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="relative bg-[#5e4075] rounded-2xl p-10 overflow-hidden"
          >
            {/* Decorative SVG */}
            <div className="absolute top-4 right-4" style={{ opacity: 0.15 }}>
              <AtomSVG width={110} height={110} color="#ffffff" />
            </div>
            <div className="relative z-10">
              <p className="text-[14px] tracking-[0.2em] uppercase mb-5" style={{ color: 'rgba(233,222,181,0.75)' }}>
                Vision
              </p>
              <h3 className="text-2xl text-white leading-snug mb-5">
                A Tamil Nadu Where No Student Fears Chemistry.
              </h3>
              <p className="text-[15px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>
                We envision a future where every 11th and 12th grade student walks into their
                exam hall with confidence — not because they crammed harder, but because they
                understood deeper.
              </p>
            </div>
          </motion.div>

          {/* Mission — light card */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative bg-[#e9deb5]/40 border border-[#e9deb5] rounded-2xl p-10 overflow-hidden"
          >
            <div className="absolute top-4 right-4" style={{ opacity: 0.12 }}>
              <FlaskSVG width={110} height={110} color="#5e4075" />
            </div>
            <div className="relative z-10">
              <p className="text-[14px] tracking-[0.2em] text-[#8b6fa0] uppercase mb-5">
                Mission
              </p>
              <h3 className="text-2xl text-[#5e4075] leading-snug mb-5">
                Conceptual Chemistry for Every Student.
              </h3>
              <p className="text-[15px] text-[#8b6fa0] leading-relaxed">
                To make chemistry education accessible, engaging, and genuinely effective — for JEE,
                NEET, CBSE, and TN Board students — through patient teaching, structured resources,
                and a commitment to understanding over memorisation.
              </p>
            </div>
          </motion.div>
        </div>

        {/* Core values */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex items-center justify-center gap-3 flex-wrap"
        >
          <span className="text-[14px] text-[#8b6fa0] mr-2">Core Values:</span>
          {values.map((v) => (
            <span
              key={v}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#f8f9ed] border border-[#d4c5e2]/60 text-[14px] text-[#8b6fa0]"
            >
              <IconCheck className="w-3.5 h-3.5 text-[#5e4075]" />
              {v}
            </span>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

function Gallery() {
  return (
    <section id="gallery" className="py-24 px-6 bg-[#f8f9ed]">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.5 }}
            className="text-[14px] tracking-[0.25em] text-[#8b6fa0] uppercase mb-3"
          >
            Life at OCTET
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl md:text-4xl text-[#5e4075] leading-tight mb-5"
          >
            Moments from Our Classrooms
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-[14px] text-[#8b6fa0] italic"
          >
            Photos coming soon — this space will showcase real moments from our classes, events, and student milestones.
          </motion.p>
        </div>

        {/* Gallery grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {galleryCards.map((card, i) => (
            <motion.div
              key={card.label}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.45, delay: i * 0.08 }}
              className="relative rounded-2xl overflow-hidden min-h-[200px] flex flex-col items-center justify-center"
              style={{ backgroundColor: card.accent }}
            >
              {/* Background SVG / icon */}
              <div style={{ opacity: 0.22 }} className="absolute inset-0 flex items-center justify-center">
                {card.Svg ? (
                  <card.Svg width={90} height={90} color="#5e4075" />
                ) : card.Icon ? (
                  <card.Icon className="w-20 h-20 text-[#5e4075]" />
                ) : null}
              </div>

              {/* Label overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-[#5e4075]/25 to-transparent">
                <p className="text-[14px] text-[#5e4075]">{card.label}</p>
                <p className="text-[14px] text-[#8b6fa0]/80 italic">{card.sub}</p>
              </div>

              {/* "Photo coming soon" badge */}
              <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-white/50 backdrop-blur-sm">
                <span className="text-[14px] text-[#8b6fa0]">Coming soon</span>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="text-center text-[14px] text-[#8b6fa0] italic mt-10"
        >
          Real photographs will be added as the gallery grows.
        </motion.p>
      </div>
    </section>
  )
}

function AboutCTA() {
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
          <div className="absolute top-4 right-4" style={{ opacity: 0.13 }}>
            <AtomSVG width={110} height={110} color="#5e4075" />
          </div>
          <div className="absolute bottom-4 left-4" style={{ opacity: 0.1 }}>
            <TestTubeSVG width={90} height={90} color="#8b6fa0" />
          </div>

          <div className="relative z-10">
            <p className="text-[14px] tracking-[0.25em] text-[#8b6fa0] uppercase mb-4">Join Our Story</p>
            <h2 className="text-3xl md:text-4xl text-[#5e4075] leading-tight mb-4">
              Become Part of Chemistry@OCTET
            </h2>
            <p className="text-base text-[#8b6fa0] mb-10 max-w-md mx-auto">
              The same passion that built this institute is poured into every class, every note, and every session.
            </p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Link
                href="/register"
                className="px-8 py-3.5 bg-[#5e4075] text-white text-base rounded-xl hover:bg-[#3d2652] hover:-translate-y-0.5 transition-all duration-200 shadow-[0_4px_20px_rgba(94,64,117,0.3)] hover:shadow-[0_6px_28px_rgba(94,64,117,0.4)]"
              >
                Enroll Now
              </Link>
              <Link
                href="/learn"
                className="px-8 py-3 border border-[#5e4075]/30 text-[#5e4075] text-base rounded-xl hover:bg-[#e9deb5]/40 transition-all duration-200"
              >
                How We Teach
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AboutPage() {
  return (
    <main className="bg-[#f8f9ed] min-h-screen">
      <Navbar />
      <AboutHero />
      <OurStory />
      <Founder />
      <VisionMission />
      <Gallery />
      <AboutCTA />
      <Footer />
    </main>
  )
}
