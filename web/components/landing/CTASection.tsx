'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import SectionDecor from '@/components/landing/SectionDecor'
import { AtomSVG, FlaskSVG } from '@/components/ui/PencilSVGs'

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren: 0.18 } },
}
const item = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const } },
}

export default function CTASection() {
  return (
    <section className="relative px-6 py-20 overflow-hidden section-fx" style={{ backgroundColor: '#f8f9ed' }}>
      <SectionDecor variant={2} />
      <div className="relative z-10 max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 48, scale: 0.94 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          whileHover={{ y: -4 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
          className="relative rounded-4xl overflow-hidden px-8 py-16 md:px-16 md:py-20 text-center shadow-[0_30px_80px_rgba(94,64,117,0.28)]"
          style={{ backgroundColor: '#5e4075' }}
        >
          <div className="absolute -top-8 -left-8 opacity-[0.12] pointer-events-none">
            <AtomSVG width={200} height={200} color="#ffffff" />
          </div>
          <div className="absolute -bottom-10 -right-6 opacity-[0.12] pointer-events-none">
            <FlaskSVG width={170} height={200} color="#ffffff" />
          </div>

          <motion.div
            className="relative"
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-80px' }}
          >
            <motion.p variants={item} className="text-[14px] tracking-[0.25em] text-accent1 uppercase mb-4">Admissions Open</motion.p>
            <motion.h2 variants={item} className="text-3xl md:text-5xl text-white leading-tight mb-5">
              Enroll Your Student at
              <br />
              Chemistry@OCTET Today.
            </motion.h2>
            <motion.p variants={item} className="text-white/75 text-base md:text-lg max-w-xl mx-auto mb-10">
              CBSE 11th &amp; 12th chemistry, English medium — verified materials, round-the-clock doubts, and monthly progress you can see.
            </motion.p>
            <motion.div variants={item} className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/register"
                className="px-9 py-4 bg-white text-primary text-base rounded-xl hover:bg-[#f1f1f1] hover:-translate-y-0.5 transition-all duration-200 shadow-[0_8px_28px_rgba(0,0,0,0.25)]"
              >
                Register Now
              </Link>
              <Link
                href="/login"
                className="px-9 py-4 border border-white/40 text-white text-base rounded-xl hover:bg-white/10 transition-all duration-200"
              >
                Student Login
              </Link>
            </motion.div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
