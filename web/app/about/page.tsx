'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import Navbar from '@/components/landing/Navbar'
import Footer from '@/components/landing/Footer'
import { IconCheck, IconStar, IconGlobe, IconBook } from '@/components/ui/SvgIcons'
import {
  AtomSVG,
  FlaskSVG,
  BeakerSVG,
  TestTubeSVG,
  MicroscopeSVG,
  CompoundSVG,
} from '@/components/ui/PencilSVGs'

// ─── Local line-art icons (match the PencilSVGs / SvgIcons stroke style) ───────

type LineIconProps = { className?: string }
const I = (className = 'w-5 h-5') => ({
  className,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
})

function IconSeedling({ className }: LineIconProps) {
  return (
    <svg {...I(className)}>
      <path d="M12 21 L12 10" />
      <path d="M12 13 C 8 13, 5 10, 5 6 C 9 6, 12 9, 12 13 Z" />
      <path d="M12 11 C 16 11, 19 8, 19 5 C 15 5, 12 8, 12 11 Z" />
      <path d="M7 21 L17 21" />
    </svg>
  )
}

function IconSugarcane({ className }: LineIconProps) {
  return (
    <svg {...I(className)}>
      <path d="M9 21 L9 5" />
      <path d="M9 9 l-2.4 0 M9 13 l-2.4 0 M9 17 l-2.4 0" />
      <path d="M14.5 21 L14.5 7" />
      <path d="M14.5 11 l2.4 0 M14.5 15 l2.4 0 M14.5 19 l2.4 0" />
      <path d="M9 5 C 11 3, 13.5 3, 15 4.5" />
    </svg>
  )
}

function IconCoconut({ className }: LineIconProps) {
  return (
    <svg {...I(className)}>
      <path d="M11.5 21 C 11.5 15, 12 11, 13 8.5" />
      <path d="M13 8 C 9 6, 6 6.5, 4 8.5" />
      <path d="M13 8 C 11 4.5, 9 3.5, 6 3.5" />
      <path d="M13 8 C 16.5 5.5, 19.5 5.5, 21 7.5" />
      <path d="M13 8 C 14.5 4.5, 16.5 3.5, 19.5 4.5" />
      <circle cx="11.6" cy="9.6" r="1" />
      <circle cx="14.2" cy="9.6" r="1" />
      <path d="M8 21 L16 21" />
    </svg>
  )
}

function IconTeak({ className }: LineIconProps) {
  return (
    <svg {...I(className)}>
      <path d="M12 21 L12 13" />
      <path d="M12 13 C 7 13, 5 10, 6 7 C 7 4.5, 10 3, 12 4 C 14 3, 17 4.5, 18 7 C 19 10, 17 13, 12 13 Z" />
      <path d="M9 21 L15 21" />
    </svg>
  )
}

function IconShield({ className }: LineIconProps) {
  return (
    <svg {...I(className)}>
      <path d="M12 3 L19 6 L19 11 C 19 16, 15 19, 12 21 C 9 19, 5 16, 5 11 L5 6 Z" />
      <path d="M9 11.5 l2 2 l4 -4.5" />
    </svg>
  )
}

function IconGradCap({ className }: LineIconProps) {
  return (
    <svg {...I(className)}>
      <path d="M2 9 L12 5 L22 9 L12 13 Z" />
      <path d="M6 10.8 L6 16 C 6 17.2, 18 17.2, 18 16 L18 10.8" />
      <path d="M22 9 L22 14" />
      <circle cx="22" cy="15" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  )
}

function IconTemple({ className }: LineIconProps) {
  return (
    <svg {...I(className)}>
      <path d="M3 21 L21 21" />
      <path d="M12 3 L20 9 L4 9 Z" />
      <path d="M6 9 L6 20 M10 9 L10 20 M14 9 L14 20 M18 9 L18 20" />
      <path d="M4 20 L20 20" />
    </svg>
  )
}

function IconVase({ className }: LineIconProps) {
  return (
    <svg {...I(className)}>
      <path d="M9 4 L15 4" />
      <path d="M9.5 4 C 7 8, 6 11, 8 14 C 9.5 16, 9.5 18, 8.5 20 L15.5 20 C 14.5 18, 14.5 16, 16 14 C 18 11, 17 8, 14.5 4" />
      <path d="M8.5 11 C 11 12.5, 13 12.5, 15.5 11" />
    </svg>
  )
}

