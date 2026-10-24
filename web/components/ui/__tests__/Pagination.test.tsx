import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { usePagination } from '../Pagination'

const rows = (n: number) => Array.from({ length: n }, (_, i) => i + 1)

describe('usePagination', () => {
  beforeEach(() => window.localStorage.clear())

  it('slices the list into pages of 10 by default', () => {
    const { result } = renderHook(() => usePagination(rows(25)))
    expect(result.current.pageCount).toBe(3)
    expect(result.current.pageItems).toEqual(rows(10))
    act(() => result.current.setPage(3))
    expect(result.current.pageItems).toEqual([21, 22, 23, 24, 25])
  })

  it('changing rows-per-page returns to page 1 and is remembered', () => {
    const { result } = renderHook(() => usePagination(rows(60)))
    act(() => result.current.setPage(3))
    act(() => result.current.setPageSize(25))
    expect(result.current.page).toBe(1)
    expect(result.current.pageItems).toHaveLength(25)
    expect(window.localStorage.getItem('octet.rowsPerPage')).toBe('25')
    const again = renderHook(() => usePagination(rows(60)))
    expect(again.result.current.pageSize).toBe(25)
  })

  it('a shrinking list clamps to the last page instead of resetting to page 1', () => {
    const { result, rerender } = renderHook(({ n }) => usePagination(rows(n)), { initialProps: { n: 30 } })
    act(() => result.current.setPage(3))
    rerender({ n: 25 }) // still 3 pages — stays on page 3
    expect(result.current.page).toBe(3)
    rerender({ n: 15 }) // only 2 pages now — clamps to 2
    expect(result.current.page).toBe(2)
  })

  it('handles an empty list', () => {
    const { result } = renderHook(() => usePagination([]))
    expect(result.current.pageCount).toBe(1)
    expect(result.current.pageItems).toEqual([])
  })
})
