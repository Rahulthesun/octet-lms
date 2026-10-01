'use client'

// Admin > Tests > Report — result analytics for one test: a summary, a
// score-distribution graph, per-question correctness (MCQ), a batch-wise
// breakdown, and the full per-student table. Every figure comes from
// /api/tests/:id/analytics; the admin can switch each graph between bar,
// pie and line, and download the whole report as a PDF.

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  useTestAnalytics, downloadTestAnalyticsPdf,
  type TestSummary, type AnalyticsPoint,
} from '@/hooks/useTests'
import AttendanceChart, { type AttendanceChartType, type ChartDatum } from '@/components/shared/AttendanceChart'

const ACCENT = '#5B21B6'

function toChartData(points: AnalyticsPoint[], color?: string): ChartDatum[] {
  return points.map((p) => ({ label: p.label, value: p.value, color }))
}

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 p-4">
      <p className="text-2xl font-data text-zinc-900 leading-none mb-1.5">{value}</p>
      <p className="text-zinc-500 text-sm">{label}</p>
      {sub && <p className="text-zinc-400 text-xs mt-0.5">{sub}</p>}
    </div>
  )
}

export default function TestAnalyticsModal({ test, onClose }: {
  test: TestSummary
  onClose: () => void
}) {
  const [passPct, setPassPct] = useState(40)
  const { analytics, loading, error } = useTestAnalytics(test.id, passPct)

  const [distType, setDistType] = useState<AttendanceChartType>('bar')
  const [questionType, setQuestionType] = useState<AttendanceChartType>('bar')
  const [batchType, setBatchType] = useState<AttendanceChartType>('bar')

  const [downloading, setDownloading] = useState(false)
  const [downloadError, setDownloadError] = useState<string | null>(null)

  async function handleDownload() {
    setDownloading(true)
    setDownloadError(null)
    try {
      const filename = `${test.title.replace(/[^a-zA-Z0-9]+/g, '_')}_analytics.pdf`
      await downloadTestAnalyticsPdf(test.id, filename, passPct)
    } catch (e) {
      setDownloadError(e instanceof Error ? e.message : 'Download failed')
    } finally {
      setDownloading(false)
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
        className="bg-white w-full sm:max-w-4xl shadow-2xl rounded-t-2xl sm:rounded-2xl border border-zinc-200 overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-zinc-200 flex items-start justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <h3 className="text-lg font-semibold text-zinc-900 truncate">{test.title} — Report</h3>
            <p className="text-sm text-zinc-500 mt-0.5">Result analytics, built from every graded attempt.</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <label className="flex items-center gap-1.5 text-sm text-zinc-600">
              Pass mark
              <input
                type="number" min={0} max={100} value={passPct}
                onChange={(e) => setPassPct(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                className="w-16 text-sm rounded-md px-2 py-1 border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-violet-200"
              />
              %
            </label>
            <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 text-2xl leading-none" aria-label="Close">&times;</button>
          </div>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-6 space-y-8">
          {loading && <p className="text-sm text-zinc-500 py-8 text-center">Loading analytics...</p>}
          {error && <div className="text-sm px-4 py-3 rounded-lg bg-rose-50 text-rose-700 border border-rose-100">{error}</div>}

          {analytics && (
            <>
              <div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <StatCard label="Targeted students" value={String(analytics.summary.totalTargeted)} />
                  <StatCard
                    label="Attempted"
                    value={String(analytics.summary.attemptedCount)}
                    sub={`${analytics.summary.notAttemptedCount} not attempted`}
                  />
                  <StatCard
                    label="Average score"
                    value={analytics.summary.avgMarks !== null ? `${analytics.summary.avgMarks} / ${analytics.summary.maxMarks}` : '-'}
                    sub={analytics.summary.avgPct !== null ? `${analytics.summary.avgPct}%` : undefined}
                  />
                  <StatCard
                    label="Pass / fail"
                    value={`${analytics.summary.passCount} / ${analytics.summary.failCount}`}
                    sub={`at ${analytics.summary.passPct}% pass mark`}
                  />
                </div>
                {analytics.summary.evaluatedCount > 0 && (
                  <p className="text-sm text-zinc-500 mt-3">
                    Highest {analytics.summary.highest} - Lowest {analytics.summary.lowest} -{' '}
                    {analytics.summary.pendingEvaluationCount > 0 ? `${analytics.summary.pendingEvaluationCount} awaiting evaluation` : 'all attempts evaluated'}
                  </p>
                )}
              </div>

              <div className="border-t border-zinc-100 pt-6">
                <AttendanceChart
                  type={distType}
                  onTypeChange={setDistType}
                  barData={toChartData(analytics.scoreDistribution, ACCENT)}
                  pieData={toChartData(analytics.scoreDistribution, ACCENT)}
                  lineData={toChartData(analytics.scoreDistribution, ACCENT)}
                  defaultColor={ACCENT}
                  lineColor={ACCENT}
                  description="How many students fell into each score band."
                  barAxisLabels={{ x: 'Score band', y: 'Students' }}
                  emptyMessage="No evaluated attempts yet."
                />
              </div>

              {analytics.perQuestion.length > 0 && (
                <div className="border-t border-zinc-100 pt-6">
                  <AttendanceChart
                    type={questionType}
                    onTypeChange={setQuestionType}
                    barData={toChartData(analytics.perQuestion.map((q) => ({ label: q.label, value: q.correctPct })), '#059669')}
                    pieData={toChartData(analytics.perQuestion.map((q) => ({ label: q.label, value: q.correctCount })), '#059669')}
                    lineData={toChartData(analytics.perQuestion.map((q) => ({ label: q.label, value: q.correctPct })), '#059669')}
                    defaultColor="#059669"
                    lineColor="#059669"
                    valueSuffix="%"
                    description="Percentage of students who answered each question correctly."
                    barAxisLabels={{ x: 'Question', y: 'Correct %' }}
                    emptyMessage="No evaluated attempts yet."
                  />
                </div>
              )}

              {analytics.batchWise.length > 1 && (
                <div className="border-t border-zinc-100 pt-6">
                  <AttendanceChart
                    type={batchType}
                    onTypeChange={setBatchType}
                    barData={toChartData(analytics.batchWise.map((b) => ({ label: b.batchName, value: b.avgPct ?? 0 })), '#0284c7')}
                    pieData={toChartData(analytics.batchWise.map((b) => ({ label: b.batchName, value: b.evaluatedCount })), '#0284c7')}
                    lineData={toChartData(analytics.batchWise.map((b) => ({ label: b.batchName, value: b.avgPct ?? 0 })), '#0284c7')}
                    defaultColor="#0284c7"
                    lineColor="#0284c7"
                    valueSuffix="%"
                    description="Average score by batch (this test's audience spans more than one batch)."
                    barAxisLabels={{ x: 'Batch', y: 'Average %' }}
                    horizontalBars
                    emptyMessage="No evaluated attempts yet."
                  />
                </div>
              )}

              <div className="border-t border-zinc-100 pt-6">
                <p className="text-sm font-medium text-zinc-700 mb-3">Per-student results</p>
                <div className="border border-zinc-200 rounded-xl overflow-hidden">
                  <div className="hidden sm:grid sm:grid-cols-[1fr_100px_100px_90px_80px] gap-2 px-4 py-2.5 text-xs font-medium text-zinc-500 bg-zinc-50 border-b border-zinc-200">
                    <span>Student</span>
                    <span>Batch</span>
                    <span>Status</span>
                    <span className="text-right">Marks</span>
                    <span className="text-right">Result</span>
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-zinc-100">
                    {analytics.perStudent.map((s) => (
                      <div key={s.studentId} className="flex flex-wrap sm:grid sm:grid-cols-[1fr_100px_100px_90px_80px] gap-2 px-4 py-2.5 text-sm items-center">
                        <div className="min-w-0">
                          <p className="text-zinc-900 truncate">{s.name}</p>
                          <p className="text-zinc-400 text-xs">{s.admissionNumber || '-'}</p>
                        </div>
                        <span className="text-zinc-600 text-xs">{s.batchName || '-'}</span>
                        <span className="text-zinc-600 text-xs">
                          {s.status === 'evaluated' ? 'Evaluated' : s.status === 'not_started' ? 'Not attempted' : 'Awaiting evaluation'}
                        </span>
                        <span className="text-right text-zinc-700 font-inter">
                          {s.marksAwarded !== null ? `${s.marksAwarded}/${s.maxMarks}` : '-'}
                        </span>
                        <span className={`text-right text-xs font-medium ${
                          s.pass === null ? 'text-zinc-400' : s.pass ? 'text-emerald-600' : 'text-rose-600'
                        }`}>
                          {s.pass === null ? '-' : s.pass ? 'Pass' : 'Fail'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="px-6 py-4 border-t border-zinc-200 flex items-center justify-between gap-3 shrink-0">
          {downloadError && <p className="text-sm text-rose-600">{downloadError}</p>}
          <div className="flex gap-3 ml-auto">
            <button onClick={onClose} className="px-5 py-2.5 rounded-lg border border-zinc-300 text-zinc-600 text-[15px] hover:bg-zinc-50 transition-colors">
              Close
            </button>
            <button
              onClick={handleDownload}
              disabled={downloading || !analytics}
              className="px-5 py-2.5 rounded-lg text-white text-[15px] transition-colors disabled:opacity-40"
              style={{ backgroundColor: ACCENT }}
            >
              {downloading ? 'Preparing...' : 'Download as PDF'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