function IconFlame({ className }: LineIconProps) {
  return (
    <svg {...I(className)}>
      <path d="M13 2.5 C 13.5 6.5, 17.5 8.5, 16.5 13.5 C 16 18, 13.5 20.5, 12 20.5 C 10.5 20.5, 7.5 18, 7.5 13.5 C 7.5 10.5, 9.5 9, 10.5 7 C 11.5 9.5, 13 8.5, 13 2.5 Z" />
      <path d="M12 13 C 13 14.5, 13 16.5, 12 17.5 C 11 16.5, 11 14.5, 12 13 Z" />
    </svg>
  )
}

// ─── Data ────────────────────────────────────────────────────────────────────

const milestones = [
  { year: 'Loyola', text: 'B.Sc & M.Sc in Chemistry at Loyola College, Chennai; degree in Education (B.Ed) from MKU, Madurai.' },
  { year: 'Sherwood', text: 'PG Teacher of Chemistry at Sherwood Hall Senior Secondary School, Chetpet, Chennai for over a decade.' },
  { year: 'Balavidya', text: 'A year as PG Teacher in Chemistry at Balavidya Mandir Senior Secondary School, Adyar, Chennai.' },
  { year: 'TN Govt', text: 'Two decades of Tamil Nadu Government service as a PG Teacher — over three decades of teaching in all.' },
  { year: 'OCTET', text: 'Founded Chemistry@OCTET to spread true science with comfortable, fear-free, error-free learning.' },
]

const credentials = ['M.Sc. Chemistry — Loyola', '30+ Years Teaching', 'Best Teacher Award']

const values = [
  'Error-Free',
  'Fear-Free',
  'Conceptual',
  'Accessible',
]

// "To Parents" — the investment ladder
const investmentLadder: {
  span: string
  asset: string
  Icon: (p: LineIconProps) => React.ReactElement
  accent: string
  highlight?: boolean
}[] = [
  { span: '6 Months',    asset: 'Paddy',          Icon: IconSeedling,  accent: '#e9deb5' },
  { span: '1 Year',      asset: 'Sugarcane',      Icon: IconSugarcane, accent: '#daeae4' },
  { span: 'A Decade',    asset: 'Coconut',        Icon: IconCoconut,   accent: '#d4c5e2' },
  { span: '25 Years',    asset: 'Teak',           Icon: IconTeak,      accent: '#c8e0da' },
  { span: 'A Lifetime',  asset: 'Insurance',      Icon: IconShield,    accent: '#f0e8f8' },
  { span: 'Generations', asset: 'TRUE EDUCATION', Icon: IconGradCap,   accent: '#5e4075', highlight: true },
]

// "To Students"
const studentNotes: {
  Icon: (p: LineIconProps) => React.ReactElement
  title: string
  text: string
  accent: string
  wide?: boolean
}[] = [
  {
    Icon: IconTemple,
    title: 'An Adorable Place',
    text: 'OCTET Institute is an adorable place — give it the respect you would a temple, a church, or a mosque.',
    accent: '#e9deb5',
  },
  {
    Icon: IconVase,
    title: 'Respect Your Teacher',
    text: 'Your teacher is the sculptor carving you to fit society — the potter who moulds your life.',
    accent: '#d4c5e2',
  },
  {
    Icon: IconBook,
    title: 'Respect the Book',
    text: 'The book in your hand is the hard work of scientists across the world. Add your contribution if you can, and carefully hand it to future generations.',
    accent: '#daeae4',
  },
  {
    Icon: IconFlame,
    title: 'Education Is Fire',
    text: 'Playing with education is like playing with FIRE.',
    accent: '#c8e0da',
  },
  {
    Icon: IconGlobe,
    title: 'An Unseen Responsibility',
    text: "There is an unseen burden on your shoulders today, because your future generations' lives depend on your present education. Those who have ears, hear.",
    accent: '#f0e8f8',
    wide: true,
  },
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
    sub: 'Our CBSE chemistry board toppers',
    accent: '#e9deb5',
    Svg: null,
    Icon: IconStar,
  },
]

// ─── Sections ─────────────────────────────────────────────────────────────────

