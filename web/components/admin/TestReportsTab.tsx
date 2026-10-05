'use client'

// components/admin/TestReportsTab.tsx
//
// Student-wise consolidated test report — mirrors AttendanceReportsTab's UX:
// a roster of registered students, click one to open their report, pick a
// month, see a line graph of their evaluated test scores (normalized to a
// 0-100% scale) for that month, with absent dates (a test was scheduled for
// their batch/All Students and they never attempted it) called out in red.
//
// Real data only — the student roster comes from useStudents() (GET
// /api/students), and the report comes from GET
// /api/tests/students/:studentId/report?month=YYYY-MM (testAttempts.service.js).

import { useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useStudents } from '@/hooks/admin/useStudents'
import { useStudentTestReport } from '@/hooks/useTests'
import AttendanceChart, { type ChartDatum } from '@/components/shared/AttendanceChart'

const ACCENT = '#5B21B6'

function currentMonthStr() {
  return new Date().toISOString().slice(0, 7) // YYYY-MM
}

function monthLabel(month: string) {
  const [y, m] = month.split('-').map(Number)
  return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
}

function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split('-').map(Number)
  const d = new Date(y, m - 1 + delta, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

// ─── Individual student report ─────────────────────────────────────────────

function StudentTestReportModal({ studentId, studentName, onClose }: {
  studentId: string
  studentName: string
  onClose: () => void
}) {
  const [month, setMonth] = useState(currentMonthStr())
  const { report, loading, error } = useStudentTestReport(studentId, month)

  const chartData: ChartDatum[] = useMemo(() => {
    if (!report) return []
    return report.points.map((p) => {
      const pct = p.maxMarks > 0 ? Math.round((p.marksAwarded / p.maxMarks) * 100) : 0
      const day = Number(p.date.slice(-2))
      return {
        label: String(day),
        value: pct,
        color: ACCENT,
        tooltipLabel: `${p.marksAwarded}/${p.maxMarks} — ${pct}% (${p.testTitle})`,
      }
    })
  }, [report])

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 24, opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="bg-white w-full sm:max-w-2xl shadow-2xl rounded-t-xl sm:rounded-xl border border-zinc-200 overflow-hidden max-h-[88vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-zinc-200 flex items-start justify-between shrink-0">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900">Test Report</h3>
            <p className="text-xs text-zinc-500 mt-0.5">{studentName}</p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 text-xl leading-none">&times;</button>
        </div>

        <div className="px-6 py-3 border-b border-zinc-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMonth((m) => shiftMonth(m, -1))}
              className="w-7 h-7 flex items-center justify-center rounded-md border border-zinc-300 text-zinc-500 hover:bg-zinc-100"
            >
              ‹
            </button>
            <span className="text-sm font-medium text-zinc-800 w-40 text-center">{monthLabel(month)}</span>
            <button
              onClick={() => setMonth((m) => shiftMonth(m, 1))}
              disabled={month >= currentMonthStr()}
              className="w-7 h-7 flex items-center justify-center rounded-md border border-zinc-300 text-zinc-500 hover:bg-zinc-100 disabled:opacity-40"
            >
              ›
            </button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="py-16 text-center text-sm text-zinc-400">Loading report…</div>
          ) : error ? (
            <div className="py-16 text-center text-sm text-red-600">{error}</div>
          ) : report ? (
            <div className="px-6 py-4">
              <div className="flex items-start justify-between mb-2 gap-3">
                <p className="text-[10px] font-medium tracking-widest uppercase text-zinc-400 mt-1">Score trend</p>
                {report.absentDates.length > 0 && (
                  <p className="text-xs text-rose-600 text-right shrink-0 max-w-[55%]">
                    Absent on: {report.absentDates.join(', ')}
                  </p>
                )}
              </div>

              <AttendanceChart
                type="line"
                onTypeChange={() => {}}
                barData={[]}
                pieData={[]}
                lineData={chartData}
                lineColor={ACCENT}
                valueSuffix="%"
                lineAxisLabels={{ x: 'Date of month', y: 'Score %' }}
                emptyMessage="No evaluated test attempts for this student in this month."
                description="Each evaluated test attempt's score for this student this month, normalized to a 0–100% scale. Dates with no attempt are skipped — not plotted as zero."
              />

              <div className="mt-4 border border-zinc-200 rounded-lg overflow-hidden">
                <div className="grid grid-cols-[1fr_1fr_80px] px-3 py-2 bg-zinc-50 border-b border-zinc-200 text-[10px] uppercase tracking-wide text-zinc-400">
                  <span>Date</span>
                  <span>Test</span>
                  <span className="text-right">Score</span>
                </div>
                <div className="divide-y divide-zinc-100 max-h-56 overflow-y-auto">
                  {report.points.length === 0 ? (
                    <div className="py-8 text-center text-sm text-zinc-400">No evaluated attempts this month.</div>
                  ) : report.points.map((p, i) => {
                    const pct = p.maxMarks > 0 ? Math.round((p.marksAwarded / p.maxMarks) * 100) : 0
                    return (
                      <div key={i} className="grid grid-cols-[1fr_1fr_80px] px-3 py-2 text-sm items-center">
                        <span className="text-zinc-700">{p.date}</span>
                        <span className="text-zinc-500 truncate">{p.testTitle}</span>
                        <span className="text-right font-inter text-zinc-700 tabular-nums">
                          {p.marksAwarded}/{p.maxMarks} ({pct}%)
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Student roster ─────────────────────────────────────────────────────────

export default function TestReportsTab() {
  const { students, loadingStudents, error } = useStudents()
  const [search, setSearch] = useState('')
  const [reportStudent, setReportStudent] = useState<{ id: string; name: string } | null>(null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return students
    return students.filter((s) =>
      s.name?.toLowerCase().includes(q) ||
      s.admission_number?.toLowerCase().includes(q) ||
      s.email?.toLowerCase().includes(q)
    )
  }, [students, search])

  return (
    <div>
      <p className="text-sm text-zinc-500 mb-4">Select a student to view their consolidated monthly test report.</p>

      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search by name, admission number, or email…"
        className="w-full sm:w-80 mb-4 px-3 py-2 text-sm border border-zinc-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-200"
      />

      <div className="border border-zinc-200 rounded-lg overflow-hidden bg-white">
        {loadingStudents ? (
          <div className="py-12 text-center text-sm text-zinc-400">Loading students…</div>
        ) : error ? (
          <div className="py-12 text-center text-sm text-red-600">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-zinc-400">No students found.</div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {filtered.map((s) => (
              <div key={s.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-zinc-50 transition-colors">
                <div className="min-w-0">
                  <p className="text-sm text-zinc-900 truncate">{s.name}</p>
                  <p className="text-xs text-zinc-500 font-mono">{s.admission_number || s.email}</p>
                </div>
                <button
                  onClick={() => setReportStudent({ id: s.id, name: s.name })}
                  className="text-xs px-3 py-1.5 rounded-md border border-zinc-300 text-zinc-600 hover:bg-zinc-100 transition-colors shrink-0"
                  style={{}}
                >
                  Report
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {reportStudent && (
          <StudentTestReportModal
            studentId={reportStudent.id}
            studentName={reportStudent.name}
            onClose={() => setReportStudent(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
