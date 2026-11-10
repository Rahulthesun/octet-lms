'use client'

// The "Excel" button used for the per-test marks sheet (Test Results) and the
// monthly marks register (Students → Test Reports). Clicking it offers two
// choices instead of downloading straight away:
//   • View     — opens the sheet in a large in-app viewer (no file saved)
//   • Download — saves the .xlsx, exactly as before
// The viewer is fed by the same register the server writes into the .xlsx
// (GET …/marks/view), so the two always show the same rows and numbers.

import { useEffect, useRef, useState, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import type { MarksRegister, MarksRegisterCell } from '@/hooks/useTests'

export function ExcelIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
      <path d="M9.5 12.5l4 5M13.5 12.5l-4 5" />
    </svg>
  )
}

function EyeIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function DownloadIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
    </svg>
  )
}

export default function ExcelDownloadButton({ onDownload, onView, label = 'Excel', className, disabled }: {
  onDownload: () => Promise<unknown>
  /** Loads the register for the in-app viewer. */
  onView: () => Promise<MarksRegister>
  label?: string
  className?: string
  disabled?: boolean
}) {
  // Where the button sat when it was clicked — the menu is placed from this.
  const [menuAt, setMenuAt] = useState<DOMRect | null>(null)
  const [busy, setBusy] = useState<null | 'view' | 'download'>(null)
  const [error, setError] = useState<string | null>(null)
  const [register, setRegister] = useState<MarksRegister | null>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  async function download() {
    setMenuAt(null)
    setBusy('download')
    setError(null)
    try {
      await onDownload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Download failed')
    } finally {
      setBusy(null)
    }
  }

  async function view() {
    setMenuAt(null)
    setBusy('view')
    setError(null)
    try {
      setRegister(await onView())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not open the sheet')
    } finally {
      setBusy(null)
    }
  }

  return (
    <span className="inline-flex flex-col items-end">
      <button
        ref={buttonRef}
        type="button"
        onClick={(e) => setMenuAt(menuAt ? null : e.currentTarget.getBoundingClientRect())}
        disabled={!!busy || disabled}
        title="View or download marks as Excel"
        aria-haspopup="menu"
        aria-expanded={!!menuAt}
        className={className ?? 'flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-emerald-300 text-emerald-700 hover:bg-emerald-50 transition-colors disabled:opacity-40'}
      >
        <ExcelIcon className="w-4 h-4" />
        {busy === 'download' ? 'Preparing…' : busy === 'view' ? 'Opening…' : label}
      </button>
      {error && <span className="text-xs text-rose-600 mt-1" role="alert">{error}</span>}

      {menuAt && (
        <ExcelChoiceMenu anchorRect={menuAt} anchorRef={buttonRef} onView={view} onDownload={download} onClose={() => setMenuAt(null)} />
      )}
      {register && (
        <ExcelViewerModal register={register} onDownload={onDownload} onClose={() => setRegister(null)} />
      )}
    </span>
  )
}

// ─── View / Download choice ─────────────────────────────────────────────────
// Portaled + fixed-positioned so it is never clipped by a parent modal's
// overflow, and flips above the button when there is no room below.

const MENU_WIDTH = 200
const MENU_HEIGHT = 104

function ExcelChoiceMenu({ anchorRect: r, anchorRef, onView, onDownload, onClose }: {
  anchorRect: DOMRect
  anchorRef: RefObject<HTMLButtonElement | null>
  onView: () => void
  onDownload: () => void
  onClose: () => void
}) {
  const menuRef = useRef<HTMLDivElement>(null)
  const below = r.bottom + 6 + MENU_HEIGHT <= window.innerHeight
  const pos = {
    top: below ? r.bottom + 6 : r.top - 6 - MENU_HEIGHT,
    left: Math.min(Math.max(8, r.right - MENU_WIDTH), window.innerWidth - MENU_WIDTH - 8),
  }

  useEffect(() => {
    function onPointer(e: MouseEvent) {
      if (menuRef.current?.contains(e.target as Node) || anchorRef.current?.contains(e.target as Node)) return
      onClose()
    }
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('mousedown', onPointer)
    document.addEventListener('keydown', onKey)
    window.addEventListener('resize', onClose)
    window.addEventListener('scroll', onClose, true)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onClose)
      window.removeEventListener('scroll', onClose, true)
    }
  }, [anchorRef, onClose])

  return createPortal(
    <div
      ref={menuRef}
      role="menu"
      className="fixed z-[70] w-[200px] rounded-xl border border-zinc-200 bg-white shadow-xl p-1.5"
      style={{ top: pos.top, left: pos.left }}
    >
      <button
        type="button" role="menuitem" onClick={onView}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm rounded-lg text-zinc-800 hover:bg-emerald-50 hover:text-emerald-800 transition-colors"
      >
        <EyeIcon className="w-4 h-4 text-emerald-600" /> View
      </button>
      <button
        type="button" role="menuitem" onClick={onDownload}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-sm rounded-lg text-zinc-800 hover:bg-emerald-50 hover:text-emerald-800 transition-colors"
      >
        <DownloadIcon className="w-4 h-4 text-emerald-600" /> Download
      </button>
    </div>,
    document.body,
  )
}

// ─── Full-screen sheet viewer ───────────────────────────────────────────────