function AboutHero() {
  return (
    <section className="relative flex flex-col items-center justify-center bg-bg overflow-hidden pt-40 pb-28 px-6 text-center">
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
          className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-accent1/60 border border-accent1 mb-8"
        >
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-[14px] tracking-[0.25em] text-muted uppercase">Our Institute</span>
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25 }}
          className="text-5xl md:text-6xl text-primary leading-tight mb-6"
        >
          Built on Passion.<br />
          <span className="text-muted italic">Driven by Purpose.</span>
        </motion.h1>

        {/* Description */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-base text-muted max-w-2xl mx-auto mb-12 leading-relaxed"
        >
          Chemistry@OCTET takes its name from the octet rule — the stability an atom gains by
          completing its outer shell. We exist to give students that same completeness in chemistry.
        </motion.p>

        {/* Stat badges */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.55 }}
          className="flex items-center justify-center gap-3 flex-wrap"
        >
          {[
            { value: '30+',     label: 'Years of Teaching' },
            { value: 'XI & XII', label: 'CBSE Chemistry'    },
            { value: '100%',    label: 'English Medium'      },
          ].map((s) => (
            <div key={s.label} className="px-5 py-2.5 rounded-full bg-white border border-accent3/60 flex items-center gap-2.5">
              <span className="text-xl font-mono text-primary">{s.value}</span>
              <span className="text-[14px] text-muted">{s.label}</span>
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
              className="text-[14px] tracking-[0.25em] text-muted uppercase mb-3"
            >
              About OCTET
            </motion.p>
            <motion.h2
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-3xl md:text-4xl text-primary leading-tight mb-8"
            >
              Stability, Completeness, Satisfaction
            </motion.h2>

            {[
              `The name OCTET comes from the octet rule in chemistry — atoms combine to attain an octet of electrons in their valence shell, and once they do, they reach stability. OCTET stands for that same stability, completeness, fulfilment, and satisfaction.`,
              `OCTET Institute is a comfortable, interest-driven, fear-free and error-free zone to learn chemistry. Our tagline is "Spread True Science" — so every teaching-learning material is screened, verified, authenticated, and proof-read before it is uploaded. Students may ask doubts during class and after class hours, round the clock; clearing small doubts then and there, throughout the day, is how you truly get into the subject.`,
              `OCTET Institute is designed for CBSE 11th and 12th grade students all over the world — comfortable, enjoyable chemistry learning and board-exam training. We teach only in English medium with English-medium materials, focus only on chemistry, and will extend to NEET chemistry coaching within a year.`,
            ].map((para, i) => (
              <motion.p
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.5, delay: 0.15 + i * 0.12 }}
                className="text-base text-muted leading-relaxed mb-5 last:mb-0"
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
              className="text-[14px] tracking-[0.25em] text-muted uppercase mb-8"
            >
              Three Decades of Teaching
            </motion.p>

            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-9.5 top-5 bottom-5 w-px bg-accent3 hidden sm:block" />

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
                    <span className="shrink-0 px-3 py-1.5 text-[14px] rounded-full bg-accent1 text-primary font-mono z-10">
                      {m.year}
                    </span>
                    <div className="flex-1 pt-1.5 pb-2">
                      <p className="text-[15px] text-muted leading-relaxed">{m.text}</p>
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
    <section id="founder" className="py-24 px-6 bg-bg">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">

          {/* Left: Avatar + credentials */}
          <div className="flex flex-col items-center lg:items-start">
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.5 }}
              className="text-[14px] tracking-[0.25em] text-muted uppercase mb-10 self-start"
            >
              Director cum Instructor
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
                <div className="w-55 h-55 rounded-full border-4 border-accent1 flex items-center justify-center bg-bg">
                  {/* Purple avatar circle */}
                  <div
                    className="w-49 h-49 rounded-full flex items-center justify-center"
                    style={{
                      background: 'radial-gradient(circle at 35% 35%, #7a5498 0%, #5e4075 55%, #3d2652 100%)',
                    }}
                  >
                    <span className="text-6xl font-mono text-white select-none">AR</span>
                  </div>
                </div>
              </div>

              {/* Name + role */}
              <h3 className="text-xl text-primary mt-6 mb-1">Raju A</h3>
              <p className="text-[15px] text-muted">Director cum Instructor</p>

              {/* Credential badges */}
              <div className="flex flex-wrap justify-center gap-2 mt-5">
                {credentials.map((c) => (
                  <span
                    key={c}
                    className="px-4 py-2 rounded-full bg-white border border-accent3/60 text-[14px] text-muted"
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
              className="text-3xl md:text-4xl text-primary leading-tight mb-8"
            >
              The Man Behind<br />Chemistry@OCTET
            </motion.h2>

            {[
              `Raju A is the Director and Teacher of OCTET. He completed his B.Sc and M.Sc in Chemistry at Loyola College, Chennai, and then earned his degree in Education (B.Ed) from MKU, Madurai.`,
              `Soon after, he joined as a PG Teacher at Sherwood Hall Senior Secondary School, Chetpet, Chennai — under then-principal Mrs. Olga Frolich — for more than a decade. As he puts it, "Loyola College made me a chemist, but Sherwood Hall moulded me into the best chemist." He then taught for a year at Balavidya Mandir Senior Secondary School, Adyar, Chennai.`,
              `This was followed by two decades of Tamil Nadu Government service as a PG Teacher — over three decades of teaching in all. During his service, he received the Best Teacher award from the Chennai Collector.`,
            ].map((para, i) => (
              <motion.p
                key={i}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.5, delay: 0.15 + i * 0.12 }}
                className="text-base text-muted leading-relaxed mb-5 last:mb-0"
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
              className="border-l-4 border-accent1 pl-6 py-2 mt-10"
            >
              <p className="text-lg text-primary leading-relaxed italic mb-3">
                &ldquo;My aim is simple — to spread true science, and to make chemistry a fear-free,
                error-free joy for every student.&rdquo;
              </p>
              <cite className="text-[14px] text-muted not-italic">
                — Raju A, Director cum Instructor
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
            className="text-[14px] tracking-[0.25em] text-muted uppercase mb-3"
          >
            Our Purpose
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl md:text-4xl text-primary leading-tight"
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
            className="relative bg-primary rounded-2xl p-10 overflow-hidden"
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
                A World Where No Student Fears Chemistry.
              </h3>
              <p className="text-[15px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.65)' }}>
                We envision every 11th and 12th grade student, anywhere in the world, walking into
                their exam hall with confidence — not because they crammed harder, but because they
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
            className="relative bg-accent1/40 border border-accent1 rounded-2xl p-10 overflow-hidden"
          >
            <div className="absolute top-4 right-4" style={{ opacity: 0.12 }}>
              <FlaskSVG width={110} height={110} color="#5e4075" />
            </div>
            <div className="relative z-10">
              <p className="text-[14px] tracking-[0.2em] text-muted uppercase mb-5">
                Mission
              </p>
              <h3 className="text-2xl text-primary leading-snug mb-5">
                Conceptual Chemistry for Every Student.
              </h3>
              <p className="text-[15px] text-muted leading-relaxed">
                To give CBSE 11th and 12th students worldwide a comfortable, fear-free, error-free
                way to master chemistry — through verified materials, English-medium teaching,
                round-the-clock doubt support, and a commitment to spreading true science. NEET
                chemistry coaching is coming soon.
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
          <span className="text-[14px] text-muted mr-2">Core Values:</span>
          {values.map((v) => (
            <span
              key={v}
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-bg border border-accent3/60 text-[14px] text-muted"
            >
              <IconCheck className="w-3.5 h-3.5 text-primary" />
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
    <section id="gallery" className="py-24 px-6 bg-bg">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.5 }}
            className="text-[14px] tracking-[0.25em] text-muted uppercase mb-3"
          >
            Life at OCTET
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl md:text-4xl text-primary leading-tight mb-5"
          >
            Moments from Our Classrooms
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-[14px] text-muted italic"
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
              className="relative rounded-2xl overflow-hidden min-h-50 flex flex-col items-center justify-center"
              style={{ backgroundColor: card.accent }}
            >
              {/* Background SVG / icon */}
              <div style={{ opacity: 0.22 }} className="absolute inset-0 flex items-center justify-center">
                {card.Svg ? (
                  <card.Svg width={90} height={90} color="#5e4075" />
                ) : card.Icon ? (
                  <card.Icon className="w-20 h-20 text-primary" />
                ) : null}
              </div>

              {/* Label overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-linear-to-t from-primary/25 to-transparent">
                <p className="text-[14px] text-primary">{card.label}</p>
                <p className="text-[14px] text-muted/80 italic">{card.sub}</p>
              </div>

              {/* "Photo coming soon" badge */}
              <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-white/50 backdrop-blur-sm">
                <span className="text-[14px] text-muted">Coming soon</span>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="text-center text-[14px] text-muted italic mt-10"
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
          className="relative bg-accent1/30 border border-accent1 rounded-3xl p-16 max-w-3xl mx-auto text-center overflow-hidden"
        >
          <div className="absolute top-4 right-4" style={{ opacity: 0.13 }}>
            <AtomSVG width={110} height={110} color="#5e4075" />
          </div>
          <div className="absolute bottom-4 left-4" style={{ opacity: 0.1 }}>
            <TestTubeSVG width={90} height={90} color="#8b6fa0" />
          </div>

          <div className="relative z-10">
            <p className="text-[14px] tracking-[0.25em] text-muted uppercase mb-4">Join Our Story</p>
            <h2 className="text-3xl md:text-4xl text-primary leading-tight mb-4">
              Become Part of Chemistry@OCTET
            </h2>
            <p className="text-base text-muted mb-10 max-w-md mx-auto">
              The same passion that built this institute is poured into every class, every note, and every session.
            </p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <Link
                href="/register"
                className="px-8 py-3.5 bg-primary text-white text-base rounded-xl hover:bg-[#3d2652] hover:-translate-y-0.5 transition-all duration-200 shadow-[0_4px_20px_rgba(94,64,117,0.3)] hover:shadow-[0_6px_28px_rgba(94,64,117,0.4)]"
              >
                Enroll Now
              </Link>
              <Link
                href="/learn"
                className="px-8 py-3 border border-primary/30 text-primary text-base rounded-xl hover:bg-accent1/40 transition-all duration-200"
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

function ToParents() {
  return (
    <section id="parents" className="relative py-24 px-6 bg-white overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <svg className="absolute -top-10 -left-10" style={{ opacity: 0.05 }} width="240" height="240" viewBox="0 0 240 240" fill="none">
          <circle cx="120" cy="120" r="110" stroke="#5e4075" strokeWidth="1" strokeDasharray="4 9" />
          <circle cx="120" cy="120" r="78" stroke="#8b6fa0" strokeWidth="0.8" strokeDasharray="3 10" />
        </svg>
        <div className="absolute top-12 right-[5%]" style={{ opacity: 0.07, transform: 'rotate(12deg)' }}>
          <CompoundSVG width={150} height={120} color="#5e4075" />
        </div>
        <div className="absolute bottom-10 left-[6%]" style={{ opacity: 0.06, transform: 'rotate(-10deg)' }}>
          <AtomSVG width={120} height={120} color="#8b6fa0" />
        </div>
      </div>

      <div className="relative z-10 max-w-5xl mx-auto">
        <div className="text-center mb-10 max-w-3xl mx-auto">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.5 }}
            className="text-[14px] tracking-[0.25em] text-muted uppercase mb-3"
          >
            To Parents
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl md:text-5xl text-primary leading-tight"
          >
            Planning Ahead for Your Children
          </motion.h2>
        </div>

        <div className="max-w-3xl mx-auto">
          {[
            `It is every parent's duty to give a good education. Education is for transformation — physical, mental, and emotional. Not admitting a child to every available course simply because the neighbours are doing so.`,
            `Children are not mark-scoring machines; they have feelings, likes, and dislikes. Identify their talents and train them according to their own will and interest. Planning ahead for your children is very, very important.`,
          ].map((para, i) => (
            <motion.p
              key={i}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.5, delay: 0.15 + i * 0.12 }}
              className="text-lg text-muted leading-relaxed mb-5"
            >
              {para}
            </motion.p>
          ))}
        </div>

        {/* Investment ladder — icon card grid */}
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.5 }}
          className="text-center text-[15px] tracking-[0.15em] text-muted uppercase mt-12 mb-7"
        >
          The further you plan, the wiser the investment
        </motion.p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {investmentLadder.map(({ span, asset, Icon, accent, highlight }, i) => (
            <motion.div
              key={span}
              initial={{ opacity: 0, y: 24, scale: 0.96 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.45, delay: i * 0.07 }}
              className={`rounded-2xl p-7 flex flex-col gap-5 transition-transform duration-200 hover:-translate-y-1 ${
                highlight
                  ? 'bg-primary shadow-[0_10px_36px_rgba(94,64,117,0.3)]'
                  : 'bg-white border border-accent3/50 shadow-[0_2px_16px_rgba(94,64,117,0.05)]'
              }`}
            >
              <div
                className="w-16 h-16 rounded-2xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: highlight ? 'rgba(255,255,255,0.14)' : accent }}
              >
                <Icon className={`w-9 h-9 ${highlight ? 'text-white' : 'text-primary'}`} />
              </div>
              <div>
                <p
                  className={`text-[13px] tracking-[0.2em] uppercase font-mono mb-2 ${
                    highlight ? 'text-accent1' : 'text-muted'
                  }`}
                >
                  If you plan for {span}
                </p>
                <p className={`text-2xl leading-tight ${highlight ? 'text-white' : 'text-primary'}`}>
                  {highlight && <span className="mr-1.5">★</span>}
                  Invest on {asset}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Closing lines */}
        <div className="max-w-3xl mx-auto">
          <motion.blockquote
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="border-l-4 border-accent1 pl-6 py-2 mt-14"
          >
            <p className="text-xl md:text-2xl text-primary leading-relaxed italic">
              &ldquo;Who gives true education is a question. Finding out is the greatest task — it is
              like searching for truth in a sea of errors, where the truth has sunk.&rdquo;
            </p>
          </motion.blockquote>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="text-lg text-muted leading-relaxed mt-8"
          >
            Encourage your children when they improve even a little, and give a small gift — it makes
            them realise that their parents are watching, caring, and looking after them. They learn
            the meaning of appreciation, of being with family, and of being truthful to their parents.
          </motion.p>
        </div>
      </div>
    </section>
  )
}

function ToStudents() {
  return (
    <section id="students" className="relative py-24 px-6 bg-bg overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <svg className="absolute top-10 right-[-4%]" style={{ opacity: 0.05 }} width="220" height="220" viewBox="0 0 220 220" fill="none">
          <circle cx="110" cy="110" r="100" stroke="#5e4075" strokeWidth="1" strokeDasharray="5 9" />
        </svg>
        <div className="absolute bottom-24 left-[4%]" style={{ opacity: 0.06, transform: 'rotate(-8deg)' }}>
          <BeakerSVG width={120} height={140} color="#5e4075" />
        </div>
        <div className="absolute top-20 left-[40%]" style={{ opacity: 0.05, transform: 'rotate(10deg)' }}>
          <TestTubeSVG width={90} height={150} color="#8b6fa0" />
        </div>
      </div>

      <div className="relative z-10 max-w-5xl mx-auto">
        <div className="text-center mb-12 max-w-3xl mx-auto">
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.5 }}
            className="text-[14px] tracking-[0.25em] text-muted uppercase mb-3"
          >
            To Students
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-40px' }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl md:text-5xl text-primary leading-tight"
          >
            Respect the Place, the Teacher, the Book
          </motion.h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {studentNotes.map(({ Icon, title, text, accent, wide }, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.45, delay: i * 0.07 }}
              className={`flex gap-5 items-start bg-white border border-accent3/50 rounded-2xl p-7 shadow-[0_2px_16px_rgba(94,64,117,0.05)] transition-transform duration-200 hover:-translate-y-1 ${
                wide ? 'sm:col-span-2' : ''
              }`}
            >
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: accent }}
              >
                <Icon className="w-8 h-8 text-primary" />
              </div>
              <div>
                <h3 className="text-xl text-primary mb-2 leading-snug">{title}</h3>
                <p className="text-base text-muted leading-relaxed">{text}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="relative bg-primary rounded-3xl p-12 mt-6 text-center overflow-hidden"
        >
          <div className="absolute top-4 right-4" style={{ opacity: 0.15 }}>
            <AtomSVG width={130} height={130} color="#ffffff" />
          </div>
          <div className="absolute bottom-2 left-4" style={{ opacity: 0.1 }}>
            <IconGradCap className="w-24 h-24 text-white" />
          </div>
          <p className="relative z-10 text-2xl md:text-3xl text-white leading-snug max-w-2xl mx-auto">
            If you are not studying at OCTET, you are missing something in your life.
          </p>
        </motion.div>
      </div>
    </section>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AboutPage() {
  return (
    <main className="bg-bg min-h-screen">
      <Navbar />
      <AboutHero />
      <OurStory />
      <Founder />
      <ToParents />
      <ToStudents />
      <VisionMission />
      <Gallery />
      <AboutCTA />
      <Footer />
    </main>
  )
}
