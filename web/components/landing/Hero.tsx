'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import ChemistryOctetLogo from '@/components/ui/ChemistryOctetLogo'
import { AtomSVG, CompoundSVG, ChemIcon } from '@/components/ui/PencilSVGs'

type Slide = {
  quote: string
  sub: string
  caption: string
  icon: string
  from: string
  src?: string // drop a real photo path here later, e.g. '/classroom.jpg'
}

const slides: Slide[] = [
  {
    quote: "Chemistry Isn't Hard — It Just Hasn't Been Taught Right.",
    sub: 'A calm, fear-free space where 11th & 12th chemistry finally clicks.',
    caption: 'Live Classroom',
    icon: 'microscope',
    from: '#d4c5e2',
  },
  {
    quote: 'Every Doubt Is Welcome — Any Hour of the Day.',
    sub: 'Round-the-clock doubt clearing, so nothing slows your child down.',
    caption: 'Doubt Sessions',
    icon: 'flask',
    from: '#daeae4',
  },
  {
    quote: 'Verified, Error-Free Material. True Science, Spread With Care.',
    sub: 'Every note and paper is screened before it reaches your child.',
    caption: 'Trusted Notes',
    icon: 'compound',
    from: '#e9deb5',
  },
  {
    quote: 'Progress You Can See — Every Single Month.',
    sub: "Periodic tests, clear reports, and a parents' meet the first Sunday.",
    caption: "Parents' Meet",
    icon: 'beaker',
    from: '#c8e0da',
  },
]

// Directional: a positive direction enters from the right / exits left; a
// negative direction (clicking a dot to the left) enters from the left / exits right.
const slideVariants = {
  enter: (dir: number) => ({ x: dir >= 0 ? '100%' : '-100%', opacity: 0 }),
  center: { x: '0%', opacity: 1 },
  exit: (dir: number) => ({ x: dir >= 0 ? '-100%' : '100%', opacity: 0 }),
}
const slideTransition = { duration: 0.6, ease: [0.4, 0, 0.2, 1] as const }

function FeatureChip({ icon, label, className, delay = 0 }: { icon: React.ReactNode; label: string; className: string; delay?: number }) {
  return (
    <motion.div
      animate={{ y: [0, -9, 0] }}
      transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut', delay }}
      className={`absolute z-30 flex items-center gap-3 bg-white/95 backdrop-blur-sm rounded-xl px-4 py-3 shadow-[0_10px_28px_rgba(94,64,117,0.20)] border border-accent3/50 ${className}`}
    >
      <span className="flex items-center justify-center shrink-0" style={{ color: '#7e57ab' }}>{icon}</span>
      <span className="text-primary text-[15px] whitespace-nowrap">{label}</span>
    </motion.div>
  )
}

