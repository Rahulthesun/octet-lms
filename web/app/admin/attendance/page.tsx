'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { IconCheckCircle, IconXCircle } from '@/components/ui/SvgIcons'

// ─── Types ────────────────────────────────────────────────────────────────────

type Section = 'mark' | 'summary'

interface Student {
  id: string; name: string; roll: string; grade: string; batch: string
  onlineAtt: number | null; offlineAtt: number | null
}

interface AttendanceEntry { studentId: string; present: boolean }

// ─── Mock Data ────────────────────────────────────────────────────────────────

const students: Student[] = [
  { id: 'S01', name: 'Arjun Kumar',      roll: 'CO-001', grade: '12th', batch: 'Offline A', onlineAtt: 82,  offlineAtt: 78   },
  { id: 'S02', name: 'Sneha Rajan',      roll: 'CO-002', grade: '12th', batch: 'Online A',  onlineAtt: 94,  offlineAtt: null },
  { id: 'S03', name: 'Karthik S.',       roll: 'CO-003', grade: '11th', batch: 'Offline B', onlineAtt: 72,  offlineAtt: 68   },
  { id: 'S04', name: 'Priya Thirumalai', roll: 'CO-004', grade: 'JEE',  batch: 'Online B',  onlineAtt: 88,  offlineAtt: null },
  { id: 'S05', name: 'Meenakshi A.',     roll: 'CO-005', grade: '12th', batch: 'Offline A', onlineAtt: 91,  offlineAtt: 89   },
  { id: 'S06', name: 'Rahul Venkat',     roll: 'CO-006', grade: 'NEET', batch: 'Online A',  onlineAtt: 73,  offlineAtt: null },
  { id: 'S07', name: 'Divya Krishnan',   roll: 'CO-007', grade: '11th', batch: 'Offline B', onlineAtt: 65,  offlineAtt: 60   },
  { id: 'S08', name: 'Ananya Lakshmi',   roll: 'CO-008', grade: 'NEET', batch: 'Online B',  onlineAtt: 97,  offlineAtt: null },
  { id: 'S09', name: 'Siva Prakash',     roll: 'CO-009', grade: '12th', batch: 'Offline A', onlineAtt: 85,  offlineAtt: 83   },
  { id: 'S10', name: 'Arun Shankar',     roll: 'CO-010', grade: 'JEE',  batch: 'Online A',  onlineAtt: 79,  offlineAtt: null },
  { id: 'S11', name: 'Deepak Mohan',     roll: 'CO-011', grade: '11th', batch: 'Offline B', onlineAtt: 88,  offlineAtt: 85   },
  { id: 'S12', name: 'Kaviya Raj',       roll: 'CO-012', grade: '12th', batch: 'Online B',  onlineAtt: 92,  offlineAtt: null },
  { id: 'S13', name: 'Surya Kumar',      roll: 'CO-013', grade: 'NEET', batch: 'Offline A', onlineAtt: 71,  offlineAtt: 69   },
  { id: 'S14', name: 'Nithya Saravanan', roll: 'CO-014', grade: '11th', batch: 'Online A',  onlineAtt: 96,  offlineAtt: null },
  { id: 'S15', name: 'Praveen Raman',    roll: 'CO-015', grade: 'JEE',  batch: 'Offline B', onlineAtt: 76,  offlineAtt: 74   },
  { id: 'S16', name: 'Riya Sharma',      roll: 'CO-016', grade: '12th', batch: 'Online A',  onlineAtt: 89,  offlineAtt: null },
  { id: 'S17', name: 'Venkat Suresh',    roll: 'CO-017', grade: '11th', batch: 'Offline A', onlineAtt: 63,  offlineAtt: 58   },
  { id: 'S18', name: 'Pooja Nair',       roll: 'CO-018', grade: 'NEET', batch: 'Online B',  onlineAtt: 93,  offlineAtt: null },
  { id: 'S19', name: 'Manoj Pillai',     roll: 'CO-019', grade: '12th', batch: 'Offline B', onlineAtt: 80,  offlineAtt: 77   },
  { id: 'S20', name: 'Lakshmi Devi',     roll: 'CO-020', grade: '11th', batch: 'Online A',  onlineAtt: 98,  offlineAtt: null },
]

