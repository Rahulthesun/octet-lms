'use client'

// Admin > Exam Documents
//
// Create an exam event, open the hall-ticket window (students are notified by
// in-app notification + email through the existing notification engine), open
// the results window after the exam date, and track who has submitted what.
// Every figure comes from /api/exam-documents.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { authedFetch } from '@/lib/apiClient'

interface ExamEvent {
  id: string
  name: string
  examDate: string
  audience: 'BATCH' | 'ALL'
  batchIds: string[]
  hallTicketOpenedAt: string | null
  resultsOpenedAt: string | null
  targetedCount: number
  hallTicketSubmitted: number
  marksheetSubmitted: number
}

interface Submission {
  status: 'submitted' | 'pending'
  entryMode?: 'UPLOAD' | 'MANUAL'
  fileName?: string | null
  fileUrl?: string | null
  marksObtained?: number | null
  maxMarks?: number | null
  grade?: string | null
  submittedAt?: string
}

interface TrackingRow {
  studentId: string
  name: string
  email: string | null
  admissionNumber: string | null
  batch: string | null
  hallTicket: Submission
  marksheet: Submission
  inactive: boolean
}

interface Tracking {
  event: ExamEvent
  summary: { targeted: number; hallTicketSubmitted: number; marksheetSubmitted: number }
  rows: TrackingRow[]
}

