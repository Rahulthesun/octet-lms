'use client'

// Admin > Exam Documents
//
// Create an exam event, open the hall-ticket window (students are notified by
// in-app notification + email through the existing notification engine), open
// the results window after the exam date, and track who has submitted what.
// Every figure comes from /api/exam-documents.
//
// Creating and editing go through a review step (ConfirmDialog) so the admin
// re-checks name, date and audience before anything is saved; events can be
// edited or deleted from their card.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { authedFetch } from '@/lib/apiClient'
import Pagination, { usePagination } from '@/components/ui/Pagination'
import PageHeader from '@/components/ui/PageHeader'
import ConfirmDialog, { SummaryRow } from '@/components/ui/ConfirmDialog'
import { btnPrimary, btnSecondary, btnSecondarySm, btnDangerSm } from '@/components/ui/buttonStyles'
import { todayISODate } from '@/lib/helpers'

interface ExamEvent {
  id: string
  name: string
  examDate: string
  audience: 'BATCH' | 'ALL'
  batchIds: string[]
  hallTicketOpenedAt: string | null
  resultsOpenedAt: string | null
  hallTicketClosesOn: string | null
  resultsClosesOn: string | null
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

interface EventForm {
  name: string
  examDate: string
  allStudents: boolean
  batchIds: string[]
}

const EMPTY_FORM: EventForm = { name: '', examDate: '', allStudents: false, batchIds: [] }

function formatDate(iso: string | null | undefined) {
  if (!iso) return '-'
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

/** "Fri, 30 Oct 2026" for a YYYY-MM-DD value, without timezone drift. */
function formatLongDate(ymd: string) {
  if (!ymd) return '-'
  const [y, m, d] = ymd.split('-').map(Number)
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })
}

function validateForm(form: EventForm, originalDate?: string): string | null {
  if (!form.name.trim()) return 'Enter the exam name.'
  if (!form.examDate) return 'Choose the exam date.'
  if (form.examDate < todayISODate() && form.examDate !== originalDate) return 'The exam date cannot be in the past.'
  if (!form.allStudents && form.batchIds.length === 0) return 'Choose All Students or at least one batch.'
  return null
}

// ─── Form fields (shared by create + edit) ───────────────────────────────────

