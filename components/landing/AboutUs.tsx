'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { AtomSVG, FlaskSVG, TestTubeSVG, MicroscopeSVG, CompoundSVG, BeakerSVG } from '@/components/ui/PencilSVGs'

type SVGComponent = React.ComponentType<{ width?: number; height?: number; color?: string }>

const whyPoints: { Icon: SVGComponent; title: string; desc: string }[] = [
  {
    Icon: AtomSVG,
    title: 'Concepts Over Memorisation',
    desc: 'We build deep understanding first. Memorisation follows naturally when you truly understand why reactions happen.',
  },
  {
    Icon: MicroscopeSVG,
    title: 'Track Every Step of Progress',
    desc: 'Parents get full visibility — attendance, test scores, topic completion — all in real time. No surprises before exams.',
  },
  {
    Icon: CompoundSVG,
    title: 'JEE + NEET + Board — One Place',
    desc: 'A single, well-structured curriculum that prepares students for board exams, JEE, and NEET simultaneously.',
  },
  {
    Icon: FlaskSVG,
    title: 'Handcrafted Study Materials',
    desc: 'Every note, formula sheet, and cheat sheet is crafted to make the hardest concepts immediately understandable.',
  },
  {
    Icon: TestTubeSVG,
    title: 'Proven Results, Real Students',
    desc: 'Our students consistently score 85%+ in boards and clear JEE/NEET with chemistry as their highest-scoring subject.',
  },
  {
    Icon: BeakerSVG,
    title: 'Both Online & Offline Classes',
    desc: "Flexible learning modes that fit every family's schedule. All classes are recorded and available forever.",
  },
]

const svgPositions = [
  { top: '0%',  left: '3%',  Component: AtomSVG,       color: '#5e4075', size: 160, rotate: -14 },
  { top: '3%',  left: '54%', Component: FlaskSVG,      color: '#8b6fa0', size: 145, rotate: 18  },
  { top: '28%', left: '0%',  Component: CompoundSVG,   color: '#5e4075', size: 170, rotate: -7  },
  { top: '32%', left: '56%', Component: TestTubeSVG,   color: '#8b6fa0', size: 135, rotate: 14  },
  { top: '55%', left: '4%',  Component: BeakerSVG,     color: '#5e4075', size: 155, rotate: 6   },
  { top: '54%', left: '50%', Component: MicroscopeSVG, color: '#8b6fa0', size: 155, rotate: -11 },
  { top: '78%', left: '22%', Component: FlaskSVG,      color: '#8b6fa0', size: 130, rotate: -6  },
  { top: '74%', left: '66%', Component: AtomSVG,       color: '#5e4075', size: 120, rotate: 22  },
]

export default function AboutUs() {
  return (
    <section id="about" className="py-24 px-6 overflow-hidden bg-[#f8f9ed]">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <p className="text-[14px] tracking-[0.25em] text-[#8b6fa0] uppercase mb-3">Why Choose Us</p>
          <h2 className="text-3xl md:text-4xl text-[#5e4075] leading-tight">
            The Reason Parents Choose
            <br />
            Chemistry<span className="text-[#8b6fa0]">@</span>OCTET
          </h2>
        </motion.div>

        <div className="flex flex-col lg:flex-row gap-16 items-center">
          {/* Left — Chemistry SVG illustrations */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.8, delay: 0.1 }}
            className="w-full lg:w-1/2 relative h-[500px] lg:h-[620px]"
          >
            {svgPositions.map(({ top, left, Component, color, size, rotate }, i) => (
              <motion.div
                key={i}
                className="absolute"
                style={{ top, left }}
                initial={{ opacity: 0, scale: 0.7 }}
                whileInView={{ opacity: 1, scale: 1, rotate }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.7, delay: 0.15 + i * 0.1 }}
              >
                <motion.div
                  animate={{ y: [0, -6, 0] }}
                  transition={{ duration: 3 + i * 0.5, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <Component width={size} height={size} color={color} />
                </motion.div>
              </motion.div>
            ))}
            <svg className="absolute inset-0 w-full h-full opacity-8 pointer-events-none" viewBox="0 0 480 620">
              <path d="M 60,60 Q 200,150 260,230 Q 320,310 240,420 Q 180,510 120,550" stroke="#5e4075" strokeWidth="1.2" fill="none" strokeDasharray="5 9" />
              <path d="M 310,40 Q 200,160 120,250 Q 55,320 85,440 Q 110,520 80,590" stroke="#8b6fa0" strokeWidth="1.2" fill="none" strokeDasharray="4 7" />
              <path d="M 160,20 Q 360,120 420,280 Q 460,400 380,530" stroke="#5e4075" strokeWidth="0.8" fill="none" strokeDasharray="3 10" opacity="0.6" />
            </svg>
          </motion.div>

          {/* Right — Why points */}
          <div className="w-full lg:w-1/2 space-y-6">
            {whyPoints.map((point, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 24 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.5, delay: 0.05 * i }}
                className="flex gap-5 items-start group"
              >
                <div className="w-14 h-14 rounded-xl bg-[#e9deb5] flex items-center justify-center shrink-0 group-hover:bg-[#ddd0a0] transition-colors duration-200">
                  <point.Icon width={34} height={34} color="#5e4075" />
                </div>
                <div>
                  <h3 className="text-[#5e4075] text-lg mb-1.5">{point.title}</h3>
                  <p className="text-[#8b6fa0] text-base leading-relaxed">{point.desc}</p>
                </div>
              </motion.div>
            ))}

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.35 }}
              className="pt-4"
            >
              <Link
                href="/register"
                className="inline-flex items-center gap-2.5 px-8 py-4 bg-[#5e4075] text-white text-base rounded-xl hover:bg-[#3d2652] transition-all duration-200 shadow-[0_4px_16px_rgba(94,64,117,0.25)] hover:-translate-y-0.5"
              >
                Explore Our Courses
                <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
                  <path d="M 3,8 L 13,8 M 9,4 L 13,8 L 9,12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}
