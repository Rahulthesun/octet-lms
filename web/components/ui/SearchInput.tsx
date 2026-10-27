'use client'

// The app's one search-bar design (taken from Admin > Content): rounded pill,
// magnifier on the left, clear button on the right once something is typed.
// Use this for every search box so they all look and behave the same.

import type { InputHTMLAttributes } from 'react'

interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'type' | 'size'> {
  value: string
  onChange: (value: string) => void
  /** Classes for the outer wrapper — use to control width (defaults to full width, max-w-xl). */
  wrapperClassName?: string
  /** Smaller variant for use inside modals and dense lists. */
  size?: 'md' | 'sm'
}

export default function SearchInput({
  value,
  onChange,
  wrapperClassName = 'w-full max-w-xl',
  size = 'md',
  placeholder = 'Search…',
  className = '',
  ...rest
}: SearchInputProps) {
  const sm = size === 'sm'
  return (
    <div className={`relative ${wrapperClassName}`}>
      <svg
        className={`absolute top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none ${sm ? 'left-3 w-3.5 h-3.5' : 'left-4 w-4 h-4'}`}
        viewBox="0 0 20 20"
        fill="none"
        aria-hidden="true"
      >
        <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.6" />
        <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={rest['aria-label'] ?? (typeof placeholder === 'string' ? placeholder : 'Search')}
        className={`w-full bg-white border border-gray-300 rounded-full text-gray-700 placeholder-gray-400 outline-none transition-colors focus:border-action focus:ring-2 focus:ring-violet-100 [&::-webkit-search-cancel-button]:hidden ${
          sm ? 'pl-8 pr-8 py-1.5 text-sm' : 'pl-10 pr-10 py-2 text-base'
        } ${className}`}
        {...rest}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange('')}
          aria-label="Clear search"
          className={`absolute top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 rounded-full ${sm ? 'right-2' : 'right-3'}`}
        >
          <svg className={sm ? 'w-3.5 h-3.5' : 'w-4 h-4'} viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </button>
      )}
    </div>
  )
}
