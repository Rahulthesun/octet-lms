'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { QRCodeSVG } from 'qrcode.react'
import * as api from '../../../lib/attendance'
import type { Student } from '../../../lib/attendance'
import {
  useBatches,
  useBatchStudents,
  useEligibleStudents,
  useAttendanceSession,
  useRoster,
  useStudentTrend,
} from '../../../hooks/useAttendanceData'

// ─── Types ────────────────────────────────────────────────────────────────────

type Section = 'qr' | 'summary'

const GRADES = ['11th', '12th', 'JEE', 'NEET'] as const

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS = {
  blocked:  { text: 'Blocked',   color: '#991b1b', light: '#fef2f2', dot: '#dc2626' },
  warning:  { text: 'Warning',   color: '#9a3412', light: '#fff7ed', dot: '#ea580c' },
  good:     { text: 'Good',      color: '#166534', light: '#f0fdf4', dot: '#16a34a' },
  excellent:{ text: 'Excellent', color: '#0f766e', light: '#f0fdfa', dot: '#14b8a6' },
  active:   { text: 'Active',    color: '#3730a3', light: '#eef2ff', dot: '#6366f1' },
}

function statusOf(pct: number) {
  if (pct < 75) return STATUS.blocked
  if (pct < 80) return STATUS.warning
  if (pct < 90) return STATUS.good
  return STATUS.excellent
}

// ─── Countdown ring ───────────────────────────────────────────────────────────