const GRADES = ['11th', '12th', 'JEE', 'NEET'] as const

// Mock chart data per grade+batch for the last 5 sessions
const chartData: Record<string, { label: string; val: number }[]> = {
  '12th-Offline A': [{ label: 'S1', val: 85 }, { label: 'S2', val: 89 }, { label: 'S3', val: 82 }, { label: 'S4', val: 87 }, { label: 'S5', val: 90 }],
  '12th-Online A':  [{ label: 'S1', val: 90 }, { label: 'S2', val: 92 }, { label: 'S3', val: 88 }, { label: 'S4', val: 94 }, { label: 'S5', val: 91 }],
  '12th-Online B':  [{ label: 'S1', val: 88 }, { label: 'S2', val: 90 }, { label: 'S3', val: 92 }, { label: 'S4', val: 91 }, { label: 'S5', val: 92 }],
  '12th-Offline B': [{ label: 'S1', val: 78 }, { label: 'S2', val: 80 }, { label: 'S3', val: 82 }, { label: 'S4', val: 79 }, { label: 'S5', val: 80 }],
  '11th-Offline B': [{ label: 'S1', val: 72 }, { label: 'S2', val: 69 }, { label: 'S3', val: 74 }, { label: 'S4', val: 71 }, { label: 'S5', val: 75 }],
  '11th-Online A':  [{ label: 'S1', val: 94 }, { label: 'S2', val: 96 }, { label: 'S3', val: 97 }, { label: 'S4', val: 96 }, { label: 'S5', val: 97 }],
  '11th-Offline A': [{ label: 'S1', val: 60 }, { label: 'S2', val: 63 }, { label: 'S3', val: 61 }, { label: 'S4', val: 65 }, { label: 'S5', val: 63 }],
  'JEE-Online B':   [{ label: 'S1', val: 86 }, { label: 'S2', val: 88 }, { label: 'S3', val: 85 }, { label: 'S4', val: 89 }, { label: 'S5', val: 88 }],
  'JEE-Online A':   [{ label: 'S1', val: 77 }, { label: 'S2', val: 79 }, { label: 'S3', val: 80 }, { label: 'S4', val: 78 }, { label: 'S5', val: 79 }],
  'JEE-Offline B':  [{ label: 'S1', val: 74 }, { label: 'S2', val: 76 }, { label: 'S3', val: 75 }, { label: 'S4', val: 77 }, { label: 'S5', val: 76 }],
  'NEET-Online A':  [{ label: 'S1', val: 70 }, { label: 'S2', val: 73 }, { label: 'S3', val: 72 }, { label: 'S4', val: 74 }, { label: 'S5', val: 73 }],
  'NEET-Online B':  [{ label: 'S1', val: 92 }, { label: 'S2', val: 94 }, { label: 'S3', val: 93 }, { label: 'S4', val: 95 }, { label: 'S5', val: 95 }],
  'NEET-Offline A': [{ label: 'S1', val: 68 }, { label: 'S2', val: 70 }, { label: 'S3', val: 69 }, { label: 'S4', val: 71 }, { label: 'S5', val: 69 }],
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getAtt(s: Student, batch: string): number | null {
  return batch.startsWith('Online') ? s.onlineAtt : s.offlineAtt
}

function statusOf(pct: number) {
  if (pct < 75) return { text: 'Blocked',   color: '#9e4a4a' }
  if (pct < 80) return { text: 'Warning',   color: '#9e7438' }
  if (pct < 90) return { text: 'Good',      color: '#3e7450' }
  return             { text: 'Excellent',   color: '#2e7470' }
}

// ─── Mini bar chart ───────────────────────────────────────────────────────────

function MiniChart({ data }: { data: { label: string; val: number }[] }) {
  const H = 160
  const max = 100
  return (
    <div className="flex flex-col gap-1 w-full">
      <div className="flex items-end gap-1.5" style={{ height: H }}>
        {data.map((row, i) => (
          <div key={i} className="flex-1 flex flex-col justify-end items-center gap-1">
            <span className="text-base text-gray-600 font-inter">{row.val}%</span>
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: `${(row.val / max) * H * 0.8}px` }}
              transition={{ duration: 0.5, delay: i * 0.06, ease: 'easeOut' }}
              className="w-full bg-primary rounded-xs"
            />
          </div>
        ))}
      </div>
      <div className="flex gap-1.5">
        {data.map((row, i) => (
          <div key={i} className="flex-1 text-center text-md text-gray-600">{row.label}</div>
        ))}
      </div>
    </div>
  )
}

