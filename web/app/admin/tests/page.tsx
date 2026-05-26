'use client'

import { useState, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { IconCalendar, IconDocument, IconCheckCircle } from '@/components/ui/SvgIcons'

// ─── Types ────────────────────────────────────────────────────────────────────

type TestType = 'MCQ' | 'Descriptive'
type TestStatus = 'completed' | 'upcoming'

interface TestResult { studentId: string; name: string; roll: string; grade: string; marks: number | null }
interface Test {
  id: string; name: string; type: TestType; status: TestStatus; date: string; grade: string
  maxMarks: number; classAvg: number | null; results: TestResult[]
  qpFile: string | null; keyFile: string | null; descriptiveResultUrl: string | null
}
interface ScheduleForm { name: string; type: TestType; date: string; grade: string; maxMarks: string }

// ─── Mock Data ────────────────────────────────────────────────────────────────

const allStudents = [
  { id: 'S01', name: 'Arjun Kumar',      roll: 'CO-001', grade: '12th', batch: 'Offline A' },
  { id: 'S02', name: 'Sneha Rajan',      roll: 'CO-002', grade: '12th', batch: 'Online A'  },
  { id: 'S05', name: 'Meenakshi A.',     roll: 'CO-005', grade: '12th', batch: 'Offline A' },
  { id: 'S09', name: 'Siva Prakash',     roll: 'CO-009', grade: '12th', batch: 'Offline A' },
  { id: 'S12', name: 'Kaviya Raj',       roll: 'CO-012', grade: '12th', batch: 'Online B'  },
  { id: 'S03', name: 'Karthik S.',       roll: 'CO-003', grade: '11th', batch: 'Offline B' },
  { id: 'S11', name: 'Deepak Mohan',     roll: 'CO-011', grade: '11th', batch: 'Offline B' },
  { id: 'S14', name: 'Nithya Saravanan', roll: 'CO-014', grade: '11th', batch: 'Online A'  },
  { id: 'S17', name: 'Venkat Suresh',    roll: 'CO-017', grade: '11th', batch: 'Offline A' },
  { id: 'S20', name: 'Lakshmi Devi',     roll: 'CO-020', grade: '11th', batch: 'Online A'  },
  { id: 'S04', name: 'Priya Thirumalai', roll: 'CO-004', grade: 'JEE',  batch: 'Online B'  },
  { id: 'S10', name: 'Arun Shankar',     roll: 'CO-010', grade: 'JEE',  batch: 'Online A'  },
  { id: 'S15', name: 'Praveen Raman',    roll: 'CO-015', grade: 'JEE',  batch: 'Offline B' },
  { id: 'S06', name: 'Rahul Venkat',     roll: 'CO-006', grade: 'NEET', batch: 'Online A'  },
  { id: 'S08', name: 'Ananya Lakshmi',   roll: 'CO-008', grade: 'NEET', batch: 'Online B'  },
  { id: 'S13', name: 'Surya Kumar',      roll: 'CO-013', grade: 'NEET', batch: 'Offline A' },
  { id: 'S18', name: 'Pooja Nair',       roll: 'CO-018', grade: 'NEET', batch: 'Online B'  },
]

const initialTests: Test[] = [
  {
    id: 'T001', name: 'Unit Test 1 — Atomic Structure', type: 'MCQ', status: 'completed',
    date: '10 May 2026', grade: '12th', maxMarks: 50, classAvg: 38.4, qpFile: 'UT1_AtomicStructure_QP.pdf', keyFile: 'UT1_AtomicStructure_Key.pdf', descriptiveResultUrl: null,
    results: [
      { studentId: 'S01', name: 'Arjun Kumar',  roll: 'CO-001', grade: '12th', marks: 44 },
      { studentId: 'S02', name: 'Sneha Rajan',  roll: 'CO-002', grade: '12th', marks: 47 },
      { studentId: 'S05', name: 'Meenakshi A.', roll: 'CO-005', grade: '12th', marks: 42 },
      { studentId: 'S09', name: 'Siva Prakash', roll: 'CO-009', grade: '12th', marks: 38 },
      { studentId: 'S12', name: 'Kaviya Raj',   roll: 'CO-012', grade: '12th', marks: 22 },
    ],
  },
  {
    id: 'T002', name: 'Chapter Test — Chemical Bonding', type: 'MCQ', status: 'completed',
    date: '15 May 2026', grade: '12th', maxMarks: 40, classAvg: 31.2, qpFile: 'CT_ChemBonding_QP.pdf', keyFile: 'CT_ChemBonding_Key.pdf', descriptiveResultUrl: null,
    results: [
      { studentId: 'S01', name: 'Arjun Kumar',  roll: 'CO-001', grade: '12th', marks: 35 },
      { studentId: 'S02', name: 'Sneha Rajan',  roll: 'CO-002', grade: '12th', marks: 38 },
      { studentId: 'S05', name: 'Meenakshi A.', roll: 'CO-005', grade: '12th', marks: 33 },
      { studentId: 'S09', name: 'Siva Prakash', roll: 'CO-009', grade: '12th', marks: 29 },
      { studentId: 'S12', name: 'Kaviya Raj',   roll: 'CO-012', grade: '12th', marks: 21 },
    ],
  },
  {
    id: 'T003', name: 'Unit Test 2 — Thermodynamics', type: 'Descriptive', status: 'completed',
    date: '18 May 2026', grade: '11th', maxMarks: 60, classAvg: null, qpFile: 'UT2_Thermo_QP.pdf', keyFile: null, descriptiveResultUrl: null,
    results: [
      { studentId: 'S03', name: 'Karthik S.',       roll: 'CO-003', grade: '11th', marks: null },
      { studentId: 'S11', name: 'Deepak Mohan',     roll: 'CO-011', grade: '11th', marks: null },
      { studentId: 'S14', name: 'Nithya Saravanan', roll: 'CO-014', grade: '11th', marks: null },
    ],
  },
  {
    id: 'T004', name: 'Mock Test 1 — JEE Pattern', type: 'MCQ', status: 'completed',
    date: '20 May 2026', grade: 'JEE', maxMarks: 100, classAvg: 67.5, qpFile: 'MT1_JEE_QP.pdf', keyFile: 'MT1_JEE_Key.pdf', descriptiveResultUrl: null,
    results: [
      { studentId: 'S04', name: 'Priya Thirumalai', roll: 'CO-004', grade: 'JEE', marks: 78 },
      { studentId: 'S10', name: 'Arun Shankar',     roll: 'CO-010', grade: 'JEE', marks: 62 },
      { studentId: 'S15', name: 'Praveen Raman',    roll: 'CO-015', grade: 'JEE', marks: 63 },
    ],
  },
  { id: 'T005', name: 'Unit Test 3 — Thermodynamics', type: 'MCQ', status: 'upcoming', date: '28 May 2026', grade: '12th', maxMarks: 50, classAvg: null, qpFile: null, keyFile: null, descriptiveResultUrl: null, results: [] },
  { id: 'T006', name: 'Mock Test 2 — NEET Pattern',   type: 'MCQ', status: 'upcoming', date: '01 Jun 2026', grade: 'NEET', maxMarks: 180, classAvg: null, qpFile: null, keyFile: null, descriptiveResultUrl: null, results: [] },
  { id: 'T007', name: 'Chapter Test — Electrochemistry', type: 'MCQ', status: 'upcoming', date: '05 Jun 2026', grade: '12th', maxMarks: 40, classAvg: null, qpFile: null, keyFile: null, descriptiveResultUrl: null, results: [] },
]

// ─── Schedule Modal ───────────────────────────────────────────────────────────

function ScheduleModal({ onClose, onCreate }: { onClose: () => void; onCreate: (t: Test) => void }) {
  const [form, setForm] = useState<ScheduleForm>({ name: '', type: 'MCQ', date: '', grade: '12th', maxMarks: '50' })

  const create = () => {
    if (!form.name || !form.date) return
    const rel = allStudents.filter((s) => s.grade === form.grade)
    onCreate({
      id: `T${Date.now()}`, name: form.name, type: form.type, status: 'upcoming',
      date: new Date(form.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
      grade: form.grade, maxMarks: parseInt(form.maxMarks) || 50,
      classAvg: null, qpFile: null, keyFile: null, descriptiveResultUrl: null,
      results: rel.map((s) => ({ studentId: s.id, name: s.name, roll: s.roll, grade: s.grade, marks: null })),
    })
    onClose()
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/25 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <motion.div initial={{ scale: 0.96, y: 12 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.96 }}
        className="bg-white border border-gray-200 p-7 w-full max-w-md shadow-lg" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-xl text-gray-900 mb-5">Schedule New Test</h3>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-gray-500 block mb-1">Test Name</label>
            <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Unit Test 3 — Thermodynamics"
              className="w-full border border-gray-200 px-3 py-2 text-base text-gray-800 placeholder-gray-400 outline-none focus:border-gray-400" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-gray-500 block mb-1">Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as TestType })}
                className="w-full border border-gray-200 px-3 py-2 text-base text-gray-800 outline-none bg-white">
                <option>MCQ</option><option>Descriptive</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-500 block mb-1">Grade</label>
              <select value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })}
                className="w-full border border-gray-200 px-3 py-2 text-base text-gray-800 outline-none bg-white">
                {['11th', '12th', 'JEE', 'NEET'].map((g) => <option key={g}>{g}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm text-gray-500 block mb-1">Date</label>
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })}
                className="w-full border border-gray-200 px-3 py-2 text-base text-gray-800 outline-none" />
            </div>
            <div>
              <label className="text-sm text-gray-500 block mb-1">Max Marks</label>
              <input type="number" value={form.maxMarks} onChange={(e) => setForm({ ...form, maxMarks: e.target.value })}
                className="w-full border border-gray-200 px-3 py-2 text-base text-gray-800 outline-none" />
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2.5 border border-gray-200 text-gray-600 text-base hover:bg-gray-50">Cancel</button>
          <button onClick={create} className="flex-1 py-2.5 bg-[#5e4075] text-white text-base hover:bg-[#3d2652] transition-colors">Schedule</button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Test Card ────────────────────────────────────────────────────────────────