function EventFields({ form, setForm, batches, idPrefix, minDate }: {
  form: EventForm
  setForm: (f: EventForm) => void
  batches: Batch[]
  idPrefix: string
  minDate: string
}) {
  const toggleAll = () => setForm({ ...form, allStudents: !form.allStudents, batchIds: [] })
  const toggleBatch = (id: string) =>
    setForm({
      ...form,
      allStudents: false,
      batchIds: form.batchIds.includes(id) ? form.batchIds.filter((b) => b !== id) : [...form.batchIds, id],
    })
  const chip = (active: boolean) =>
    `px-4 py-1.5 text-sm rounded-full border transition-colors ${
      active ? 'bg-action text-white border-action' : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400'
    }`

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="text-sm text-gray-500 block mb-1" htmlFor={`${idPrefix}-name`}>Exam name</label>
          <input
            id={`${idPrefix}-name`}
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Chemistry board exam"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-base text-gray-900 outline-none focus:border-action"
          />
        </div>
        <div>
          <label className="text-sm text-gray-500 block mb-1" htmlFor={`${idPrefix}-date`}>Exam date</label>
          <input
            id={`${idPrefix}-date`}
            type="date"
            value={form.examDate}
            min={minDate}
            onChange={(e) => setForm({ ...form, examDate: e.target.value })}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-base text-gray-900 font-inter outline-none focus:border-action"
          />
        </div>
      </div>
      <p className="text-sm text-gray-500 mb-2">Applies to</p>
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={toggleAll} className={chip(form.allStudents)}>All Students</button>
        {batches.map((b) => (
          <button key={b.id} type="button" onClick={() => toggleBatch(b.id)} className={chip(form.batchIds.includes(b.id))}>
            {b.name}
          </button>
        ))}
      </div>
    </>
  )
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function ExamsPage() {
  const [events, setEvents] = useState<ExamEvent[]>([])
  const [batches, setBatches] = useState<Batch[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  // Create
  const [form, setForm] = useState<EventForm>(EMPTY_FORM)
  const [reviewingCreate, setReviewingCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  // Edit
  const [editing, setEditing] = useState<ExamEvent | null>(null)
  const [editForm, setEditForm] = useState<EventForm>(EMPTY_FORM)
  const [editStep, setEditStep] = useState<'form' | 'review'>('form')
  const [saving, setSaving] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)

  // Delete
  const [deleting, setDeleting] = useState<ExamEvent | null>(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Tracking
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [tab, setTab] = useState<'hall-ticket' | 'marksheet'>('hall-ticket')
  const [pendingOnly, setPendingOnly] = useState(false)
  const [tracking, setTracking] = useState<Tracking | null>(null)
  const [trackingLoading, setTrackingLoading] = useState(false)
  const trackingPaging = usePagination(tracking?.rows ?? [])
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

  const batchName = useMemo(() => Object.fromEntries(batches.map((b) => [b.id, b.name])), [batches])
  const audienceText = (allStudents: boolean, ids: string[]) =>
    allStudents ? 'All Students' : ids.map((b) => batchName[b] ?? b).join(', ')
  const audienceLabel = (ev: ExamEvent) => audienceText(ev.audience === 'ALL', ev.batchIds)

  // ── Create: validate -> review dialog -> save ──
  const reviewCreate = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setNotice(null)
    const invalid = validateForm(form)
    if (invalid) {
      setError(invalid)
      return
    }
    setCreateError(null)
    setReviewingCreate(true)
  }

  const confirmCreate = async () => {
    setCreating(true)
    setCreateError(null)
    try {
      await authedFetch('/api/exam-documents/events', {
        method: 'POST',
        body: JSON.stringify({ name: form.name.trim(), examDate: form.examDate, allStudents: form.allStudents, batchIds: form.batchIds }),
      })
      setForm(EMPTY_FORM)
      setReviewingCreate(false)
      setNotice('Exam event created. Open the hall ticket window when you are ready to prompt students.')
      await loadEvents()
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create exam event')
    } finally {
      setCreating(false)
    }
  }

  // ── Edit: form -> review changes -> save ──
  const startEdit = (ev: ExamEvent) => {
    setEditing(ev)
    setEditForm({ name: ev.name, examDate: ev.examDate, allStudents: ev.audience === 'ALL', batchIds: ev.batchIds })
    setEditStep('form')
    setEditError(null)
  }

  const editChanges = useMemo(() => {
    if (!editing) return []
    const changes: { label: string; from: string; to: string }[] = []
    if (editForm.name.trim() !== editing.name) changes.push({ label: 'Exam name', from: editing.name, to: editForm.name.trim() })
    if (editForm.examDate !== editing.examDate) {
      changes.push({ label: 'Exam date', from: formatLongDate(editing.examDate), to: formatLongDate(editForm.examDate) })
    }
    const before = audienceLabel(editing)
    const after = audienceText(editForm.allStudents, editForm.batchIds)
    if (before !== after) changes.push({ label: 'Applies to', from: before, to: after })
    return changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editing, editForm, batchName])

  const reviewEdit = () => {
    if (!editing) return
    const invalid = validateForm(editForm, editing.examDate)
    if (invalid) {
      setEditError(invalid)
      return
    }
    if (editChanges.length === 0) {
      setEditError('Nothing has changed yet.')
      return
    }
    setEditError(null)
    setEditStep('review')
  }

  const confirmEdit = async () => {
    if (!editing) return
    setSaving(true)
    setEditError(null)
    try {
      await authedFetch(`/api/exam-documents/events/${editing.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: editForm.name.trim(),
          examDate: editForm.examDate,
          allStudents: editForm.allStudents,
          batchIds: editForm.batchIds,
        }),
      })
      setEditing(null)
      setNotice('Exam event updated.')
      await loadEvents()
      if (selectedId === editing.id) await loadTracking()
    } catch (err) {
      setEditError(err instanceof Error ? err.message : 'Failed to update exam event')
      setEditStep('form')
    } finally {
      setSaving(false)
    }
  }

  // ── Delete ──
  const confirmDelete = async () => {
    if (!deleting) return
    setDeleteBusy(true)
    setDeleteError(null)
    try {
      await authedFetch(`/api/exam-documents/events/${deleting.id}`, { method: 'DELETE' })
      if (selectedId === deleting.id) {
        setSelectedId(null)
        setTracking(null)
      }
      setNotice(`"${deleting.name}" was deleted.`)
      setDeleting(null)
      await loadEvents()
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete exam event')
    } finally {
      setDeleteBusy(false)
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

  const today = todayISODate()

  return (
    <div>
      <PageHeader
        title="Exam Documents"
        subtitle="Collect each student's board exam hall ticket and final 12th marksheet, and see who is still pending."
      />

      {error && <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">{error}</div>}
      {notice && <div className="mb-6 px-4 py-3 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg">{notice}</div>}

      {/* Create event */}
      <form onSubmit={reviewCreate} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">New exam event</h2>
        <EventFields form={form} setForm={setForm} batches={batches} idPrefix="new-exam" minDate={today} />
        <div className="mt-5">
          <button type="submit" className={btnPrimary}>Review &amp; create</button>
        </div>
      </form>

      {/* Events */}
      <h2 className="text-lg font-semibold text-gray-900 mb-3">Exam events</h2>
      {loading ? (
        <p className="text-base text-gray-600">Loading exam events...</p>
      ) : events.length === 0 ? (
        <p className="text-base text-gray-600">No exam events yet. Create one above.</p>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-10">
          {events.map((ev) => {
            const examPassed = ev.examDate < today
            const selected = selectedId === ev.id
            return (
              <div
                key={ev.id}
                className={`bg-white rounded-2xl shadow-sm p-5 border-2 ${selected ? 'border-action' : 'border-transparent'}`}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">{ev.name}</h3>
                    <p className="text-sm text-gray-600">
                      Exam on {formatDate(ev.examDate)} · {audienceLabel(ev)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => startEdit(ev)} className={btnSecondarySm}>Edit</button>
                    <button
                      onClick={() => { setDeleting(ev); setDeleteError(null) }}
                      className={btnDangerSm}
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm text-gray-500">Students</p>
                    <p className="text-xl text-gray-900 font-inter">{ev.targetedCount}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm text-gray-500">Hall tickets</p>
                    <p className="text-xl text-gray-900 font-inter">{ev.hallTicketSubmitted}/{ev.targetedCount}</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-3">
                    <p className="text-sm text-gray-500">Marksheets</p>
                    <p className="text-xl text-gray-900 font-inter">{ev.marksheetSubmitted}/{ev.targetedCount}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() => openWindow(ev, 'open-hall-ticket')}
                    disabled={!!ev.hallTicketOpenedAt || examPassed || busyAction === `${ev.id}:open-hall-ticket`}
                    className={btnPrimary}
                  >
                    {!ev.hallTicketOpenedAt
                      ? 'Open hall ticket window'
                      : ev.hallTicketClosesOn && ev.hallTicketClosesOn < today
                        ? `Hall ticket window closed on ${formatDate(ev.hallTicketClosesOn)}`
                        : `Hall ticket window open until ${formatDate(ev.hallTicketClosesOn ?? ev.examDate)}`}
                  </button>
                  <button
                    onClick={() => openWindow(ev, 'open-results')}
                    disabled={!!ev.resultsOpenedAt || !examPassed || busyAction === `${ev.id}:open-results`}
                    title={!examPassed ? 'Available after the exam date has passed' : undefined}
                    className={btnSecondary}
                  >
                    {!ev.resultsOpenedAt
                      ? 'Open results window'
                      : ev.resultsClosesOn && ev.resultsClosesOn < today
                        ? `Results window closed on ${formatDate(ev.resultsClosesOn)}`
                        : `Results window open until ${formatDate(ev.resultsClosesOn ?? ev.resultsOpenedAt)}`}
                  </button>
                  <button
                    onClick={() => {
                      setSelectedId(selected ? null : ev.id)
                      setTracking(null)
                    }}
                    className={btnSecondary}
                  >
                    {selected ? 'Hide tracking' : 'View tracking'}
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
              <h2 className="text-lg font-semibold text-gray-900">{tracking?.event.name ?? 'Tracking'}</h2>
              {tracking && (
                <p className="text-sm text-gray-500">
                  {tracking.summary.hallTicketSubmitted} of {tracking.summary.targeted} hall tickets and{' '}
                  {tracking.summary.marksheetSubmitted} of {tracking.summary.targeted} marksheets submitted
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center gap-1 p-1 bg-gray-100 rounded-lg" role="group" aria-label="Document type">
                {(['hall-ticket', 'marksheet'] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                      tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'
                    }`}
                  >
                    {t === 'hall-ticket' ? 'Hall tickets' : 'Marksheets'}
                  </button>
                ))}
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={pendingOnly}
                  onChange={(e) => setPendingOnly(e.target.checked)}
                  className="w-4 h-4 accent-violet-700"
                />
                Pending only
              </label>
            </div>
          </div>

          <div className="hidden lg:grid lg:grid-cols-[1fr_150px_130px_120px_140px_1fr] gap-3 px-5 py-3 text-sm text-gray-600 border-b border-gray-200 bg-gray-50">
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
              trackingPaging.pageItems.map((r) => {
                const sub = tab === 'hall-ticket' ? r.hallTicket : r.marksheet
                return (
                  <div
                    key={r.studentId}
                    className="flex flex-wrap lg:grid lg:grid-cols-[1fr_150px_130px_120px_140px_1fr] gap-3 px-5 py-3.5 items-center hover:bg-gray-50"
                  >
                    <div className="min-w-0 flex-1 lg:flex-none">
                      <p className="text-base text-gray-900 truncate">{r.name}</p>
                      <p className="text-sm text-gray-500 truncate">{r.email}</p>
                    </div>
                    <span className="text-sm font-inter text-gray-600">{r.admissionNumber || '-'}</span>
                    <span className="text-sm text-gray-600">{r.batch || '-'}</span>
                    <span
                      className={`inline-flex w-fit items-center gap-1.5 text-sm px-2.5 py-0.5 rounded-full ${
                        sub.status === 'submitted' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${sub.status === 'submitted' ? 'bg-green-500' : 'bg-amber-500'}`} />
                      {sub.status === 'submitted' ? 'Submitted' : 'Pending'}
                    </span>
                    <span className="text-sm text-gray-600">{sub.submittedAt ? formatDate(sub.submittedAt) : '-'}</span>
                    <div className="flex flex-wrap items-center gap-2">
                      {sub.status === 'submitted' && sub.entryMode === 'MANUAL' && (
                        <span className="text-sm text-gray-700">
                          Marks entered: {sub.marksObtained}/{sub.maxMarks}
                          {sub.grade ? ` (${sub.grade})` : ''}
                        </span>
                      )}
                      {sub.status === 'submitted' && sub.fileUrl && (
                        <>
                          <a href={sub.fileUrl} target="_blank" rel="noopener noreferrer" className={btnSecondarySm}>
                            View
                          </a>
                          <a href={sub.fileUrl} download={sub.fileName || undefined} className={btnSecondarySm}>
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
          <Pagination
            page={trackingPaging.page} pageCount={trackingPaging.pageCount} pageSize={trackingPaging.pageSize} total={trackingPaging.total}
            onPageChange={trackingPaging.setPage} onPageSizeChange={trackingPaging.setPageSize} label="students"
          />
        </div>
      )}

      {/* Review before create */}
      <ConfirmDialog
        open={reviewingCreate}
        title="Create this exam event?"
        description="Please check the details. Students are only notified later, when you open the hall ticket window."
        confirmLabel="Create exam event"
        busy={creating}
        error={createError}
        onConfirm={confirmCreate}
        onCancel={() => setReviewingCreate(false)}
      >
        <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 space-y-2">
          <SummaryRow label="Exam name" value={form.name.trim()} />
          <SummaryRow label="Exam date" value={formatLongDate(form.examDate)} />
          <SummaryRow label="Applies to" value={audienceText(form.allStudents, form.batchIds)} />
        </div>
      </ConfirmDialog>

      {/* Edit: form step */}
      <ConfirmDialog
        open={!!editing && editStep === 'form'}
        title="Edit exam event"
        description={editing?.hallTicketOpenedAt ? 'Students have already been notified about this exam. They will see the updated details.' : undefined}
        confirmLabel="Review changes"
        error={editError}
        onConfirm={reviewEdit}
        onCancel={() => setEditing(null)}
      >
        {editing && (
          <EventFields
            form={editForm}
            setForm={setEditForm}
            batches={batches}
            idPrefix="edit-exam"
            minDate={editing.examDate < today ? editing.examDate : today}
          />
        )}
      </ConfirmDialog>

      {/* Edit: review step */}
      <ConfirmDialog
        open={!!editing && editStep === 'review'}
        title="Save these changes?"
        confirmLabel="Save changes"
        cancelLabel="Back"
        busy={saving}
        error={editError}
        onConfirm={confirmEdit}
        onCancel={() => setEditStep('form')}
      >
        <ul className="space-y-2">
          {editChanges.map((c) => (
            <li key={c.label} className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-sm">
              <p className="text-gray-500 mb-1">{c.label}</p>
              <p className="text-gray-400 line-through">{c.from}</p>
              <p className="text-gray-900 font-medium">{c.to}</p>
            </li>
          ))}
        </ul>
      </ConfirmDialog>

      {/* Delete */}
      <ConfirmDialog
        open={!!deleting}
        title={`Delete "${deleting?.name ?? ''}"?`}
        description="This cannot be undone."
        confirmLabel="Delete exam event"
        tone="danger"
        busy={deleteBusy}
        error={deleteError}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      >
        {deleting && (deleting.hallTicketSubmitted > 0 || deleting.marksheetSubmitted > 0) ? (
          <p className="text-sm px-3 py-2.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200">
            {deleting.hallTicketSubmitted} hall ticket(s) and {deleting.marksheetSubmitted} marksheet(s) have already been
            submitted for this exam. Deleting it permanently removes those files too.
          </p>
        ) : (
          <p className="text-sm text-gray-600">No documents have been submitted for this exam yet.</p>
        )}
      </ConfirmDialog>
    </div>
  )
}
