// The one page header used by every admin and student page: same title size,
// weight, subtitle style, spacing, and right-aligned action area, so the top
// of each page lines up identically.

import type { ReactNode } from 'react'

interface PageHeaderProps {
  title: ReactNode
  subtitle?: ReactNode
  /** Small uppercase label above the title (e.g. a greeting). */
  eyebrow?: ReactNode
  /** Buttons / toggles shown on the right (below the title on mobile). */
  actions?: ReactNode
  /** Optional element above the title, e.g. a "Back to …" link. */
  back?: ReactNode
  className?: string
}

export default function PageHeader({ title, subtitle, eyebrow, actions, back, className = '' }: PageHeaderProps) {
  return (
    <header className={`mb-6 ${className}`}>
      {back && <div className="mb-3">{back}</div>}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="min-w-0">
          {eyebrow && (
            <p className="text-xs font-medium tracking-[0.15em] uppercase text-gray-400 mb-1">{eyebrow}</p>
          )}
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">{title}</h1>
          {subtitle && <p className="text-sm sm:text-base text-gray-500 mt-1">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">{actions}</div>}
      </div>
    </header>
  )
}
