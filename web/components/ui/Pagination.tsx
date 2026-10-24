'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'

export const PAGE_SIZE_OPTIONS = [10, 25, 50] as const

const PAGE_SIZE_STORAGE_KEY = 'octet.rowsPerPage'

function readStoredPageSize(): number | null {
  try {
    const n = Number(window.localStorage.getItem(PAGE_SIZE_STORAGE_KEY))
    return (PAGE_SIZE_OPTIONS as readonly number[]).includes(n) ? n : null
  } catch {
    return null
  }
}

/**
 * Client-side paging for an already-loaded list.
 *  - "Rows per page" is remembered across pages and visits (localStorage,
 *    best-effort — works without it).
 *  - Changing the page size returns to page 1; a shrinking list (a row was
 *    deleted, a filter narrowed it) only clamps to the last valid page, so
 *    deleting a row never throws you back to page 1.
 */
export function usePagination<T>(items: T[], initialPageSize: number = PAGE_SIZE_OPTIONS[0]) {
  const [page, setPage] = useState(1)
  const [pageSize, setPageSizeState] = useState<number>(initialPageSize)

  // Read the stored preference after mount (not during render) so server and
  // client markup always match.
  useEffect(() => {
    const stored = readStoredPageSize()
    if (stored) setPageSizeState(stored)
  }, [])

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size)
    setPage(1)
    try {
      window.localStorage.setItem(PAGE_SIZE_STORAGE_KEY, String(size))
    } catch { /* storage unavailable — fine */ }
  }, [])

  const total = items.length
  const pageCount = Math.max(1, Math.ceil(total / pageSize))
  const safePage = Math.min(Math.max(1, page), pageCount)

  const pageItems = useMemo(
    () => items.slice((safePage - 1) * pageSize, safePage * pageSize),
    [items, safePage, pageSize],
  )

  return { page: safePage, setPage, pageSize, setPageSize, pageCount, total, pageItems }
}

// 1 … 4 5 [6] 7 8 … 20 — always keeps first/last and a window around the current page.
function pageWindow(page: number, pageCount: number): (number | 'gap')[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i + 1)
  const out: (number | 'gap')[] = [1]
  const start = Math.max(2, page - 1)
  const end = Math.min(pageCount - 1, page + 1)
  if (start > 2) out.push('gap')
  for (let i = start; i <= end; i++) out.push(i)
  if (end < pageCount - 1) out.push('gap')
  out.push(pageCount)
  return out
}

interface PaginationProps {
  page: number
  pageCount: number
  pageSize: number
  total: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: number) => void
  /** Noun for the "Showing x–y of N …" label. */
  label?: string
  className?: string
}

/** "Rows per page" selector + "x–y of N" + numbered page buttons. Renders nothing for an empty list. */
export default function Pagination({
  page, pageCount, pageSize, total, onPageChange, onPageSizeChange, label = 'items', className = '',
}: PaginationProps) {
  if (total === 0) return null
  const from = (page - 1) * pageSize + 1
  const to = Math.min(total, page * pageSize)
  const btn = 'min-w-8 h-8 px-2 inline-flex items-center justify-center rounded-lg border text-sm transition-colors'

  return (
    <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 border-t border-zinc-100 bg-white text-sm text-zinc-500 ${className}`}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <label className="flex items-center gap-2">
          <span>Rows per page</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="h-8 rounded-lg border border-zinc-300 bg-white px-2 text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-violet-200 cursor-pointer"
          >
            {PAGE_SIZE_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
        </label>
        <span>
          <span className="font-inter text-zinc-700">{from}–{to}</span> of <span className="font-inter text-zinc-700">{total}</span> {label}
        </span>
      </div>

      {pageCount > 1 && (
        <nav className="flex items-center gap-1" aria-label="Pagination">
          <button
            type="button"
            onClick={() => onPageChange(page - 1)}
            disabled={page <= 1}
            className={`${btn} border-zinc-200 text-zinc-600 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-default cursor-pointer`}
            aria-label="Previous page"
          >
            ‹
          </button>
          {pageWindow(page, pageCount).map((p, i) =>
            p === 'gap' ? (
              <span key={`gap-${i}`} className="px-1 text-zinc-400">…</span>
            ) : (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                aria-current={p === page ? 'page' : undefined}
                className={`${btn} font-inter cursor-pointer ${
                  p === page ? 'text-white border-transparent bg-[#5B21B6]' : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                }`}
              >
                {p}
              </button>
            ),
          )}
          <button
            type="button"
            onClick={() => onPageChange(page + 1)}
            disabled={page >= pageCount}
            className={`${btn} border-zinc-200 text-zinc-600 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-default cursor-pointer`}
            aria-label="Next page"
          >
            ›
          </button>
        </nav>
      )}
    </div>
  )
}
