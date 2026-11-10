'use client'

// Admin > Students > Feedbacks
// Everything students send from /student/feedback (Bug / Suggestion / General
// + star rating), with the student's name, batch and grade. Data: /api/feedback.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { authedFetch } from '@/lib/apiClient'
import { formatDateTimeIST, timeAgo } from '@/lib/helpers'
import Pagination, { usePagination } from '@/components/ui/Pagination'
import SearchInput from '@/components/ui/SearchInput'
import SegmentedControl from '@/components/ui/SegmentedControl'
import StarRating from '@/components/shared/StarRating'
import { SkeletonCard } from '@/components/ui/Skeleton'

type FeedbackType = 'bug' | 'suggestion' | 'general'
type Status = 'new' | 'reviewed'

interface StudentFeedback {
  id: string
  type: FeedbackType
  area: string | null
  details: string
  rating: number | null
  status: Status
  createdAt: string
  student: {
    name: string
    email: string | null
    admissionNumber: string | null
    grade: string | null
    batchId: string | null
    batchName: string | null
  }
}

export const TYPE_STYLE: Record<FeedbackType, { label: string; cls: string }> = {
  general: { label: 'General', cls: 'bg-violet-50 text-violet-700 border-violet-100' },
  suggestion: { label: 'Suggestion', cls: 'bg-amber-50 text-amber-700 border-amber-100' },
  bug: { label: 'Bug', cls: 'bg-rose-50 text-rose-700 border-rose-100' },
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase()
}

export function StatCard({ label, value, sub, accent }: { label: string; value: React.ReactNode; sub?: React.ReactNode; accent?: string }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm px-5 py-4">
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-semibold mt-1 font-inter tabular-nums" style={{ color: accent ?? '#5e4075' }}>{value}</p>
      {sub && <div className="mt-1 text-xs text-gray-400">{sub}</div>}
    </div>
  )
}

