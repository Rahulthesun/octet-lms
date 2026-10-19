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
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useStudents } from '@/hooks/admin/useStudents'
import { useStudentTestReport, downloadStudentTestReportPdf } from '@/hooks/useTests'
import AttendanceChart, { type AttendanceChartType, type ChartDatum } from '@/components/shared/AttendanceChart'

const ACCENT = '#5B21B6'

// Score-band color coding, consistent with the app's existing Present
// (green) / Partial (orange) / Absent (red) attendance palette
// (ATTENDANCE_STATUS_COLORS in AttendanceChart.tsx) — reused here for the
// same visual language on test scores.
const SCORE_BAND_COLORS = {
  low: '#d03b3b', // 0-34%
  mid: '#fab219', // 35-79%
  high: '#0ca30c', // 80-100%
} as const

/** 0-34 -> red, 35-79 -> orange, 80-100 -> green. Shared by bar + pie score charts. */
function scoreBandColor(pct: number): string {
  if (pct < 35) return SCORE_BAND_COLORS.low
  if (pct < 80) return SCORE_BAND_COLORS.mid
  return SCORE_BAND_COLORS.high
}

// Visual-only marker magnitude for an absent date's downward bar — doesn't
// mean anything numerically, just needs to render a visible short bar below
// the zero-axis.
const ABSENT_MARKER_VALUE = -10
const ABSENT_MARKER_COLOR = '#000000'

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
  const [chartType, setChartType] = useState<AttendanceChartType>('line')
  const [downloading, setDownloading] = useState(false)
  const { report, loading, error } = useStudentTestReport(studentId, month)

  async function downloadPdf() {
    setDownloading(true)
    try {
      const name = `test_report_${studentName.replace(/\s+/g, '_')}_${month}.pdf`
      await downloadStudentTestReportPdf(studentId, month, name)
    } catch (e) {
      console.error(e)
    } finally {
      setDownloading(false)
    }
  }

  // Per-date score data, shared by the bar/pie/line chart variants. Each
  // evaluated attempt becomes a 0-100% datum colored by score band; each
  // absent date becomes a black downward marker (bar/line only — a pie
  // chart has no "below axis" concept, so absences are left out of it).
  const scorePoints: ChartDatum[] = useMemo(() => {
    if (!report) return []
    return report.points.map((p) => {
      const pct = p.maxMarks > 0 ? Math.round((p.marksAwarded / p.maxMarks) * 100) : 0
      const day = Number(p.date.slice(-2))
      return {
        label: String(day),
        value: pct,
        color: scoreBandColor(pct),
        tooltipLabel: `${p.marksAwarded}/${p.maxMarks} — ${pct}% (${p.testTitle})`,
      }
    })
  }, [report])

  const absentPoints: ChartDatum[] = useMemo(() => {
    if (!report) return []
    return report.absentDates.map((day) => ({
      label: String(day),
      value: ABSENT_MARKER_VALUE,
      color: ABSENT_MARKER_COLOR,
      tooltipLabel: `Absent (test scheduled, not attempted)`,
    }))
  }, [report])

  const lineData = scorePoints
  const barData = useMemo(
    () => [...scorePoints, ...absentPoints].sort((a, b) => Number(a.label) - Number(b.label)),
    [scorePoints, absentPoints],
  )
  const pieData = scorePoints

  // Rendered through a portal straight to <body> — a modal this deep in the
  // admin layout tree otherwise inherits whatever positioning context its
  // ancestors create (e.g. the scrollable <main> wrapper), which made this
  // dialog center/size inconsistently across different screen widths. A
  // portal guarantees it's always truly fixed to the full viewport. Width is
  // capped as a percentage of the viewport (not a flat pixel max-width) so
  // it can never overflow a narrower laptop screen.
  return createPortal(
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 24, opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="bg-white w-full sm:w-[92vw] sm:max-w-5xl shadow-2xl rounded-t-xl sm:rounded-xl border border-zinc-200 overflow-hidden max-h-[92vh] sm:max-h-[88vh] flex flex-col"
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
              <AttendanceChart
                type={chartType}
                onTypeChange={setChartType}
                barData={barData}
                pieData={pieData}
                lineData={lineData}
                lineColor={ACCENT}
                valueSuffix="%"
                barAxisLabels={{ x: 'Date of month', y: 'Score %' }}
                lineAxisLabels={{ x: 'Date of month', y: 'Score %' }}
                showMaxLine
                emptyMessage="No evaluated test attempts for this student in this month."
                description="Each evaluated test attempt's score for this student this month, normalized to a 0–100% scale. Black bars below the axis = absent (a test was scheduled but not attempted). Dates with neither are skipped."
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

        <div className="px-6 py-4 border-t border-zinc-200 bg-zinc-50 shrink-0">
          <button
            onClick={downloadPdf}
            disabled={!report || downloading}
            className="w-full py-2.5 text-sm font-medium text-white rounded-md disabled:opacity-40 transition-colors"
            style={{ backgroundColor: ACCENT }}
          >
            {downloading ? 'Preparing…' : 'Download PDF'}
          </button>
        </div>
      </motion.div>
    </motion.div>,
    document.body
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
