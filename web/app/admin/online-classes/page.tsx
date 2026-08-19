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
import { useBatches, useEligibleStudents } from '@/hooks/useAttendanceData'
import { formatDateInZone, formatTimeInZone, isoToZonedParts } from '@/lib/helpers'
import SessionAttendanceModal from '@/components/admin/SessionAttendanceModal'

const ACCENT = '#5B21B6'

// ─── Icons ──────────────────────────────────────────────────────────────────

function ClockIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
      <path d="M12 7.2V12l3.3 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="0.9" fill="currentColor" />
    </svg>
  )
}

function CalendarIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3.5 9.5h17M8 3v3.5M16 3v3.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function SearchIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none">
      <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.5" />
      <path d="M13.5 13.5L17 17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function UsersIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none">
      <circle cx="7" cy="6.5" r="2.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M2 16c.6-3 2.4-4.5 5-4.5s4.4 1.5 5 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="14.5" cy="7.5" r="2" stroke="currentColor" strokeWidth="1.4" />
      <path d="M12.5 11.3c2 .1 3.3 1.4 3.8 3.9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}

function LinkIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none">
      <path d="M8.5 11.5a3 3 0 0 0 4.2.3l2-2a3 3 0 0 0-4.2-4.2l-1.1 1.1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M11.5 8.5a3 3 0 0 0-4.2-.3l-2 2a3 3 0 0 0 4.2 4.2l1.1-1.1" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

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

// ─── Online attendance settings modal ──────────────────────────────────────
// Reached via the ⚙️ button next to "Schedule Online Class" — kept out of
// the main flow since it's configured once and rarely touched day to day.

function SettingField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-zinc-800 mb-1.5">{label}</label>
      {children}
    </div>
  )
}