export default function StudentFeedbackTab() {
  const [rows, setRows] = useState<StudentFeedback[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [type, setType] = useState<'all' | FeedbackType>('all')
  const [status, setStatus] = useState<'all' | Status>('all')
  const [batch, setBatch] = useState('')
  const [search, setSearch] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const d = await authedFetch('/api/feedback')
      setRows(d.feedback ?? [])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load feedback')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const batches = useMemo(() => {
    const m = new Map<string, string>()
    rows.forEach((r) => r.student.batchId && m.set(r.student.batchId, r.student.batchName || r.student.batchId))
    return Array.from(m.entries())
  }, [rows])

  const stats = useMemo(() => {
    const rated = rows.filter((r) => r.rating)
    const avg = rated.length ? rated.reduce((s, r) => s + (r.rating ?? 0), 0) / rated.length : null
    return {
      total: rows.length,
      fresh: rows.filter((r) => r.status === 'new').length,
      avg,
      ratedCount: rated.length,
      general: rows.filter((r) => r.type === 'general').length,
      bug: rows.filter((r) => r.type === 'bug').length,
      suggestion: rows.filter((r) => r.type === 'suggestion').length,
    }
  }, [rows])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter((r) => {
      if (type !== 'all' && r.type !== type) return false
      if (status !== 'all' && r.status !== status) return false
      if (batch && r.student.batchId !== batch) return false
      if (!q) return true
      return [r.student.name, r.student.email, r.student.admissionNumber, r.student.grade, r.details]
        .some((v) => v?.toLowerCase().includes(q))
    })
  }, [rows, type, status, batch, search])

  const paging = usePagination(filtered)
  const resetPage = paging.setPage
  useEffect(() => { resetPage(1) }, [type, status, batch, search, resetPage])

  async function setRowStatus(r: StudentFeedback, next: Status) {
    setBusyId(r.id)
    try {
      await authedFetch(`/api/feedback/${r.id}`, { method: 'PATCH', body: JSON.stringify({ status: next }) })
      setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, status: next } : x)))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed')
    } finally {
      setBusyId(null)
    }
  }

  async function remove(r: StudentFeedback) {
    if (!window.confirm(`Delete this feedback from ${r.student.name}? This cannot be undone.`)) return
    setBusyId(r.id)
    try {
      await authedFetch(`/api/feedback/${r.id}`, { method: 'DELETE' })
      setRows((prev) => prev.filter((x) => x.id !== r.id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total feedback" value={stats.total} sub={stats.fresh > 0 ? `${stats.fresh} new to review` : 'All reviewed'} />
        <StatCard
          label="Average rating"
          value={stats.avg ? stats.avg.toFixed(1) : '—'}
          accent="#B7791F"
          sub={stats.avg ? <span className="inline-flex items-center gap-1.5"><StarRating value={Math.round(stats.avg)} size={12} /> {stats.ratedCount} rated</span> : 'No ratings yet'}
        />
        <StatCard label="General comments" value={stats.general} accent="#6f4f8e" />
        <StatCard label="Bugs · Suggestions" value={`${stats.bug} · ${stats.suggestion}`} accent="#be123c" sub="PDF notes" />
      </div>

      {/* Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center gap-3">
        <SearchInput value={search} onChange={setSearch} placeholder="Search by student, roll, grade or text" wrapperClassName="flex-1 lg:max-w-md" />
        <SegmentedControl
          ariaLabel="Filter by type"
          value={type}
          onChange={setType}
          options={[
            { value: 'all', label: 'All' },
            { value: 'general', label: 'General' },
            { value: 'bug', label: 'Bug' },
            { value: 'suggestion', label: 'Suggestion' },
          ]}
        />
        <div className="flex gap-3">
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
          <select
            value={batch}
            onChange={(e) => setBatch(e.target.value)}
            className="px-4 py-2.5 border border-gray-200 rounded-full text-sm text-gray-700 bg-white outline-none focus:border-primary"
            aria-label="Filter by batch"
          >
            <option value="">All batches</option>
            {batches.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
          </select>
        </div>
      </div>

      {error && <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-base rounded-lg">{error}</div>}

      {/* List */}
      {loading ? (
        <SkeletonCard count={3} />
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm py-16 text-center">
          <p className="text-base text-gray-600">{rows.length === 0 ? 'No feedback from students yet.' : 'No feedback matches your filters.'}</p>
          <p className="text-sm text-gray-400 mt-1">Students send feedback from the Feedback page in their portal.</p>
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
                  className={`px-5 py-5 flex gap-4 transition-colors hover:bg-gray-50/70 ${r.status === 'new' ? 'border-l-2 border-primary' : 'border-l-2 border-transparent'}`}
                >
                  <span className="w-11 h-11 shrink-0 rounded-full bg-[#F1EEF5] text-primary flex items-center justify-center text-sm font-semibold">
                    {initials(r.student.name)}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-base text-primary font-medium">{r.student.name}</p>
                          {r.status === 'new' && (
                            <span className="text-[10px] uppercase tracking-wide font-semibold px-1.5 py-0.5 rounded bg-primary text-white">New</span>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                          <Chip>{r.student.batchName ?? 'No batch'}</Chip>
                          <Chip>Grade {r.student.grade ?? '—'}</Chip>
                          {r.student.admissionNumber && <Chip mono>{r.student.admissionNumber}</Chip>}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <span className={`inline-block text-xs font-medium px-2.5 py-1 rounded-full border ${TYPE_STYLE[r.type].cls}`}>
                          {TYPE_STYLE[r.type].label}{r.type !== 'general' && r.area === 'pdf' ? ' · PDF' : ''}
                        </span>
                        <p className="text-xs text-gray-400 mt-1.5" title={formatDateTimeIST(r.createdAt)}>
                          {formatDateTimeIST(r.createdAt)} · {timeAgo(r.createdAt)}
                        </p>
                      </div>
                    </div>

                    {r.rating && (
                      <div className="mt-3 flex items-center gap-2">
                        <StarRating value={r.rating} size={16} />
                        <span className="text-sm text-gray-500 font-inter">{r.rating}/5</span>
                      </div>
                    )}

                    <p className="mt-3 text-[15px] leading-relaxed text-gray-700 whitespace-pre-wrap break-words bg-gray-50 border border-gray-100 rounded-xl px-4 py-3">
                      {r.details}
                    </p>

                    <div className="mt-3 flex items-center gap-2">
                      <button
                        onClick={() => setRowStatus(r, r.status === 'new' ? 'reviewed' : 'new')}
                        disabled={busyId === r.id}
                        className={`px-3 py-1.5 text-sm rounded-md border transition-colors disabled:opacity-50 ${
                          r.status === 'new'
                            ? 'border-primary text-primary hover:bg-[#f5f0fa]'
                            : 'border-gray-200 text-gray-600 hover:border-gray-400'
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
            onPageChange={paging.setPage} onPageSizeChange={paging.setPageSize} label="feedback"
          />
        </div>
      )}
    </div>
  )
}

function Chip({ children, mono }: { children: React.ReactNode; mono?: boolean }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-md bg-gray-100 text-gray-600 ${mono ? 'font-inter' : ''}`}>{children}</span>
  )
}
