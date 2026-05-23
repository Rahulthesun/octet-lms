'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { IconCheckCircle, IconXCircle, IconGlobe, IconBuilding } from '@/components/ui/SvgIcons'

type Mode = 'online' | 'offline'
type Period = 'monthly' | 'yearly'
type Section = 'mark' | 'summary'

interface Student {
 id: string; name: string; roll: string; grade: string; batch: string
 onlineAtt: number | null; offlineAtt: number | null
}

interface AttendanceEntry { studentId: string; present: boolean }

// ─── Mock Data ────────────────────────────────────────────────────────────────

const students: Student[] = [
 { id: 'S01', name: 'Arjun Kumar', roll: 'CO-001', grade: '12th', batch: 'Offline A', onlineAtt: 82, offlineAtt: 78 },
 { id: 'S02', name: 'Sneha Rajan', roll: 'CO-002', grade: '12th', batch: 'Online A', onlineAtt: 94, offlineAtt: null },
 { id: 'S03', name: 'Karthik S.', roll: 'CO-003', grade: '11th', batch: 'Offline B', onlineAtt: 72, offlineAtt: 68 },
 { id: 'S04', name: 'Priya Thirumalai', roll: 'CO-004', grade: 'JEE', batch: 'Online B', onlineAtt: 88, offlineAtt: null },
 { id: 'S05', name: 'Meenakshi A.', roll: 'CO-005', grade: '12th', batch: 'Offline A', onlineAtt: 91, offlineAtt: 89 },
 { id: 'S06', name: 'Rahul Venkat', roll: 'CO-006', grade: 'NEET', batch: 'Online A', onlineAtt: 73, offlineAtt: null },
 { id: 'S07', name: 'Divya Krishnan', roll: 'CO-007', grade: '11th', batch: 'Offline B', onlineAtt: 65, offlineAtt: 60 },
 { id: 'S08', name: 'Ananya Lakshmi', roll: 'CO-008', grade: 'NEET', batch: 'Online B', onlineAtt: 97, offlineAtt: null },
 { id: 'S09', name: 'Siva Prakash', roll: 'CO-009', grade: '12th', batch: 'Offline A', onlineAtt: 85, offlineAtt: 83 },
 { id: 'S10', name: 'Arun Shankar', roll: 'CO-010', grade: 'JEE', batch: 'Online A', onlineAtt: 79, offlineAtt: null },
 { id: 'S11', name: 'Deepak Mohan', roll: 'CO-011', grade: '11th', batch: 'Offline B', onlineAtt: 88, offlineAtt: 85 },
 { id: 'S12', name: 'Kaviya Raj', roll: 'CO-012', grade: '12th', batch: 'Online B', onlineAtt: 92, offlineAtt: null },
 { id: 'S13', name: 'Surya Kumar', roll: 'CO-013', grade: 'NEET', batch: 'Offline A', onlineAtt: 71, offlineAtt: 69 },
 { id: 'S14', name: 'Nithya Saravanan',roll: 'CO-014', grade: '11th', batch: 'Online A', onlineAtt: 96, offlineAtt: null },
 { id: 'S15', name: 'Praveen Raman', roll: 'CO-015', grade: 'JEE', batch: 'Offline B', onlineAtt: 76, offlineAtt: 74 },
 { id: 'S16', name: 'Riya Sharma', roll: 'CO-016', grade: '12th', batch: 'Online A', onlineAtt: 89, offlineAtt: null },
 { id: 'S17', name: 'Venkat Suresh', roll: 'CO-017', grade: '11th', batch: 'Offline A', onlineAtt: 63, offlineAtt: 58 },
 { id: 'S18', name: 'Pooja Nair', roll: 'CO-018', grade: 'NEET', batch: 'Online B', onlineAtt: 93, offlineAtt: null },
 { id: 'S19', name: 'Manoj Pillai', roll: 'CO-019', grade: '12th', batch: 'Offline B', onlineAtt: 80, offlineAtt: 77 },
 { id: 'S20', name: 'Lakshmi Devi', roll: 'CO-020', grade: '11th', batch: 'Online A', onlineAtt: 98, offlineAtt: null },
]

