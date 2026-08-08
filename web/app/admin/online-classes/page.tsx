'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  useAdminOnlineClasses,
  useGoogleAccountStatus,
  useSubjects,
  useAttendanceSettings,
  type OnlineClass,
  type OnlineClassStatus,
  type SyncStatus,
} from '@/hooks/useOnlineClasses'
import { useBatches, useBatchStudents } from '@/hooks/useAttendanceData'
import { formatDateInZone, formatTimeInZone, isoToZonedParts } from '@/lib/helpers'
import SessionAttendanceModal from '@/components/admin/SessionAttendanceModal'

const ACCENT = '#5B21B6'

const STATUS_STYLE: Record<OnlineClassStatus, { label: string; fg: string; bg: string }> = {
  scheduled: { label: 'Scheduled', fg: '#15803D', bg: '#F0FDF4' },
  rescheduled: { label: 'Rescheduled', fg: '#B45309', bg: '#FFFBEB' },
  cancelled: { label: 'Cancelled', fg: '#B91C1C', bg: '#FEF2F2' },
}

function StatusBadge({ status }: { status: OnlineClassStatus }) {
  const s = STATUS_STYLE[status]
  return (
    <span className="text-xs px-2.5 py-0.5 rounded-full font-medium" style={{ color: s.fg, backgroundColor: s.bg }}>
      {s.label}
    </span>
  )
}

const SYNC_STYLE: Partial<Record<SyncStatus, { label: string; fg: string; bg: string }>> = {
  NOT_STARTED: { label: 'Not started', fg: '#71717A', bg: '#F4F4F5' },
  LIVE: { label: 'Live', fg: '#5B21B6', bg: '#F5F3FF' },
  AWAITING_ATTENDANCE_SYNC: { label: 'Awaiting sync', fg: '#B45309', bg: '#FFFBEB' },
  SYNCED: { label: 'Synced', fg: '#15803D', bg: '#F0FDF4' },
  SYNC_FAILED: { label: 'Sync failed', fg: '#B91C1C', bg: '#FEF2F2' },
  MANUALLY_REVIEWED: { label: 'Reviewed', fg: '#0F766E', bg: '#F0FDFA' },
}

function SyncBadge({ status }: { status: SyncStatus | null }) {
  if (!status) return <span className="text-xs text-zinc-400">—</span>
  const s = SYNC_STYLE[status] || { label: status, fg: '#71717A', bg: '#F4F4F5' }
  return (
    <span className="text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap" style={{ color: s.fg, backgroundColor: s.bg }}>
      {s.label}
    </span>
  )
}

// ─── Online attendance settings panel ──────────────────────────────────────

