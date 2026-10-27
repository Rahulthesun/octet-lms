// Why a styled native <select> instead of a fully custom listbox:
// -----------------------------------------------------------------------
// A native <select> keeps free accessibility (screen readers, keyboard
// nav, form semantics) and -- critically on mobile -- the OS's own native
// picker UI (iOS wheel / Android dropdown sheet), which a hand-rolled
// listbox would have to reimplement and will never match exactly. We lose
// a little visual control over the open/closed menu itself, but for ~90%
// of this app's selects (plain option lists, no multi-select, no search)
// that's a cosmetic concession, not a functional one. Styling just the
// closed control (appearance-none + a custom chevron overlay) gets the
// visual consistency this sweep needs at a fraction of the risk/cost of a
// full custom combobox (keyboard handling, portal positioning, outside
// click, scroll-into-view, screen reader roles, etc.).
import React, { forwardRef, SelectHTMLAttributes } from 'react'

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  wrapperClassName?: string
}

export const selectClasses = 
  "appearance-none w-full bg-white border border-zinc-200 text-zinc-900 text-sm rounded-xl px-3.5 py-2.5 pr-10 outline-none transition-all duration-150 " +
  "focus:border-[#5e4075] focus:ring-2 focus:ring-[#5e4075]/15 hover:border-zinc-300 disabled:bg-zinc-50 disabled:text-zinc-400 disabled:cursor-not-allowed cursor-pointer"

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = '', label, error, children, wrapperClassName = '', ...props }, ref) => {
    return (
      <div className={`relative ${wrapperClassName}`}>
        {label && (
          <label className="block text-xs font-semibold text-zinc-700 mb-1.5 uppercase tracking-wide">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            className={`${selectClasses} ${error ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-200' : ''} ${className}`}
            {...props}
          >
            {children}
          </select>
          {/* Custom system configured arrow */}
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-zinc-400">
            <svg className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path
                fillRule="evenodd"
                d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                clipRule="evenodd"
              />
            </svg>
          </div>
        </div>
        {error && <p className="text-xs text-rose-500 mt-1">{error}</p>}
      </div>
    )
  }
)

Select.displayName = 'Select'
export default Select