function TestCard({ test, isOpen, onToggle, onUploadQP, onUploadKey, onUploadDescriptive, onUpdateMark }: {
  test: Test; isOpen: boolean; onToggle: () => void
  onUploadQP: (id: string, filename: string) => void
  onUploadKey: (id: string, filename: string) => void
  onUploadDescriptive: (id: string, url: string) => void
  onUpdateMark: (testId: string, studentId: string, marks: number) => void
}) {
  const qpRef = useRef<HTMLInputElement>(null)
  const keyRef = useRef<HTMLInputElement>(null)
  const descRef = useRef<HTMLInputElement>(null)
  const [editingMarks, setEditingMarks] = useState(false)
  const [drafts, setDrafts] = useState<Record<string, string>>({})

  const sorted = [...test.results].sort((a, b) => (b.marks ?? -1) - (a.marks ?? -1))

  function startEditing() {
    const d: Record<string, string> = {}
    sorted.forEach((r) => { d[r.studentId] = r.marks !== null ? String(r.marks) : '' })
    setDrafts(d)
    setEditingMarks(true)
  }

  function commitAll() {
    sorted.forEach((r) => {
      const v = parseInt(drafts[r.studentId] ?? '')
      if (!isNaN(v) && v >= 0 && v <= test.maxMarks) onUpdateMark(test.id, r.studentId, v)
    })
    setEditingMarks(false)
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-gray-50 hover:cursor-pointer transition-colors">
        <span className="text-lg border border-gray-200 px-2 py-0.5 text-gray-600 shrink-0 rounded-full">{test.grade}</span>
        <div className="flex-1 min-w-0">
          <p className="text-base text-gray-800 truncate">{test.name}</p>
          <p className="text-base text-gray-600">{test.date} · {test.type} · Max <span className="font-inter">{test.maxMarks}</span>
            <span className="font-inter">{test.classAvg !== null && ` · Avg: ${test.classAvg}`}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {test.qpFile && <span className="text-base border border-green-200 bg-green-50 text-green-700 px-2 py-0.5">QP ✓</span>}
          {test.keyFile && <span className="text-base border border-green-200 bg-green-50 text-green-700 px-2 py-0.5">Key ✓</span>}
          <svg className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} viewBox="0 0 12 12" fill="none">
            <path d="M 2,4 L 6,8 L 10,4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
            transition={{ duration: 0.2 }} className="overflow-hidden border-t border-gray-200">
            <div className="p-5 bg-gray-50 space-y-4">

              {/* Upload buttons with real file pickers */}
              <div className="flex gap-2 flex-wrap">
                <button onClick={() => qpRef.current?.click()}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-base border transition-colors ${
                    test.qpFile ? 'border-green-200 bg-green-50 text-green-700' : 'border-gray-200 text-gray-600 hover:bg-white'
                  }`}>
                  <IconDocument className="w-4 h-4" />
                  {test.qpFile ? `QP: ${test.qpFile}` : 'Upload Question Paper'}
                </button>
                <input ref={qpRef} type="file" accept=".pdf" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) onUploadQP(test.id, f.name); e.target.value = '' }} />

                <button onClick={() => keyRef.current?.click()}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-base border transition-colors ${
                    test.keyFile ? 'border-green-200 bg-green-50 text-green-700' : 'border-gray-200 text-gray-600 hover:bg-white'
                  }`}>
                  <IconCheckCircle className="w-4 h-4" />
                  {test.keyFile ? `Key: ${test.keyFile}` : 'Upload Answer Key'}
                </button>
                <input ref={keyRef} type="file" accept=".pdf" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) onUploadKey(test.id, f.name); e.target.value = '' }} />

                {test.type === 'Descriptive' && (
                  <>
                    <button onClick={() => descRef.current?.click()}
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-sm border transition-colors ${
                        test.descriptiveResultUrl ? 'border-green-200 bg-green-50 text-green-700' : 'border-gray-200 text-gray-600 hover:bg-white hover:border-primary hover:text-primary hover:cursor-pointer'
                      }`}>
                      <IconDocument className="w-4 h-4" />
                      {test.descriptiveResultUrl ? `Result: ${test.descriptiveResultUrl}` : 'Upload Result Sheet'}
                    </button>
                    <input ref={descRef} type="file" accept=".pdf,.xlsx,.xls" className="hidden"
                      onChange={(e) => { const f = e.target.files?.[0]; if (f) onUploadDescriptive(test.id, f.name); e.target.value = '' }} />
                  </>
                )}
                <button
                      onClick={editingMarks ? commitAll : startEditing}
                      className={`shrink-0 px-3 py-1 text-base border transition-colors ${
                        editingMarks
                          ? 'bg-primary text-white border-primary hover:bg-[#3d2652]'
                          : 'border-gray-300 text-gray-600 hover:bg-white hover:border-primary hover:text-primary hover:cursor-pointer'
                      }`}
                    >
                      {editingMarks ? 'Save & Done' : 'Edit Marks'}
                </button>
              </div>
  
              {/* Marks table */}
              {test.type === 'MCQ' && sorted.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  {/* Table header + Edit toggle */}
                  <div className="flex items-center gap-3 px-4 py-2.5 bg-gray-100 border-b border-gray-100">
                    <div className="grid grid-cols-[0.2fr_2fr_1fr_0.5fr_1fr] gap-2 flex-1 text-base text-gray-600">
                      <span>ID</span><span>Student</span>
                      <span className="">Roll No</span>
                      <span className="">{editingMarks ? 'Enter marks' : 'Marks'}</span>
                      <span className="text-right">%</span>
                    </div>
                    
                  </div>
                  {sorted.map((r, i) => {
                    const draftVal = drafts[r.studentId] ?? ''
                    const draftPct = (() => { const v = parseInt(draftVal); return !isNaN(v) ? `${Math.round((v / test.maxMarks) * 100)}%` : '—' })()
                    return (
                      <div key={r.studentId} className="grid grid-cols-[0.2fr_2fr_1fr_0.5fr_1fr] gap-2 px-4 py-2.5 border-b border-gray-50 last:border-0">
                        <span className="text-base text-gray-600 font-inter self-center">{i + 1}</span>
                        <span className="text-lg text-gray-800 truncate self-center">{r.name}</span>
                        <span className="text-base text-gray-600 font-inter self-center">{r.roll}</span>
                        <div className="self-center">
                          {editingMarks ? (
                            <input
                              type="text"
                              inputMode="numeric"
                              value={draftVal}
                              onChange={(e) => setDrafts((d) => ({ ...d, [r.studentId]: e.target.value.replace(/[^0-9]/g, '') }))}
                              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commitAll() } }}
                              className="w-full border border-primary px-2 py-1 text-base font-inter outline-none bg-white"
                              placeholder="—"
                            />
                          ) : (
                            <span className="text-base font-inter text-gray-700">
                              {r.marks !== null ? `${r.marks} / ${test.maxMarks}` : '—'}
                            </span>
                          )}
                        </div>
                        <span className="text-base font-inter text-gray-600 text-right self-center">
                          {editingMarks ? draftPct : r.marks !== null ? `${Math.round((r.marks / test.maxMarks) * 100)}%` : '—'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}

              {test.type === 'Descriptive' && !test.descriptiveResultUrl && (
                <p className="text-sm text-gray-400 italic">Descriptive results pending — upload a result sheet above.</p>
              )}
              {test.descriptiveResultUrl && (
                <div className="flex items-center gap-2 text-green-700 text-sm">
                  <IconCheckCircle className="w-4 h-4" />
                  Result uploaded: {test.descriptiveResultUrl}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Upcoming Test Row ────────────────────────────────────────────────────────

function UpcomingTestRow({ test, onUploadQP, onUploadKey }: {
  test: Test
  onUploadQP: (id: string, filename: string) => void
  onUploadKey: (id: string, filename: string) => void
}) {
  const qpRef = useRef<HTMLInputElement>(null)
  const keyRef = useRef<HTMLInputElement>(null)

  return (
    <div className="bg-white rounded-2xl shadow-sm px-5 py-4 flex items-center gap-4 flex-wrap">
      <span className="text-lg border border-gray-200 px-2 py-0.5 text-gray-600 shrink-0 rounded-full">{test.grade}</span>
      <div className="flex-1 min-w-0">
        <p className="text-base text-gray-800">{test.name}</p>
        <p className="text-md text-gray-600">{test.date} · {test.type} · Max <span className="font-inter">{test.maxMarks}</span> marks</p>
      </div>
      <div className="flex gap-2 shrink-0 flex-wrap">
        <button onClick={() => qpRef.current?.click()}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-base border transition-colors ${
            test.qpFile ? 'border-green-200 bg-green-50 text-green-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}>
          <IconDocument className="w-4 h-4" />
          {test.qpFile ? 'QP ✓' : 'Upload QP'}
        </button>
        <input ref={qpRef} type="file" accept=".pdf" className="  hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onUploadQP(test.id, f.name); e.target.value = '' }} />

        <button onClick={() => keyRef.current?.click()}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-base border transition-colors ${
            test.keyFile ? 'border-green-200 bg-green-50 text-green-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
          }`}>
          <IconCheckCircle className="w-4 h-4" />
          {test.keyFile ? 'Key ✓' : 'Upload Key'}
        </button>
        <input ref={keyRef} type="file" accept=".pdf" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onUploadKey(test.id, f.name); e.target.value = '' }} />
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const GRADE_FILTERS = ['All', '11th', '12th', 'JEE', 'NEET'] as const
type GradeFilter = typeof GRADE_FILTERS[number]

