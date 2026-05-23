'use client'

import { useState, useMemo, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { IconCalendar, IconDocument, IconCheckCircle, IconBarChart } from '@/components/ui/SvgIcons'

type TestType = 'MCQ' | 'Descriptive'
type TestStatus = 'completed' | 'upcoming'

interface TestResult { studentId: string; name: string; roll: string; marks: number | null }
interface Test {
 id: string; name: string; type: TestType; status: TestStatus; date: string; grade: string
 maxMarks: number; classAvg: number | null; results: TestResult[]
 qpUploaded: boolean; keyUploaded: boolean; descriptiveResultUrl: string | null
}
interface ScheduleForm { name: string; type: TestType; date: string; grade: string; maxMarks: string }

const allStudents = [
 { id: 'S01', name: 'Arjun Kumar', roll: 'CO-001', grade: '12th' },
 { id: 'S02', name: 'Sneha Rajan', roll: 'CO-002', grade: '12th' },
 { id: 'S05', name: 'Meenakshi A.', roll: 'CO-005', grade: '12th' },
 { id: 'S09', name: 'Siva Prakash', roll: 'CO-009', grade: '12th' },
 { id: 'S12', name: 'Kaviya Raj', roll: 'CO-012', grade: '12th' },
 { id: 'S03', name: 'Karthik S.', roll: 'CO-003', grade: '11th' },
 { id: 'S11', name: 'Deepak Mohan', roll: 'CO-011', grade: '11th' },
 { id: 'S14', name: 'Nithya Saravanan', roll: 'CO-014', grade: '11th' },
 { id: 'S17', name: 'Venkat Suresh', roll: 'CO-017', grade: '11th' },
 { id: 'S20', name: 'Lakshmi Devi', roll: 'CO-020', grade: '11th' },
 { id: 'S04', name: 'Priya Thirumalai', roll: 'CO-004', grade: 'JEE' },
 { id: 'S10', name: 'Arun Shankar', roll: 'CO-010', grade: 'JEE' },
 { id: 'S15', name: 'Praveen Raman', roll: 'CO-015', grade: 'JEE' },
 { id: 'S06', name: 'Rahul Venkat', roll: 'CO-006', grade: 'NEET' },
 { id: 'S08', name: 'Ananya Lakshmi', roll: 'CO-008', grade: 'NEET' },
 { id: 'S13', name: 'Surya Kumar', roll: 'CO-013', grade: 'NEET' },
 { id: 'S18', name: 'Pooja Nair', roll: 'CO-018', grade: 'NEET' },
]

const initialTests: Test[] = [
 {
 id: 'T001', name: 'Unit Test 1 — Atomic Structure', type: 'MCQ', status: 'completed',
 date: '10 May 2026', grade: '12th', maxMarks: 50, classAvg: 38.4, qpUploaded: true, keyUploaded: true, descriptiveResultUrl: null,
 results: [
 { studentId: 'S01', name: 'Arjun Kumar', roll: 'CO-001', marks: 44 },
 { studentId: 'S02', name: 'Sneha Rajan', roll: 'CO-002', marks: 47 },
 { studentId: 'S05', name: 'Meenakshi A.', roll: 'CO-005', marks: 42 },
 { studentId: 'S09', name: 'Siva Prakash', roll: 'CO-009', marks: 38 },
 { studentId: 'S12', name: 'Kaviya Raj', roll: 'CO-012', marks: 22 },
 ],
 },
 {
 id: 'T002', name: 'Chapter Test — Chemical Bonding', type: 'MCQ', status: 'completed',
 date: '15 May 2026', grade: '12th', maxMarks: 40, classAvg: 31.2, qpUploaded: true, keyUploaded: true, descriptiveResultUrl: null,
 results: [
 { studentId: 'S01', name: 'Arjun Kumar', roll: 'CO-001', marks: 35 },
 { studentId: 'S02', name: 'Sneha Rajan', roll: 'CO-002', marks: 38 },
 { studentId: 'S05', name: 'Meenakshi A.', roll: 'CO-005', marks: 33 },
 { studentId: 'S09', name: 'Siva Prakash', roll: 'CO-009', marks: 29 },
 { studentId: 'S12', name: 'Kaviya Raj', roll: 'CO-012', marks: 21 },
 ],
 },
 {
 id: 'T003', name: 'Unit Test 2 — Thermodynamics', type: 'Descriptive', status: 'completed',
 date: '18 May 2026', grade: '11th', maxMarks: 60, classAvg: null, qpUploaded: true, keyUploaded: false, descriptiveResultUrl: null,
 results: [
 { studentId: 'S03', name: 'Karthik S.', roll: 'CO-003', marks: null },
 { studentId: 'S11', name: 'Deepak Mohan', roll: 'CO-011', marks: null },
 { studentId: 'S14', name: 'Nithya Saravanan', roll: 'CO-014', marks: null },
 ],
 },
 {
 id: 'T004', name: 'Mock Test 1 — JEE Pattern', type: 'MCQ', status: 'completed',
 date: '20 May 2026', grade: 'JEE', maxMarks: 100, classAvg: 67.5, qpUploaded: true, keyUploaded: true, descriptiveResultUrl: null,
 results: [
 { studentId: 'S04', name: 'Priya Thirumalai', roll: 'CO-004', marks: 78 },
 { studentId: 'S10', name: 'Arun Shankar', roll: 'CO-010', marks: 62 },
 { studentId: 'S15', name: 'Praveen Raman', roll: 'CO-015', marks: 63 },
 ],
 },
 { id: 'T005', name: 'Unit Test 3 — Thermodynamics', type: 'MCQ', status: 'upcoming', date: '28 May 2026', grade: '12th', maxMarks: 50, classAvg: null, qpUploaded: false, keyUploaded: false, descriptiveResultUrl: null, results: [] },
 { id: 'T006', name: 'Mock Test 2 — NEET Pattern', type: 'MCQ', status: 'upcoming', date: '01 Jun 2026', grade: 'NEET', maxMarks: 180, classAvg: null, qpUploaded: false, keyUploaded: false, descriptiveResultUrl: null, results: [] },
 { id: 'T007', name: 'Chapter Test — Electrochemistry', type: 'MCQ', status: 'upcoming', date: '05 Jun 2026', grade: '12th', maxMarks: 40, classAvg: null, qpUploaded: false, keyUploaded: false, descriptiveResultUrl: null, results: [] },
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
 classAvg: null, qpUploaded: false, keyUploaded: false, descriptiveResultUrl: null,
 results: rel.map((s) => ({ studentId: s.id, name: s.name, roll: s.roll, marks: null })),
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

function TestCard({ test, isOpen, onToggle, onUploadQP, onUploadKey, onUploadDescriptive, searchQuery }: {
 test: Test; isOpen: boolean; onToggle: () => void
 onUploadQP: (id: string) => void; onUploadKey: (id: string) => void
 onUploadDescriptive: (id: string, url: string) => void; searchQuery: string
}) {
 const fileRef = useRef<HTMLInputElement>(null)
 const sorted = [...test.results].sort((a, b) => (b.marks ?? -1) - (a.marks ?? -1))
 const filtered = sorted.filter((r) =>
 r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
 r.roll.toLowerCase().includes(searchQuery.toLowerCase())
 )

 return (
 <div className="bg-white shadow-sm overflow-hidden">
 <button onClick={onToggle} className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-gray-50 transition-colors">
 <span className="text-sm border border-gray-200 px-2 py-0.5 text-gray-600 shrink-0">{test.grade}</span>
 <div className="flex-1 min-w-0">
 <p className="text-base text-gray-800 truncate">{test.name}</p>
 <p className="text-sm text-gray-400">{test.date} · {test.type} · Max {test.maxMarks}
 {test.classAvg !== null && ` · Avg: ${test.classAvg}`}
 </p>
 </div>
 <div className="flex items-center gap-2 shrink-0">
 {test.qpUploaded && <span className="text-sm border border-gray-200 px-2 py-0.5 text-gray-600">QP</span>}
 {test.keyUploaded && <span className="text-sm border border-gray-200 px-2 py-0.5 text-gray-600">Key</span>}
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
 {/* Upload buttons */}
 <div className="flex gap-2 flex-wrap">
 <button onClick={() => onUploadQP(test.id)}
 className={`flex items-center gap-1.5 px-3 py-1.5 text-sm border transition-colors ${
 test.qpUploaded ? 'border-green-200 bg-green-50 text-green-700' : 'border-gray-200 text-gray-600 hover:bg-white'
 }`}>
 <IconDocument className="w-4 h-4" />
 {test.qpUploaded ? 'QP Uploaded' : 'Upload Question Paper'}
 </button>
 <button onClick={() => onUploadKey(test.id)}
 className={`flex items-center gap-1.5 px-3 py-1.5 text-sm border transition-colors ${
 test.keyUploaded ? 'border-green-200 bg-green-50 text-green-700' : 'border-gray-200 text-gray-600 hover:bg-white'
 }`}>
 <IconCheckCircle className="w-4 h-4" />
 {test.keyUploaded ? 'Key Uploaded' : 'Upload Answer Key'}
 </button>
 {test.type === 'Descriptive' && (
 <>
 <button onClick={() => fileRef.current?.click()}
 className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 text-gray-600 hover:bg-white">
 <IconBarChart className="w-4 h-4" />
 {test.descriptiveResultUrl ? 'Result Uploaded' : 'Upload Result (.pdf / .xlsx)'}
 </button>
 <input ref={fileRef} type="file" accept=".pdf,.xlsx,.xls" className="hidden"
 onChange={(e) => { const f = e.target.files?.[0]; if (f) onUploadDescriptive(test.id, f.name); e.target.value = '' }} />
 </>
 )}
 </div>

 {/* Marks table */}
 {test.type === 'MCQ' && filtered.length > 0 && (
 <div className="bg-white shadow-sm overflow-hidden">
 <div className="grid grid-cols-[28px_1fr_80px_100px_70px] gap-2 px-4 py-2.5 text-base text-gray-400 border-b border-gray-100">
 <span>#</span><span>Student</span><span className="text-right">Roll</span>
 <span className="text-right">Marks</span><span className="text-right">%</span>
 </div>
 {filtered.map((r, i) => (
 <div key={r.studentId} className="grid grid-cols-[28px_1fr_80px_100px_70px] gap-2 px-4 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50">
 <span className="text-base text-gray-400 font-inter">{i + 1}</span>
 <span className="text-base text-gray-800 truncate">{r.name}</span>
 <span className="text-base text-gray-400 text-right">{r.roll}</span>
 <span className="text-base font-inter text-gray-700 text-right">{r.marks ?? '—'} / {test.maxMarks}</span>
 <span className="text-base font-inter text-gray-500 text-right">
 {r.marks !== null ? `${Math.round((r.marks / test.maxMarks) * 100)}%` : '—'}
 </span>
 </div>
 ))}
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TestResultsPage() {
 const [tests, setTests] = useState<Test[]>(initialTests)
 const [search, setSearch] = useState('')
 const [showSchedule, setShow] = useState(false)
 const [openTest, setOpenTest] = useState<string | null>(null)

 const completed = tests.filter((t) => t.status === 'completed')
 const upcoming = tests.filter((t) => t.status === 'upcoming')

 const avgScore = useMemo<number>(() => {
 const w = completed.filter((t) => t.classAvg !== null)
 return w.length ? Math.round(w.reduce((s, t) => s + (t.classAvg ?? 0), 0) / w.length) : 0
 }, [completed])

 const topScorers = useMemo(() => {
 const map = new Map<string, { name: string; roll: string; totalPct: number; count: number }>()
 completed.forEach((t) => {
 t.results.forEach((r) => {
 if (r.marks === null) return
 const pct = Math.round((r.marks / t.maxMarks) * 100)
 const existing = map.get(r.studentId)
 if (existing) { existing.totalPct += pct; existing.count++ }
 else map.set(r.studentId, { name: r.name, roll: r.roll, totalPct: pct, count: 1 })
 })
 })
 return [...map.values()]
 .map((s) => ({ ...s, avg: Math.round(s.totalPct / s.count) }))
 .sort((a, b) => b.avg - a.avg)
 .slice(0, 10)
 }, [completed])

 const addTest = (t: Test) => setTests((p) => [...p, t])
 const uploadQP = (id: string) => setTests((p) => p.map((t) => t.id === id ? { ...t, qpUploaded: true } : t))
 const uploadKey = (id: string) => setTests((p) => p.map((t) => t.id === id ? { ...t, keyUploaded: true } : t))
 const uploadDesc = (id: string, url: string) => setTests((p) => p.map((t) => t.id === id ? { ...t, descriptiveResultUrl: url } : t))

 const stats = [
 { label: 'Total Students', value: allStudents.length, sub: 'enrolled', Icon: IconBarChart, color: '#5e4075' },
 { label: 'Class Avg Score', value: `${avgScore}%`, sub: 'across MCQ tests', Icon: IconCheckCircle, color: '#3e5e8a' },
 { label: 'Tests Done', value: completed.length, sub: 'this semester', Icon: IconDocument, color: '#3e7450' },
 { label: 'Upcoming', value: upcoming.length, sub: 'scheduled', Icon: IconCalendar, color: '#9e7438' },
 ]

 return (
 <div className="p-8">
 {/* Header */}
 <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
 <div>
 <h1 className="text-3xl font-bold text-gray-900">Test Results</h1>
 <p className="text-base text-gray-500 mt-1">Manage tests, upload papers, and view student scores.</p>
 </div>
 <button onClick={() => setShow(true)}
 className="flex items-center gap-2 px-5 py-2.5 bg-[#5e4075] text-white text-base hover:bg-[#3d2652] transition-colors">
 <IconCalendar className="w-5 h-5" />
 Schedule New Test
 </button>
 </div>

 {/* Uniform stat boxes */}
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
 {stats.map(({ label, value, sub, Icon, color }) => (
 <div key={label} className="bg-white shadow-sm overflow-hidden relative">
 <div className="h-1" style={{ backgroundColor: color }} />
 <div className="px-5 py-4">
 <div className="flex items-start justify-between mb-3">
 <p className="text-xs uppercase tracking-widest text-gray-400">{label}</p>
 <div className="w-8 h-8 flex items-center justify-center text-gray-400 shrink-0">
 <Icon className="w-5 h-5" />
 </div>
 </div>
 <p className="text-3xl font-inter font-bold" style={{ color }}>{value}</p>
 <p className="text-sm text-gray-400 mt-1">{sub}</p>
 </div>
 <svg viewBox="0 0 40 40" fill="none" className="absolute bottom-1 right-1 w-16 h-16 opacity-[0.06] pointer-events-none" style={{ color }} stroke="currentColor" strokeWidth="1.2">
 <circle cx="20" cy="20" r="6" />
 <circle cx="8" cy="28" r="4" />
 <circle cx="32" cy="28" r="4" />
 <line x1="20" y1="26" x2="8" y2="28" />
 <line x1="20" y1="26" x2="32" y2="28" />
 </svg>
 </div>
 ))}
 </div>

 {/* Search */}
 <div className="mb-6 relative">
 <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" viewBox="0 0 16 16" fill="none">
 <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.3" />
 <path d="M 11,11 L 14,14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
 </svg>
 <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
 placeholder="Search student name or roll…"
 className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-none text-base text-gray-700 placeholder-gray-400 outline-none focus:border-gray-400 bg-transparent" />
 </div>

 {/* Upcoming */}
 {upcoming.length > 0 && (
 <div className="mb-6">
 <h2 className="text-base text-gray-600 mb-3">Upcoming Tests</h2>
 <div className="space-y-2">
 {upcoming.map((t) => (
 <div key={t.id} className="bg-white shadow-sm px-5 py-4 flex items-center gap-4">
 <span className="text-sm border border-gray-200 px-2 py-0.5 text-gray-600 shrink-0">{t.grade}</span>
 <div className="flex-1 min-w-0">
 <p className="text-base text-gray-800">{t.name}</p>
 <p className="text-sm text-gray-400">{t.date} · {t.type} · Max {t.maxMarks} marks</p>
 </div>
 <div className="flex gap-2 shrink-0">
 <button onClick={() => uploadQP(t.id)}
 className={`flex items-center gap-1.5 px-3 py-1.5 text-sm border transition-colors ${
 t.qpUploaded ? 'border-green-200 bg-green-50 text-green-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
 }`}>
 <IconDocument className="w-4 h-4" />
 {t.qpUploaded ? 'QP' : 'Upload QP'}
 </button>
 <button onClick={() => uploadKey(t.id)}
 className={`flex items-center gap-1.5 px-3 py-1.5 text-sm border transition-colors ${
 t.keyUploaded ? 'border-green-200 bg-green-50 text-green-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
 }`}>
 <IconCheckCircle className="w-4 h-4" />
 {t.keyUploaded ? 'Key' : 'Upload Key'}
 </button>
 </div>
 </div>
 ))}
 </div>
 </div>
 )}

 {/* Completed tests */}
 <div>
 <h2 className="text-base text-gray-600 mb-3">Completed Tests</h2>
 <div className="space-y-2">
 {completed.map((t) => (
 <TestCard key={t.id} test={t} isOpen={openTest === t.id}
 onToggle={() => setOpenTest(openTest === t.id ? null : t.id)}
 onUploadQP={uploadQP} onUploadKey={uploadKey} onUploadDescriptive={uploadDesc} searchQuery={search} />
 ))}
 </div>
 </div>

 {topScorers.length > 0 && (
 <div className="mt-6">
 <h2 className="text-base text-gray-600 mb-3">Top Scorers</h2>
 <div className="bg-white shadow-sm overflow-hidden">
 <div className="grid grid-cols-[32px_1fr_100px_80px] px-5 py-3 text-xs uppercase tracking-widest text-gray-400 bg-gray-50 border-b border-gray-100">
 <span>#</span>
 <span>Student</span>
 <span className="text-right">Roll</span>
 <span className="text-right">Avg %</span>
 </div>
 {topScorers.map((s, i) => (
 <div key={s.roll} className="grid grid-cols-[32px_1fr_100px_80px] px-5 py-3 border-b border-gray-50 last:border-0 hover:bg-gray-50">
 <span className="text-base font-inter text-gray-400">{i + 1}</span>
 <span className="text-base text-gray-800">{s.name}</span>
 <span className="text-base font-inter text-gray-500 text-right">{s.roll}</span>
 <span className="text-base font-inter font-bold text-right" style={{ color: '#5e4075' }}>{s.avg}%</span>
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