function AttendanceSettingsModal({ onClose }: { onClose: () => void }) {
  const { settings, loading, update } = useAttendanceSettings()
  const [presentThreshold, setPresentThreshold] = useState(75)
  const [partialThreshold, setPartialThreshold] = useState(40)
  const [autoCalculate, setAutoCalculate] = useState(true)
  const [autoSync, setAutoSync] = useState(true)
  const [allowOverride, setAllowOverride] = useState(true)
  const [syncDelayMinutes, setSyncDelayMinutes] = useState(5)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
    setError(null)
    try {
      await update({ presentThreshold, partialThreshold, autoCalculate, autoSync, allowOverride, syncDelayMinutes })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save settings')
    } finally {
      setSaving(false)
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
        className="bg-white w-full sm:max-w-xl shadow-2xl rounded-t-xl sm:rounded-xl border border-zinc-200 overflow-hidden max-h-[88vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-zinc-200 flex items-start justify-between shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-xl leading-none" aria-hidden="true">⚙️</span>
            <div>
              <h3 className="text-sm font-semibold text-zinc-900">Online Attendance Settings</h3>
              <p className="text-xs text-zinc-500 mt-0.5">How Google Meet attendance is calculated and synced</p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 text-xl leading-none">&times;</button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {loading ? (
            <p className="text-sm text-zinc-400">Loading settings…</p>
          ) : (
            <>
              <div>
                <p className="text-xs text-zinc-500 mb-2">Minimum % of class time to count as Present or Partial</p>
                <div className="grid grid-cols-2 gap-4">
                  <SettingField label="Present threshold (%)">
                    <input type="number" min={0} max={100} value={presentThreshold}
                      onChange={(e) => setPresentThreshold(Number(e.target.value))}
                      className="w-full text-sm rounded-md px-3 py-2 border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400" />
                  </SettingField>
                  <SettingField label="Partial threshold (%)">
                    <input type="number" min={0} max={100} value={partialThreshold}
                      onChange={(e) => setPartialThreshold(Number(e.target.value))}
                      className="w-full text-sm rounded-md px-3 py-2 border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400" />
                  </SettingField>
                </div>
              </div>

              <SettingField label="Sync delay after class ends (minutes)">
                <input type="number" min={0} max={60} value={syncDelayMinutes}
                  onChange={(e) => setSyncDelayMinutes(Number(e.target.value))}
                  className="w-32 text-sm rounded-md px-3 py-2 border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400" />
              </SettingField>

              <div className="pt-1 border-t border-zinc-100">
                <p className="text-xs text-zinc-500 pt-3 mb-1">What happens automatically after each class</p>
                <div className="space-y-2.5">
                  <label className="flex items-center gap-2.5 text-sm text-zinc-700">
                    <input type="checkbox" checked={autoCalculate} onChange={(e) => setAutoCalculate(e.target.checked)} />
                    Automatically calculate attendance
                  </label>
                  <label className="flex items-center gap-2.5 text-sm text-zinc-700">
                    <input type="checkbox" checked={autoSync} onChange={(e) => setAutoSync(e.target.checked)} />
                    Automatically sync attendance
                  </label>
                  <label className="flex items-center gap-2.5 text-sm text-zinc-700">
                    <input type="checkbox" checked={allowOverride} onChange={(e) => setAllowOverride(e.target.checked)} />
                    Allow admin override
                  </label>
                </div>
              </div>

              {error && (
                <div className="text-sm px-3 py-2.5 rounded-md bg-rose-50 text-rose-700 border border-rose-100">{error}</div>
              )}
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-zinc-200 bg-zinc-50 shrink-0 flex items-center gap-3">
          <button onClick={handleSave} disabled={saving || loading}
            className="text-sm px-5 py-2.5 text-white rounded-md disabled:opacity-40 transition-colors" style={{ backgroundColor: ACCENT }}>
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
          {saved && <span className="text-xs text-emerald-600">Saved</span>}
        </div>
      </motion.div>
    </motion.div>
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
  const [studentSearch, setStudentSearch] = useState('')

  // Students genuinely OUTSIDE this batch (never already-enrolled ones) —
  // scoped to the selected batch's grade so the candidate list stays
  // relevant, fetched live from the database, not derived from mock data.
  // useEligibleStudents(grade, batchId) only gates its fetch on `grade` being
  // truthy — the backend (getEligibleStudents) never actually filters by it,
  // it only needs `batchId`. The batches list here (useBatches('all')) never
  // carries a real `grade` field, so deriving one from the selected batch is
  // always empty and silently keeps the list from ever loading. Pass a fixed
  // truthy placeholder instead so the fetch fires as soon as a batch is picked.
  const { students: eligibleStudents, loading: loadingEligible } = useEligibleStudents(
    batchId ? 'all' : null,
    batchId || null
  )

  // Dropdown only ever offers students not already added, narrowed live by
  // whatever's typed into the search bar above it.
  const studentDropdownOptions = eligibleStudents
    .filter((s) => !extraStudentIds.includes(s.id))
    .filter((s) => s.name.toLowerCase().includes(studentSearch.trim().toLowerCase()))

  function addExtraStudent(id: string) {
    setExtraStudentIds((prev) => (prev.includes(id) ? prev : [...prev, id]))
    setStudentSearch('')
  }

  function removeExtraStudent(id: string) {
    setExtraStudentIds((prev) => prev.filter((x) => x !== id))
  }

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
        className="bg-white w-full sm:max-w-3xl shadow-2xl rounded-t-2xl sm:rounded-2xl border border-zinc-200 overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-8 py-5 border-b border-zinc-200 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-lg font-semibold text-zinc-900">Schedule Online Class</h3>
            <p className="text-sm text-zinc-500 mt-0.5">Creates a Google Meet and notifies the batch automatically</p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 text-2xl leading-none">&times;</button>
        </div>

        <div className="overflow-y-auto flex-1 px-8 py-6 space-y-6">
          {!googleConnected && (
            <div className="text-sm px-4 py-3 rounded-lg bg-amber-50 text-amber-700 border border-amber-100">
              No Google account is connected. Connect one above before scheduling — otherwise no Google Meet can be created.
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">Course / Subject</label>
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                className="w-full text-[15px] rounded-lg px-4 py-3 border border-zinc-300 bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400"
              >
                <option value="">Select subject (optional)…</option>
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">Topic</label>
              <input
                type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Introduction to TCP/IP"
                className="w-full text-[15px] rounded-lg px-4 py-3 border border-zinc-300 bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-700 mb-2">Description</label>
            <textarea
              value={description} onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Optional notes for students"
              className="w-full text-[15px] rounded-lg px-4 py-3 border border-zinc-300 bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">Date</label>
              <input
                type="date" value={date} onChange={(e) => setDate(e.target.value)}
                className="w-full text-[15px] rounded-lg px-4 py-3 border border-zinc-300 bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">Start time</label>
              <input
                type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)}
                className="w-full text-[15px] rounded-lg px-4 py-3 border border-zinc-300 bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2">End time</label>
              <input
                type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)}
                className="w-full text-[15px] rounded-lg px-4 py-3 border border-zinc-300 bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-zinc-100">
            <label className="block text-sm font-medium text-zinc-700 mb-2 flex items-center gap-2">
              <UsersIcon className="w-4 h-4 text-zinc-400" />
              Students (batch)
            </label>
            <select
              value={batchId}
              onChange={(e) => {
                setBatchId(e.target.value)
                setExtraStudentIds([])
                setStudentSearch('')
                setShowExtraStudents(false)
              }}
              className="w-full text-[15px] rounded-lg px-4 py-3 border border-zinc-300 bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400"
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
                className="text-sm font-medium hover:underline underline-offset-2"
                style={{ color: ACCENT }}
              >
                {showExtraStudents ? 'Hide' : '+ Add individual students outside this batch'}
                {extraStudentIds.length > 0 ? ` (${extraStudentIds.length} added)` : ''}
              </button>

              {showExtraStudents && (
                <div className="mt-3 space-y-3">
                  {extraStudentIds.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {extraStudentIds.map((id) => {
                        const s = eligibleStudents.find((x) => x.id === id)
                        return (
                          <span key={id} className="inline-flex items-center gap-1.5 text-sm bg-violet-50 text-violet-700 border border-violet-100 rounded-full pl-3 pr-2 py-1">
                            {s?.name ?? 'Student'}
                            <button type="button" onClick={() => removeExtraStudent(id)}
                              className="text-violet-400 hover:text-violet-700 text-base leading-none">&times;</button>
                          </span>
                        )
                      })}
                    </div>
                  )}

                  <div className="border border-zinc-200 rounded-lg overflow-hidden">
                    <div className="relative p-2.5 bg-zinc-50 border-b border-zinc-200">
                      <SearchIcon className="w-4 h-4 text-zinc-400 absolute left-5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={studentSearch}
                        onChange={(e) => setStudentSearch(e.target.value)}
                        placeholder="Search students by name…"
                        className="w-full text-sm rounded-md pl-9 pr-3 py-2 border border-zinc-300 bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400"
                      />
                    </div>

                    <div className="max-h-56 overflow-y-auto divide-y divide-zinc-100">
                      {loadingEligible ? (
                        <p className="text-xs text-zinc-400 px-4 py-3">Loading students…</p>
                      ) : studentDropdownOptions.length === 0 ? (
                        <p className="text-xs text-zinc-400 px-4 py-3">
                          {studentSearch
                            ? `No students found matching "${studentSearch}".`
                            : 'No more students available outside this batch.'}
                        </p>
                      ) : (
                        studentDropdownOptions.map((s) => (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => addExtraStudent(s.id)}
                            className="w-full flex items-center justify-between gap-2 px-4 py-2 text-sm text-left text-zinc-700 hover:bg-violet-50 transition-colors"
                          >
                            <span className="truncate">
                              {s.name} <span className="text-zinc-400">({s.roll})</span>
                            </span>
                            {s.currentBatchName && (
                              <span className="text-[11px] text-zinc-400 shrink-0">also in {s.currentBatchName}</span>
                            )}
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="space-y-3 pt-3 border-t border-zinc-100">
            <label className="flex items-center gap-2.5 text-sm text-zinc-700">
              <input type="checkbox" checked={createGoogleMeet} onChange={(e) => setCreateGoogleMeet(e.target.checked)} />
              Create Google Meet
            </label>
            <label className="flex items-center gap-2.5 text-sm text-zinc-700">
              <input type="checkbox" checked={sendNotification} onChange={(e) => setSendNotification(e.target.checked)} />
              Send student notification (Google Calendar invite + email)
            </label>
          </div>

          {error && (
            <div className="text-sm px-4 py-3 rounded-lg bg-rose-50 text-rose-700 border border-rose-100">
              {error}
            </div>
          )}
        </div>

        <div className="px-8 py-5 border-t border-zinc-200 bg-zinc-50 shrink-0">
          <button
            onClick={handleSubmit}
            disabled={!canSubmit || submitting}
            className="w-full py-3.5 text-[15px] font-medium text-white rounded-lg disabled:opacity-40 transition-colors"
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

type ViewFilter = 'all' | 'past' | 'today'

/** Which calendar day (in the CLASS's own timezone) a class falls on, relative to today. */
function classDayBucket(cls: OnlineClass): 'today' | 'past' | 'future' {
  const todayStr = isoToZonedParts(new Date().toISOString(), cls.timezone).date
  const clsStr = isoToZonedParts(cls.scheduledStart, cls.timezone).date
  if (clsStr === todayStr) return 'today'
  if (clsStr < todayStr) return 'past'
  return 'future'
}

export default function OnlineClassesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { classes, loading, error, refetch, reschedule, cancel, syncAttendance } = useAdminOnlineClasses()
  const { status: googleStatus } = useGoogleAccountStatus()

  const [showSchedule, setShowSchedule] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [selectedClass, setSelectedClass] = useState<OnlineClass | null>(null)
  const [attendanceSessionId, setAttendanceSessionId] = useState<string | null>(null)
  const [banner, setBanner] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [syncingId, setSyncingId] = useState<string | null>(null)
  const [viewFilter, setViewFilter] = useState<ViewFilter>('today')

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

  const filtered = useMemo(() => {
    if (viewFilter === 'all') return sorted
    if (viewFilter === 'today') return sorted.filter((c) => classDayBucket(c) === 'today')
    return sorted.filter((c) => classDayBucket(c) === 'past')
  }, [sorted, viewFilter])

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
          <button
            onClick={() => setShowSettings(true)}
            title="Online Attendance Settings"
            className="w-10 h-10 shrink-0 flex items-center justify-center rounded-md border border-zinc-300 hover:bg-zinc-100 transition-colors text-xl leading-none"
          >
            <span aria-hidden="true">⚙️</span>
          </button>
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

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="inline-flex items-center gap-1 p-1 bg-zinc-100 rounded-lg" role="group" aria-label="Filter classes">
          {(['all', 'past', 'today'] as ViewFilter[]).map((v) => (
            <button
              key={v}
              onClick={() => setViewFilter(v)}
              aria-pressed={viewFilter === v}
              className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors cursor-pointer ${
                viewFilter === v ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
              }`}
            >
              {v === 'all' ? 'All' : v === 'past' ? 'Past' : 'Today'}
            </button>
          ))}
        </div>
        <p className="text-xs text-zinc-400">
          {filtered.length} class{filtered.length === 1 ? '' : 'es'}
        </p>
      </div>

      <div className="space-y-3">
        {loading ? (
          <div className="py-12 text-center text-sm text-zinc-400 bg-white border border-zinc-200 rounded-xl">Loading classes…</div>
        ) : error ? (
          <div className="py-12 text-center text-sm text-red-600 bg-white border border-zinc-200 rounded-xl">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-zinc-400 bg-white border border-zinc-200 rounded-xl">
            {viewFilter === 'today'
              ? 'No online classes scheduled for today.'
              : viewFilter === 'past'
              ? 'No past online classes.'
              : 'No online classes scheduled yet.'}
          </div>
        ) : (
          filtered.map((cls) => (
            <div
              key={cls.id}
              className="bg-white rounded-xl border border-zinc-200 hover:border-violet-200 hover:shadow-sm transition-all p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-[15px] font-semibold text-zinc-900 truncate">{cls.title}</h3>
                  <p className="text-sm text-zinc-500 truncate mt-0.5">
                    {cls.batchName}{cls.subjectName ? ` · ${cls.subjectName}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge status={cls.status} />
                  <SyncBadge status={cls.attendance?.syncStatus ?? null} />
                </div>
              </div>

              <div className="flex items-center gap-3 py-3 my-3 border-y border-zinc-100">
                <div className="w-10 h-10 rounded-full bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
                  <ClockIcon className="w-5 h-5" />
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-x-4 gap-y-0.5">
                  <span className="flex items-center gap-1.5 text-sm font-medium text-zinc-800">
                    <CalendarIcon className="w-3.5 h-3.5 text-zinc-400" />
                    {formatDateInZone(cls.scheduledStart, cls.timezone)}
                  </span>
                  <span className="text-sm text-zinc-500">
                    {formatTimeInZone(cls.scheduledStart, cls.timezone)} – {formatTimeInZone(cls.scheduledEnd, cls.timezone)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button onClick={() => setSelectedClass(cls)}
                  className="text-sm px-3 py-1.5 rounded-md border border-zinc-300 text-zinc-600 hover:bg-zinc-100 transition-colors">
                  View
                </button>
                {cls.attendance && (
                  <button onClick={() => setAttendanceSessionId(cls.attendance!.sessionId)}
                    className="text-sm px-3 py-1.5 rounded-md border border-zinc-300 text-zinc-600 hover:bg-zinc-100 transition-colors">
                    Attendance
                  </button>
                )}
                {cls.status !== 'cancelled' && cls.meetUrl && (
                  <button onClick={() => handleSync(cls.id)} disabled={syncingId === cls.id}
                    className="text-sm px-3 py-1.5 rounded-md border border-zinc-300 text-zinc-600 hover:bg-zinc-100 transition-colors disabled:opacity-40">
                    {syncingId === cls.id ? 'Syncing…' : cls.attendance?.syncStatus === 'SYNC_FAILED' ? 'Retry Sync' : 'Sync Attendance'}
                  </button>
                )}
                {cls.meetUrl && cls.status !== 'cancelled' && (
                  <>
                    <button onClick={() => copyLink(cls)}
                      className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-md border border-zinc-300 text-zinc-600 hover:bg-zinc-100 transition-colors">
                      <LinkIcon className="w-3.5 h-3.5" />
                      {copiedId === cls.id ? 'Copied' : 'Copy link'}
                    </button>
                    <a href={cls.meetUrl} target="_blank" rel="noopener noreferrer"
                      className="text-sm px-3.5 py-1.5 rounded-md text-white transition-colors ml-auto"
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

      <AnimatePresence>
        {showSchedule && (
          <ScheduleModal
            onClose={() => setShowSchedule(false)}
            onScheduled={refetch}
            googleConnected={!!googleStatus?.connected}
          />
        )}
        {showSettings && (
          <AttendanceSettingsModal onClose={() => setShowSettings(false)} />
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
