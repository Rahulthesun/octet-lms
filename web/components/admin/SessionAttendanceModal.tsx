'use client'

// components/admin/SessionAttendanceModal.tsx
//
// Per-session attendance detail — works for BOTH an offline QR session and
// a Google-Meet-sourced online-class session, since both live in the same
// attendance_sessions/attendance_records tables. Used from the admin's
// Online Classes page ("View attendance") and from the batch day-by-day
// breakdown in AttendanceReportsTab.

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  useSessionAttendanceDetail,
  useBatchStudents,
  type AttendanceTriState,
} from '@/hooks/useAttendanceData'

const ACCENT = '#5B21B6'

const STATUS_STYLE: Record<AttendanceTriState, { label: string; fg: string; bg: string }> = {
  present: { label: 'Present', fg: '#15803D', bg: '#F0FDF4' },
  partial: { label: 'Partial', fg: '#B45309', bg: '#FFFBEB' },
  absent: { label: 'Absent', fg: '#B91C1C', bg: '#FEF2F2' },
}

function StatusBadge({ status }: { status: AttendanceTriState }) {
  const s = STATUS_STYLE[status]
  return (
    <span className="text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap" style={{ color: s.fg, backgroundColor: s.bg }}>
      {s.label}
    </span>
  )
}

const SYNC_LABEL: Record<string, string> = {
  NOT_STARTED: 'Not started yet',
  LIVE: 'Class is live',
  AWAITING_ATTENDANCE_SYNC: 'Awaiting attendance sync',
  SYNCED: 'Synced',
  SYNC_FAILED: 'Sync failed',
  MANUALLY_REVIEWED: 'Manually reviewed',
}

interface Props {
  sessionId: string
  onClose: () => void
}

