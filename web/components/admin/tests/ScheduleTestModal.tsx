'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useSubjects } from '@/hooks/useOnlineClasses'
import { useBatches } from '@/hooks/useAttendanceData'
import type { CreateTestInput, TestQuestionInput, TestType, OptionKey } from '@/hooks/useTests'
import { PlusIcon, TrashIcon } from './icons'

const ACCENT = '#5B21B6'
const inputCls = 'w-full text-[15px] rounded-lg px-4 py-3 border border-zinc-300 bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400'
const labelCls = 'block text-sm font-medium text-zinc-700 mb-2'

function blankQuestion(): TestQuestionInput {
  return { questionText: '', optionA: '', optionB: '', optionC: '', optionD: '', correctOption: 'a', marks: 1 }
}

export default function ScheduleTestModal({ onClose, onCreate }: {
  onClose: () => void
  onCreate: (input: CreateTestInput) => Promise<void>
}) {
  const { subjects } = useSubjects()
  const { batches } = useBatches('all')

  const [title, setTitle] = useState('')
  const [type, setType] = useState<TestType>('mcq')
  const [subjectId, setSubjectId] = useState('')
  const [batchId, setBatchId] = useState('')
  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [instructions, setInstructions] = useState('')
  const [maxMarks, setMaxMarks] = useState('100')
  const [questionText, setQuestionText] = useState('')
  const [questions, setQuestions] = useState<TestQuestionInput[]>([blankQuestion()])

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function updateQuestion(i: number, patch: Partial<TestQuestionInput>) {
    setQuestions((prev) => prev.map((q, idx) => (idx === i ? { ...q, ...patch } : q)))
  }
  function addQuestion() {
    setQuestions((prev) => [...prev, blankQuestion()])
  }
  function removeQuestion(i: number) {
    setQuestions((prev) => (prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev))
  }

  const totalMcqMarks = questions.reduce((s, q) => s + (Number(q.marks) || 1), 0)

  const scheduledStart = date && startTime ? new Date(`${date}T${startTime}`).toISOString() : ''
  const scheduledEnd = date && endTime ? new Date(`${date}T${endTime}`).toISOString() : ''

  const canSubmit =
    title.trim() && batchId && date && startTime && endTime && scheduledEnd > scheduledStart &&
    (type === 'descriptive' || questions.every((q) => q.questionText.trim() && q.optionA.trim() && q.optionB.trim() && q.optionC.trim() && q.optionD.trim()))

  async function handleSubmit() {
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    try {
      const input: CreateTestInput = {
        title: title.trim(),
        type,
        subjectId: subjectId || undefined,
        batchId,
        scheduledStart,
        scheduledEnd,
        instructions: instructions.trim() || undefined,
      }
      if (type === 'mcq') {
        input.questions = questions.map((q) => ({ ...q, marks: Number(q.marks) || 1 }))
      } else {
        input.maxMarks = Number(maxMarks) || 0
        input.questionText = questionText.trim() || undefined
      }
      await onCreate(input)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create the test')
    } finally {
      setSubmitting(false)
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
        className="bg-white w-full sm:max-w-3xl shadow-2xl rounded-t-2xl sm:rounded-2xl border border-zinc-200 overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-8 py-5 border-b border-zinc-200 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-lg font-semibold text-zinc-900">Schedule New Test</h3>
            <p className="text-sm text-zinc-500 mt-0.5">MCQ tests auto-grade instantly; descriptive tests are graded manually.</p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 text-2xl leading-none">&times;</button>
        </div>

        <div className="overflow-y-auto flex-1 px-8 py-6 space-y-6">
          {error && <div className="text-sm px-4 py-3 rounded-lg bg-rose-50 text-rose-700 border border-rose-100">{error}</div>}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className={labelCls}>Test Title</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Unit Test 3 — Thermodynamics" className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Type</label>
              <select value={type} onChange={(e) => setType(e.target.value as TestType)} className={inputCls}>
                <option value="mcq">MCQ (auto-graded)</option>
                <option value="descriptive">Descriptive (manually graded)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className={labelCls}>Subject</label>
              <select value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className={inputCls}>
                <option value="">Select subject (optional)…</option>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Batch</label>
              <select value={batchId} onChange={(e) => setBatchId(e.target.value)} className={inputCls}>
                <option value="">Select a batch…</option>
                {batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div>
              <label className={labelCls}>Date</label>
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Start time</label>
              <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>End time</label>
              <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className={inputCls} />
            </div>
          </div>
          {date && startTime && endTime && scheduledEnd <= scheduledStart && (
            <p className="text-sm text-rose-600 -mt-3">End time must be after start time.</p>
          )}

          <div>
            <label className={labelCls}>Instructions (shown to students before they start)</label>
            <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={2}
              placeholder="Optional" className={`${inputCls} resize-none`} />
          </div>

          {type === 'descriptive' ? (
            <div className="pt-2 border-t border-zinc-100 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className={labelCls}>Max Marks</label>
                  <input type="number" min={0} value={maxMarks} onChange={(e) => setMaxMarks(e.target.value)} className={inputCls} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Typed question (optional — you can also upload a question paper after creating the test)</label>
                <textarea value={questionText} onChange={(e) => setQuestionText(e.target.value)} rows={4}
                  placeholder="Type the question here, or leave blank and upload a question paper file after scheduling"
                  className={`${inputCls} resize-none`} />
              </div>
              <p className="text-sm text-zinc-500">
                After scheduling, use the test card's <span className="font-medium text-zinc-700">Upload Question Paper</span> and
                {' '}<span className="font-medium text-zinc-700">Upload Answer Key</span> buttons to attach files.
              </p>
            </div>
          ) : (
            <div className="pt-2 border-t border-zinc-100 space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-zinc-700">Questions</label>
                <span className="text-sm text-zinc-500">Total marks: <span className="font-inter font-semibold">{totalMcqMarks}</span></span>
              </div>

              <div className="space-y-4">
                {questions.map((q, i) => (
                  <div key={i} className="rounded-xl border border-zinc-200 p-4 space-y-3 bg-zinc-50/60">
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-sm font-semibold text-zinc-500 shrink-0 mt-3">Q{i + 1}</span>
                      <textarea value={q.questionText} onChange={(e) => updateQuestion(i, { questionText: e.target.value })}
                        rows={2} placeholder="Type the question"
                        className={`${inputCls} resize-none bg-white`} />
                      {questions.length > 1 && (
                        <button onClick={() => removeQuestion(i)} className="shrink-0 mt-3 text-zinc-400 hover:text-rose-600 transition-colors" title="Remove question">
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pl-8">
                      {(['a', 'b', 'c', 'd'] as OptionKey[]).map((key) => {
                        const field = `option${key.toUpperCase()}` as 'optionA' | 'optionB' | 'optionC' | 'optionD'
                        return (
                          <label key={key} className="flex items-center gap-2">
                            <input type="radio" name={`correct-${i}`} checked={q.correctOption === key}
                              onChange={() => updateQuestion(i, { correctOption: key })}
                              className="accent-violet-600 w-4 h-4 shrink-0" />
                            <span className="text-sm font-semibold text-zinc-500 w-4 shrink-0">{key.toUpperCase()}</span>
                            <input type="text" value={q[field]} onChange={(e) => updateQuestion(i, { [field]: e.target.value } as Partial<TestQuestionInput>)}
                              placeholder={`Option ${key.toUpperCase()}`}
                              className="flex-1 text-[14px] rounded-md px-3 py-2 border border-zinc-300 bg-white focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400" />
                          </label>
                        )
                      })}
                    </div>
                    <div className="pl-8 flex items-center gap-2">
                      <span className="text-sm text-zinc-500">Marks</span>
                      <input type="number" min={1} value={q.marks} onChange={(e) => updateQuestion(i, { marks: Number(e.target.value) || 1 })}
                        className="w-20 text-[14px] rounded-md px-2.5 py-1.5 border border-zinc-300 bg-white focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400" />
                      <span className="text-sm text-zinc-400">Select the radio button next to the correct option</span>
                    </div>
                  </div>
                ))}
              </div>

              <button onClick={addQuestion} type="button"
                className="flex items-center gap-1.5 text-sm font-medium px-3.5 py-2 rounded-lg border border-dashed border-violet-300 text-violet-700 hover:bg-violet-50 transition-colors">
                <PlusIcon className="w-4 h-4" /> Add Question
              </button>
            </div>
          )}
        </div>

        <div className="px-8 py-5 border-t border-zinc-200 flex justify-end gap-3 shrink-0">
          <button onClick={onClose} className="px-5 py-2.5 rounded-lg border border-zinc-300 text-zinc-600 text-[15px] hover:bg-zinc-50 transition-colors">
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={!canSubmit || submitting}
            className="px-5 py-2.5 rounded-lg text-white text-[15px] transition-colors disabled:opacity-40"
            style={{ backgroundColor: ACCENT }}>
            {submitting ? 'Scheduling…' : 'Schedule Test'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