// ─── Add Students Modal ───────────────────────────────────────────────────────

function AddStudentsModal({ grade, currentStudentIds, onAdd, onClose }: {
  grade: string
  currentStudentIds: string[]
  onAdd: (ids: string[]) => void
  onClose: () => void
}) {
  const eligible = students.filter((s) => s.grade === grade && !currentStudentIds.includes(s.id))
  const [selected, setSelected] = useState<string[]>([])

  function toggleSel(id: string) {
    setSelected((p) => p.includes(id) ? p.filter((x) => x !== id) : [...p, id])
  }

  function confirm() {
    if (selected.length > 0) onAdd(selected)
    onClose()
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/25 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.96, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96 }}
        className="bg-white border border-gray-200 w-full max-w-md shadow-lg" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg text-gray-900">Add Students to Batch</h3>
          <p className="text-sm text-gray-400 mt-0.5">Select {grade} students to add to this batch</p>
        </div>
        {eligible.length === 0 ? (
          <div className="px-6 py-10 text-center text-gray-400 text-base">
            All {grade} students are already assigned to a batch.
          </div>
        ) : (
          <div className="max-h-72 overflow-y-auto divide-y divide-gray-100">
            {eligible.map((s) => (
              <label key={s.id} className="flex items-center gap-3 px-6 py-3 hover:bg-gray-50 cursor-pointer">
                <input type="checkbox" checked={selected.includes(s.id)} onChange={() => toggleSel(s.id)}
                  className="w-4 h-4 accent-[#5e4075]" />
                <div>
                  <p className="text-base text-gray-800">{s.name}</p>
                  <p className="text-sm text-gray-400">{s.roll} · current batch: {s.batch}</p>
                </div>
              </label>
            ))}
          </div>
        )}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-base hover:bg-gray-50">Cancel</button>
          <button onClick={confirm} disabled={selected.length === 0}
            className="flex-1 py-2.5 bg-[#5e4075] text-white text-base hover:bg-[#3d2652] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            Add {selected.length > 0 ? `${selected.length} Student${selected.length !== 1 ? 's' : ''}` : 'Selected'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AttendancePage() {
  const [selectedGrade, setSelectedGrade] = useState<string | null>(null)
  const [selectedBatch, setSelectedBatch] = useState<string | null>(null)
  const [activeSection, setSection] = useState<Section>('mark')
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [entries, setEntries] = useState<AttendanceEntry[]>(() =>
    students.map((s) => ({ studentId: s.id, present: true }))
  )
  const [saved, setSaved] = useState(false)
  const [customBatches, setCustomBatches] = useState<Record<string, string[]>>({})
  const [addingBatch, setAddingBatch] = useState(false)
  const [newBatchName, setNewBatchName] = useState('')
  const [customBatchStudents, setCustomBatchStudents] = useState<Record<string, string[]>>({})
  const [showAddStudents, setShowAddStudents] = useState(false)
  const [manualUnblocks, setManualUnblocks] = useState<string[]>([])

  // Unique batches for the selected grade (student-derived + custom)
  const batchesForGrade = useMemo(() => {
    if (!selectedGrade) return []
    const b = new Set(students.filter((s) => s.grade === selectedGrade).map((s) => s.batch))
    ;(customBatches[selectedGrade] ?? []).forEach((cb) => b.add(cb))
    return [...b].sort()
  }, [selectedGrade, customBatches])

  function addCustomBatch() {
    const name = newBatchName.trim()
    if (!name || !selectedGrade) return
    setCustomBatches((prev) => ({
      ...prev,
      [selectedGrade]: [...new Set([...(prev[selectedGrade] ?? []), name])],
    }))
    setSelectedBatch(name)
    setAddingBatch(false)
    setNewBatchName('')
  }

  // Students matching current grade + batch (including manually added ones)
  const batchStudents = useMemo(() => {
    if (!selectedGrade || !selectedBatch) return []
    const fromData = students.filter((s) => s.grade === selectedGrade && s.batch === selectedBatch)
    const key = `${selectedGrade}-${selectedBatch}`
    const addedIds = customBatchStudents[key] ?? []
    const existing = new Set(fromData.map((s) => s.id))
    const fromCustom = students.filter((s) => addedIds.includes(s.id) && !existing.has(s.id))
    return [...fromData, ...fromCustom]
  }, [selectedGrade, selectedBatch, customBatchStudents])

  function handleAddStudents(ids: string[]) {
    if (!selectedGrade || !selectedBatch) return
    const key = `${selectedGrade}-${selectedBatch}`
    setCustomBatchStudents((prev) => ({
      ...prev,
      [key]: [...new Set([...(prev[key] ?? []), ...ids])],
    }))
  }

  function toggleUnblock(studentId: string) {
    setManualUnblocks((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    )
  }

  // Attendance stats for selected batch
  const stats = useMemo(() => {
    if (!selectedBatch) return { blocked: 0, warning: 0, good: 0, excellent: 0 }
    const counts = { blocked: 0, warning: 0, good: 0, excellent: 0 }
    batchStudents.forEach((s) => {
      const pct = getAtt(s, selectedBatch)
      if (pct === null) return
      if (pct < 75) counts.blocked++
      else if (pct < 80) counts.warning++
      else if (pct < 90) counts.good++
      else counts.excellent++
    })
    return counts
  }, [batchStudents, selectedBatch])

  const isPresent = (id: string) => entries.find((e) => e.studentId === id)?.present ?? true
  const toggle = (id: string) =>
    setEntries((prev) => prev.map((e) => e.studentId === id ? { ...e, present: !e.present } : e))

  const chartKey = selectedGrade && selectedBatch ? `${selectedGrade}-${selectedBatch}` : ''
  const miniChartData = chartData[chartKey] ?? []

  function handleGradeSelect(g: string) {
    setSelectedGrade(g)
    setSelectedBatch(null)
    setAddingBatch(false)
    setNewBatchName('')
  }

  const dateLabel = new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  const hasContext = selectedGrade && selectedBatch

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Attendance</h1>
        <p className="text-base text-gray-600 mt-1">Select a grade and batch to mark or review attendance.</p>
      </div>

      {/* ── Context selector ── */}
      <div className="bg-white rounded-2xl shadow-sm px-5 py-4 space-y-4">
        {/* Grade selector */}
        <div className="flex items-center gap-4 flex-wrap">
          <span className="text-md text-gray-600 w-16 shrink-0">Grade</span>
          <div className="flex gap-2 flex-wrap">
            {GRADES.map((g) => (
              <button
                key={g}
                onClick={() => handleGradeSelect(g)}
                className={`px-4 py-1.5 text-base rounded-full border transition-colors ${
                  selectedGrade === g
                    ? 'bg-primary text-white border-primary'
                    : 'border-gray-200 text-gray-600 hover:border-gray-400'
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        </div>

        {/* Batch selector (appears after grade) */}
        <AnimatePresence>
          {selectedGrade && batchesForGrade.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.2 }}
              className="flex items-center gap-4 flex-wrap overflow-hidden"
            >
              <span className="text-md text-gray-600 w-16 shrink-0">Batch</span>
              <div className="flex gap-2 flex-wrap items-center">
                {batchesForGrade.map((b) => (
                  <button
                    key={b}
                    onClick={() => setSelectedBatch(b)}
                    className={`px-4 py-1.5 text-base rounded-full border transition-colors ${
                      selectedBatch === b
                        ? 'bg-primary text-white border-primary'
                        : 'border-gray-200 text-gray-600 hover:border-gray-400'
                    }`}
                  >
                    {b}
                  </button>
                ))}
                {addingBatch ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      autoFocus
                      type="text"
                      value={newBatchName}
                      onChange={(e) => setNewBatchName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') addCustomBatch(); if (e.key === 'Escape') { setAddingBatch(false); setNewBatchName('') } }}
                      placeholder="e.g. Online C"
                      className="border border-gray-300 px-3 py-1 text-sm outline-none focus:border-primary w-32"
                    />
                    <button onClick={addCustomBatch} className="px-2 py-1 bg-primary text-white text-sm">✓</button>
                    <button onClick={() => { setAddingBatch(false); setNewBatchName('') }} className="px-2 py-1 text-gray-400 hover:text-gray-600 text-sm">✕</button>
                  </div>
                ) : (
                  <button
                    onClick={() => setAddingBatch(true)}
                    className="flex items-center gap-1 px-3 py-1.5 text-sm text-gray-400 border border-dashed border-gray-300 rounded-full hover:text-primary hover:border-primary transition-colors"
                  >
                    <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
                      <path d="M 6,1 L 6,11 M 1,6 L 11,6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                    New Batch
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Date picker */}
        <div className="flex items-center gap-4">
          <span className="text-md text-gray-600 w-16 shrink-0">Date</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="border border-gray-200 px-3 py-1.5 text-base text-gray-700 outline-none focus:border-gray-400"
          />
        </div>
      </div>

      {/* ── Empty state ── */}
      {!hasContext && (
        <div className="flex flex-col items-center justify-center py-20 text-center text-gray-400 gap-3">
          <svg className="w-10 h-10 text-gray-200" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <path d="M 3,10 H 21 M 8,3 V 7 M 16,3 V 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
            <circle cx="12" cy="15" r="2" stroke="currentColor" strokeWidth="1.3" />
          </svg>
          <p className="text-base">Select a grade and batch above to continue</p>
        </div>
      )}

      {/* ── Content (shown only after grade + batch selected) ── */}
      <AnimatePresence>
        {hasContext && (
          <motion.div
            key={`${selectedGrade}-${selectedBatch}`}
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-5"
          >
            {/* Stats strip + mini chart */}
            <div className="flex flex-col lg:flex-row lg:items-stretch gap-4">
              {/* Compact inline stats */}
              <div className="lg:w-1/2 shrink-0 bg-white rounded-2xl shadow-sm px-5 py-4">
                <p className="text-md text-gray-600 tracking-widest mb-3">
                  <span className="font-inter">{selectedGrade}</span> — {selectedBatch} — <span className="font-inter">{batchStudents.length}</span> students
                </p>
                <div className="flex flex-wrap gap-x-25 gap-y-2">
                  {[
                    { label: 'Blocked',   count: stats.blocked,   color: '#9e4a4a' },
                    { label: 'Warning',   count: stats.warning,   color: '#9e7438' },
                    { label: 'Good',      count: stats.good,      color: '#3e7450' },
                    { label: 'Excellent', count: stats.excellent,  color: '#2e7470' },
                  ].map(({ label, count, color }) => (
                    <div key={label} className="flex items-baseline gap-1.5">
                      <span className="text-2xl font-inter" style={{ color }}>{count}</span>
                      <span className="text-lg text-gray-500">{label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mini chart */}
              {miniChartData.length > 0 && (
                <div className="lg:w-1/2 shrink-0 bg-white rounded-2xl shadow-sm px-5 py-4">
                  <p className="text-md text-gray-600 tracking-widest mb-3">Last <span className="font-inter">5</span> sessions</p>
                  <MiniChart data={miniChartData} />
                </div>
              )}
            </div>

            {/* Section toggle */}
            <div className="flex border border-gray-200 rounded-xl bg-white overflow-hidden w-fit">
              {(['mark', 'summary'] as Section[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setSection(s)}
                  className={`px-6 py-2.5 text-base transition-colors ${
                    activeSection === s ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {s === 'mark' ? 'Mark Attendance' : 'Attendance Summary'}
                </button>
              ))}
            </div>

            {/* ── Mark Attendance ── */}
            <AnimatePresence mode="wait">
              {activeSection === 'mark' ? (
                <motion.div key="mark" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                  <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    {/* Context label */}
                    <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                      <p className="text-lg text-gray-700 font-medium">
                        Marking attendance for <span className="text-primary">{selectedGrade}  — {selectedBatch}</span>
                        <span className="text-gray-600 font-normal"> - {dateLabel}</span>
                      </p>
                      <button onClick={() => setShowAddStudents(true)} className="text-md text-primary hover:cursor-pointer shrink-0 ml-4">
                        + Add Students
                      </button>
                    </div>

                    {batchStudents.length === 0 ? (
                      <div className="py-14 flex flex-col items-center gap-4 text-gray-400">
                        <p className="text-base">No students in this batch yet.</p>
                        <button onClick={() => setShowAddStudents(true)} className="px-5 py-2.5 bg-primary text-white text-base hover:bg-primary-dark transition-colors">
                          + Add Students to this Batch
                        </button>
                      </div>
                    ) : (
                      <>
                        {/* Column header */}
                        <div className="grid grid-cols-[1fr_110px_90px_110px_140px] px-5 py-2.5 text-sm uppercase tracking-widest text-gray-600 border-b border-gray-100 bg-gray-100">
                          <span>Student</span>
                          <span>Roll</span>
                          <span>Att. %</span>
                          <span>Status</span>
                          <span className="text-center">Attendance</span>
                        </div>
                        <div className="divide-y divide-gray-100">
                          {batchStudents.map((s) => {
                            const pct = getAtt(s, selectedBatch!)
                            const isUnblocked = manualUnblocks.includes(s.id)
                            const st = pct !== null ? (isUnblocked ? { text: 'Active', color: '#3e5e8a' } : statusOf(pct)) : null
                            const present = isPresent(s.id)
                            return (
                              <div key={s.id} className="grid grid-cols-[1fr_110px_90px_110px_140px] items-center px-5 py-3 hover:bg-gray-50">
                                {/* Name */}
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="w-8 h-8 bg-gray-100 flex items-center justify-center text-gray-600 text-sm shrink-0 rounded-sm">
                                    {s.name.charAt(0)}
                                  </div>
                                  <span className="text-base text-gray-800 truncate">{s.name}</span>
                                </div>
                                {/* Roll */}
                                <span className="text-base text-gray-600 font-inter">{s.roll}</span>
                                {/* Att % */}
                                <span className="text-base font-inter" style={{ color: st?.color ?? '#9ca3af' }}>
                                  {pct !== null ? `${pct}%` : '—'}
                                </span>
                                {/* Status badge */}
                                {st ? (
                                  <span className="text-base px-2 py-0.5 rounded-full border w-fit" style={{ color: st.color, borderColor: st.color + '55', backgroundColor: st.color + '15' }}>
                                    {st.text}
                                  </span>
                                ) : <span />}
                                {/* Present / Absent toggle */}
                                <button
                                  onClick={() => toggle(s.id)}
                                  className={`flex items-center justify-center rounded-2xl gap-1.5 p-1 text-md font-medium transition-colors ${
                                    present
                                      ? 'bg-green-500 text-white hover:bg-green-700 hover:cursor-pointer'
                                      : 'bg-red-50 border border-red-300 text-red-600 hover:bg-red-100 hover:cursor-pointer'
                                  }`}
                                >
                                  {present
                                    ? <><IconCheckCircle className="w-4 h-4" />Present</>
                                    : <><IconXCircle className="w-4 h-4" />Absent</>
                                  }
                                </button>
                              </div>
                            )
                          })}
                        </div>
                      </>
                    )}

                    {/* Save row */}
                    <div className="px-5 py-4 border-t border-gray-200 flex items-center gap-4">
                      <button
                        onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 3000) }}
                        className="px-5 py-2 rounded-xl bg-primary text-white text-lg hover:bg-primary-dark transition-colors"
                      >
                        Save Attendance
                      </button>
                      <AnimatePresence>
                        {saved && (
                          <motion.div
                            initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                            className="flex items-center gap-2 text-green-700 text-base"
                          >
                            <IconCheckCircle className="w-4 h-4" />
                            Saved for {dateLabel}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.div>
              ) : (
                /* ── Attendance Summary ── */
                <motion.div key="summary" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="space-y-3">
                  <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-gray-100 bg-gray-50">
                      <p className="text-lg text-gray-700 font-medium">
                        Summary — <span className="text-primary">{selectedGrade} — {selectedBatch}</span>
                      </p>
                    </div>
                    <div className="grid grid-cols-[1fr_90px_110px_100px] px-5 py-2.5 text-sm uppercase tracking-widest text-gray-600 border-b border-gray-100 bg-gray-100">
                      <span>Student</span>
                      <span className="text-right">Att. %</span>
                      <span className="text-right">Status</span>
                      <span className="text-right">Action</span>
                    </div>
                    <div className="divide-y divide-gray-100">
                      {batchStudents.map((s) => {
                        const pct = getAtt(s, selectedBatch!)
                        if (pct === null) return null
                        const isUnblocked = manualUnblocks.includes(s.id)
                        const st = isUnblocked ? { text: 'Active', color: '#3e5e8a' } : statusOf(pct)
                        const isBlocked = !isUnblocked && pct < 75
                        return (
                          <div key={s.id} className="grid grid-cols-[1fr_90px_110px_100px] px-5 py-3 hover:bg-gray-50 items-center">
                            <div className="min-w-0">
                              <span className="text-base text-gray-700 truncate block">{s.name}</span>
                              <span className="text-base text-gray-600">{s.roll}</span>
                            </div>
                            <span className="text-base font-inter pl-11" style={{ color: st.color }}>{pct}%</span>
                            <span className="text-base pl-14" style={{ color: st.color }}>{st.text}</span>
                            <div className="text-right">
                              {(isBlocked || isUnblocked) && (
                                <button
                                  onClick={() => toggleUnblock(s.id)}
                                  className={`text-base px-2.5 py-0.5 border transition-colors ${
                                    isUnblocked
                                      ? 'border-gray-300 text-gray-500 hover:bg-gray-200 hover:cursor-pointer'
                                      : 'border-primary text-primary hover:bg-[#f5f0fa] hover:cursor-pointer'
                                  }`}
                                >
                                  {isUnblocked ? 'Re-block' : 'Unblock'}
                                </button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Students modal */}
      <AnimatePresence>
        {showAddStudents && selectedGrade && (
          <AddStudentsModal
            grade={selectedGrade}
            currentStudentIds={batchStudents.map((s) => s.id)}
            onAdd={handleAddStudents}
            onClose={() => setShowAddStudents(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