const monthlyData = [
 { label: 'Jan', val: 88 }, { label: 'Feb', val: 84 },
 { label: 'Mar', val: 91 }, { label: 'Apr', val: 86 }, { label: 'May', val: 89 },
]
const yearlyData = [
 { label: '2022', val: 86 }, { label: '2023', val: 88 },
 { label: '2024', val: 91 }, { label: '2025', val: 89 }, { label: '2026', val: 90 },
]

const CHART_H = 160

// ─── Helpers ──────────────────────────────────────────────────────────────────

function attPct(s: Student, mode: Mode): number | null {
 return mode === 'online' ? s.onlineAtt : s.offlineAtt
}

function statusLabel(pct: number) {
 if (pct < 75) return { text: 'Blocked', color: 'text-gray-900' }
 if (pct < 80) return { text: 'Warning', color: 'text-gray-700' }
 if (pct < 90) return { text: 'Good', color: 'text-gray-500' }
 return { text: 'Excellent', color: 'text-[#2e7470]' }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AttendancePage() {
 const [mode, setMode] = useState<Mode>('online')
 const [period, setPeriod] = useState<Period>('monthly')
 const [activeSection, setSection] = useState<Section>('mark')
 const [search, setSearch] = useState('')
 const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
 const [entries, setEntries] = useState<AttendanceEntry[]>(() =>
 students.map((s) => ({ studentId: s.id, present: true }))
 )
 const [saved, setSaved] = useState(false)

 const eligible = students.filter((s) => attPct(s, mode) !== null)
 const blocked = eligible.filter((s) => (attPct(s, mode) ?? 100) < 75).length
 const warning = eligible.filter((s) => { const p = attPct(s, mode) ?? 100; return p >= 75 && p < 80 }).length
 const good = eligible.filter((s) => { const p = attPct(s, mode) ?? 100; return p >= 80 && p < 90 }).length
 const excellent = eligible.filter((s) => (attPct(s, mode) ?? 0) >= 90).length

 const filtered = useMemo(() =>
 students.filter((s) =>
 attPct(s, mode) !== null &&
 (s.name.toLowerCase().includes(search.toLowerCase()) ||
 s.roll.toLowerCase().includes(search.toLowerCase()))
 ), [mode, search])

 const isPresent = (id: string) => entries.find((e) => e.studentId === id)?.present ?? true
 const toggle = (id: string) => setEntries((prev) => prev.map((e) => e.studentId === id ? { ...e, present: !e.present } : e))

 const chartData = period === 'monthly' ? monthlyData : yearlyData

 return (
 <div className="p-8 space-y-6">
 {/* Header */}
 <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
 <div>
 <h1 className="text-3xl font-bold text-gray-900">Attendance</h1>
 <p className="text-base text-gray-500 mt-1">Track and manage daily attendance for all batches.</p>
 </div>
 {/* Mode toggle */}
 <div className="flex border border-gray-200 overflow-hidden">
 {([['online', 'Online', IconGlobe], ['offline', 'Offline', IconBuilding]] as [Mode, string, React.ComponentType<{className?: string}>][]).map(([m, label, Icon]) => (
 <button key={m} onClick={() => setMode(m)}
 className={`flex items-center gap-2 px-5 py-2.5 text-base transition-colors ${
 mode === m ? 'bg-[#5e4075] text-white' : 'text-gray-600 hover:bg-gray-50'
 }`}>
 <Icon className="w-4 h-4" />{label}
 </button>
 ))}
 </div>
 </div>

 {/* Stat strip */}
 <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
 {([
 { label: 'Blocked (< 75%)', count: blocked, color: '#9e4a4a', icon: (
 <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none">
 <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.4" />
 <path d="M 7,7 L 13,13 M 13,7 L 7,13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
 </svg>
 )},
 { label: 'Warning (75–80%)', count: warning, color: '#9e7438', icon: (
 <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none">
 <path d="M 10,3 L 18,16 H 2 Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
 <line x1="10" y1="9" x2="10" y2="12.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
 <circle cx="10" cy="14.5" r="0.8" fill="currentColor" />
 </svg>
 )},
 { label: 'Good (80–90%)', count: good, color: '#3e7450', icon: (
 <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none">
 <circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.4" />
 <path d="M 6.5,10 L 9,12.5 L 13.5,7.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
 </svg>
 )},
 { label: 'Excellent (90%+)', count: excellent, color: '#2e7470', icon: (
 <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none">
 <path d="M 10,3 L 11.8,7.8 H 17 L 12.9,10.7 L 14.5,15.5 L 10,12.5 L 5.5,15.5 L 7.1,10.7 L 3,7.8 H 8.2 Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
 </svg>
 )},
 ] as { label: string; count: number; color: string; icon: React.ReactNode }[]).map(({ label, count, color, icon }) => (
 <div key={label} className="bg-white shadow-sm overflow-hidden relative">
 <div className="h-1" style={{ backgroundColor: color }} />
 <div className="px-5 py-4">
 <div className="flex items-start justify-between mb-3">
 <p className="text-xs uppercase tracking-widest text-gray-400">{label}</p>
 <div className="w-8 h-8 flex items-center justify-center text-gray-400 shrink-0">
 {icon}
 </div>
 </div>
 <p className="text-4xl font-inter font-bold" style={{ color }}>{count}</p>
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

 {/* Bar chart */}
 <div className="bg-white shadow-sm">
 <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
 <h3 className="text-base text-gray-800">Attendance Overview</h3>
 <div className="flex border border-gray-200 overflow-hidden">
 {(['monthly', 'yearly'] as Period[]).map((p) => (
 <button key={p} onClick={() => setPeriod(p)}
 className={`px-4 py-1.5 text-base capitalize transition-colors ${
 period === p ? 'bg-[#5e4075] text-white' : 'text-gray-500 hover:bg-gray-50'
 }`}>
 {p}
 </button>
 ))}
 </div>
 </div>
 <div className="px-6 py-6">
 <div className="flex gap-3">
 {/* Y-axis labels */}
 <div
 className="flex flex-col justify-between text-xs text-gray-400 text-right w-8 shrink-0 pb-6"
 style={{ height: CHART_H + 8 }}
 >
 <span>100%</span>
 <span>75%</span>
 <span>50%</span>
 <span>25%</span>
 <span>0%</span>
 </div>
 {/* Chart area */}
 <div className="flex-1">
 <div className="relative" style={{ height: CHART_H }}>
 {/* Horizontal gridlines */}
 {[0, 25, 50, 75, 100].map((pct) => (
 <div
 key={pct}
 className="absolute left-0 right-0 border-t border-gray-100"
 style={{ bottom: `${(pct / 100) * CHART_H}px` }}
 />
 ))}
 {/* Bars */}
 <div className="absolute inset-0 flex items-end gap-4 px-2">
 {chartData.map((row, i) => (
 <div key={i} className="flex-1 flex justify-center items-end h-full">
 <motion.div
 initial={{ height: 0 }}
 animate={{ height: `${(row.val / 100) * CHART_H}px` }}
 transition={{ duration: 0.6, delay: i * 0.08, ease: 'easeOut' }}
 className="w-full max-w-[72px] bg-[#5e4075]"
 />
 </div>
 ))}
 </div>
 </div>
 {/* X-axis labels */}
 <div className="flex gap-4 px-2 mt-2">
 {chartData.map((row, i) => (
 <div key={i} className="flex-1 text-center text-sm text-gray-400">{row.label}</div>
 ))}
 </div>
 </div>
 </div>
 </div>
 </div>

 {/* Section toggle */}
 <div className="flex justify-center">
 <div className="flex bg-white shadow-sm overflow-hidden w-[360px]">
 {(['mark', 'summary'] as Section[]).map((s) => (
 <button key={s} onClick={() => setSection(s)}
 className={`flex-1 py-2.5 text-base transition-colors ${
 activeSection === s ? 'bg-[#5e4075] text-white' : 'text-gray-600 hover:bg-gray-50'
 }`}>
 {s === 'mark' ? 'Mark Attendance' : 'Attendance Summary'}
 </button>
 ))}
 </div>
 </div>

 {/* Conditional section */}
 <AnimatePresence mode="wait">
 {activeSection === 'mark' ? (
 <motion.div key="mark" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
 <div className="bg-white shadow-sm overflow-hidden">
 {/* Toolbar */}
 <div className="px-5 py-4 border-b border-gray-200 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
 <h3 className="text-base text-gray-800">Mark Attendance</h3>
 <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
 <div className="relative flex-1 sm:w-72">
 <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" viewBox="0 0 16 16" fill="none">
 <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.3" />
 <path d="M 11,11 L 14,14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
 </svg>
 <input type="text" placeholder="Search by name or roll…" value={search} onChange={(e) => setSearch(e.target.value)}
 className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-none text-base text-gray-700 placeholder-gray-400 outline-none focus:border-gray-400 bg-transparent" />
 </div>
 <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
 className="border border-gray-200 px-3 py-2 text-base text-gray-700 outline-none focus:border-gray-400" />
 </div>
 </div>

 {/* Student rows */}
 <div className="divide-y divide-gray-100">
 {filtered.length === 0
 ? <div className="py-12 text-center text-gray-400 text-base">No students found.</div>
 : filtered.map((s) => {
 const pct = attPct(s, mode)
 const present = isPresent(s.id)
 const st = pct !== null ? statusLabel(pct) : null
 return (
 <div key={s.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50">
 <div className="w-9 h-9 bg-gray-100 flex items-center justify-center text-gray-600 text-base shrink-0">
 {s.name.charAt(0)}
 </div>
 <div className="flex-1 min-w-0">
 <p className="text-base text-gray-800">{s.name}</p>
 <p className="text-sm text-gray-400">{s.roll} · {s.grade} · {s.batch}</p>
 </div>
 {st && pct !== null && (
 <span className={`text-base font-inter ${st.color} w-14 text-right`}>{pct}%</span>
 )}
 <span className={`text-base ${st?.color ?? 'text-gray-400'} w-20 text-right hidden sm:block`}>
 {st?.text}
 </span>
 <button onClick={() => toggle(s.id)}
 className={`flex items-center gap-1.5 px-3 py-1.5 text-base transition-colors border shrink-0 ${
 present
 ? 'border-green-200 bg-green-50 text-green-700'
 : 'border-gray-200 bg-gray-100 text-gray-600'
 }`}>
 {present ? <IconCheckCircle className="w-4 h-4" /> : <IconXCircle className="w-4 h-4" />}
 {present ? 'Present' : 'Absent'}
 </button>
 </div>
 )
 })
 }
 </div>

 {/* Save row */}
 <div className="px-5 py-4 border-t border-gray-200 flex items-center gap-4">
 <button onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 3000) }}
 className="px-7 py-2.5 bg-[#5e4075] text-white text-base hover:bg-[#3d2652] transition-colors">
 Save Attendance
 </button>
 <AnimatePresence>
 {saved && (
 <motion.div initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
 className="flex items-center gap-2 text-green-700 text-base">
 <IconCheckCircle className="w-4 h-4" />
 Saved for {new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 </div>
 </motion.div>
 ) : (
 <motion.div key="summary" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
 <div className="bg-white shadow-sm overflow-hidden">
 <div className="px-5 py-4 border-b border-gray-200">
 <h3 className="text-base text-gray-800">Attendance Summary — All Students</h3>
 </div>
 <div className="grid grid-cols-[1fr_80px_100px] px-5 py-3 text-base text-gray-400 border-b border-gray-100 bg-gray-50">
 <span>Student</span>
 <span className="text-right">Att. %</span>
 <span className="text-right">Status</span>
 </div>
 <div className="divide-y divide-gray-100">
 {students.map((s) => {
 const pct = attPct(s, mode)
 if (pct === null) return null
 const st = statusLabel(pct)
 return (
 <div key={s.id} className="grid grid-cols-[1fr_80px_100px] px-5 py-3 hover:bg-gray-50">
 <div className="min-w-0">
 <span className="text-base text-gray-700 truncate block">{s.name}</span>
 <span className="text-sm text-gray-400">{s.roll}</span>
 </div>
 <span className="text-base font-inter text-gray-700 text-right self-center">{pct}%</span>
 <span className={`text-base text-right self-center ${st.color}`}>{st.text}</span>
 </div>
 )
 })}
 </div>
 </div>
 </motion.div>
 )}
 </AnimatePresence>
 </div>
 )
}