function CountdownRing({ countdown, total, size = 240 }: {
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
      <circle cx={size / 2} cy={size / 2} r={R} fill="none" stroke="hsl(var(--muted))" strokeWidth="2" />
      <circle
        cx={size / 2} cy={size / 2} r={R}
        fill="none" stroke="hsl(var(--primary))" strokeWidth="2"
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
    <div className="flex items-end gap-3 w-full" style={{ height: maxH + 28 }}>
      {data.map((row, i) => {
        const barH = Math.round((row.val / 100) * maxH)
        const st = statusOf(row.val)
        return (
          <div key={i} className="flex-1 flex flex-col items-center justify-end gap-1.5">
            <span className="text-[11px] tabular-nums text-muted-foreground">{row.val}%</span>
            <motion.div
              initial={{ height: 0 }} animate={{ height: barH }}
              transition={{ duration: 0.35, delay: i * 0.06, ease: 'easeOut' }}
              className="w-full rounded-[2px]"
              style={{ backgroundColor: st.dot }}
            />
            <span className="text-[10px] text-muted-foreground">{row.label}</span>
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
      await api.addStudentsToBatch(batchId, selected)
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
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.97, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.97, opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="bg-background w-full max-w-md shadow-2xl rounded-lg border overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 py-5 border-b">
          <h3 className="text-sm font-semibold">Add students to batch</h3>
          <p className="text-xs text-muted-foreground mt-1">Unassigned {grade} students</p>
        </div>

        {loading ? (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">Loading…</div>
        ) : loadError ? (
          <div className="px-6 py-12 text-center text-sm text-red-600">{loadError}</div>
        ) : eligible.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">
            All {grade} students are already in a batch.
          </div>
        ) : (
          <div className="max-h-72 overflow-y-auto">
            {eligible.map((s, i) => (
              <label key={s.id} className={`flex items-center gap-3 px-6 py-3 hover:bg-accent cursor-pointer ${i !== eligible.length - 1 ? 'border-b' : ''}`}>
                <input type="checkbox" checked={selected.includes(s.id)} onChange={() => toggle(s.id)}
                  className="w-4 h-4 accent-foreground rounded-sm" />
                <div>
                  <p className="text-sm">{s.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {s.roll}{s.currentBatchName ? ` · currently in ${s.currentBatchName}` : ''}
                  </p>
                </div>
              </label>
            ))}
          </div>
        )}

        {submitError && (
          <p className="px-6 pt-3 text-xs text-red-600">{submitError}</p>
        )}

        <div className="flex gap-2 px-6 py-4 border-t bg-muted/30">
          <button onClick={onClose}
            className="flex-1 py-2 text-sm border rounded-md hover:bg-accent transition-colors">
            Cancel
          </button>
          <button
            onClick={confirm}
            disabled={selected.length === 0 || submitting}
            className="flex-1 py-2 text-sm text-primary-foreground bg-primary rounded-md hover:bg-primary/90 disabled:opacity-50 transition-colors"
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
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.97, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.97, opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="bg-background w-full max-w-sm shadow-2xl rounded-lg border p-6 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="text-sm font-semibold">{student.name}</p>
            <p className="text-xs text-muted-foreground mt-1">{student.roll}</p>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl leading-none">&times;</button>
        </div>
        <p className="text-[10px] font-semibold tracking-widest uppercase text-muted-foreground mb-4">Last 5 sessions</p>

        {loading ? (
          <div className="h-[108px] flex items-center justify-center text-sm text-muted-foreground">Loading…</div>
        ) : error ? (
          <div className="h-[108px] flex items-center justify-center text-sm text-red-600">{error}</div>
        ) : points.length === 0 ? (
          <div className="h-[108px] flex items-center justify-center text-sm text-muted-foreground">No sessions yet</div>
        ) : (
          <MiniChart data={points.map(p => ({ label: p.label, val: p.pct }))} />
        )}

        {avg !== null && st && (
          <div className="mt-4 flex items-center justify-between pt-4 border-t">
            <span className="text-xs text-muted-foreground">5-session average</span>
            <span className="text-sm font-bold tabular-nums" style={{ color: st.color }}>{avg}%</span>
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
  const [showAddStudents, setShowAddStudents] = useState(false)
  const [graphStudent, setGraphStudent] = useState<Student | null>(null)
  const [selectedStudentIdForScan, setSelectedStudentIdForScan] = useState('')

  const { batches, addBatch } = useBatches(selectedGrade)
  const selectedBatch = batches.find(b => b.id === selectedBatchId) ?? null

  const { students, refetch: refetchStudents } = useBatchStudents(selectedBatchId, date)

  const hasContext = !!(selectedGrade && selectedBatchId)
  const qrActive = activeSection === 'qr' && hasContext

  const { sessionId, qrToken, countdown, refreshSeconds, error: sessionError } =
    useAttendanceSession(selectedBatchId, date, qrActive)
  const { entries, refetch: refetchRoster } = useRoster(sessionId)

  async function handleAddBatch() {
    const name = newBatchName.trim()
    if (!name) return
    const batch = await addBatch(name, newBatchMode)
    if (batch) setSelectedBatchId(batch.id)
    setAddingBatch(false)
    setNewBatchName('')
  }

  function handleGradeSelect(g: string) {
    setSelectedGrade(g)
    setSelectedBatchId(null)
    setAddingBatch(false)
  }

  async function handleSimulateScan() {
    if (!selectedStudentIdForScan || !sessionId) return
    try {
      await api.manualMark(sessionId, selectedStudentIdForScan, true)
      refetchRoster()
      setSelectedStudentIdForScan('')
    } catch (e) {
      console.error(e)
    }
  }

  async function handleToggleUnblock(s: Student) {
    if (!selectedBatchId) return
    try {
      await api.overrideStudentBlock(s.id, selectedBatchId, !s.unblocked)
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
    <div className="min-h-screen bg-background p-6 max-w-5xl mx-auto space-y-6">

      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div className="flex items-end justify-between pb-2 border-b">
        <div>
          <p className="text-[10px] font-medium tracking-[0.15em] uppercase text-muted-foreground mb-1">Attendance</p>
          <h1 className="text-2xl font-semibold tracking-tight">Session Management</h1>
        </div>
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="text-sm border rounded-md px-3 py-1.5 bg-background focus:outline-none focus:ring-1 focus:ring-ring"
        />
      </div>

      {/* ── Grade + Batch selectors ────────────────────────────────────────── */}
      <div className="space-y-4">
        {/* Grade */}
        <div className="flex items-center gap-4">
          <span className="text-xs font-medium text-muted-foreground w-12 shrink-0">Grade</span>
          <div className="flex gap-1">
            {GRADES.map(g => (
              <button
                key={g}
                onClick={() => handleGradeSelect(g)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  selectedGrade === g
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
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
              className="flex items-center gap-4 overflow-hidden"
            >
              <span className="text-xs font-medium text-muted-foreground w-12 shrink-0">Batch</span>
              <div className="flex gap-1 flex-wrap items-center">
                {batches.map(b => (
                  <button
                    key={b.id}
                    onClick={() => setSelectedBatchId(b.id)}
                    className={`px-3 py-1 rounded-md text-sm transition-all ${
                      selectedBatchId === b.id
                        ? 'bg-secondary text-secondary-foreground border border-border font-medium'
                        : 'bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground border border-transparent'
                    }`}
                  >
                    {b.name}
                  </button>
                ))}
                {!addingBatch ? (
                  <button
                    onClick={() => setAddingBatch(true)}
                    className="px-3 py-1 rounded-md text-sm border border-dashed border-muted-foreground/30 text-muted-foreground hover:border-foreground/40 hover:text-foreground transition-all"
                  >
                    + New batch
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <input
                      autoFocus type="text" value={newBatchName}
                      onChange={e => setNewBatchName(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') handleAddBatch()
                        if (e.key === 'Escape') { setAddingBatch(false); setNewBatchName('') }
                      }}
                      placeholder="Batch name"
                      className="border rounded-md px-3 py-1 text-sm w-32 focus:outline-none focus:ring-1 focus:ring-ring bg-background"
                    />
                    <div className="flex rounded-md border overflow-hidden text-xs">
                      {(['offline', 'online'] as const).map(m => (
                        <button
                          key={m}
                          onClick={() => setNewBatchMode(m)}
                          className={`px-2 py-1 capitalize ${newBatchMode === m ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground'}`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                    <button onClick={handleAddBatch}
                      className="px-3 py-1 bg-primary text-primary-foreground text-sm rounded-md hover:bg-primary/90 transition-colors">
                      Save
                    </button>
                    <button onClick={() => { setAddingBatch(false); setNewBatchName('') }}
                      className="text-muted-foreground hover:text-foreground px-1 text-lg leading-none">&times;</button>
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
            {/* Stat cards */}
            <div className="grid grid-cols-4 gap-3">
              {[
                { key: 'blocked',   label: 'Blocked',   count: stats.blocked,   ...STATUS.blocked   },
                { key: 'warning',   label: 'Warning',   count: stats.warning,   ...STATUS.warning   },
                { key: 'good',      label: 'Good',      count: stats.good,      ...STATUS.good      },
                { key: 'excellent', label: 'Excellent', count: stats.excellent, ...STATUS.excellent  },
              ].map(s => (
                <div key={s.key} className="border rounded-lg p-4 flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: s.dot }} />
                  <div>
                    <p className="text-2xl font-semibold leading-none tabular-nums" style={{ color: s.color }}>{s.count}</p>
                    <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Tab bar */}
            <div className="flex items-center justify-between border-b">
              <div className="flex">
                {(['qr', 'summary'] as Section[]).map(s => (
                  <button
                    key={s}
                    onClick={() => setSection(s)}
                    className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-all ${
                      activeSection === s
                        ? 'border-foreground text-foreground'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {s === 'qr' ? 'QR Attendance' : 'Summary'}
                  </button>
                ))}
              </div>
              {activeSection === 'qr' && (
                <button
                  onClick={() => setShowAddStudents(true)}
                  className="text-xs px-3 py-1.5 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 mb-1 transition-colors"
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
        <div className="flex flex-col items-center justify-center py-32 gap-3 text-muted-foreground/50">
          <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M3 10h18M8 3v4M16 3v4" strokeLinecap="round" />
            <circle cx="12" cy="15" r="2" />
          </svg>
          <p className="text-sm text-muted-foreground">Choose a grade and batch to begin</p>
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
              <div className="bg-card rounded-lg border p-8 flex flex-col items-center gap-6">
                <div className="text-center">
                  <p className="text-[10px] font-medium tracking-[0.2em] uppercase text-muted-foreground mb-2">Live Session</p>
                  <p className="text-foreground text-lg font-semibold">
                    {selectedGrade} · {selectedBatch?.name}
                  </p>
                  <p className="text-muted-foreground text-xs mt-1">{dateLabel}</p>
                </div>

                {/* QR + ring */}
                <div className="relative" style={{ width: 240, height: 240 }}>
                  <CountdownRing countdown={countdown} total={refreshSeconds} size={240} />
                  <div className="absolute inset-3 bg-white rounded-md flex items-center justify-center border shadow-sm">
                    {qrToken ? (
                      <QRCodeSVG value={qrToken} size={188} bgColor="#ffffff" fgColor="#0a0a0a" level="H" />
                    ) : (
                      <div className="w-44 h-44 bg-muted animate-pulse rounded" />
                    )}
                  </div>
                </div>

                {sessionError ? (
                  <p className="text-xs text-red-600 text-center">{sessionError}</p>
                ) : (
                  <p className="text-muted-foreground text-xs text-center">
                    Refreshes in <span className="text-foreground font-mono font-medium">{countdown}s</span> · Students scan to mark attendance
                  </p>
                )}

                {/* Demo simulator */}
                <div className="w-full pt-5 border-t space-y-2">
                  <p className="text-[10px] font-medium tracking-[0.15em] uppercase text-muted-foreground">
                    Demo — simulate scan
                  </p>
                  <div className="flex gap-2">
                    <select
                      value={selectedStudentIdForScan}
                      onChange={e => setSelectedStudentIdForScan(e.target.value)}
                      className="flex-1 text-sm rounded-md px-3 py-2 outline-none border bg-background focus:ring-1 focus:ring-ring"
                    >
                      <option value="">Select student…</option>
                      {students.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                    <button
                      onClick={handleSimulateScan}
                      disabled={!selectedStudentIdForScan}
                      className="px-4 py-2 bg-primary text-primary-foreground text-sm rounded-md hover:bg-primary/90 disabled:opacity-40 transition-colors whitespace-nowrap"
                    >
                      Mark present
                    </button>
                  </div>
                </div>
              </div>

              {/* Attendance roster */}
              <div className="border rounded-lg overflow-hidden flex flex-col bg-card">
                <div className="px-5 py-4 border-b flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold">Today's roster</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {presentCount} of {students.length} present
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-semibold tabular-nums">
                      {students.length > 0 ? Math.round((presentCount / students.length) * 100) : 0}%
                    </p>
                  </div>
                </div>

                {/* Live fill bar */}
                <div className="h-1 bg-muted">
                  <motion.div
                    className="h-full bg-primary"
                    animate={{ width: `${students.length > 0 ? (presentCount / students.length) * 100 : 0}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                  />
                </div>

                <div className="divide-y overflow-y-auto flex-1" style={{ maxHeight: 400 }}>
                  {students.map(s => {
                    const present = isPresent(s.id)
                    return (
                      <div key={s.id} className="flex items-center justify-between px-5 py-3 hover:bg-accent/50 transition-colors">
                        <div className="min-w-0">
                          <p className="text-sm truncate">{s.name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{s.roll}</p>
                        </div>
                        <span
                          className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${
                            present
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : 'bg-muted text-muted-foreground'
                          }`}
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
            >
              <div className="border rounded-lg overflow-hidden bg-card">
                <div className="grid grid-cols-[1fr_80px_100px_140px] px-5 py-3 border-b bg-muted/40">
                  {['Student', 'Att.', 'Status', 'Actions'].map((h, i) => (
                    <span key={h}
                      className={`text-[10px] font-medium tracking-widest uppercase text-muted-foreground ${i > 0 ? 'text-right' : ''}`}
                    >
                      {h}
                    </span>
                  ))}
                </div>

                <div className="divide-y">
                  {students.map(s => {
                    if (s.attendancePct === null) return null
                    const pct = s.attendancePct
                    const st = s.unblocked ? STATUS.active : statusOf(pct)
                    const isBlocked = !s.unblocked && pct < 75

                    return (
                      <div
                        key={s.id}
                        className="grid grid-cols-[1fr_80px_100px_140px] px-5 py-3.5 items-center hover:bg-accent/40 transition-colors"
                      >
                        {/* Student */}
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-1.5 h-8 rounded-full shrink-0" style={{ backgroundColor: st.dot }} />
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{s.name}</p>
                            <p className="text-xs text-muted-foreground font-mono">{s.roll}</p>
                          </div>
                        </div>

                        {/* Att % + mini bar */}
                        <div className="text-right space-y-1">
                          <span className="text-sm font-semibold tabular-nums block" style={{ color: st.color }}>
                            {pct}%
                          </span>
                          <div className="h-1 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${pct}%`, backgroundColor: st.dot }}
                            />
                          </div>
                        </div>

                        {/* Status badge */}
                        <div className="text-right">
                          <span
                            className="text-xs px-2.5 py-0.5 rounded-full font-medium"
                            style={{ color: st.color, backgroundColor: st.light }}
                          >
                            {st.text}
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end gap-1.5">
                          {(isBlocked || s.unblocked) && (
                            <button
                              onClick={() => handleToggleUnblock(s)}
                              className={`text-xs px-2.5 py-1 rounded-md border transition-colors ${
                                s.unblocked
                                  ? 'border-border text-muted-foreground hover:bg-accent'
                                  : 'border-primary/30 text-primary bg-primary/5 hover:bg-primary/10'
                              }`}
                            >
                              {s.unblocked ? 'Re-block' : 'Unblock'}
                            </button>
                          )}
                          <button
                            onClick={() => setGraphStudent(s)}
                            className="text-xs px-2.5 py-1 rounded-md border border-border text-muted-foreground hover:bg-accent transition-colors"
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