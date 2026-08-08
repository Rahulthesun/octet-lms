'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'
import { supabase } from '../../../lib/supabase/client'
import {
  useBatches,
  useBatchStudents,
  useEligibleStudents,
  useAttendanceSession,
  useRoster,
  useStudentTrend,
  useBatchSummary,
} from '../../../hooks/useAttendanceData'
import type { Student } from '../../../hooks/useAttendanceData'

// ─── Shared fetch helper for the few mutations this page calls directly ──────
const API_BASE = process.env.NEXT_PUBLIC_SERVER_URL ?? ''
async function authedFetch(path: string, init?: RequestInit) {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.error || body?.message || `Request failed: ${res.status}`)
  }
  if (res.status === 204) return null
  return res.json()
}
const manualMark = (sessionId: string, studentId: string, present: boolean) =>
  authedFetch(`/api/attendance/sessions/${sessionId}/manual-mark`, {
    method: 'POST',
    body: JSON.stringify({ studentId, present }),
  })
const overrideStudentBlock = (studentId: string, batchId: string, unblocked: boolean) =>
  authedFetch(`/api/attendance/students/${studentId}/override`, {
    method: 'POST',
    body: JSON.stringify({ batchId, unblocked }),
  })
const addStudentsToBatch = (batchId: string, studentIds: string[]) =>
  authedFetch(`/api/attendance/batches/${batchId}/students`, {
    method: 'POST',
    body: JSON.stringify({ studentIds }),
  })

// ─── Types ────────────────────────────────────────────────────────────────────

type Section = 'qr' | 'summary'

const GRADES = ['12th'] as const

// ─── Status config — readable text/bg pairs, no white-on-light-tint ──────────

const STATUS = {
  blocked:   { text: 'Blocked',   fg: '#B91C1C', bg: '#FEF2F2', dot: '#DC2626' },
  warning:   { text: 'Warning',   fg: '#B45309', bg: '#FFFBEB', dot: '#D97706' },
  good:      { text: 'Good',      fg: '#15803D', bg: '#F0FDF4', dot: '#16A34A' },
  excellent: { text: 'Excellent', fg: '#0F766E', bg: '#F0FDFA', dot: '#0D9488' },
  active:    { text: 'Active',    fg: '#5B21B6', bg: '#F5F3FF', dot: '#7C3AED' },
}

function statusOf(pct: number) {
  if (pct < 75) return STATUS.blocked
  if (pct < 80) return STATUS.warning
  if (pct < 90) return STATUS.good
  return STATUS.excellent
}

// Accent — used only for primary actions, dark enough for white text to pass contrast
const ACCENT = '#5B21B6'

// ─── Countdown ring ───────────────────────────────────────────────────────────

function CountdownRing({ countdown, total, size = 220 }: {
  countdown: number; total: number; size?: number
}) {
  const R = size / 2 - 4
  const C = 2 * Math.PI * R
  const offset = C - (countdown / total) * C
  return (
    <svg
      width={size} height={size}
      className="absolute inset-0 pointer-events-none"
      style={{ transform: 'rotate(-90deg)' }}
    >
      <circle cx={size / 2} cy={size / 2} r={R} fill="none" stroke="#E4E4E7" strokeWidth="2" />
      <circle
        cx={size / 2} cy={size / 2} r={R}
        fill="none" stroke={ACCENT} strokeWidth="2"
        strokeDasharray={C} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 1s linear' }}
      />
    </svg>
  )
}

// ─── Mini bar chart ───────────────────────────────────────────────────────────

