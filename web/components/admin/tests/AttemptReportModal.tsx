'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { fetchAdminAttemptDetail, type AdminAttemptDetail, type TestSummary } from '@/hooks/useTests'

const ACCENT = '#5B21B6'

function formatDuration(seconds: number) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return mins > 0 ? `${mins} min ${secs} sec` : `${secs} sec`
}

function Stat({ label, value, tone }: { label: string; value: string | number; tone?: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 px-4 py-3">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className={`text-xl font-inter font-bold mt-0.5 ${tone || 'text-zinc-900'}`}>{value}</p>
    </div>
  )
}

/**
 * Report for ONE student on ONE test (score, accuracy, time, question-wise
 * result). The student's all-tests consolidated report lives under
 * Students > Test Report; per-question answers are in AttemptDetailModal.
 */
export default function AttemptReportModal({ test, attemptId, rank, totalAttempted, onClose }: {
  test: TestSummary
  attemptId: string
  rank: number | null
  totalAttempted: number
  onClose: () => void
}) {
  const [detail, setDetail] = useState<AdminAttemptDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    fetchAdminAttemptDetail(test.id, attemptId)
      .then(setDetail)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load report'))
      .finally(() => setLoading(false))
  }, [test.id, attemptId])

  const questions = detail?.questions || []
  const correct = questions.filter((q) => q.isCorrect).length
  const unanswered = questions.filter((q) => !q.selectedOption).length
  const wrong = questions.length - correct - unanswered
  const pct = detail && detail.marksAwarded !== null && detail.maxMarks ? Math.round((detail.marksAwarded / detail.maxMarks) * 100) : null
  const timeTaken = detail?.startedAt && detail?.submittedAt
    ? Math.max(0, Math.round((new Date(detail.submittedAt).getTime() - new Date(detail.startedAt).getTime()) / 1000))
    : null

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <motion.div initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 24, opacity: 0 }}
        className="bg-white w-full sm:w-[92vw] sm:max-w-xl shadow-2xl rounded-t-2xl sm:rounded-2xl border border-zinc-200 overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}>
        <div className="px-8 py-5 border-b border-zinc-200 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-lg font-semibold text-zinc-900">{detail?.student.name || 'Loading…'}</h3>
            <p className="text-sm text-zinc-500 mt-0.5">{test.title} · Test report</p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 text-2xl leading-none">&times;</button>
        </div>

        <div className="overflow-y-auto flex-1 px-8 py-6 space-y-5">
          {loading && <p className="text-sm text-zinc-500">Loading report…</p>}
          {error && <div className="text-sm px-4 py-3 rounded-lg bg-rose-50 text-rose-700 border border-rose-100">{error}</div>}

          {detail && (
            <>
              <div className="rounded-xl px-5 py-4 flex items-center justify-between" style={{ backgroundColor: '#F5F3FF' }}>
                <span className="text-sm text-zinc-600">Score</span>
                <span className="text-xl font-inter font-bold" style={{ color: ACCENT }}>
                  {detail.marksAwarded !== null ? `${detail.marksAwarded} / ${detail.maxMarks}` : 'Not graded'}{pct !== null && ` (${pct}%)`}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Stat label="Rank in this test" value={rank ? `${rank} of ${totalAttempted}` : '—'} />
                <Stat label="Time taken" value={timeTaken !== null ? formatDuration(timeTaken) : '—'} />
                {test.type === 'mcq' && questions.length > 0 && (
                  <>
                    <Stat label="Correct" value={correct} tone="text-emerald-600" />
                    <Stat label="Wrong" value={wrong} tone="text-rose-600" />
                    <Stat label="Unanswered" value={unanswered} tone="text-zinc-500" />
                    <Stat label="Accuracy" value={`${Math.round((correct / questions.length) * 100)}%`} />
                  </>
                )}
              </div>

              {detail.autoSubmitted && <p className="text-xs text-amber-700">This attempt was auto-submitted when time ran out.</p>}

              {test.type === 'mcq' && questions.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-zinc-700 mb-2">Question-wise result</p>
                  <div className="flex flex-wrap gap-1.5">
                    {questions.map((q, i) => (
                      <span key={q.id} title={q.isCorrect ? 'Correct' : q.selectedOption ? 'Wrong' : 'Unanswered'}
                        className={`w-8 h-8 rounded-md text-xs font-medium flex items-center justify-center ${
                          q.isCorrect ? 'bg-emerald-100 text-emerald-700' : q.selectedOption ? 'bg-rose-100 text-rose-700' : 'bg-zinc-100 text-zinc-500'
                        }`}>
                        {i + 1}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {detail.evaluatorFeedback && (
                <div>
                  <p className="text-sm font-medium text-zinc-700 mb-1">Evaluator feedback</p>
                  <p className="text-sm text-zinc-700 whitespace-pre-wrap">{detail.evaluatorFeedback}</p>
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