function cellClass(cell: MarksRegisterCell) {
  if (cell.kind === 'absent') return 'text-red-600 font-semibold'
  if (cell.kind === 'pending') return 'text-zinc-500 italic'
  if (cell.kind === 'score' && (cell.pct ?? 0) >= 90) return 'text-green-700 font-semibold'
  return 'text-zinc-800'
}

export function ExcelViewerModal({ register, onDownload, onClose }: {
  register: MarksRegister
  onDownload: () => Promise<unknown>
  onClose: () => void
}) {
  const [sheet, setSheet] = useState<'marks' | 'tests'>('marks')
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [onClose])

  async function download() {
    setDownloading(true)
    setError(null)
    try {
      await onDownload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Download failed')
    } finally {
      setDownloading(false)
    }
  }

  const border = 'border border-zinc-300'
  const head = `${border} bg-[#F3EEF7] font-semibold text-zinc-900 text-center align-middle px-2 py-1.5`

  return createPortal(
    <div className="fixed inset-0 z-[65] bg-black/60 flex items-center justify-center p-2 sm:p-4" onClick={onClose}>
      <div
        role="dialog" aria-modal="true" aria-label={register.title}
        className="bg-white w-full h-full max-w-[1800px] rounded-xl shadow-2xl border border-zinc-200 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 sm:px-6 py-3 border-b border-zinc-200 flex items-center gap-3 shrink-0">
          <ExcelIcon className="w-5 h-5 text-emerald-600 shrink-0" />
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold text-zinc-900 truncate">{register.title}</h3>
            <p className="text-xs text-zinc-500">
              {register.rows.length} students · {register.columns.length} {register.columns.length === 1 ? 'test' : 'tests'} · marks out of 100
            </p>
          </div>
          {error && <span className="text-xs text-rose-600" role="alert">{error}</span>}
          <button
            type="button" onClick={download} disabled={downloading}
            className="flex items-center gap-1.5 px-3.5 py-2 text-sm rounded-lg border border-emerald-300 text-emerald-700 hover:bg-emerald-50 transition-colors disabled:opacity-40 shrink-0"
          >
            <DownloadIcon className="w-4 h-4" /> {downloading ? 'Preparing…' : 'Download'}
          </button>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 text-2xl leading-none px-1 shrink-0" aria-label="Close">&times;</button>
        </div>

        <div className="flex-1 overflow-auto bg-zinc-50">
          {sheet === 'marks' ? (
            register.rows.length === 0 ? (
              <div className="py-20 text-center text-sm text-zinc-400">No students on this sheet.</div>
            ) : (
              <table className="border-collapse text-sm bg-white min-w-full">
                <thead className="sticky top-0 z-30">
                  <tr>
                    <th colSpan={2 + register.columns.length} className={`${border} bg-white text-base font-bold text-zinc-900 py-2`}>
                      {register.title}
                    </th>
                  </tr>
                  <tr>
                    <th rowSpan={2} className={`${head} sticky left-0 z-20 w-12 min-w-12`}>No.</th>
                    <th rowSpan={2} className={`${head} sticky left-12 z-20 min-w-[220px] text-left`}>Student&apos;s name</th>
                    {register.columns.map((c, i) => (
                      <th key={i} className={`${head} min-w-[120px] max-w-[160px] whitespace-normal leading-snug`}>{c.header}</th>
                    ))}
                  </tr>
                  <tr>
                    {register.columns.map((c, i) => (
                      <th key={i} className={head}>{c.sub}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {register.rows.map((r, i) => (
                    <tr key={i} className="hover:bg-emerald-50/60">
                      <td className={`${border} sticky left-0 z-10 bg-white text-center px-2 py-1.5 tabular-nums`}>{i + 1}.</td>
                      <td className={`${border} sticky left-12 z-10 bg-white px-2 py-1.5 whitespace-nowrap`}>{r.name}</td>
                      {r.cells.map((c, j) => (
                        <td key={j} className={`${border} text-center px-2 py-1.5 tabular-nums ${cellClass(c)}`}>{c.value}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          ) : (
            <div className="p-4 sm:p-6">
              <table className="border-collapse text-sm bg-white">
                <thead>
                  <tr>
                    {['Test', 'Full title', 'Date', 'Max marks'].map((h) => <th key={h} className={`${head} px-3`}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {register.tests.map((t, i) => (
                    <tr key={i}>
                      <td className={`${border} px-3 py-1.5`}>{t.code}</td>
                      <td className={`${border} px-3 py-1.5`}>{t.title}</td>
                      <td className={`${border} px-3 py-1.5 whitespace-nowrap`}>{t.date}</td>
                      <td className={`${border} px-3 py-1.5 text-center tabular-nums`}>{t.maxMarks}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-xs text-zinc-500 mt-4 max-w-3xl leading-relaxed">{register.note}</p>
            </div>
          )}
        </div>

        {/* Sheet tabs, like the workbook's own tabs. */}
        <div className="border-t border-zinc-200 px-3 py-1.5 flex items-center gap-1 shrink-0 bg-white">
          {([['marks', register.sheetName], ['tests', 'Tests']] as const).map(([key, name]) => (
            <button
              key={key} type="button" onClick={() => setSheet(key)}
              className={`px-3.5 py-1.5 text-sm rounded-md transition-colors ${sheet === key ? 'bg-emerald-100 text-emerald-900 font-semibold' : 'text-zinc-500 hover:bg-zinc-100'}`}
            >
              {name}
            </button>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  )
}