export default function TestResultsPage() {
  const [tests, setTests] = useState<Test[]>(initialTests)
  const [gradeFilter, setGradeFilter] = useState<GradeFilter>('All')
  const [showSchedule, setShow] = useState(false)
  const [openTest, setOpenTest] = useState<string | null>(null)

  const completed = tests.filter((t) => t.status === 'completed')
  const upcoming = tests.filter((t) => t.status === 'upcoming')

  const filteredCompleted = gradeFilter === 'All' ? completed : completed.filter((t) => t.grade === gradeFilter)
  const filteredUpcoming  = gradeFilter === 'All' ? upcoming  : upcoming.filter((t) => t.grade === gradeFilter)

  const avgScore = useMemo<number>(() => {
    const w = completed.filter((t) => t.classAvg !== null)
    return w.length ? Math.round(w.reduce((s, t) => s + (t.classAvg ?? 0), 0) / w.length) : 0
  }, [completed])

  const topScorers = useMemo(() => {
    const source = gradeFilter === 'All' ? completed : completed.filter((t) => t.grade === gradeFilter)
    const map = new Map<string, { name: string; roll: string; grade: string; totalPct: number; count: number }>()
    source.forEach((t) => {
      t.results.forEach((r) => {
        if (r.marks === null) return
        const pct = Math.round((r.marks / t.maxMarks) * 100)
        const existing = map.get(r.studentId)
        if (existing) { existing.totalPct += pct; existing.count++ }
        else map.set(r.studentId, { name: r.name, roll: r.roll, grade: r.grade, totalPct: pct, count: 1 })
      })
    })
    return [...map.values()]
      .map((s) => ({ ...s, avg: Math.round(s.totalPct / s.count) }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 10)
  }, [completed, gradeFilter])

  const addTest = (t: Test) => setTests((p) => [...p, t])

  const uploadQP   = (id: string, filename: string) => setTests((p) => p.map((t) => t.id === id ? { ...t, qpFile: filename } : t))
  const uploadKey  = (id: string, filename: string) => setTests((p) => p.map((t) => t.id === id ? { ...t, keyFile: filename } : t))
  const uploadDesc = (id: string, url: string) => setTests((p) => p.map((t) => t.id === id ? { ...t, descriptiveResultUrl: url } : t))
  const updateMark = (testId: string, studentId: string, marks: number) =>
    setTests((p) => p.map((t) => t.id === testId
      ? { ...t, results: t.results.map((r) => r.studentId === studentId ? { ...r, marks } : r) }
      : t
    ))

  const stats = [
    { label: 'Total Students', value: allStudents.length, color: '#5e4075' },
    { label: 'Class Avg Score', value: `${avgScore}%`,   color: '#3e5e8a' },
    { label: 'Tests Done',      value: completed.length,  color: '#3e7450' },
    { label: 'Upcoming',        value: upcoming.length,   color: '#9e7438' },
  ]

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Test Results</h1>
          <p className="text-base text-gray-500 mt-1">Manage tests, upload papers, and record student scores.</p>
        </div>
        <button onClick={() => setShow(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#5e4075] text-white text-base hover:bg-[#3d2652] transition-colors w-fit">
          <IconCalendar className="w-5 h-5" />
          Schedule New Test
        </button>
      </div>

      {/* Stat chips */}
      <div className="grid grid-cols-4 gap-3 mb-8">
        {stats.map(({ label, value, color }) => (
          <div key={label}
            className="flex items-center justify-center gap-3 bg-white border border-gray-200 rounded-full px-5 py-4 shadow-sm min-w-0">
            <span className="text-2xl font-inter font-bold shrink-0" style={{ color }}>{value}</span>
            <span className="text-base text-gray-500 truncate">{label}</span>
          </div>
        ))}
      </div>

      {/* Grade filter chips */}
      <div className="flex flex-wrap gap-2 mb-6">
        {GRADE_FILTERS.map((g) => (
          <button
            key={g}
            onClick={() => setGradeFilter(g)}
            className={`px-4 py-1.5 text-lg rounded-full border transition-colors ${
              gradeFilter === g
                ? 'bg-primary text-white border-primary'
                : 'border-gray-300 text-gray-600 hover:border-gray-400'
            }`}
          >
            {g}
          </button>
        ))}
      </div>

      {/* Upcoming tests */}
      {filteredUpcoming.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg text-gray-600 mb-3">Upcoming Tests</h2>
          <div className="space-y-2">
            {filteredUpcoming.map((t) => (
              <UpcomingTestRow key={t.id} test={t} onUploadQP={uploadQP} onUploadKey={uploadKey} />
            ))}
          </div>
        </div>
      )}

      {/* Completed tests */}
      {filteredCompleted.length > 0 && (
        <div>
          <h2 className="text-lg text-gray-600 mb-3">Completed Tests</h2>
          <div className="space-y-2">
            {filteredCompleted.map((t) => (
              <TestCard key={t.id} test={t} isOpen={openTest === t.id}
                onToggle={() => setOpenTest(openTest === t.id ? null : t.id)}
                onUploadQP={uploadQP} onUploadKey={uploadKey} onUploadDescriptive={uploadDesc} onUpdateMark={updateMark} />
            ))}
          </div>
        </div>
      )}

      {filteredCompleted.length === 0 && filteredUpcoming.length === 0 && (
        <div className="py-16 text-center text-gray-400 text-base">No tests for the selected grade.</div>
      )}

      {/* Top scorers */}
      {topScorers.length > 0 && (
        <div className="mt-6">
          <h2 className="text-lg text-gray-600 mb-3">Top Scorers{gradeFilter !== 'All' ? ` — ${gradeFilter}` : ''}</h2>
          <div className="bg-white rounded-2xl border-gray-100 shadow-sm overflow-hidden">
            <div className="grid grid-cols-[32px_1fr_90px_70px_80px] px-5 py-3 text-base tracking-widest text-gray-600 bg-gray-100 border-b border-gray-200">
              <span>ID</span>
              <span>Student</span>
              <span className="text-right">Roll</span>
              <span className="text-right">Grade</span>
              <span className="text-right">Avg %</span>
            </div>
            {topScorers.map((s, i) => (
              <div key={s.roll} className="grid grid-cols-[32px_1fr_90px_70px_80px] px-5 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50">
                <span className="text-base font-inter text-gray-600">{i + 1}</span>
                <span className="text-lg text-gray-800">{s.name}</span>
                <span className="text-base font-inter text-gray-600 text-right">{s.roll}</span>
                <span className="text-lg text-gray-600 text-right">{s.grade}</span>
                <span className="text-base font-inter font-semibold text-right" style={{ color: '#5e4075' }}>{s.avg}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <AnimatePresence>
        {showSchedule && <ScheduleModal onClose={() => setShow(false)} onCreate={addTest} />}
      </AnimatePresence>
    </div>
  )
}