interface Batch {
  id: string
  name: string
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return '-'
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

const todayIso = () => new Date().toLocaleDateString('en-CA')

export default function ExamsPage() {
  const [events, setEvents] = useState<ExamEvent[]>([])
  const [batches, setBatches] = useState<Batch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  // Create form
  const [name, setName] = useState('')
  const [examDate, setExamDate] = useState('')
  const [allStudents, setAllStudents] = useState(false)
  const [selectedBatches, setSelectedBatches] = useState<string[]>([])
  const [creating, setCreating] = useState(false)

  // Tracking
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [tab, setTab] = useState<'hall-ticket' | 'marksheet'>('hall-ticket')
  const [pendingOnly, setPendingOnly] = useState(false)
  const [tracking, setTracking] = useState<Tracking | null>(null)
  const [trackingLoading, setTrackingLoading] = useState(false)
  const [busyAction, setBusyAction] = useState<string | null>(null)

  const loadEvents = useCallback(async () => {
    try {
      const json = await authedFetch('/api/exam-documents/events')
      setEvents(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load exam events')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadEvents()
    authedFetch('/api/attendance/batches')
      .then((json) => setBatches(json.batches ?? []))
      .catch(() => setBatches([]))
  }, [loadEvents])

  const loadTracking = useCallback(async () => {
    if (!selectedId) return
    setTrackingLoading(true)
    try {
      const params = new URLSearchParams({ kind: tab })
      if (pendingOnly) params.set('pendingOnly', 'true')
      setTracking(await authedFetch(`/api/exam-documents/events/${selectedId}/tracking?${params.toString()}`))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load tracking')
    } finally {
      setTrackingLoading(false)
    }
  }, [selectedId, tab, pendingOnly])

  useEffect(() => {
    loadTracking()
  }, [loadTracking])

  const toggleAll = (checked: boolean) => {
    setAllStudents(checked)
    if (checked) setSelectedBatches([]) // All Students already includes every batch
  }

  const toggleBatch = (id: string) => {
    setAllStudents(false)
    setSelectedBatches((prev) => (prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]))
  }

  const createEvent = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setNotice(null)
    if (!name.trim() || !examDate) {
      setError('Exam name and exam date are required.')
      return
    }
    if (!allStudents && selectedBatches.length === 0) {
      setError('Choose All Students or at least one batch.')
      return
    }
    setCreating(true)
    try {
      await authedFetch('/api/exam-documents/events', {
        method: 'POST',
        body: JSON.stringify({ name: name.trim(), examDate, allStudents, batchIds: selectedBatches }),
      })
      setName('')
      setExamDate('')
      setAllStudents(false)
      setSelectedBatches([])
      setNotice('Exam event created. Open the hall ticket window when you are ready to prompt students.')
      await loadEvents()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create exam event')
    } finally {
      setCreating(false)
    }
  }

  const openWindow = async (ev: ExamEvent, kind: 'open-hall-ticket' | 'open-results') => {
    const label = kind === 'open-hall-ticket' ? 'hall ticket' : 'results'
    const ok = window.confirm(
      `Open the ${label} window for ${ev.name}? Every student in this exam will get an in-app notification and an email now.`
    )
    if (!ok) return
    setError(null)
    setNotice(null)
    setBusyAction(`${ev.id}:${kind}`)
    try {
      const res = await authedFetch(`/api/exam-documents/events/${ev.id}/${kind}`, { method: 'POST' })
      setNotice(`Window opened. ${res.notified} student(s) notified, ${res.emailed} email(s) sent.`)
      await loadEvents()
      if (selectedId === ev.id) await loadTracking()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open window')
    } finally {
      setBusyAction(null)
    }
  }

  const batchName = useMemo(() => Object.fromEntries(batches.map((b) => [b.id, b.name])), [batches])
  const audienceLabel = (ev: ExamEvent) =>
    ev.audience === 'ALL' ? 'All Students' : ev.batchIds.map((b) => batchName[b] ?? b).join(', ')

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Exam Documents</h1>
        <p className="text-base text-gray-600 mt-1">
          Collect each student&apos;s board exam hall ticket and final 12th marksheet, and see who is still pending.
        </p>
      </div>

      {error && <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-base rounded-lg">{error}</div>}
      {notice && <div className="mb-6 px-4 py-3 bg-green-50 border border-green-200 text-green-700 text-base rounded-lg">{notice}</div>}

      {/* Create event */}
      <form onSubmit={createEvent} className="bg-white rounded-2xl shadow-sm p-6 mb-8">
        <h2 className="text-lg text-primary mb-4">New exam event</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-sm text-gray-500 block mb-1" htmlFor="exam-name">Exam name</label>
            <input
              id="exam-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Chemistry"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-base text-primary outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="text-sm text-gray-500 block mb-1" htmlFor="exam-date">Exam date</label>
            <input
              id="exam-date"
              type="date"
              value={examDate}
              onChange={(e) => setExamDate(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-base text-primary font-inter outline-none focus:border-primary"
            />
          </div>
        </div>
        <p className="text-sm text-gray-500 mb-2">Applies to</p>
        <div className="flex flex-wrap gap-2 mb-5">
          <button
            type="button"
            onClick={() => toggleAll(!allStudents)}
            className={`px-4 py-2 text-base rounded-full border transition-colors ${
              allStudents ? 'bg-primary text-white border-primary' : 'border-gray-200 text-gray-600 hover:border-gray-400'
            }`}
          >
            All Students
          </button>
          {batches.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => toggleBatch(b.id)}
              className={`px-4 py-2 text-base rounded-full border transition-colors ${
                selectedBatches.includes(b.id) ? 'bg-primary text-white border-primary' : 'border-gray-200 text-gray-600 hover:border-gray-400'
              }`}
            >
              {b.name}
            </button>
          ))}
        </div>
        <button
          type="submit"
          disabled={creating}
          className="px-6 py-2.5 bg-primary text-white text-base rounded-lg hover:opacity-90 disabled:opacity-50"
        >
          {creating ? 'Creating...' : 'Create exam event'}
        </button>
      </form>

      {/* Events */}
      <h2 className="text-lg text-primary mb-3">Exam events</h2>
      {loading ? (
        <p className="text-base text-gray-600">Loading exam events...</p>
      ) : events.length === 0 ? (
        <p className="text-base text-gray-600">No exam events yet. Create one above.</p>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-10">
          {events.map((ev) => {
            const examPassed = ev.examDate < todayIso()
            const selected = selectedId === ev.id
            return (
              <div
                key={ev.id}
                className={`bg-white rounded-2xl shadow-sm p-5 border-2 ${selected ? 'border-primary' : 'border-transparent'}`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <h3 className="text-lg text-primary">{ev.name}</h3>
                    <p className="text-base text-gray-600">
                      Exam on {formatDate(ev.examDate)} - {audienceLabel(ev)}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedId(selected ? null : ev.id)
                      setTracking(null)
                    }}
                    className="px-3 py-1.5 text-base border border-primary text-primary rounded-md hover:bg-primary hover:text-white transition-colors shrink-0"
                  >
                    {selected ? 'Hide tracking' : 'View tracking'}
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm text-gray-500">Students</p>
                    <p className="text-xl text-primary font-inter">{ev.targetedCount}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm text-gray-500">Hall tickets</p>
                    <p className="text-xl text-primary font-inter">{ev.hallTicketSubmitted}/{ev.targetedCount}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm text-gray-500">Marksheets</p>
                    <p className="text-xl text-primary font-inter">{ev.marksheetSubmitted}/{ev.targetedCount}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => openWindow(ev, 'open-hall-ticket')}
                    disabled={!!ev.hallTicketOpenedAt || examPassed || busyAction === `${ev.id}:open-hall-ticket`}
                    className="px-4 py-2 text-base bg-primary text-white rounded-lg hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    {ev.hallTicketOpenedAt ? `Hall ticket window open since ${formatDate(ev.hallTicketOpenedAt)}` : 'Open hall ticket window'}
                  </button>
                  <button
                    onClick={() => openWindow(ev, 'open-results')}
                    disabled={!!ev.resultsOpenedAt || !examPassed || busyAction === `${ev.id}:open-results`}
                    title={!examPassed ? 'Available after the exam date has passed' : undefined}
                    className="px-4 py-2 text-base border border-primary text-primary rounded-lg hover:bg-primary hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    {ev.resultsOpenedAt ? `Results window open since ${formatDate(ev.resultsOpenedAt)}` : 'Open results window'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Tracking table */}
      {selectedId && (
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg text-primary">{tracking?.event.name ?? 'Tracking'}</h2>
              {tracking && (
                <p className="text-sm text-gray-500">
                  {tracking.summary.hallTicketSubmitted} of {tracking.summary.targeted} hall tickets and{' '}
                  {tracking.summary.marksheetSubmitted} of {tracking.summary.targeted} marksheets submitted
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex border border-gray-200 rounded-full overflow-hidden">
                {(['hall-ticket', 'marksheet'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`px-4 py-1.5 text-base transition-colors ${tab === t ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-50'}`}
                  >
                    {t === 'hall-ticket' ? 'Hall tickets' : 'Marksheets'}
                  </button>
                ))}
              </div>
              <label className="flex items-center gap-2 text-base text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={pendingOnly}
                  onChange={(e) => setPendingOnly(e.target.checked)}
                  className="w-4 h-4 accent-[#5e4075]"
                />
                Pending only
              </label>
            </div>
          </div>

          <div className="hidden lg:grid lg:grid-cols-[1fr_150px_130px_120px_140px_1fr] gap-3 px-5 py-3 text-base text-gray-600 border-b border-gray-200 bg-gray-50">
            <span>Student</span>
            <span>Roll</span>
            <span>Batch</span>
            <span>Status</span>
            <span>Submitted</span>
            <span>File or marks</span>
          </div>
          <div className="divide-y divide-gray-100">
            {trackingLoading && !tracking ? (
              <div className="py-10 text-center text-gray-600 text-base">Loading...</div>
            ) : !tracking || tracking.rows.length === 0 ? (
              <div className="py-10 text-center text-gray-600 text-base">
                {pendingOnly ? 'Nobody is pending. Every student has submitted.' : 'No students for this exam.'}
              </div>
            ) : (
              tracking.rows.map((r) => {
                const sub = tab === 'hall-ticket' ? r.hallTicket : r.marksheet
                return (
                  <div
                    key={r.studentId}
                    className="flex flex-wrap lg:grid lg:grid-cols-[1fr_150px_130px_120px_140px_1fr] gap-3 px-5 py-3.5 items-center hover:bg-gray-50"
                  >
                    <div className="min-w-0 flex-1 lg:flex-none">
                      <p className="text-base text-primary truncate">{r.name}</p>
                      <p className="text-sm text-gray-500 truncate">{r.email}</p>
                    </div>
                    <span className="text-base font-inter text-gray-600">{r.admissionNumber || '-'}</span>
                    <span className="text-base text-gray-600">{r.batch || '-'}</span>
                    <span
                      className={`inline-flex w-fit items-center gap-1.5 text-sm px-2.5 py-0.5 rounded-full ${
                        sub.status === 'submitted' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${sub.status === 'submitted' ? 'bg-green-500' : 'bg-amber-500'}`} />
                      {sub.status === 'submitted' ? 'Submitted' : 'Pending'}
                    </span>
                    <span className="text-base text-gray-600">{sub.submittedAt ? formatDate(sub.submittedAt) : '-'}</span>
                    <div className="flex flex-wrap items-center gap-2">
                      {sub.status === 'submitted' && sub.entryMode === 'MANUAL' && (
                        <span className="text-base text-gray-700">
                          Marks entered: {sub.marksObtained}/{sub.maxMarks}
                          {sub.grade ? ` (${sub.grade})` : ''}
                        </span>
                      )}
                      {sub.status === 'submitted' && sub.fileUrl && (
                        <>
                          <a
                            href={sub.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 text-sm border border-primary text-primary rounded-md hover:bg-primary hover:text-white transition-colors"
                          >
                            View
                          </a>
                          <a
                            href={sub.fileUrl}
                            download={sub.fileName || undefined}
                            className="px-2.5 py-1 text-sm border border-gray-300 text-gray-600 rounded-md hover:bg-gray-100 transition-colors"
                          >
                            Download
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
