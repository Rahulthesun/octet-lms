'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { fetchAdminAttemptDetail, gradeDescriptiveAttempt, type AdminAttemptDetail, type TestSummary } from '@/hooks/useTests'
import { CheckCircleIcon, XIcon } from './icons'

const ACCENT = '#5B21B6'

export default function AttemptDetailModal({ test, attemptId, onClose, onGraded }: {
  test: TestSummary
  attemptId: string
  onClose: () => void
  onGraded: () => void
}) {
  const [detail, setDetail] = useState<AdminAttemptDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [marksInput, setMarksInput] = useState('')
  const [feedback, setFeedback] = useState('')
  const [grading, setGrading] = useState(false)

  useEffect(() => {
    setLoading(true)
    fetchAdminAttemptDetail(test.id, attemptId)
      .then((d) => {
        setDetail(d)
        if (d.marksAwarded !== null) setMarksInput(String(d.marksAwarded))
        if (d.evaluatorFeedback) setFeedback(d.evaluatorFeedback)
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load attempt'))
      .finally(() => setLoading(false))
  }, [test.id, attemptId])

  async function submitGrade() {
    const marks = Number(marksInput)
    if (!Number.isFinite(marks) || marks < 0 || marks > test.maxMarks) return
    setGrading(true)
    setError(null)
    try {
      await gradeDescriptiveAttempt(test.id, attemptId, marks, feedback)
      onGraded()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save grade')
    } finally {
      setGrading(false)
    }
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <motion.div initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 24, opacity: 0 }}
        className="bg-white w-full sm:max-w-2xl shadow-2xl rounded-t-2xl sm:rounded-2xl border border-zinc-200 overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}>
        <div className="px-8 py-5 border-b border-zinc-200 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-lg font-semibold text-zinc-900">{detail?.student.name || 'Loading…'}</h3>
            <p className="text-sm text-zinc-500 mt-0.5">{test.title}</p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 text-2xl leading-none">&times;</button>
        </div>

        <div className="overflow-y-auto flex-1 px-8 py-6 space-y-5">
          {loading && <p className="text-sm text-zinc-500">Loading attempt…</p>}
          {error && <div className="text-sm px-4 py-3 rounded-lg bg-rose-50 text-rose-700 border border-rose-100">{error}</div>}

          {detail && (
            <>
              <div className="flex items-center gap-4 text-sm text-zinc-500">
                {detail.student.admissionNumber && <span>Roll: <span className="font-inter text-zinc-700">{detail.student.admissionNumber}</span></span>}
                {detail.student.batch && <span>Batch: <span className="text-zinc-700">{detail.student.batch}</span></span>}
                <span>Status: <span className="text-zinc-700 capitalize">{detail.status.replace('_', ' ')}</span></span>
              </div>

              {detail.marksAwarded !== null && (
                <div className="rounded-xl px-5 py-4 flex items-center justify-between" style={{ backgroundColor: '#F5F3FF' }}>
                  <span className="text-sm text-zinc-600">Score</span>
                  <span className="text-xl font-inter font-bold" style={{ color: ACCENT }}>
                    {detail.marksAwarded} / {detail.maxMarks}
                  </span>
                </div>
              )}

              {test.type === 'mcq' && detail.questions && (
                <div className="space-y-3">
                  {detail.questions.map((q, i) => (
                    <div key={q.id} className="rounded-lg border border-zinc-200 p-4">
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <p className="text-[15px] text-zinc-900"><span className="text-zinc-400 mr-1">Q{i + 1}.</span>{q.questionText}</p>
                        {q.isCorrect ? (
                          <span className="shrink-0 flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-700"><CheckCircleIcon className="w-3.5 h-3.5" /> {q.marksAwarded}/{q.marks}</span>
                        ) : (
                          <span className="shrink-0 flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-rose-50 text-rose-700"><XIcon className="w-3.5 h-3.5" /> 0/{q.marks}</span>
                        )}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        {(['a', 'b', 'c', 'd'] as const).map((key) => {
                          const text = { a: q.optionA, b: q.optionB, c: q.optionC, d: q.optionD }[key]
                          const isCorrect = q.correctOption === key
                          const isSelected = q.selectedOption === key
                          return (
                            <div key={key}
                              className={`px-3 py-1.5 rounded-md border ${
                                isCorrect ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                                : isSelected ? 'border-rose-300 bg-rose-50 text-rose-800'
                                : 'border-zinc-200 text-zinc-600'
                              }`}>
                              <span className="font-semibold mr-1">{key.toUpperCase()}.</span>{text}
                              {isSelected && !isCorrect && <span className="ml-1.5 text-xs">(student's answer)</span>}
                              {isCorrect && <span className="ml-1.5 text-xs">(correct)</span>}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {test.type === 'descriptive' && detail.descriptive && (
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium text-zinc-700 mb-1.5">Question</p>
                    {detail.descriptive.questionText && <p className="text-[15px] text-zinc-800 whitespace-pre-wrap">{detail.descriptive.questionText}</p>}
                    {detail.descriptive.questionFileUrl && (
                      <a href={detail.descriptive.questionFileUrl} target="_blank" rel="noreferrer" className="text-sm underline" style={{ color: ACCENT }}>
                        View question paper
                      </a>
                    )}
                  </div>

                  <div>
                    <p className="text-sm font-medium text-zinc-700 mb-1.5">Student's answer</p>
                    {detail.descriptive.answerText && <p className="text-[15px] text-zinc-800 whitespace-pre-wrap rounded-lg border border-zinc-200 p-4 bg-zinc-50">{detail.descriptive.answerText}</p>}
                    {detail.descriptive.answerFileUrl && (
                      <a href={detail.descriptive.answerFileUrl} target="_blank" rel="noreferrer" className="text-sm underline block mt-1.5" style={{ color: ACCENT }}>
                        View uploaded answer ({detail.descriptive.answerFileName})
                      </a>
                    )}
                    {!detail.descriptive.answerText && !detail.descriptive.answerFileUrl && (
                      <p className="text-sm text-zinc-400 italic">No answer submitted yet.</p>
                    )}
                  </div>

                  {detail.descriptive.answerKeyFileUrl && (
                    <a href={detail.descriptive.answerKeyFileUrl} target="_blank" rel="noreferrer" className="text-sm underline block" style={{ color: ACCENT }}>
                      View answer key
                    </a>
                  )}

                  <div className="pt-3 border-t border-zinc-100 space-y-3">
                    <p className="text-sm font-medium text-zinc-700">Grade this answer</p>
                    <div className="flex items-center gap-3">
                      <input type="number" min={0} max={test.maxMarks} value={marksInput}
                        onChange={(e) => setMarksInput(e.target.value)}
                        placeholder="Marks" className="w-28 text-[15px] rounded-lg px-3 py-2.5 border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400" />
                      <span className="text-sm text-zinc-500">out of {test.maxMarks}</span>
                    </div>
                    <textarea value={feedback} onChange={(e) => setFeedback(e.target.value)} rows={3}
                      placeholder="Feedback for the student (optional)"
                      className="w-full text-[15px] rounded-lg px-4 py-3 border border-zinc-300 resize-none focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400" />
                    <button onClick={submitGrade} disabled={grading || marksInput === ''}
                      className="px-5 py-2.5 rounded-lg text-white text-[15px] transition-colors disabled:opacity-40"
                      style={{ backgroundColor: ACCENT }}>
                      {grading ? 'Saving…' : detail.status === 'evaluated' ? 'Update Grade' : 'Submit Grade'}
                    </button>
                    <p className="text-xs text-zinc-400">Saving sends the result immediately to the student, father, and mother by email.</p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
