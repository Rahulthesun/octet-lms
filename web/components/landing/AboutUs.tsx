'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import SectionDecor from '@/components/landing/SectionDecor'
import { AtomSVG, FlaskSVG, TestTubeSVG, MicroscopeSVG, CompoundSVG, BeakerSVG } from '@/components/ui/PencilSVGs'

type SVGComponent = React.ComponentType<{ width?: number; height?: number; color?: string }>

const whyPoints: { Icon: SVGComponent; title: string; desc: string; pastel: string }[] = [
  {
    Icon: AtomSVG,
    title: 'Error-Free, Verified Materials',
    desc: 'Every material is screened, authenticated and proof-read before it is uploaded — true science, spread without errors.',
    pastel: '#e9deb5',
  },
  {
    Icon: MicroscopeSVG,
    title: 'Round-the-Clock Doubt Clearing',
    desc: 'Ask doubts during class, after class, or anytime through the day — clearing them then and there is how you get into the subject.',
    pastel: '#daeae4',
  },
  {
    Icon: CompoundSVG,
    title: 'Topic-Wise Quick Access',
    desc: 'Only half an hour? Search a single topic — electrolysis, fuel cells, batteries — and revise exactly what you need.',
    pastel: '#d4c5e2',
  },
  {
    Icon: FlaskSVG,
    title: 'PDFs, Tests & Video Classes',
    desc: 'Chapter PDFs, quick-revision notes, question papers with key, practice sets, and video classes — all in one place.',
    pastel: '#c8e0da',
  },
  {
    Icon: TestTubeSVG,
    title: 'Progress Reports & Parents’ Meet',
    desc: 'Periodic tests with clear bar-diagram reports, followed by a parents’ meet on the first Sunday of every month.',
    pastel: '#e9deb5',
  },
  {
    Icon: BeakerSVG,
    title: 'Focused Only on Chemistry',
    desc: 'CBSE 11th & 12th chemistry for students worldwide, in English medium and geared for the board exams — with NEET chemistry coaching coming soon.',
    pastel: '#daeae4',
  },
]

export default function AboutUs() {
  return (
    <section id="about" className="relative pt-14 pb-24 px-6 overflow-hidden section-fx" style={{ backgroundColor: '#e7dff0' }}>
      <SectionDecor variant={0} />
      <div className="relative z-10 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <p className="text-[14px] tracking-[0.25em] text-muted uppercase mb-3">Why Choose Us</p>
          <h2 className="text-3xl md:text-4xl text-primary leading-tight">
            The Reason Parents Choose Chemistry<span className="text-muted">@</span>OCTET
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {whyPoints.map((point, i) => (
            <motion.div
              key={point.title}
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.5, delay: 0.06 * i }}
              className="group relative bg-white rounded-2xl p-7 border border-accent3/50 shadow-[0_2px_16px_rgba(94,64,117,0.05)] hover:shadow-[0_12px_36px_rgba(94,64,117,0.14)] hover:-translate-y-1.5 transition-all duration-300 overflow-hidden"
            >
              <div
                className="absolute top-0 right-0 w-24 h-24 rounded-bl-[2.5rem] opacity-45 pointer-events-none transition-transform duration-300 group-hover:scale-110"
                style={{ backgroundColor: point.pastel }}
              />
              <div
                className="relative w-14 h-14 rounded-2xl mb-5 flex items-center justify-center"
                style={{ backgroundColor: point.pastel }}
              >
                <point.Icon width={34} height={34} color="#5e4075" />
              </div>
              <h3 className="relative text-primary text-lg mb-2">{point.title}</h3>
              <p className="relative text-muted text-base leading-relaxed">{point.desc}</p>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="mt-14 text-center"
        >
          <Link
            href="/register"
            className="inline-flex items-center gap-2.5 px-8 py-4 bg-primary text-white text-base rounded-xl hover:bg-[#3d2652] transition-all duration-200 shadow-[0_4px_16px_rgba(94,64,117,0.25)] hover:-translate-y-0.5"
          >
            Enroll Today
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
              <path d="M 3,8 L 13,8 M 9,4 L 13,8 L 9,12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
