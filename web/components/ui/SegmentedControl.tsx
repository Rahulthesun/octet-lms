'use client'

// The one filter toggle used across the admin and student portals (Online
// Classes, Tests, Exam Documents …): a grey track with the selected option
// raised in white. Page-level section switching uses underline tabs instead.

interface Option<T extends string> {
  value: T
  label: React.ReactNode
}

interface SegmentedControlProps<T extends string> {
  options: Option<T>[]
  value: T
  onChange: (value: T) => void
  ariaLabel: string
  className?: string
}

export default function SegmentedControl<T extends string>({ options, value, onChange, ariaLabel, className = '' }: SegmentedControlProps<T>) {
  return (
    <div
      className={`inline-flex max-w-full flex-wrap items-center gap-1 p-1 bg-gray-100 rounded-lg ${className}`}
      role="group"
      aria-label={ariaLabel}
    >
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            aria-pressed={active}
            className={`px-3.5 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
              active ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
