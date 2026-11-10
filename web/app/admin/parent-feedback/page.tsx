'use client'

// Admin > Parent's Feedback
//
// Reviews sent by parents from the public /parents-feedback page (linked in
// the landing-page footer). Data: GET /api/feedback/parents.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { authedFetch } from '@/lib/apiClient'
import { formatDateTimeIST, timeAgo } from '@/lib/helpers'
import Pagination, { usePagination } from '@/components/ui/Pagination'
import SearchInput from '@/components/ui/SearchInput'
import SegmentedControl from '@/components/ui/SegmentedControl'
import StarRating from '@/components/shared/StarRating'
import { SkeletonCard } from '@/components/ui/Skeleton'
import { StatCard } from '@/components/admin/StudentFeedbackTab'

type Status = 'new' | 'reviewed'

interface ParentFeedback {
  id: string
  parentName: string
  phone: string | null
  studentCount: number
  studentNames: string[]
  rating: number | null
  comment: string
  status: Status
  createdAt: string
}

function initials(name: string) {
  return name.replace(/^(mr|mrs|ms|dr)\.?\s+/i, '').split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase()
}

export default function ParentFeedbackPage() {
  const [rows, setRows] = useState<ParentFeedback[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<'all' | Status>('all')
  const [minRating, setMinRating] = useState<'all' | '5' | '4' | 'low'>('all')
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const d = await authedFetch('/api/feedback/parents')
      setRows(d.feedback ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load parents' feedback")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const stats = useMemo(() => {
    const rated = rows.filter((r) => r.rating)
    const avg = rated.length ? rated.reduce((s, r) => s + (r.rating ?? 0), 0) / rated.length : null
    const dist = [5, 4, 3, 2, 1].map((n) => ({ n, count: rated.filter((r) => r.rating === n).length }))
    return {
      total: rows.length,
      fresh: rows.filter((r) => r.status === 'new').length,
      avg,
      dist,
      ratedCount: rated.length,
      students: rows.reduce((s, r) => s + (r.studentCount || 0), 0),
    }
  }, [rows])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((r) => {
      if (status !== 'all' && r.status !== status) return false
      if (minRating === '5' && r.rating !== 5) return false
      if (minRating === '4' && r.rating !== 4) return false
      if (minRating === 'low' && (r.rating ?? 0) > 3) return false
      if (!q) return true
      return [r.parentName, r.phone, r.comment, ...r.studentNames].some((v) => v?.toLowerCase().includes(q))
    })
  }, [rows, search, status, minRating])

  const paging = usePagination(filtered)
  const resetPage = paging.setPage
  useEffect(() => { resetPage(1) }, [search, status, minRating, resetPage])

  async function setRowStatus(r: ParentFeedback, next: Status) {
    setBusyId(r.id)
    try {
      await authedFetch(`/api/feedback/parents/${r.id}`, { method: 'PATCH', body: JSON.stringify({ status: next }) })
      setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, status: next } : x)))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed')
    } finally {
      setBusyId(null)
    }
  }

  async function remove(r: ParentFeedback) {
    if (!window.confirm(`Delete the review from ${r.parentName}? This cannot be undone.`)) return
    setBusyId(r.id)
    try {
      await authedFetch(`/api/feedback/parents/${r.id}`, { method: 'DELETE' })
      setRows((prev) => prev.filter((x) => x.id !== r.id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div>
      <div className="mb-8 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">Parent&apos;s Feedback</h1>
          <p className="text-sm sm:text-base text-gray-500 mt-1">
            Reviews, expectations and ratings sent by parents from the website footer.
          </p>
        </div>
        <a
          href="/parents-feedback"
          target="_blank"
          rel="noopener noreferrer"
          className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2 text-sm border border-gray-200 rounded-lg text-primary hover:border-primary transition-colors bg-white"
        >
          Open parent form
          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none"><path d="M6 3h7v7M13 3L5 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </a>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="grid grid-cols-2 md:grid-cols-1 gap-4">
          <StatCard label="Total reviews" value={stats.total} sub={stats.fresh > 0 ? `${stats.fresh} new to review` : 'All reviewed'} />
          <StatCard label="Students covered" value={stats.students} accent="#0f766e" />
        </div>
        <div className="md:col-span-2 bg-white rounded-2xl shadow-sm px-6 py-5 flex flex-col sm:flex-row gap-6 sm:items-center">
          <div className="text-center sm:pr-6 sm:border-r border-gray-100 shrink-0">
            <p className="text-sm text-gray-500">Average rating</p>
            <p className="text-5xl font-semibold font-inter text-[#B7791F] mt-1 tabular-nums">{stats.avg ? stats.avg.toFixed(1) : '—'}</p>
            <div className="mt-2 flex justify-center"><StarRating value={stats.avg ? Math.round(stats.avg) : 0} size={16} /></div>
            <p className="text-xs text-gray-400 mt-1">{stats.ratedCount} rating{stats.ratedCount === 1 ? '' : 's'}</p>
          </div>
          <div className="flex-1 space-y-2">
            {stats.dist.map(({ n, count }) => {
              const pct = stats.ratedCount ? (count / stats.ratedCount) * 100 : 0
              return (
                <div key={n} className="flex items-center gap-3 text-sm">
                  <span className="w-8 text-gray-600 font-inter">{n}★</span>
                  <div className="flex-1 h-2.5 rounded-full bg-gray-100 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6, ease: 'easeOut' }}
                      className="h-full rounded-full bg-[#F5B301]"
                    />
                  </div>
                  <span className="w-8 text-right text-gray-500 font-inter tabular-nums">{count}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3 mb-6">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by parent, student, phone or comment" wrapperClassName="flex-1 lg:max-w-md" />
        <SegmentedControl
          ariaLabel="Filter by rating"
          value={minRating}
          onChange={setMinRating}
          options={[
            { value: 'all', label: 'All ratings' },
            { value: '5', label: '5★' },
            { value: '4', label: '4★' },
            { value: 'low', label: '3★ & below' },
          ]}
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value as 'all' | Status)}
          className="px-4 py-2.5 border border-gray-200 rounded-full text-sm text-gray-700 bg-white outline-none focus:border-primary"
          aria-label="Filter by status"
        >
          <option value="all">All statuses</option>
          <option value="new">New</option>
          <option value="reviewed">Reviewed</option>
        </select>
      </div>

      {error && <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-base rounded-lg">{error}</div>}

      {loading ? (
        <SkeletonCard count={3} />
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm py-16 text-center">
          <p className="text-base text-gray-600">{rows.length === 0 ? 'No parent reviews yet.' : 'No reviews match your filters.'}</p>
          <p className="text-sm text-gray-400 mt-1">Parents can write one from the &ldquo;Parent&apos;s Feedback&rdquo; link in the website footer.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-100">
            <AnimatePresence initial={false}>
              {paging.pageItems.map((r) => (
                <motion.div
                  key={r.id}
                  layout
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className={`px-5 py-5 flex gap-4 hover:bg-gray-50/70 transition-colors border-l-2 ${r.status === 'new' ? 'border-primary' : 'border-transparent'}`}
                >
                  <span className="w-11 h-11 shrink-0 rounded-full bg-accent2 text-primary flex items-center justify-center text-sm font-semibold">
                    {initials(r.parentName) || 'P'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-base text-primary font-medium">{r.parentName}</p>
                          {r.status === 'new' && (
                            <span className="text-[10px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded bg-primary text-white">New</span>
                          )}
                        </div>
                        {r.phone && (
                          <a href={`tel:${r.phone.replace(/\s/g, '')}`} className="text-sm text-gray-500 font-inter hover:text-primary">{r.phone}</a>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <div className="flex items-center justify-end gap-2">
                          <StarRating value={r.rating} size={16} />
                          {r.rating && <span className="text-sm text-gray-500 font-inter">{r.rating}/5</span>}
                        </div>
                        <p className="text-xs text-gray-400 mt-1.5">{formatDateTimeIST(r.createdAt)} · {timeAgo(r.createdAt)}</p>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-1.5">
                      <span className="text-xs text-gray-500 mr-1">
                        {r.studentCount} student{r.studentCount === 1 ? '' : 's'} at OCTET:
                      </span>
                      {r.studentNames.map((n, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 rounded-md bg-[#F1EEF5] text-primary">{n}</span>
                      ))}
                    </div>

                    <p className="mt-3 text-[15px] leading-relaxed text-gray-700 whitespace-pre-wrap break-words bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
                      {r.comment}
                    </p>

                    <div className="mt-3 flex items-center gap-2">
                      <button
                        onClick={() => setRowStatus(r, r.status === 'new' ? 'reviewed' : 'new')}
                        disabled={busyId === r.id}
                        className={`px-3 py-1.5 text-sm rounded-md border transition-colors disabled:opacity-50 ${
                          r.status === 'new' ? 'border-primary text-primary hover:bg-[#f5f0fa]' : 'border-gray-200 text-gray-600 hover:border-gray-400'
                        }`}
                      >
                        {r.status === 'new' ? 'Mark as reviewed' : 'Mark as new'}
                      </button>
                      <button
                        onClick={() => remove(r)}
                        disabled={busyId === r.id}
                        className="px-3 py-1.5 text-sm rounded-md border border-gray-200 text-gray-500 hover:border-rose-300 hover:text-rose-600 transition-colors disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          <Pagination
            page={paging.page} pageCount={paging.pageCount} pageSize={paging.pageSize} total={paging.total}
            onPageChange={paging.setPage} onPageSizeChange={paging.setPageSize} label="reviews"
          />
        </div>
      )}
    </div>
  )
}
