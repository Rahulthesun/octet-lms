'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import SectionDecor from '@/components/landing/SectionDecor'
import { AtomSVG, FlaskSVG, TestTubeSVG, BeakerSVG, CompoundSVG, MicroscopeSVG } from '@/components/ui/PencilSVGs'

/* The client's "invest for the horizon" parable — each planning horizon paired
   with what a farmer would plant for it, building to TRUE EDUCATION. Each line
   carries a small STATIC chemistry glyph (no animation). */
const ladder = [
  { span: 'six months', invest: 'paddy', Icon: TestTubeSVG, w: 24, h: 44 },
  { span: 'one year', invest: 'sugarcane', Icon: FlaskSVG, w: 34, h: 40 },
  { span: 'a decade', invest: 'coconut', Icon: AtomSVG, w: 40, h: 40 },
  { span: 'twenty-five years', invest: 'teak', Icon: BeakerSVG, w: 34, h: 40 },
  { span: 'a lifetime', invest: 'insurance', Icon: CompoundSVG, w: 46, h: 34 },
]

export default function ParentsMessage() {
  return (
    <section id="parents" className="relative overflow-hidden section-fx" style={{ backgroundColor: '#f0ebe8' }}>
      <SectionDecor variant={5} />
      <div className="relative z-10 max-w-6xl mx-auto px-6 py-24 md:py-28">
        <div className="grid lg:grid-cols-2 gap-14 lg:gap-20 items-center">
          {/* Left — the message + CTA */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6 }}
          >
            <p className="text-[14px] tracking-[0.25em] text-muted uppercase mb-3">A Note to Parents</p>
            <h2 className="text-4xl md:text-5xl text-primary leading-tight mb-6">
              Education Is for <span className="text-muted">Transformation</span>
            </h2>
            <p className="text-muted text-lg leading-relaxed mb-5">
              Transformation that is physical, mental and emotional. Children are not mark-scoring
              machines — they have feelings, likes and dislikes. Identify their talents and nurture
              them by their own interest, not by chasing every course just because the neighbours are.
            </p>

            <blockquote className="border-l-2 border-primary/40 pl-5 mb-8">
              <p className="text-primary text-lg md:text-xl leading-relaxed italic">
                Who gives true education? Finding out is the greatest task — like searching for truth
                in a sea of errors, where the truth has sunk.
              </p>
            </blockquote>

            <p className="text-muted text-lg leading-relaxed mb-8">
              Encourage your child when they improve, even a little. It teaches them the meaning of
              appreciation — that you are watching, caring and looking after them.
            </p>

            <Link
              href="/register"
              className="inline-flex items-center gap-2.5 px-9 py-4 bg-primary text-white text-lg rounded-xl hover:bg-[#3d2652] transition-all duration-200 shadow-[0_4px_16px_rgba(94,64,117,0.25)] hover:-translate-y-0.5"
            >
              Register Your Student
              <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
                <path d="M 3,8 L 13,8 M 9,4 L 13,8 L 9,12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </motion.div>

          {/* Right — the parable, plain growing lines (no boxes) */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <p className="text-[14px] tracking-[0.22em] uppercase mb-6" style={{ color: '#7e57ab' }}>
              Plan ahead — as the old wisdom goes
            </p>

            <div className="space-y-4 md:space-y-5">
              {ladder.map((row, i) => (
                <motion.div
                  key={row.span}
                  initial={{ opacity: 0, x: 18 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.45, delay: i * 0.08 }}
                  className="flex items-center gap-3"
                >
                  <span className="shrink-0 w-14 flex justify-center">
                    <row.Icon width={row.w} height={row.h} color="#7e57ab" />
                  </span>
                  <p className="text-lg md:text-2xl leading-snug">
                    <span className="text-muted">Planning for {row.span}? </span>
                    <span className="text-primary">Invest in {row.invest}.</span>
                  </p>
                </motion.div>
              ))}

              <motion.div
                initial={{ opacity: 0, scale: 0.97 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.5, delay: 0.45 }}
                className="flex items-start gap-3 pt-3"
              >
                <span className="shrink-0 w-14 flex justify-center mt-1">
                  <MicroscopeSVG width={50} height={54} color="#7e57ab" />
                </span>
                <p className="text-2xl md:text-4xl leading-tight">
                  <span className="text-muted">For generations? </span>
                  <span className="text-primary" style={{ boxShadow: 'inset 0 -0.42em 0 rgba(233,222,181,0.7)' }}>
                    Invest in TRUE EDUCATION.
                  </span>
                </p>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
