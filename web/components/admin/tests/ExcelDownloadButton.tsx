'use client'

// A small "Excel" download button with its own busy/error state — used for
// the per-test marks sheet (Test Results) and the monthly marks register
// (Students → Test Reports).

import { useState } from 'react'

export function ExcelIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      <path d="M9.5 12.5l4 5M13.5 12.5l-4 5" />
    </svg>
  )
}

export default function ExcelDownloadButton({ onDownload, label = 'Excel', className, disabled }: {
  onDownload: () => Promise<unknown>
  label?: string
  className?: string
  disabled?: boolean
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    setBusy(true)
    setError(null)
    try {
      await onDownload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Download failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <span className="inline-flex flex-col items-end">
      <button
        type="button"
        onClick={handleClick}
        disabled={busy || disabled}
        title="Download marks as Excel"
        className={className ?? 'flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-emerald-300 text-emerald-700 hover:bg-emerald-50 transition-colors disabled:opacity-40'}
      >
        <ExcelIcon className="w-4 h-4" />
        {busy ? 'Preparing…' : label}
      </button>
      {error && <span className="text-xs text-rose-600 mt-1" role="alert">{error}</span>}
    </span>
  )
}
