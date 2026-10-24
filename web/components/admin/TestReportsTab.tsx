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

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useStudents } from '@/hooks/admin/useStudents'
import { useStudentTestReport, downloadStudentTestReportPdf } from '@/hooks/useTests'
import AttendanceChart, { type AttendanceChartType, type ChartDatum } from '@/components/shared/AttendanceChart'
import Pagination, { usePagination } from '@/components/ui/Pagination'

const ACCENT = '#5B21B6'

// Score-band color coding: Emerald (high), Amber (mid), Red (low),
// Jet Black (absent downward bar below zero line).
const SCORE_BAND_COLORS = {
  low: '#dc2626', // 0-39%
  mid: '#d97706', // 40-74%
  high: '#059669', // 75-100%
} as const

/** < 40 -> red, 40-74 -> amber, >= 75 -> emerald. Shared by bar + pie score charts. */
function scoreBandColor(pct: number): string {
  if (pct < 40) return SCORE_BAND_COLORS.low
  if (pct < 75) return SCORE_BAND_COLORS.mid
  return SCORE_BAND_COLORS.high
}

// Visual-only marker magnitude for an absent date's downward bar — renders
// a distinct jet black bar below the 0-line axis.
const ABSENT_MARKER_VALUE = -10
const ABSENT_MARKER_COLOR = '#18181b'

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

export function StudentTestReportModal({ studentId, studentName, onClose }: {
  studentId: string
  studentName: string
  onClose: () => void
}) {
  const [month, setMonth] = useState(currentMonthStr())
  const [chartType, setChartType] = useState<AttendanceChartType>('bar')
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
  // Pie: one slice per evaluated test (labelled by the test, not a bare day
  // number), each in its own color — the shared chart assigns the palette.
  const pieData: ChartDatum[] = useMemo(() => {
    if (!report) return []
    return report.points.map((p) => ({
      label: p.testTitle,
      value: p.maxMarks > 0 ? Math.round((p.marksAwarded / p.maxMarks) * 100) : 0,
      tooltipLabel: `${p.marksAwarded}/${p.maxMarks} — ${p.maxMarks > 0 ? Math.round((p.marksAwarded / p.maxMarks) * 100) : 0}%`,
    }))
  }, [report])

  // Headline numbers shown above the graph.
  const summary = useMemo(() => {
    const pcts = scorePoints.map((d) => d.value)
    if (pcts.length === 0) return null
    return {
      tests: pcts.length,
      avg: Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length),
      best: Math.max(...pcts),
      lowest: Math.min(...pcts),
      absent: report?.absentDates.length ?? 0,
    }
  }, [scorePoints, report])

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
              {summary && (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
                  {[
                    { label: 'Tests evaluated', value: String(summary.tests), color: '#18181b' },
                    { label: 'Average score', value: `${summary.avg}%`, color: scoreBandColor(summary.avg) },
                    { label: 'Best score', value: `${summary.best}%`, color: scoreBandColor(summary.best) },
                    { label: 'Lowest score', value: `${summary.lowest}%`, color: scoreBandColor(summary.lowest) },
                    { label: 'Absent', value: String(summary.absent), color: summary.absent > 0 ? '#18181b' : '#a1a1aa' },
                  ].map((c) => (
                    <div key={c.label} className="rounded-xl border border-zinc-200 px-3.5 py-3">
                      <p className="text-xl font-data leading-none" style={{ color: c.color }}>{c.value}</p>
                      <p className="text-xs text-zinc-500 mt-1.5">{c.label}</p>
                    </div>
                  ))}
                </div>
              )}

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
                height={300}
                emptyMessage="No evaluated test attempts for this student in this month."
                description="Each evaluated test attempt's score for this student this month, normalized to a 0–100% scale. Black bars below the axis = absent (a test was scheduled but not attempted). Dates with neither are skipped."
              />

              <div className={`flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-xs text-zinc-500 ${chartType === 'pie' ? 'hidden' : 'flex'}`}>
                {[
                  { c: SCORE_BAND_COLORS.high, t: '75–100% strong' },
                  { c: SCORE_BAND_COLORS.mid, t: '40–74% average' },
                  { c: SCORE_BAND_COLORS.low, t: 'below 40% needs work' },
                  { c: ABSENT_MARKER_COLOR, t: 'absent' },
                ].map((b) => (
                  <span key={b.t} className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: b.c }} />{b.t}
                  </span>
                ))}
              </div>

              <div className="mt-4 border border-zinc-200 rounded-lg overflow-x-auto">
                <div className="grid min-w-[440px] grid-cols-[1fr_1fr_80px] px-3 py-2 bg-zinc-50 border-b border-zinc-200 text-[10px] uppercase tracking-wide text-zinc-400">
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
                      <div key={i} className="grid min-w-[440px] grid-cols-[1fr_1fr_80px] px-3 py-2 text-sm items-center">
                        <span className="text-zinc-700">{p.date}</span>
                        <span className="text-zinc-500 truncate">{p.testTitle}</span>
                        <span className="text-right font-inter tabular-nums" style={{ color: scoreBandColor(pct) }}>
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
  const paging = usePagination(filtered)
  const resetPage = paging.setPage
  useEffect(() => { resetPage(1) }, [search, resetPage])

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

      <div className="border border-zinc-200 rounded-lg overflow-x-auto bg-white">
        {loadingStudents ? (
          <div className="py-12 text-center text-sm text-zinc-400">Loading students…</div>
        ) : error ? (
          <div className="py-12 text-center text-sm text-red-600">{error}</div>
        ) : filtered.length === 0 ? (
          <div className="py-12 text-center text-sm text-zinc-400">No students found.</div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {paging.pageItems.map((s) => (
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
        {!loadingStudents && !error && (
          <Pagination
            page={paging.page} pageCount={paging.pageCount} pageSize={paging.pageSize} total={paging.total}
            onPageChange={paging.setPage} onPageSizeChange={paging.setPageSize} label="students"
          />
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
