'use client'

// Shared 1–5 star rating. Interactive when `onChange` is given (student
// General feedback, Parent's Feedback page); read-only otherwise (admin lists).

import { useState } from 'react'

const LABELS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent']

function Star({ filled, size }: { filled: boolean; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 2.8l2.83 5.74 6.33.92-4.58 4.46 1.08 6.3L12 17.25l-5.66 2.97 1.08-6.3L2.84 9.46l6.33-.92L12 2.8z"
        fill={filled ? '#F5B301' : 'none'}
        stroke={filled ? '#F5B301' : '#CBD5E1'}
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export default function StarRating({
  value,
  onChange,
  size = 20,
  showLabel = false,
  className = '',
}: {
  value: number | null
  onChange?: (v: number) => void
  size?: number
  showLabel?: boolean
  className?: string
}) {
  const [hover, setHover] = useState<number | null>(null)
  const shown = hover ?? value ?? 0

  if (!onChange) {
    return (
      <span className={`inline-flex items-center gap-0.5 ${className}`} aria-label={value ? `${value} out of 5 stars` : 'No rating'}>
        {[1, 2, 3, 4, 5].map((i) => <Star key={i} filled={i <= (value ?? 0)} size={size} />)}
      </span>
    )
  }

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className="inline-flex items-center gap-1" role="radiogroup" aria-label="Rating" onMouseLeave={() => setHover(null)}>
        {[1, 2, 3, 4, 5].map((i) => (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={value === i}
            aria-label={`${i} star${i === 1 ? '' : 's'} — ${LABELS[i]}`}
            onClick={() => onChange(i)}
            onMouseEnter={() => setHover(i)}
            className="p-0.5 rounded-md transition-transform hover:scale-110 active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#5e4075]/40"
          >
            <Star filled={i <= shown} size={size} />
          </button>
        ))}
      </div>
      {showLabel && (
        <span className={`text-sm min-w-[72px] ${shown ? 'text-gray-700' : 'text-gray-400'}`}>
          {shown ? LABELS[shown] : 'Tap to rate'}
        </span>
      )}
    </div>
  )
}