export default function SessionAttendanceModal({ sessionId, onClose }: Props) {
  const { detail, loading, error, override, assignUnmatched, ignoreUnmatched, markReviewed } =
    useSessionAttendanceDetail(sessionId)
  const [overridingStudentId, setOverridingStudentId] = useState<string | null>(null)
  const [overrideStatus, setOverrideStatus] = useState<AttendanceTriState>('present')
  const [overrideReason, setOverrideReason] = useState('')
  const [assigningIndex, setAssigningIndex] = useState<number | null>(null)
  const [assignStudentId, setAssignStudentId] = useState('')
  const [busy, setBusy] = useState(false)

  const { students: batchStudents } = useBatchStudents(detail?.session.batchId ?? null, detail?.session.date ?? '')

  function startOverride(studentId: string, current: AttendanceTriState) {
    setOverridingStudentId(studentId)
    setOverrideStatus(current)
    setOverrideReason('')
  }

  async function saveOverride() {
    if (!overridingStudentId) return
    setBusy(true)
    try {
      await override(overridingStudentId, overrideStatus, overrideReason.trim() || undefined)
      setOverridingStudentId(null)
    } catch (e) {
      console.error(e)
    } finally {
      setBusy(false)
    }
  }

  async function saveAssign(index: number) {
    if (!assignStudentId) return
    setBusy(true)
    try {
      await assignUnmatched(index, assignStudentId)
      setAssigningIndex(null)
      setAssignStudentId('')
    } catch (e) {
      console.error(e)
    } finally {
      setBusy(false)
    }
  }

  async function doIgnore(index: number) {
    setBusy(true)
    try {
      await ignoreUnmatched(index)
    } catch (e) {
      console.error(e)
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
        className="bg-white w-full sm:max-w-2xl shadow-2xl rounded-t-xl sm:rounded-xl border border-zinc-200 overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-zinc-200 flex items-start justify-between shrink-0">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900">
              {detail?.session.onlineClassTitle || detail?.session.batchName || 'Attendance'}
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              {detail?.session.batchName}
              {detail?.session.subjectName ? ` · ${detail.session.subjectName}` : ''}
              {detail?.session.date ? ` · ${detail.session.date}` : ''}
            </p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 text-xl leading-none">&times;</button>
        </div>

        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="py-16 text-center text-sm text-zinc-400">Loading attendance…</div>
          ) : error ? (
            <div className="py-16 text-center text-sm text-red-600">{error}</div>
          ) : detail ? (
            <>
              <div className="px-6 py-4 flex flex-wrap items-center gap-3">
                <span className="text-xs px-2.5 py-1 rounded-md bg-zinc-100 text-zinc-600">
                  Source: {detail.session.source === 'GOOGLE_MEET' ? 'Google Meet' : 'Offline (QR)'}
                </span>
                {detail.session.source === 'GOOGLE_MEET' && (
                  <span className="text-xs px-2.5 py-1 rounded-md bg-zinc-100 text-zinc-600">
                    {SYNC_LABEL[detail.session.syncStatus || ''] || detail.session.syncStatus || 'Unknown'}
                  </span>
                )}
                {detail.session.syncError && (
                  <span className="text-xs text-rose-600">{detail.session.syncError}</span>
                )}
              </div>

              <div className="px-6 pb-4 grid grid-cols-3 gap-3">
                <div className="bg-emerald-50 rounded-lg px-3 py-2.5 text-center">
                  <p className="text-lg font-semibold text-emerald-700 tabular-nums">{detail.counts.present}</p>
                  <p className="text-[10px] uppercase tracking-wide text-emerald-600 mt-0.5">Present</p>
                </div>
                <div className="bg-amber-50 rounded-lg px-3 py-2.5 text-center">
                  <p className="text-lg font-semibold text-amber-700 tabular-nums">{detail.counts.partial}</p>
                  <p className="text-[10px] uppercase tracking-wide text-amber-600 mt-0.5">Partial</p>
                </div>
                <div className="bg-rose-50 rounded-lg px-3 py-2.5 text-center">
                  <p className="text-lg font-semibold text-rose-700 tabular-nums">{detail.counts.absent}</p>
                  <p className="text-[10px] uppercase tracking-wide text-rose-600 mt-0.5">Absent</p>
                </div>
              </div>

              <div className="px-6 pb-4">
                <div className="border border-zinc-200 rounded-lg overflow-hidden">
                  <div className="hidden sm:grid sm:grid-cols-[1fr_90px_90px_100px_90px] px-3 py-2 bg-zinc-50 border-b border-zinc-200 text-[10px] uppercase tracking-wide text-zinc-400">
                    <span>Student</span>
                    <span className="text-right">Duration</span>
                    <span className="text-right">%</span>
                    <span className="text-right">Status</span>
                    <span className="text-right">Actions</span>
                  </div>
                  <div className="divide-y divide-zinc-100">
                    {detail.roster.map((r) => (
                      <div key={r.studentId} className="px-3 py-2.5">
                        <div className="flex flex-col sm:grid sm:grid-cols-[1fr_90px_90px_100px_90px] gap-1 sm:gap-0 sm:items-center text-sm">
                          <span className="text-zinc-800 truncate">
                            {r.name}
                            {r.wasOverridden && <span className="ml-1.5 text-[10px] text-violet-600">(overridden)</span>}
                          </span>
                          <span className="sm:text-right text-zinc-500 tabular-nums">
                            {r.durationMinutes !== null ? `${r.durationMinutes} min` : '—'}
                          </span>
                          <span className="sm:text-right text-zinc-500 tabular-nums">
                            {r.finalPct !== null ? `${r.finalPct}%` : '—'}
                          </span>
                          <span className="sm:text-right"><StatusBadge status={r.finalStatus} /></span>
                          <span className="sm:text-right">
                            <button
                              onClick={() => startOverride(r.studentId, r.finalStatus)}
                              className="text-xs px-2 py-1 rounded-md border border-zinc-300 text-zinc-600 hover:bg-zinc-100 transition-colors"
                            >
                              Override
                            </button>
                          </span>
                        </div>

                        {overridingStudentId === r.studentId && (
                          <div className="mt-2 p-3 bg-zinc-50 rounded-md space-y-2">
                            <div className="flex gap-2">
                              {(['present', 'partial', 'absent'] as const).map((s) => (
                                <button
                                  key={s}
                                  onClick={() => setOverrideStatus(s)}
                                  className={`text-xs px-2.5 py-1 rounded-md border transition-colors capitalize ${
                                    overrideStatus === s ? 'text-white border-transparent' : 'border-zinc-300 text-zinc-600'
                                  }`}
                                  style={overrideStatus === s ? { backgroundColor: ACCENT } : undefined}
                                >
                                  {s}
                                </button>
                              ))}
                            </div>
                            <input
                              type="text"
                              value={overrideReason}
                              onChange={(e) => setOverrideReason(e.target.value)}
                              placeholder="Reason (optional) — e.g. student had technical issues"
                              className="w-full text-xs rounded-md px-2.5 py-1.5 border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-violet-200"
                            />
                            <div className="flex gap-2">
                              <button onClick={() => setOverridingStudentId(null)} disabled={busy}
                                className="text-xs px-3 py-1.5 rounded-md border border-zinc-300 text-zinc-600 hover:bg-zinc-100 disabled:opacity-40">
                                Cancel
                              </button>
                              <button onClick={saveOverride} disabled={busy}
                                className="text-xs px-3 py-1.5 rounded-md text-white disabled:opacity-40" style={{ backgroundColor: ACCENT }}>
                                {busy ? 'Saving…' : 'Save Override'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {detail.session.unmatchedParticipants.length > 0 && (
                <div className="px-6 pb-6">
                  <p className="text-xs font-medium tracking-widest uppercase text-zinc-400 mb-2">
                    Unmatched Google Meet Participants
                  </p>
                  <div className="border border-amber-200 rounded-lg overflow-hidden divide-y divide-amber-100 bg-amber-50/40">
                    {detail.session.unmatchedParticipants.map((p, i) => (
                      <div key={i} className="px-3 py-2.5">
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm text-zinc-800 truncate">{p.displayName}</p>
                            <p className="text-xs text-zinc-500">
                              {p.minutes} min attended · {p.isAnonymous ? 'Anonymous join' : 'No LMS student linked to this Google account'}
                            </p>
                          </div>
                          <div className="flex gap-1.5 shrink-0">
                            <button onClick={() => { setAssigningIndex(i); setAssignStudentId('') }}
                              className="text-xs px-2.5 py-1 rounded-md border border-zinc-300 text-zinc-600 hover:bg-zinc-100 transition-colors">
                              Manually Assign
                            </button>
                            <button onClick={() => doIgnore(i)} disabled={busy}
                              className="text-xs px-2.5 py-1 rounded-md border border-zinc-300 text-zinc-600 hover:bg-zinc-100 transition-colors disabled:opacity-40">
                              Ignore
                            </button>
                          </div>
                        </div>

                        {assigningIndex === i && (
                          <div className="mt-2 flex gap-2">
                            <select
                              value={assignStudentId}
                              onChange={(e) => setAssignStudentId(e.target.value)}
                              className="flex-1 text-xs rounded-md px-2.5 py-1.5 border border-zinc-300 bg-white"
                            >
                              <option value="">Select student…</option>
                              {batchStudents.map((s) => (
                                <option key={s.id} value={s.id}>{s.name} ({s.roll})</option>
                              ))}
                            </select>
                            <button onClick={() => saveAssign(i)} disabled={busy || !assignStudentId}
                              className="text-xs px-3 py-1.5 rounded-md text-white disabled:opacity-40" style={{ backgroundColor: ACCENT }}>
                              Assign
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : null}
        </div>

        {detail && detail.session.source === 'GOOGLE_MEET' && (
          <div className="px-6 py-3 border-t border-zinc-200 bg-zinc-50 shrink-0 flex justify-end">
            <button
              onClick={() => markReviewed()}
              disabled={busy}
              className="text-xs px-3 py-1.5 rounded-md border border-zinc-300 text-zinc-600 hover:bg-zinc-100 transition-colors disabled:opacity-40"
            >
              Mark Reviewed
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