function AttendanceSettingsPanel() {
  const { settings, loading, update } = useAttendanceSettings()
  const [open, setOpen] = useState(false)
  const [presentThreshold, setPresentThreshold] = useState(75)
  const [partialThreshold, setPartialThreshold] = useState(40)
  const [autoCalculate, setAutoCalculate] = useState(true)
  const [autoSync, setAutoSync] = useState(true)
  const [allowOverride, setAllowOverride] = useState(true)
  const [syncDelayMinutes, setSyncDelayMinutes] = useState(5)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!settings) return
    setPresentThreshold(settings.presentThreshold)
    setPartialThreshold(settings.partialThreshold)
    setAutoCalculate(settings.autoCalculate)
    setAutoSync(settings.autoSync)
    setAllowOverride(settings.allowOverride)
    setSyncDelayMinutes(settings.syncDelayMinutes)
  }, [settings])

  async function handleSave() {
    setSaving(true)
    try {
      await update({ presentThreshold, partialThreshold, autoCalculate, autoSync, allowOverride, syncDelayMinutes })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      console.error(e)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="border border-zinc-200 rounded-lg bg-white overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-5 py-3 text-sm font-medium text-zinc-900 hover:bg-zinc-50 transition-colors"
      >
        Online Attendance Settings
        <svg className={`w-4 h-4 text-zinc-400 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="none">
          <path d="M5 8l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div className="px-5 py-4 border-t border-zinc-200 space-y-4">
          {loading ? (
            <p className="text-xs text-zinc-400">Loading settings…</p>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4 max-w-sm">
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1.5">Present threshold (%)</label>
                  <input type="number" min={0} max={100} value={presentThreshold}
                    onChange={(e) => setPresentThreshold(Number(e.target.value))}
                    className="w-full text-sm rounded-md px-3 py-2 border border-zinc-300" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1.5">Partial threshold (%)</label>
                  <input type="number" min={0} max={100} value={partialThreshold}
                    onChange={(e) => setPartialThreshold(Number(e.target.value))}
                    className="w-full text-sm rounded-md px-3 py-2 border border-zinc-300" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1.5">Sync delay after class ends (minutes)</label>
                <input type="number" min={0} max={60} value={syncDelayMinutes}
                  onChange={(e) => setSyncDelayMinutes(Number(e.target.value))}
                  className="w-32 text-sm rounded-md px-3 py-2 border border-zinc-300" />
              </div>
              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm text-zinc-700">
                  <input type="checkbox" checked={autoCalculate} onChange={(e) => setAutoCalculate(e.target.checked)} />
                  Automatically calculate attendance
                </label>
                <label className="flex items-center gap-2 text-sm text-zinc-700">
                  <input type="checkbox" checked={autoSync} onChange={(e) => setAutoSync(e.target.checked)} />
                  Automatically sync attendance
                </label>
                <label className="flex items-center gap-2 text-sm text-zinc-700">
                  <input type="checkbox" checked={allowOverride} onChange={(e) => setAllowOverride(e.target.checked)} />
                  Allow admin override
                </label>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={handleSave} disabled={saving}
                  className="text-sm px-4 py-2 text-white rounded-md disabled:opacity-40 transition-colors" style={{ backgroundColor: ACCENT }}>
                  {saving ? 'Saving…' : 'Save Settings'}
                </button>
                {saved && <span className="text-xs text-emerald-600">Saved</span>}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Google account connection panel ───────────────────────────────────────

function GoogleAccountPanel() {
  const { status, loading, connect, disconnect } = useGoogleAccountStatus()
  const [busy, setBusy] = useState(false)

  async function handleConnect() {
    setBusy(true)
    try {
      await connect()
    } catch (e) {
      console.error(e)
      setBusy(false)
    }
  }

  async function handleDisconnect() {
    if (!confirm('Disconnect the Google account? Existing classes keep their Meet links, but new classes cannot be scheduled until you reconnect.')) return
    setBusy(true)
    try {
      await disconnect()
    } catch (e) {
      console.error(e)
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return <div className="text-xs text-zinc-400">Checking Google account…</div>
  }

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-zinc-200 bg-white">
      <span
        className={`w-2 h-2 rounded-full shrink-0 ${status?.connected ? 'bg-emerald-500' : 'bg-zinc-300'}`}
      />
      <div className="min-w-0">
        <p className="text-sm text-zinc-900">
          {status?.connected ? 'Google account connected' : 'Google account not connected'}
        </p>
        {status?.connected && status.email && (
          <p className="text-xs text-zinc-500 truncate">{status.email}</p>
        )}
      </div>
      <button
        onClick={status?.connected ? handleDisconnect : handleConnect}
        disabled={busy}
        className={`ml-2 shrink-0 text-xs px-3 py-1.5 rounded-md border transition-colors disabled:opacity-50 ${
          status?.connected
            ? 'border-zinc-300 text-zinc-600 hover:bg-zinc-100'
            : 'text-white border-transparent'
        }`}
        style={!status?.connected ? { backgroundColor: ACCENT } : undefined}
      >
        {busy ? 'Working…' : status?.connected ? 'Disconnect' : 'Connect Google Account'}
      </button>
    </div>
  )
}

// ─── Schedule modal ─────────────────────────────────────────────────────────

function ScheduleModal({ onClose, onScheduled, googleConnected }: {
  onClose: () => void
  onScheduled: () => void
  googleConnected: boolean
}) {
  const { schedule } = useAdminOnlineClasses()
  const { subjects } = useSubjects()
  const { batches } = useBatches('all')

  const [subjectId, setSubjectId] = useState('')
  const [batchId, setBatchId] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [createGoogleMeet, setCreateGoogleMeet] = useState(true)
  const [sendNotification, setSendNotification] = useState(true)
  const [extraStudentIds, setExtraStudentIds] = useState<string[]>([])
  const [showExtraStudents, setShowExtraStudents] = useState(false)

  const { students: batchStudents } = useBatchStudents(batchId || null, date || new Date().toISOString().slice(0, 10))

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSubmit = batchId && title.trim() && date && startTime && endTime

  async function handleSubmit() {
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    try {
      await schedule({
        batchId,
        subjectId: subjectId || undefined,
        title: title.trim(),
        description: description.trim() || undefined,
        date,
        startTime,
        endTime,
        extraStudentIds,
        createGoogleMeet,
        sendNotification,
      })
      onScheduled()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to schedule the online class')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 24, opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="bg-white w-full sm:max-w-lg shadow-2xl rounded-t-xl sm:rounded-xl border border-zinc-200 overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between shrink-0">
          <h3 className="text-sm font-semibold text-zinc-900">Schedule Online Class</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 text-xl leading-none">&times;</button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          {!googleConnected && (
            <div className="text-xs px-3 py-2.5 rounded-md bg-amber-50 text-amber-700 border border-amber-100">
              No Google account is connected. Connect one above before scheduling — otherwise no Google Meet can be created.
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1.5">Course / Subject</label>
            <select
              value={subjectId}
              onChange={(e) => setSubjectId(e.target.value)}
              className="w-full text-sm rounded-md px-3 py-2 border border-zinc-300 bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400"
            >
              <option value="">Select subject (optional)…</option>
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1.5">Topic</label>
            <input
              type="text" value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Introduction to TCP/IP"
              className="w-full text-sm rounded-md px-3 py-2 border border-zinc-300 bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1.5">Description</label>
            <textarea
              value={description} onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Optional notes for students"
              className="w-full text-sm rounded-md px-3 py-2 border border-zinc-300 bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400 resize-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1.5">Date</label>
              <input
                type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="w-full text-sm rounded-md px-3 py-2 border border-zinc-300 bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1.5">Start time</label>
              <input
                type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}
                className="w-full text-sm rounded-md px-3 py-2 border border-zinc-300 bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1.5">End time</label>
              <input
                type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)}
                className="w-full text-sm rounded-md px-3 py-2 border border-zinc-300 bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1.5">Students (batch)</label>
            <select
              value={batchId}
              onChange={(e) => { setBatchId(e.target.value); setExtraStudentIds([]) }}
              className="w-full text-sm rounded-md px-3 py-2 border border-zinc-300 bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400"
            >
              <option value="">Select a batch…</option>
              {batches.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
          </div>

          {batchId && (
            <div>
              <button
                type="button"
                onClick={() => setShowExtraStudents((v) => !v)}
                className="text-xs text-zinc-500 hover:text-zinc-800 underline underline-offset-2"
              >
                {showExtraStudents ? 'Hide' : 'Add individual students outside this batch'}
              </button>
              {showExtraStudents && (
                <div className="mt-2 border border-zinc-200 rounded-md max-h-40 overflow-y-auto divide-y divide-zinc-100">
                  {batchStudents.length === 0 ? (
                    <p className="text-xs text-zinc-400 px-3 py-2">No students enrolled in this batch.</p>
                  ) : (
                    batchStudents.map((s) => (
                      <label key={s.id} className="flex items-center gap-2 px-3 py-1.5 text-xs text-zinc-600">
                        <input
                          type="checkbox"
                          checked={extraStudentIds.includes(s.id)}
                          onChange={() =>
                            setExtraStudentIds((prev) =>
                              prev.includes(s.id) ? prev.filter((id) => id !== s.id) : [...prev, s.id]
                            )
                          }
                        />
                        {s.name} <span className="text-zinc-400">({s.roll})</span>
                      </label>
                    ))
                  )}
                </div>
              )}
            </div>
          )}

          <div className="space-y-2 pt-2 border-t border-zinc-100">
            <label className="flex items-center gap-2 text-sm text-zinc-700">
              <input type="checkbox" checked={createGoogleMeet} onChange={(e) => setCreateGoogleMeet(e.target.checked)} />
              Create Google Meet
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-700">
              <input type="checkbox" checked={sendNotification} onChange={(e) => setSendNotification(e.target.checked)} />
              Send student notification (Google Calendar invite + email)
            </label>
          </div>

          {error && (
            <div className="text-sm px-3 py-2.5 rounded-md bg-rose-50 text-rose-700 border border-rose-100">
              {error}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-zinc-200 bg-zinc-50 shrink-0">
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="w-full py-2.5 text-sm font-medium text-white rounded-md disabled:opacity-40 transition-colors"
            style={{ backgroundColor: ACCENT }}
          >
            {submitting ? 'Scheduling…' : 'Schedule Online Class'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Class details / reschedule / cancel modal ─────────────────────────────

function ClassDetailsModal({ cls, onClose, onReschedule, onCancel }: {
  cls: OnlineClass
  onClose: () => void
  onReschedule: (id: string, input: { title: string; description: string; date: string; startTime: string; endTime: string }) => Promise<void>
  onCancel: (id: string) => Promise<void>
}) {
  const [editing, setEditing] = useState(false)
  const startParts = isoToZonedParts(cls.scheduledStart, cls.timezone)
  const endParts = isoToZonedParts(cls.scheduledEnd, cls.timezone)

  const [title, setTitle] = useState(cls.title)
  const [description, setDescription] = useState(cls.description ?? '')
  const [date, setDate] = useState(startParts.date)
  const [startTime, setStartTime] = useState(startParts.time)
  const [endTime, setEndTime] = useState(endParts.time)

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isCancelled = cls.status === 'cancelled'

  async function handleSave() {
    setBusy(true)
    setError(null)
    try {
      await onReschedule(cls.id, { title, description, date, startTime, endTime })
      setEditing(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to reschedule')
    } finally {
      setBusy(false)
    }
  }

  async function handleCancel() {
    if (!confirm('Cancel this online class? Students will be notified and the Join button will be removed.')) return
    setBusy(true)
    setError(null)
    try {
      await onCancel(cls.id)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to cancel')
    } finally {
      setBusy(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 24, opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="bg-white w-full sm:max-w-lg shadow-2xl rounded-t-xl sm:rounded-xl border border-zinc-200 overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-zinc-200 flex items-start justify-between shrink-0">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900">{editing ? 'Reschedule class' : cls.title}</h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              {cls.batchName}{cls.subjectName ? ` · ${cls.subjectName}` : ''}
            </p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 text-xl leading-none">&times;</button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          <StatusBadge status={cls.status} />

          {!editing ? (
            <>
              <div>
                <p className="text-xs text-zinc-400 uppercase tracking-wide mb-1">When</p>
                <p className="text-sm text-zinc-800">
                  {formatDateInZone(cls.scheduledStart, cls.timezone)}, {formatTimeInZone(cls.scheduledStart, cls.timezone)} – {formatTimeInZone(cls.scheduledEnd, cls.timezone)}
                </p>
              </div>
              {cls.description && (
                <div>
                  <p className="text-xs text-zinc-400 uppercase tracking-wide mb-1">Description</p>
                  <p className="text-sm text-zinc-700 whitespace-pre-wrap">{cls.description}</p>
                </div>
              )}
              <div>
                <p className="text-xs text-zinc-400 uppercase tracking-wide mb-1">Google Meet</p>
                {cls.meetUrl && !isCancelled ? (
                  <a href={cls.meetUrl} target="_blank" rel="noopener noreferrer" className="text-sm break-all" style={{ color: ACCENT }}>
                    {cls.meetUrl}
                  </a>
                ) : (
                  <p className="text-sm text-zinc-400">{isCancelled ? 'Class cancelled' : 'No Meet link'}</p>
                )}
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1.5">Topic</label>
                <input value={title} onChange={(e) => setTitle(e.target.value)}
                  className="w-full text-sm rounded-md px-3 py-2 border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400" />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-500 mb-1.5">Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
                  className="w-full text-sm rounded-md px-3 py-2 border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400 resize-none" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1.5">Date</label>
                  <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
                    className="w-full text-sm rounded-md px-3 py-2 border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1.5">Start</label>
                  <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}
                    className="w-full text-sm rounded-md px-3 py-2 border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-500 mb-1.5">End</label>
                  <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)}
                    className="w-full text-sm rounded-md px-3 py-2 border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400" />
                </div>
              </div>
            </>
          )}

          {error && (
            <div className="text-sm px-3 py-2.5 rounded-md bg-rose-50 text-rose-700 border border-rose-100">{error}</div>
          )}
        </div>

        {!isCancelled && (
          <div className="px-6 py-4 border-t border-zinc-200 bg-zinc-50 shrink-0 flex gap-2">
            {editing ? (
              <>
                <button onClick={() => setEditing(false)} disabled={busy}
                  className="flex-1 py-2.5 text-sm font-medium text-zinc-700 border border-zinc-300 rounded-md hover:bg-zinc-100 transition-colors disabled:opacity-40">
                  Cancel edit
                </button>
                <button onClick={handleSave} disabled={busy}
                  className="flex-1 py-2.5 text-sm font-medium text-white rounded-md disabled:opacity-40 transition-colors"
                  style={{ backgroundColor: ACCENT }}>
                  {busy ? 'Saving…' : 'Save changes'}
                </button>
              </>
            ) : (
              <>
                <button onClick={handleCancel} disabled={busy}
                  className="flex-1 py-2.5 text-sm font-medium text-rose-600 border border-rose-200 rounded-md hover:bg-rose-50 transition-colors disabled:opacity-40">
                  {busy ? 'Working…' : 'Cancel class'}
                </button>
                <button onClick={() => setEditing(true)} disabled={busy}
                  className="flex-1 py-2.5 text-sm font-medium text-white rounded-md disabled:opacity-40 transition-colors"
                  style={{ backgroundColor: ACCENT }}>
                  Edit / Reschedule
                </button>
              </>
            )}
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function OnlineClassesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { classes, loading, error, refetch, reschedule, cancel, syncAttendance } = useAdminOnlineClasses()
  const { status: googleStatus } = useGoogleAccountStatus()

  const [showSchedule, setShowSchedule] = useState(false)
  const [selectedClass, setSelectedClass] = useState<OnlineClass | null>(null)
  const [attendanceSessionId, setAttendanceSessionId] = useState<string | null>(null)
  const [banner, setBanner] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [syncingId, setSyncingId] = useState<string | null>(null)

  useEffect(() => {
    const google = searchParams.get('google')
    if (google === 'connected') {
      setBanner('Google account connected successfully.')
      router.replace('/admin/online-classes')
    } else if (google === 'error') {
      setBanner('Could not connect the Google account. Please try again.')
      router.replace('/admin/online-classes')
    }
  }, [searchParams, router])

  const sorted = useMemo(
    () => [...classes].sort((a, b) => new Date(b.scheduledStart).getTime() - new Date(a.scheduledStart).getTime()),
    [classes]
  )

  async function handleReschedule(id: string, input: { title: string; description: string; date: string; startTime: string; endTime: string }) {
    const updated = await reschedule(id, input)
    setSelectedClass(updated)
  }

  async function handleCancel(id: string) {
    const updated = await cancel(id)
    setSelectedClass(updated)
  }

  function copyLink(cls: OnlineClass) {
    if (!cls.meetUrl) return
    navigator.clipboard.writeText(cls.meetUrl).then(() => {
      setCopiedId(cls.id)
      setTimeout(() => setCopiedId((id) => (id === cls.id ? null : id)), 1500)
    })
  }

  async function handleSync(classId: string) {
    setSyncingId(classId)
    try {
      await syncAttendance(classId)
    } catch (e) {
      console.error(e)
    } finally {
      setSyncingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 px-4 sm:px-6 py-6 max-w-screen mx-auto space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 pb-4 border-b border-zinc-200">
        <div>
          <p className="text-[10px] font-medium tracking-[0.15em] uppercase text-zinc-400 mb-1">Online Classes</p>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-900">Schedule &amp; Manage Online Classes</h1>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <GoogleAccountPanel />
          <button
            onClick={() => setShowSchedule(true)}
            className="text-sm px-4 py-2.5 text-white rounded-md transition-colors whitespace-nowrap"
            style={{ backgroundColor: ACCENT }}
          >
            Schedule Online Class
          </button>
        </div>
      </div>

      {banner && (
        <div className="text-sm px-4 py-3 rounded-md bg-violet-50 text-violet-700 border border-violet-100 flex items-center justify-between">
          {banner}
          <button onClick={() => setBanner(null)} className="text-violet-400 hover:text-violet-700">&times;</button>
        </div>
      )}

      <AttendanceSettingsPanel />

      <div className="border border-zinc-200 rounded-lg overflow-hidden bg-white">
        <div className="hidden md:grid md:grid-cols-[1fr_120px_130px_100px_110px_210px] px-5 py-3 border-b border-zinc-200 bg-zinc-50 text-[10px] font-medium tracking-widest uppercase text-zinc-400">
          <span>Subject / Topic</span>
          <span>Date</span>
          <span>Time</span>
          <span>Status</span>
          <span>Attendance</span>
          <span className="text-right">Actions</span>
        </div>

        <div className="divide-y divide-zinc-100">
          {loading ? (
            <div className="py-12 text-center text-sm text-zinc-400">Loading classes…</div>
          ) : error ? (
            <div className="py-12 text-center text-sm text-red-600">{error}</div>
          ) : sorted.length === 0 ? (
            <div className="py-12 text-center text-sm text-zinc-400">No online classes scheduled yet.</div>
          ) : (
            sorted.map((cls) => (
              <div key={cls.id} className="flex flex-col md:grid md:grid-cols-[1fr_120px_130px_100px_110px_210px] gap-2 md:gap-0 px-5 py-3.5 md:items-center hover:bg-zinc-50 transition-colors">
                <div className="min-w-0">
                  <p className="text-sm text-zinc-900 truncate">{cls.title}</p>
                  <p className="text-xs text-zinc-500 truncate">
                    {cls.batchName}{cls.subjectName ? ` · ${cls.subjectName}` : ''}
                  </p>
                </div>
                <span className="text-sm text-zinc-600">{formatDateInZone(cls.scheduledStart, cls.timezone)}</span>
                <span className="text-sm text-zinc-600">
                  {formatTimeInZone(cls.scheduledStart, cls.timezone)} – {formatTimeInZone(cls.scheduledEnd, cls.timezone)}
                </span>
                <span><StatusBadge status={cls.status} /></span>
                <span><SyncBadge status={cls.attendance?.syncStatus ?? null} /></span>
                <div className="flex items-center gap-1.5 md:justify-end flex-wrap">
                  <button onClick={() => setSelectedClass(cls)}
                    className="text-xs px-2.5 py-1 rounded-md border border-zinc-300 text-zinc-600 hover:bg-zinc-100 transition-colors">
                    View
                  </button>
                  {cls.attendance && (
                    <button onClick={() => setAttendanceSessionId(cls.attendance!.sessionId)}
                      className="text-xs px-2.5 py-1 rounded-md border border-zinc-300 text-zinc-600 hover:bg-zinc-100 transition-colors">
                      Attendance
                    </button>
                  )}
                  {cls.status !== 'cancelled' && cls.meetUrl && (
                    <button onClick={() => handleSync(cls.id)} disabled={syncingId === cls.id}
                      className="text-xs px-2.5 py-1 rounded-md border border-zinc-300 text-zinc-600 hover:bg-zinc-100 transition-colors disabled:opacity-40">
                      {syncingId === cls.id ? 'Syncing…' : cls.attendance?.syncStatus === 'SYNC_FAILED' ? 'Retry Sync' : 'Sync Attendance'}
                    </button>
                  )}
                  {cls.meetUrl && cls.status !== 'cancelled' && (
                    <>
                      <button onClick={() => copyLink(cls)}
                        className="text-xs px-2.5 py-1 rounded-md border border-zinc-300 text-zinc-600 hover:bg-zinc-100 transition-colors">
                        {copiedId === cls.id ? 'Copied' : 'Copy link'}
                      </button>
                      <a href={cls.meetUrl} target="_blank" rel="noopener noreferrer"
                        className="text-xs px-2.5 py-1 rounded-md text-white transition-colors"
                        style={{ backgroundColor: ACCENT }}>
                        Join
                      </a>
                    </>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <AnimatePresence>
        {showSchedule && (
          <ScheduleModal
            onClose={() => setShowSchedule(false)}
            onScheduled={refetch}
            googleConnected={!!googleStatus?.connected}
          />
        )}
        {selectedClass && (
          <ClassDetailsModal
            cls={selectedClass}
            onClose={() => setSelectedClass(null)}
            onReschedule={handleReschedule}
            onCancel={handleCancel}
          />
        )}
        {attendanceSessionId && (
          <SessionAttendanceModal
            sessionId={attendanceSessionId}
            onClose={() => setAttendanceSessionId(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