export default function Hero() {
  const [index, setIndex] = useState(0)
  const [direction, setDirection] = useState(1)

  const goTo = (i: number) => {
    setDirection(i > index ? 1 : -1)
    setIndex(i)
  }

  // Auto-advance (always forward); the timer resets whenever the index changes.
  useEffect(() => {
    const id = setTimeout(() => {
      setDirection(1)
      setIndex((i) => (i + 1) % slides.length)
    }, 5000)
    return () => clearTimeout(id)
  }, [index])

  const slide = slides[index]

  return (
    <section className="relative min-h-screen flex flex-col justify-center overflow-hidden pt-28 pb-16 px-6 bg-hero-mesh">
      {/* Texture + molecular decorations */}
      <div className="absolute inset-0 tx-dots opacity-50 pointer-events-none" />
      <div className="absolute top-24 left-6 opacity-[0.07] pointer-events-none hidden lg:block">
        <AtomSVG width={150} height={150} color="#5e4075" />
      </div>
      <div className="absolute bottom-10 right-8 opacity-[0.07] pointer-events-none hidden lg:block">
        <CompoundSVG width={170} height={130} color="#5e4075" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-8 items-center">
          {/* Left — rotating quote + CTAs */}
          <div className="order-2 lg:order-1">
            <div className="relative h-[188px] md:h-[200px] overflow-hidden">
              <AnimatePresence custom={direction}>
                <motion.div
                  key={index}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={slideTransition}
                  className="absolute inset-0 flex flex-col justify-center text-center lg:text-left"
                >
                  <h1 className="text-3xl md:text-[2.6rem] text-primary leading-[1.15] tracking-tight max-w-xl mx-auto lg:mx-0">
                    {slide.quote}
                  </h1>
                  <p className="text-muted text-base md:text-lg leading-relaxed mt-4 max-w-lg mx-auto lg:mx-0">
                    {slide.sub}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Dots */}
            <div className="flex justify-center lg:justify-start gap-2 mt-6">
              {slides.map((s, i) => (
                <button
                  key={s.caption}
                  onClick={() => goTo(i)}
                  aria-label={`Go to slide ${i + 1}`}
                  className={`h-2 rounded-full transition-all duration-300 ${i === index ? 'w-7 bg-primary' : 'w-2 bg-primary/25 hover:bg-primary/50'}`}
                />
              ))}
            </div>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-4 mt-8">
              <Link
                href="/register"
                className="px-8 py-3.5 bg-primary text-white text-base rounded-xl shadow-[0_4px_20px_rgba(94,64,117,0.3)] hover:bg-[#3d2652] hover:shadow-[0_6px_28px_rgba(94,64,117,0.4)] hover:-translate-y-0.5 transition-all duration-200"
              >
                Start Learning Today
              </Link>
              <a
                href="#video"
                className="px-8 py-3.5 border border-primary/30 text-primary text-base rounded-xl hover:bg-white/70 transition-all duration-200 flex items-center gap-2.5"
              >
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 20 20" fill="none">
                  <circle cx="10" cy="10" r="9" stroke="#5e4075" strokeWidth="1.5" />
                  <path d="M 8,7 L 14,10 L 8,13 Z" fill="#5e4075" />
                </svg>
                Watch a Demo
              </a>
            </div>

            {/* Trust line */}
            <div className="flex items-center justify-center lg:justify-start gap-3 mt-7">
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <svg key={i} className="w-4 h-4" viewBox="0 0 14 14" fill="#c9922e">
                    <path d="M7 1L8.8 5.2H13.2L9.7 7.8L11 12L7 9.5L3 12L4.3 7.8L0.8 5.2H5.2L7 1Z" />
                  </svg>
                ))}
              </div>
              <span className="text-muted text-[14px]">Loved by CBSE 11th &amp; 12th students &amp; parents</span>
            </div>
          </div>

          {/* Right — carousel visual with floating chips + center logo */}
          <div className="relative order-1 lg:order-2">
            {/* Rotating image panel */}
            <div className="relative h-[300px] lg:h-[440px] rounded-3xl overflow-hidden border border-accent3/60 shadow-[0_20px_60px_rgba(94,64,117,0.18)]">
              <AnimatePresence custom={direction}>
                <motion.div
                  key={index}
                  custom={direction}
                  variants={slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={slideTransition}
                  className="absolute inset-0"
                >
                  {slide.src ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={slide.src} alt={slide.caption} className="w-full h-full object-cover" />
                  ) : (
                    <div
                      className="relative w-full h-full flex items-center justify-center overflow-hidden"
                      style={{ background: `linear-gradient(150deg, ${slide.from} 0%, #ffffff 95%)` }}
                    >
                      <div className="absolute inset-0 tx-dots opacity-40" />
                      <div className="absolute -top-6 -right-6 opacity-20">
                        <AtomSVG width={130} height={130} color="#5e4075" />
                      </div>
                      <div className="absolute -bottom-8 -left-8 opacity-15">
                        <CompoundSVG width={150} height={120} color="#5e4075" />
                      </div>
                      <ChemIcon icon={slide.icon} width={168} height={168} color="#5e4075" />
                    </div>
                  )}
                  <span className="absolute bottom-4 left-4 z-10 px-4 py-1.5 rounded-full bg-white/85 backdrop-blur-sm text-primary text-[14px] shadow-sm">
                    {slide.caption}
                  </span>
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Center logo — bridges the seam between the sliding panels (desktop) */}
            <div className="hidden lg:block absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20 pointer-events-none">
              <ChemistryOctetLogo size={300} background="#f8f9ed" />
            </div>

            {/* Floating feature chips */}
            <FeatureChip
              className="top-5 -left-3 lg:-left-6"
              label="Verified Notes"
              delay={0}
              icon={
                <svg className="w-7 h-7" viewBox="0 0 20 20" fill="none">
                  <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M 6.5,10 L 9,12.5 L 13.5,7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              }
            />
            <FeatureChip
              className="bottom-6 -right-2 lg:-right-5"
              label="24/7 Doubt Clearing"
              delay={1.4}
              icon={
                <svg className="w-7 h-7" viewBox="0 0 20 20" fill="none">
                  <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M 7.5,7.5 Q 7.5,5.5 10,5.5 Q 12.5,5.5 12.5,7.8 Q 12.5,9.5 10,10.2 L 10,12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" fill="none" />
                  <circle cx="10" cy="14.5" r="0.8" fill="currentColor" />
                </svg>
              }
            />
          </div>
        </div>

        {/* Tagline */}
        <p className="text-muted text-[14px] tracking-[0.25em] uppercase text-center mt-14">
          ✦ Spread True Science ✦
        </p>
      </div>
    </section>
  )
}
