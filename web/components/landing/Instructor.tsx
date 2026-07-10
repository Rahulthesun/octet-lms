'use client'

import { motion } from 'framer-motion'
import { AtomSVG } from '@/components/ui/PencilSVGs'
import SectionDecor from '@/components/landing/SectionDecor'

const credentials = [
  'Best Teacher Award — Chennai Collector',
  'M.Sc. Chemistry, Loyola College',
  'B.Ed., MKU, Madurai',
]

const journey = [
  { place: 'Sherwood Hall Sr. Sec. School, Chetpet', detail: 'PG Teacher for over a decade' },
  { place: 'Balavidya Mandir Sr. Sec. School, Adyar', detail: 'PG Teacher of Chemistry' },
  { place: 'Tamil Nadu Government Service', detail: 'PG Teacher for two decades' },
]

export default function Instructor() {
  return (
    <section id="instructor" className="relative overflow-hidden section-fx" style={{ backgroundColor: '#f0ebe8' }}>
      <SectionDecor variant={2} />
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-20 md:py-24">
        <div className="grid lg:grid-cols-[0.8fr_1.2fr] gap-12 lg:gap-16 items-center">
          {/* Left — small circular avatar (drop a real photo in later) */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6 }}
            className="flex flex-col items-center text-center"
          >
            {/* golden ring, with a gap of section-colour between it and the avatar */}
            <div
              className="rounded-full p-[4px] shadow-[0_18px_44px_rgba(94,64,117,0.22)]"
              style={{ background: 'linear-gradient(135deg, #f4e09a 0%, #d3ad57 48%, #a97d2c 100%)' }}
            >
              <div className="rounded-full p-[10px]" style={{ backgroundColor: '#f0ebe8' }}>
                <div
                  className="relative w-40 h-40 md:w-48 md:h-48 rounded-full overflow-hidden flex items-center justify-center"
                  style={{ backgroundColor: '#d4c5e2' }}
                >
                <div className="absolute inset-0 opacity-25 pointer-events-none">
                  <div className="absolute -top-3 -right-3">
                    <AtomSVG width={96} height={96} color="#5e4075" />
                  </div>
                </div>
                  <span className="relative text-primary text-5xl md:text-6xl tracking-tight">RA</span>
                </div>
              </div>
            </div>
            <p className="text-primary text-xl mt-5">Raju&nbsp;A</p>
            <p className="text-muted text-[13px] tracking-[0.24em] uppercase mt-1">Director &amp; Instructor</p>
            <div className="mt-7">
              <p className="text-primary text-4xl md:text-5xl leading-none">30+</p>
              <p className="text-muted text-[13px] tracking-[0.2em] uppercase mt-2">Years of Experience in Teaching</p>
            </div>
          </motion.div>

          {/* Right — bio */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <p className="text-[14px] tracking-[0.25em] text-muted uppercase mb-3">Meet Your Instructor</p>
            <h2 className="text-3xl md:text-4xl text-primary leading-tight mb-5">
              Three Decades of <span className="text-muted">Chemistry, One Teacher</span>
            </h2>
            <p className="text-muted text-base md:text-lg leading-relaxed mb-6">
              Raju&nbsp;A is the Director and teacher at OCTET. He completed his B.Sc. and M.Sc. in
              Chemistry at Loyola College, Chennai, and his degree in Education at Madurai Kamaraj
              University — then spent more than thirty years in the classroom, honoured with the Best
              Teacher Award by the Chennai Collector.
            </p>

            <div className="flex flex-wrap gap-2.5 mb-8">
              {credentials.map((c) => (
                <span
                  key={c}
                  className="px-4 py-2 rounded-full bg-white border border-accent3/50 text-primary text-[14px] shadow-[0_2px_10px_rgba(94,64,117,0.05)]"
                >
                  {c}
                </span>
              ))}
            </div>

            <ul className="space-y-3 mb-8">
              {journey.map((j) => (
                <li key={j.place} className="flex items-start gap-3">
                  <span className="mt-2 w-2 h-2 rounded-full bg-primary/60 shrink-0" />
                  <span className="text-base">
                    <span className="text-primary">{j.place}</span>
                    <span className="text-muted"> — {j.detail}</span>
                  </span>
                </li>
              ))}
            </ul>

            <blockquote className="relative border-l-2 border-primary/40 pl-5 py-1">
              <p className="text-primary text-lg md:text-xl leading-relaxed italic">
                &ldquo;Loyola College made me a chemist — but Sherwood Hall School moulded me into the
                best chemist.&rdquo;
              </p>
            </blockquote>
            <p className="text-muted text-[15px] leading-relaxed mt-4">
              Of Sherwood Hall, he says simply: &ldquo;It was a heaven on Earth for students and
              teachers.&rdquo;
            </p>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