function MiniChart({ data }: { data: { label: string; val: number }[] }) {
  const maxH = 80
  return (
    <div className="flex items-end gap-2.5 w-full" style={{ height: maxH + 28 }}>
      {data.map((row, i) => {
        const barH = Math.round((row.val / 100) * maxH)
        const st = statusOf(row.val)
        return (
          <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1.5">
            <span className="text-[11px] tabular-nums text-zinc-500">{row.val}%</span>
            <motion.div
              initial={{ height: 0 }} animate={{ height: barH }}
              transition={{ duration: 0.35, delay: i * 0.06, ease: 'easeOut' }}
              className="w-full rounded-[2px]"
              style={{ backgroundColor: st.dot }}
            />
            <span className="text-[10px] text-zinc-400">{row.label}</span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Add Students Modal ───────────────────────────────────────────────────────

function AddStudentsModal({ grade, batchId, onAdded, onClose }: {
  grade: string
  batchId: string
  onAdded: () => void
  onClose: () => void
}) {
  const { students: eligible, loading, error: loadError } = useEligibleStudents(grade, batchId)
  const [selected, setSelected] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)

  const toggle = (id: string) =>
    setSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id])

  async function confirm() {
    if (selected.length === 0) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      await addStudentsToBatch(batchId, selected)
      onAdded()
      onClose()
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Failed to add students')
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
        className="bg-white w-full sm:max-w-md shadow-2xl rounded-t-xl sm:rounded-xl border border-zinc-200 overflow-hidden max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 sm:px-6 py-4 border-b border-zinc-200 shrink-0">
          <h3 className="text-sm font-semibold text-zinc-900">Add students to batch</h3>
          <p className="text-xs text-zinc-500 mt-0.5">Unassigned {grade} students</p>
        </div>

        {loading ? (
          <div className="px-6 py-12 text-center text-sm text-zinc-400">Loading…</div>
        ) : loadError ? (
          <div className="px-6 py-12 text-center text-sm text-red-600">{loadError}</div>
        ) : eligible.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-zinc-400">
            All {grade} students are already in a batch.
          </div>
        ) : (
          <div className="overflow-y-auto flex-1">
            {eligible.map((s, i) => (
              <label key={s.id} className={`flex items-center gap-3 px-5 sm:px-6 py-3 hover:bg-zinc-50 cursor-pointer ${i !== eligible.length - 1 ? 'border-b border-zinc-100' : ''}`}>
                <input type="checkbox" checked={selected.includes(s.id)} onChange={() => toggle(s.id)}
                  className="w-4 h-4 rounded-sm accent-violet-700 shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm text-zinc-900 truncate">{s.name}</p>
                  <p className="text-xs text-zinc-500 truncate">
                    {s.roll}{s.currentBatchName ? ` · currently in ${s.currentBatchName}` : ''}
                  </p>
                </div>
              </label>
            ))}
          </div>
        )}

        {submitError && (
          <p className="px-5 sm:px-6 pt-3 text-xs text-red-600 shrink-0">{submitError}</p>
        )}

        <div className="flex gap-2 px-5 sm:px-6 py-4 border-t border-zinc-200 bg-zinc-50 shrink-0">
          <button onClick={onClose}
            className="flex-1 py-2.5 text-sm font-medium text-zinc-700 border border-zinc-300 rounded-md hover:bg-zinc-100 transition-colors">
            Cancel
          </button>
          <button
            onClick={confirm}
            disabled={selected.length === 0 || submitting}
            className="flex-1 py-2.5 text-sm font-medium text-white rounded-md disabled:opacity-40 transition-colors"
            style={{ backgroundColor: ACCENT }}
          >
            {submitting
              ? 'Adding…'
              : selected.length > 0
                ? `Add ${selected.length} student${selected.length !== 1 ? 's' : ''}`
                : 'Select students'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Student Graph Modal ──────────────────────────────────────────────────────

function StudentGraphModal({ student, onClose }: { student: Student; onClose: () => void }) {
  const { points, loading, error } = useStudentTrend(student.id)
  const avg = points.length > 0 ? Math.round(points.reduce((a, b) => a + b.pct, 0) / points.length) : null
  const st = avg !== null ? statusOf(avg) : null

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 24, opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="bg-white w-full sm:max-w-sm shadow-2xl rounded-t-xl sm:rounded-xl border border-zinc-200 p-6 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="text-sm font-semibold text-zinc-900">{student.name}</p>
            <p className="text-xs text-zinc-500 mt-0.5">{student.roll}</p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 text-xl leading-none">&times;</button>
        </div>
        <p className="text-[10px] font-semibold tracking-widest uppercase text-zinc-400 mb-4">Last 5 sessions</p>

        {loading ? (
          <div className="h-[108px] flex items-center justify-center text-sm text-zinc-400">Loading…</div>
        ) : error ? (
          <div className="h-[108px] flex items-center justify-center text-sm text-red-600">{error}</div>
        ) : points.length === 0 ? (
          <div className="h-[108px] flex items-center justify-center text-sm text-zinc-400">No sessions yet</div>
        ) : (
          <MiniChart data={points.map(p => ({ label: p.label, val: p.pct }))} />
        )}

        {avg !== null && st && (
          <div className="mt-4 flex items-center justify-between pt-4 border-t border-zinc-200">
            <span className="text-xs text-zinc-500">5-session average</span>
            <span className="text-sm font-bold tabular-nums" style={{ color: st.fg }}>{avg}%</span>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AttendancePage() {
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null)
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null)
  const [activeSection, setSection] = useState<Section>('qr')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [addingBatch, setAddingBatch] = useState(false)
  const [newBatchName, setNewBatchName] = useState('')
  const [newBatchMode, setNewBatchMode] = useState<'online' | 'offline'>('offline')
  const [newBatchMeetLink, setNewBatchMeetLink] = useState('')
  const [newBatchLocation, setNewBatchLocation] = useState('')
  const [showAddStudents, setShowAddStudents] = useState(false)
  const [graphStudent, setGraphStudent] = useState<Student | null>(null)
  const [selectedStudentIdForScan, setSelectedStudentIdForScan] = useState('')

  const { batches, addBatch } = useBatches(selectedGrade)
  const selectedBatch = batches.find(b => b.id === selectedBatchId) ?? null

  const { students, refetch: refetchStudents } = useBatchStudents(selectedBatchId, date)
  const { summary } = useBatchSummary(selectedBatchId)

  const hasContext = !!(selectedGrade && selectedBatchId)
  const qrActive = activeSection === 'qr' && hasContext
  const isToday = date === new Date().toISOString().slice(0, 10)

  const {
    sessionId, qrToken, countdown, refreshSeconds, error: sessionError,
    started, startSession, stopSession,
  } = useAttendanceSession(selectedBatchId, date, qrActive)
  const { entries, refetch: refetchRoster } = useRoster(sessionId)

  async function handleAddBatch() {
    const name = newBatchName.trim()
    if (!name) return
    const batch = await addBatch(name, newBatchMode, {
      meet_link: newBatchMode === 'online' ? (newBatchMeetLink.trim() || undefined) : undefined,
      location:  newBatchMode === 'offline' ? (newBatchLocation.trim() || undefined) : undefined,
    })
    if (batch) setSelectedBatchId(batch.id)
    setAddingBatch(false)
    setNewBatchName('')
    setNewBatchMeetLink('')
    setNewBatchLocation('')
  }

  function handleGradeSelect(g: string) {
    setSelectedGrade(g)
    setSelectedBatchId(null)
    setAddingBatch(false)
  }

  async function handleSimulateScan() {
    if (!selectedStudentIdForScan || !sessionId) return
    try {
      await manualMark(sessionId, selectedStudentIdForScan, true)
      refetchRoster()
      setSelectedStudentIdForScan('')
    } catch (e) {
      console.error(e)
    }
  }

  async function handleToggleUnblock(s: Student) {
    if (!selectedBatchId) return
    try {
      await overrideStudentBlock(s.id, selectedBatchId, !s.unblocked)
      refetchStudents()
    } catch (e) {
      console.error(e)
    }
  }

  const presentIds = useMemo(
    () => new Set(entries.filter(e => e.present).map(e => e.studentId)),
    [entries]
  )
  const isPresent = (id: string) => presentIds.has(id)
  const presentCount = students.filter(s => presentIds.has(s.id)).length

  const stats = useMemo(() => {
    const c = { blocked: 0, warning: 0, good: 0, excellent: 0 }
    students.forEach(s => {
      if (s.attendancePct === null) return
      if (s.attendancePct < 75) c.blocked++
      else if (s.attendancePct < 80) c.warning++
      else if (s.attendancePct < 90) c.good++
      else c.excellent++
    })
    return c
  }, [students])

  const dateLabel = new Date(date).toLocaleDateString('en-IN', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric',
  })

  return (
    <div className="min-h-screen bg-zinc-50 px-4 sm:px-6 py-6 max-w-screen mx-auto space-y-6">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 pb-4 border-b border-zinc-200">
        <div>
          <p className="text-[10px] font-medium tracking-[0.15em] uppercase text-zinc-400 mb-1">Attendance</p>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-zinc-900">Session Management</h1>
        </div>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="text-sm border border-zinc-300 rounded-md px-3 py-2 bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400 w-full sm:w-auto"
        />
      </div>

      {/* ── Grade + Batch selectors ────────────────────────────────────────── */}
      <div className="space-y-4">
        {/* Grade */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
          <span className="text-xs font-medium text-zinc-500 sm:w-12 shrink-0">Grade</span>
          <div className="flex gap-1.5 flex-wrap">
            {GRADES.map(g => (
              <button
                key={g}
                onClick={() => handleGradeSelect(g)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  selectedGrade === g
                    ? 'text-white'
                    : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200'
                }`}
                style={selectedGrade === g ? { backgroundColor: ACCENT } : undefined}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Batch */}
        <AnimatePresence>
          {selectedGrade && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 overflow-hidden"
            >
              <span className="text-xs font-medium text-zinc-500 sm:w-12 shrink-0">Batch</span>
              <div className="flex gap-1.5 flex-wrap items-center">
                {batches.map(b => (
                  <button
                    key={b.id}
                    onClick={() => setSelectedBatchId(b.id)}
                    className={`px-3 py-1.5 rounded-md text-sm transition-colors border flex items-center gap-1.5 ${
                      selectedBatchId === b.id
                        ? 'bg-zinc-900 text-white border-zinc-900 font-medium'
                        : 'bg-white text-zinc-600 hover:bg-zinc-50 border-zinc-300'
                    }`}
                  >
                    {b.name}
                    {b.mode && (
                      <span className={`text-[9px] uppercase tracking-wide px-1.5 py-0.5 rounded-full ${
                        selectedBatchId === b.id ? 'bg-white/15 text-white' : 'bg-zinc-100 text-zinc-500'
                      }`}>
                        {b.mode}
                      </span>
                    )}
                  </button>
                ))}
                {!addingBatch ? (
                  <button
                    onClick={() => setAddingBatch(true)}
                    className="px-3 py-1.5 rounded-md text-sm border border-dashed border-zinc-300 text-zinc-500 hover:border-zinc-400 hover:text-zinc-700 transition-colors"
                  >
                    + New batch
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <input
                      autoFocus type="text" value={newBatchName}
                      onChange={e => setNewBatchName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleAddBatch()
                        if (e.key === 'Escape') { setAddingBatch(false); setNewBatchName('') }
                      }}
                      placeholder="Batch name"
                      className="border border-zinc-300 rounded-md px-3 py-1.5 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400 bg-white"
                    />
                    <div className="flex rounded-md border border-zinc-300 overflow-hidden text-xs">
                      {(['offline', 'online'] as const).map(m => (
                        <button
                          key={m}
                          onClick={() => setNewBatchMode(m)}
                          className={`px-2.5 py-1.5 capitalize ${newBatchMode === m ? 'text-white' : 'bg-white text-zinc-500'}`}
                          style={newBatchMode === m ? { backgroundColor: ACCENT } : undefined}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                    {newBatchMode === 'online' ? (
                      <input
                        type="url"
                        value={newBatchMeetLink}
                        onChange={e => setNewBatchMeetLink(e.target.value)}
                        placeholder="Meet/Zoom link"
                        className="border border-zinc-300 rounded-md px-3 py-1.5 text-sm w-44 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400 bg-white"
                      />
                    ) : (
                      <input
                        type="text"
                        value={newBatchLocation}
                        onChange={e => setNewBatchLocation(e.target.value)}
                        placeholder="Room / location"
                        className="border border-zinc-300 rounded-md px-3 py-1.5 text-sm w-40 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400 bg-white"
                      />
                    )}
                    <button onClick={handleAddBatch}
                      className="px-3 py-1.5 text-white text-sm rounded-md transition-colors"
                      style={{ backgroundColor: ACCENT }}>
                      Save
                    </button>
                    <button onClick={() => { setAddingBatch(false); setNewBatchName(''); setNewBatchMeetLink(''); setNewBatchLocation('') }}
                      className="text-zinc-400 hover:text-zinc-700 px-1 text-lg leading-none">&times;</button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Stats + Tabs ───────────────────────────────────────────────────── */}
      <AnimatePresence>
        {hasContext && (
          <motion.div
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >

            {/* Tab bar */}
            <div className="flex items-center justify-between border-b border-zinc-200 flex-wrap gap-y-2">
              <div className="flex">
                {(['qr', 'summary'] as Section[]).map(s => (
                  <button
                    key={s}
                    onClick={() => setSection(s)}
                    className={`px-3 sm:px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                      activeSection === s
                        ? 'border-zinc-900 text-zinc-900'
                        : 'border-transparent text-zinc-400 hover:text-zinc-700'
                    }`}
                  >
                    {s === 'qr' ? 'QR Attendance' : 'Summary'}
                  </button>
                ))}
              </div>
              {activeSection === 'qr' && (
                <button
                  onClick={() => setShowAddStudents(true)}
                  className="text-xs px-3 py-1.5 text-white rounded-md mb-1 transition-colors"
                  style={{ backgroundColor: ACCENT }}
                >
                  + Add students
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Main content ───────────────────────────────────────────────────── */}
      {!hasContext ? (
        <div className="flex flex-col items-center justify-center py-24 sm:py-32 gap-3 text-zinc-300">
          <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M3 10h18M8 3v4M16 3v4" strokeLinecap="round" />
            <circle cx="12" cy="15" r="2" />
          </svg>
          <p className="text-sm text-zinc-400">Choose a grade and batch to begin</p>
        </div>
      ) : (
        <AnimatePresence mode="wait">

          {/* ── QR tab ── */}
          {activeSection === 'qr' && (
            <motion.div
              key="qr"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6"
            >
              {/* QR session card */}
              <div className="bg-white rounded-lg border border-zinc-200 p-6 sm:p-8 flex flex-col items-center gap-6">
                <div className="text-center">
                  <p className="text-[10px] font-medium tracking-[0.2em] uppercase text-zinc-400 mb-2">Live Session</p>
                  <p className="text-zinc-900 text-lg font-semibold">
                    {selectedGrade} · {selectedBatch?.name}
                    {selectedBatch?.mode && (
                      <span className="ml-2 align-middle text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-500">
                        {selectedBatch.mode}
                      </span>
                    )}
                  </p>
                  <p className="text-zinc-500 text-xs mt-1">{dateLabel}</p>
                  {selectedBatch?.mode === 'online' && selectedBatch?.meet_link && (
                    <a
                      href={selectedBatch.meet_link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-2 text-xs text-violet-700 underline"
                    >
                      Open meet link
                    </a>
                  )}
                </div>

                {/* QR + ring, or explicit start-session CTA */}
                {started ? (
                  <div className="relative" style={{ width: 220, height: 220 }}>
                    <CountdownRing countdown={countdown} total={refreshSeconds} size={220} />
                    <div className="absolute inset-3 bg-white rounded-md flex items-center justify-center border border-zinc-200 shadow-sm">
                      {qrToken ? (
                        <QRCodeSVG value={qrToken} size={172} bgColor="#ffffff" fgColor="#18181B" level="H" />
                      ) : (
                        <div className="w-40 h-40 bg-zinc-100 animate-pulse rounded" />
                      )}
                    </div>
                  </div>
                ) : (
                  <div
                    style={{ width: 220, height: 220 }}
                    className="flex flex-col items-center justify-center gap-4 border border-dashed border-zinc-300 rounded-xl"
                  >
                    <p className="text-xs text-zinc-400 text-center px-6">No live session yet for this date</p>
                    <button
                      onClick={startSession}
                      className="px-4 py-2 text-white text-sm rounded-md transition-colors"
                      style={{ backgroundColor: ACCENT }}
                    >
                      Start Live Session
                    </button>
                  </div>
                )}

                {started && (
                  sessionError ? (
                    <p className="text-xs text-red-600 text-center">{sessionError}</p>
                  ) : (
                    <p className="text-zinc-500 text-xs text-center">
                      Refreshes in <span className="text-zinc-900 font-mono font-medium">{countdown}s</span> · Students scan to mark attendance
                    </p>
                  )
                )}

                {started && (
                  <button
                    onClick={stopSession}
                    className="text-xs text-zinc-400 hover:text-zinc-700 underline"
                  >
                    End session view
                  </button>
                )}

                {/* Demo simulator */}
                {started && (
                  <div className="w-full pt-5 border-t border-zinc-200 space-y-2">
                    <p className="text-[10px] font-medium tracking-[0.15em] uppercase text-zinc-400">
                      Demo — simulate scan
                    </p>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <select
                        value={selectedStudentIdForScan}
                        onChange={e => setSelectedStudentIdForScan(e.target.value)}
                        className="flex-1 text-sm rounded-md px-3 py-2 outline-none border border-zinc-300 bg-white text-zinc-900 focus:ring-2 focus:ring-violet-200 focus:border-violet-400"
                      >
                        <option value="">Select student…</option>
                        {students.map(s => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                      <button
                        onClick={handleSimulateScan}
                        disabled={!selectedStudentIdForScan}
                        className="px-4 py-2 text-white text-sm rounded-md disabled:opacity-40 transition-colors whitespace-nowrap"
                        style={{ backgroundColor: ACCENT }}
                      >
                        Mark present
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Attendance roster */}
              <div className="border border-zinc-200 rounded-lg overflow-hidden flex flex-col bg-white">
                <div className="px-5 py-4 border-b border-zinc-200 flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">
                      {isToday ? "Today's roster" : `Roster for ${dateLabel}`}
                    </p>
                    <p className="text-xs text-zinc-500 mt-1">
                      {presentCount} of {students.length} present
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-semibold tabular-nums text-zinc-900">
                      {students.length > 0 ? Math.round((presentCount / students.length) * 100) : 0}%
                    </p>
                  </div>
                </div>

                {/* Live fill bar */}
                <div className="h-1 bg-zinc-100">
                  <motion.div
                    className="h-full"
                    style={{ backgroundColor: ACCENT }}
                    animate={{ width: `${students.length > 0 ? (presentCount / students.length) * 100 : 0}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                  />
                </div>

                <div className="divide-y divide-zinc-100 overflow-y-auto flex-1" style={{ maxHeight: 400 }}>
                  {students.map(s => {
                    const present = isPresent(s.id)
                    return (
                      <div key={s.id} className="flex items-center justify-between px-5 py-3 hover:bg-zinc-50 transition-colors">
                        <div className="min-w-0">
                          <p className="text-sm text-zinc-900 truncate">{s.name}</p>
                          <p className="text-xs text-zinc-500 font-mono">{s.roll}</p>
                        </div>
                        <span
                          className="text-xs px-2.5 py-0.5 rounded-full font-medium shrink-0"
                          style={present
                            ? { backgroundColor: '#F0FDF4', color: '#15803D' }
                            : { backgroundColor: '#F4F4F5', color: '#71717A' }}
                        >
                          {present ? 'Present' : 'Absent'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </motion.div>
          )}

          {/* ── Summary tab ── */}
          {activeSection === 'summary' && (
            <motion.div
              key="summary"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="space-y-4"
            >
              {/* Batch-level aggregate stats — from GET /batches/:id/summary */}
              {summary && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Total students', value: summary.totalStudents },
                    { label: 'Total sessions', value: summary.totalSessions },
                    { label: 'Avg attendance', value: summary.avgAttendancePct !== null ? `${summary.avgAttendancePct}%` : '—' },
                    { label: 'Present today', value: summary.todaySessionActive ? `${summary.presentToday}/${summary.totalStudents}` : '—' },
                  ].map(tile => (
                    <div key={tile.label} className="bg-white rounded-lg border border-zinc-200 px-4 py-3">
                      <p className="text-[10px] font-medium tracking-widest uppercase text-zinc-400 mb-1">{tile.label}</p>
                      <p className="text-lg font-semibold text-zinc-900 tabular-nums">{tile.value}</p>
                    </div>
                  ))}
                </div>
              )}

              <div className="border border-zinc-200 rounded-lg overflow-hidden bg-white">
                {/* Header row — hidden on mobile, cards carry their own labels */}
                <div className="hidden sm:grid grid-cols-[1fr_140px_180px] px-5 py-3 border-b border-zinc-200 bg-zinc-50">
                  {['Student', 'Attendance', 'Actions'].map((h, i) => (
                    <span key={h}
                      className={`text-[10px] font-medium tracking-widest uppercase text-zinc-400 ${i > 0 ? 'text-right' : ''}`}
                    >
                      {h}
                    </span>
                  ))}
                </div>

                <div className="divide-y divide-zinc-100">
                  {students.map(s => {
                    if (s.attendancePct === null) return null
                    const pct = s.attendancePct
                    const st = s.unblocked ? STATUS.active : statusOf(pct)
                    const isBlocked = !s.unblocked && pct < 75

                    return (
                      <div
                        key={s.id}
                        className="flex flex-col sm:grid sm:grid-cols-[1fr_140px_180px] gap-3 sm:gap-0 px-5 py-3.5 sm:items-center hover:bg-zinc-50 transition-colors"
                      >
                        {/* Student */}
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-1.5 h-8 rounded-full shrink-0" style={{ backgroundColor: st.dot }} />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-zinc-900 truncate">{s.name}</p>
                            <p className="text-xs text-zinc-500 font-mono">{s.roll}</p>
                          </div>
                        </div>

                        {/* Attendance: % + badge merged into one column */}
                        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-2 sm:gap-1 sm:text-right pl-[22px] sm:pl-0">
                          <span className="text-sm font-semibold tabular-nums" style={{ color: st.fg }}>
                            {pct}%
                          </span>
                          <span
                            className="text-xs px-2.5 py-0.5 rounded-full font-medium"
                            style={{ color: st.fg, backgroundColor: st.bg }}
                          >
                            {st.text}
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="flex sm:justify-end gap-1.5 pl-[22px] sm:pl-0">
                          {(isBlocked || s.unblocked) && (
                            <button
                              onClick={() => handleToggleUnblock(s)}
                              className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
                                s.unblocked
                                  ? 'border-zinc-300 text-zinc-600 hover:bg-zinc-100'
                                  : 'border-violet-200 text-violet-700 bg-violet-50 hover:bg-violet-100'
                              }`}
                            >
                              {s.unblocked ? 'Re-block' : 'Unblock'}
                            </button>
                          )}
                          <button
                            onClick={() => setGraphStudent(s)}
                            className="text-xs px-2.5 py-1 rounded-md border border-zinc-300 text-zinc-600 hover:bg-zinc-100 transition-colors"
                          >
                            Trend
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showAddStudents && selectedGrade && selectedBatchId && (
          <AddStudentsModal
            grade={selectedGrade}
            batchId={selectedBatchId}
            onAdded={refetchStudents}
            onClose={() => setShowAddStudents(false)}
          />
        )}
        {graphStudent && (
          <StudentGraphModal student={graphStudent} onClose={() => setGraphStudent(null)} />
        )}
      </AnimatePresence>
    </div>
  )
}
