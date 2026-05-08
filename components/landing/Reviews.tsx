'use client'

import { motion } from 'framer-motion'
import { landingReviews } from '@/lib/mockData'

const accentColors = ['#e9deb5', '#daeae4', '#d4c5e2', '#c8e0da', '#f0e8f8', '#daeae4', '#e9deb5', '#c8e0da']

function StarRating({ count }: { count: number }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: count }).map((_, i) => (
        <svg key={i} className="w-4 h-4" viewBox="0 0 14 14" fill="#c9922e">
          <path d="M7 1L8.8 5.2H13.2L9.7 7.8L11 12L7 9.5L3 12L4.3 7.8L0.8 5.2H5.2L7 1Z" />
        </svg>
      ))}
    </div>
  )
}

function ReviewCard({ review }: { review: typeof landingReviews[0] }) {
  const colorIdx = parseInt(review.id.replace('r', '')) - 1
  const color = accentColors[colorIdx % accentColors.length]

  return (
    <div className="relative flex-shrink-0 bg-white border border-[#d4c5e2]/60 rounded-2xl p-7 shadow-[0_2px_16px_rgba(94,64,117,0.06)] mx-3 overflow-hidden" style={{ width: 340 }}>
      {/* Colored corner accent */}
      <div className="absolute top-0 right-0 w-20 h-20 rounded-bl-3xl opacity-50" style={{ backgroundColor: color }} />
      <div className="relative z-10">
        <StarRating count={review.rating} />
        <p className="text-[#5e4075] text-[15px] leading-relaxed mt-4 mb-5">&ldquo;{review.text}&rdquo;</p>
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full flex items-center justify-center text-[#5e4075] text-base shrink-0 border border-[#d4c5e2]/40" style={{ backgroundColor: color }}>
            {review.name.charAt(0)}
          </div>
          <div>
            <p className="text-[#5e4075] text-base">{review.name}</p>
            <p className="text-[#8b6fa0] text-[14px]">{review.role}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function MarqueeRow({ reviews, direction = 1, speed = 40 }: { reviews: typeof landingReviews; direction?: 1 | -1; speed?: number }) {
  const duration = reviews.length * speed
  return (
    <div className="overflow-hidden w-full py-2">
      <motion.div
        className="flex w-max"
        animate={{ x: direction === 1 ? [0, '-50%'] : ['-50%', 0] }}
        transition={{ duration, ease: 'linear', repeat: Infinity }}
      >
        {[...reviews, ...reviews].map((review, i) => (
          <ReviewCard key={`${review.id}-${i}`} review={review} />
        ))}
      </motion.div>
    </div>
  )
}

export default function Reviews() {
  const firstRow = landingReviews.slice(0, 4)
  const secondRow = landingReviews.slice(4)

  return (
    <section id="reviews" className="py-24 overflow-hidden" style={{ backgroundColor: '#f0ebe8' }}>
      <div className="max-w-7xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6 }}
          className="text-center mb-14"
        >
          <p className="text-[14px] tracking-[0.25em] text-[#8b6fa0] uppercase mb-3">What People Say</p>
          <h2 className="text-3xl md:text-4xl text-[#5e4075] mb-4 whitespace-nowrap">
            Real Students. Real Parents. <span className="text-[#8b6fa0]">Real Results.</span>
          </h2>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.7, delay: 0.2 }}
        className="space-y-5"
      >
        <MarqueeRow reviews={firstRow} direction={1} speed={45} />
        <MarqueeRow reviews={secondRow} direction={-1} speed={50} />
      </motion.div>
    </section>
  )
}
