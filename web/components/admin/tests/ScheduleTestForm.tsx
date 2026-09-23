'use client'

// The "Schedule New Test" form, as a full page (see app/admin/tests/new).
// Sections: test details, schedule, questions. MCQ questions are image-first
// (paste a screenshot per question and per option) with a text fallback, and
// can be imported from the question bank.

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useSubjects } from '@/hooks/useOnlineClasses'
import { useBatches } from '@/hooks/useAttendanceData'
import { useAdminTests } from '@/hooks/useTests'
import type { CreateTestInput, TestQuestionInput, TestType, OptionKey, QuestionField } from '@/hooks/useTests'
import { PlusIcon, TrashIcon } from './icons'
import QuestionFieldInput, { type FieldValue } from './QuestionFieldInput'
import QuestionBankModal from './QuestionBankModal'

const ACCENT = '#5B21B6'
const inputCls = 'w-full text-[15px] rounded-lg px-4 py-3 border border-zinc-300 bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400'
const labelCls = 'block text-sm font-medium text-zinc-700 mb-2'

// Image is the default for the question and for every option.
function blankQuestion(): TestQuestionInput {
  return {
    questionType: 'image', questionText: '', questionImageKey: null, questionImageUrl: null,
    optionAType: 'image', optionA: '', optionAImageKey: null, optionAImageUrl: null,
    optionBType: 'image', optionB: '', optionBImageKey: null, optionBImageUrl: null,
    optionCType: 'image', optionC: '', optionCImageKey: null, optionCImageUrl: null,
    optionDType: 'image', optionD: '', optionDImageKey: null, optionDImageUrl: null,
    correctOption: 'a',
    marks: 1,
  }
}

const QUESTION_FIELDS: { field: QuestionField; label: string }[] = [
  { field: 'question', label: 'Question' },
  { field: 'optionA', label: 'Option A' },
  { field: 'optionB', label: 'Option B' },
  { field: 'optionC', label: 'Option C' },
  { field: 'optionD', label: 'Option D' },
]

const textKeyOf = (f: QuestionField) => (f === 'question' ? 'questionText' : f)

function getField(q: TestQuestionInput, f: QuestionField): FieldValue {
  const r = q as unknown as Record<string, string | null | undefined>
  return {
    type: r[`${f}Type`] === 'image' ? 'image' : 'text',
    text: r[textKeyOf(f)] ?? '',
    imageKey: r[`${f}ImageKey`] ?? null,
    imageUrl: r[`${f}ImageUrl`] ?? null,
  }
}

function withField(q: TestQuestionInput, f: QuestionField, v: FieldValue): TestQuestionInput {
  return {
    ...q,
    [`${f}Type`]: v.type,
    [textKeyOf(f)]: v.text,
    [`${f}ImageKey`]: v.imageKey,
    [`${f}ImageUrl`]: v.imageUrl,
  } as TestQuestionInput
}

// A field has content when it has an image (image mode) or text (text mode).
function fieldFilled(q: TestQuestionInput, f: QuestionField) {
  const v = getField(q, f)
  return v.type === 'image' ? !!v.imageKey : v.text.trim().length > 0
}

const isBlankQuestion = (q: TestQuestionInput) => QUESTION_FIELDS.every(({ field }) => !fieldFilled(q, field))

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="bg-white rounded-2xl border border-zinc-200 p-6 sm:p-8">
      <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>
      {hint && <p className="text-sm text-zinc-500 mt-1">{hint}</p>}
      <div className="mt-6 space-y-6">{children}</div>
    </section>
  )
}

export default function ScheduleTestForm() {
  const router = useRouter()
  const { subjects } = useSubjects()
  const { batches } = useBatches('all')
  const { createTest } = useAdminTests()

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
  const [showBank, setShowBank] = useState(false)

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const updateQuestion = (i: number, patch: Partial<TestQuestionInput>) =>
    setQuestions((prev) => prev.map((q, idx) => (idx === i ? { ...q, ...patch } : q)))
  const setQuestionField = (i: number, f: QuestionField, v: FieldValue) =>
    setQuestions((prev) => prev.map((q, idx) => (idx === i ? withField(q, f, v) : q)))
  const addQuestion = () => setQuestions((prev) => [...prev, blankQuestion()])
  const removeQuestion = (i: number) => setQuestions((prev) => prev.filter((_, idx) => idx !== i))

  // Imported questions are independent copies appended to this test; an
  // untouched blank starter question is dropped so it does not linger.
  const importQuestions = (imported: TestQuestionInput[]) =>
    setQuestions((prev) => [...prev.filter((q) => !isBlankQuestion(q)), ...imported])

  const totalMcqMarks = questions.reduce((s, q) => s + (Number(q.marks) || 1), 0)

  const scheduledStart = date && startTime ? new Date(`${date}T${startTime}`).toISOString() : ''
  const scheduledEnd = date && endTime ? new Date(`${date}T${endTime}`).toISOString() : ''

  // What is still missing, shown next to the Schedule button so it is never a mystery why it is disabled.
  const problems = useMemo(() => {
    const p: string[] = []
    if (!title.trim()) p.push('Add a test title')
    if (!batchId) p.push('Choose a batch or All Students')
    if (!date || !startTime || !endTime) p.push('Set the date, start and end time')
    else if (scheduledEnd <= scheduledStart) p.push('End time must be after start time')
    if (type === 'mcq') {
      if (questions.length === 0) p.push('Add at least one question')
      questions.forEach((q, i) => {
        const missing = QUESTION_FIELDS.filter(({ field }) => !fieldFilled(q, field)).map((f) => f.label)
        if (missing.length) p.push(`Question ${i + 1} needs: ${missing.join(', ')}`)
      })
    }
    return p
  }, [title, batchId, date, startTime, endTime, scheduledStart, scheduledEnd, type, questions])

  async function handleSubmit() {
    if (problems.length > 0) return
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
        // Local/signed preview URLs are display-only; the server stores the image keys.
        input.questions = questions.map((q) => {
          const {
            questionImageUrl, optionAImageUrl, optionBImageUrl, optionCImageUrl, optionDImageUrl,
            ...rest
          } = q
          void questionImageUrl; void optionAImageUrl; void optionBImageUrl; void optionCImageUrl; void optionDImageUrl
          return { ...rest, marks: Number(q.marks) || 1 }
        })
      } else {
        input.maxMarks = Number(maxMarks) || 0
        input.questionText = questionText.trim() || undefined
      }
      await createTest(input)
      router.push('/admin/tests')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create the test')
      document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 space-y-6">
        <div>
          <Link href="/admin/tests" className="text-sm text-zinc-500 hover:text-violet-700">Back to tests</Link>
          <h1 className="text-2xl sm:text-3xl font-semibold text-zinc-900 mt-2">Schedule New Test</h1>
          <p className="text-[15px] text-zinc-500 mt-1">MCQ tests auto-grade instantly; descriptive tests are graded manually.</p>
        </div>

        {error && <div className="text-sm px-4 py-3 rounded-lg bg-rose-50 text-rose-700 border border-rose-100">{error}</div>}

        <Section title="Test details">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label className={labelCls} htmlFor="t-title">Test title</label>
              <input id="t-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                placeholder="Chemistry" className={inputCls} />
            </div>
            <div>
              <label className={labelCls} htmlFor="t-type">Type</label>
              <select id="t-type" value={type} onChange={(e) => setType(e.target.value as TestType)} className={inputCls}>
                <option value="mcq">MCQ (auto-graded)</option>
                <option value="descriptive">Descriptive (manually graded)</option>
              </select>
            </div>
            <div>
              <label className={labelCls} htmlFor="t-subject">Subject</label>
              <select id="t-subject" value={subjectId} onChange={(e) => setSubjectId(e.target.value)} className={inputCls}>
                <option value="">No subject</option>
                {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls} htmlFor="t-batch">Batch</label>
              <select id="t-batch" value={batchId} onChange={(e) => setBatchId(e.target.value)} className={inputCls}>
                <option value="">Select a batch</option>
                <option value="ALL">All Students</option>
                {batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
          </div>
        </Section>

        <Section title="Schedule and instructions">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div>
              <label className={labelCls} htmlFor="t-date">Date</label>
              <input id="t-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls} htmlFor="t-start">Start time</label>
              <input id="t-start" type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls} htmlFor="t-end">End time</label>
              <input id="t-end" type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className={inputCls} />
            </div>
          </div>
          {date && startTime && endTime && scheduledEnd <= scheduledStart && (
            <p className="text-sm text-rose-600 -mt-3">End time must be after start time.</p>
          )}
          <div>
            <label className={labelCls} htmlFor="t-instr">Instructions shown to students before they start (optional)</label>
            <textarea id="t-instr" value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={2}
              className={`${inputCls} resize-none`} />
          </div>
        </Section>

        {type === 'descriptive' ? (
          <Section title="Question" hint="You can also upload a question paper and answer key from the test card after scheduling.">
            <div className="max-w-xs">
              <label className={labelCls} htmlFor="t-max">Max marks</label>
              <input id="t-max" type="number" min={0} value={maxMarks} onChange={(e) => setMaxMarks(e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls} htmlFor="t-q">Typed question (optional)</label>
              <textarea id="t-q" value={questionText} onChange={(e) => setQuestionText(e.target.value)} rows={5}
                className={`${inputCls} resize-none`} />
            </div>
          </Section>
        ) : (
          <section className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-zinc-900">Questions</h2>
                <p className="text-sm text-zinc-500 mt-1">
                  Paste a screenshot for the question and for each option. Use the Text button on any field to type instead.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button onClick={() => setShowBank(true)} type="button"
                  className="text-sm font-medium px-4 py-2.5 rounded-lg border border-violet-300 text-violet-700 bg-white hover:bg-violet-50 transition-colors">
                  Import from question bank
                </button>
                <button onClick={addQuestion} type="button"
                  className="flex items-center gap-1.5 text-sm font-medium px-4 py-2.5 rounded-lg text-white transition-colors hover:opacity-90"
                  style={{ backgroundColor: ACCENT }}>
                  <PlusIcon className="w-4 h-4" /> Add question
                </button>
              </div>
            </div>

            {questions.length === 0 && (
              <div className="bg-white rounded-2xl border border-dashed border-zinc-300 p-10 text-center text-[15px] text-zinc-500">
                No questions yet. Add one, or import from the question bank.
              </div>
            )}

            {questions.map((q, i) => (
              <div key={i} className="bg-white rounded-2xl border border-zinc-200 p-6 sm:p-8 space-y-6">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-base font-semibold text-zinc-900">Question {i + 1}</span>
                    {q.bankQuestionId && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-500" title="Changes here do not affect the original">
                        Imported copy
                      </span>
                    )}
                  </div>
                  <button onClick={() => removeQuestion(i)} type="button"
                    className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-rose-600 transition-colors" aria-label={`Remove question ${i + 1}`}>
                    <TrashIcon className="w-4 h-4" /> Remove
                  </button>
                </div>

                <QuestionFieldInput label="Question" multiline value={getField(q, 'question')}
                  onChange={(v) => setQuestionField(i, 'question', v)} />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {(['a', 'b', 'c', 'd'] as OptionKey[]).map((key) => {
                    const field = `option${key.toUpperCase()}` as 'optionA' | 'optionB' | 'optionC' | 'optionD'
                    return (
                      <div key={key} className={`rounded-xl p-4 border ${q.correctOption === key ? 'border-emerald-300 bg-emerald-50/40' : 'border-zinc-200 bg-zinc-50/50'}`}>
                        <QuestionFieldInput label={`Option ${key.toUpperCase()}`} compact value={getField(q, field)}
                          onChange={(v) => setQuestionField(i, field, v)} />
                      </div>
                    )
                  })}
                </div>

                <div className="flex flex-wrap items-center gap-x-8 gap-y-4 pt-2 border-t border-zinc-100">
                  <div>
                    <p className="text-sm font-medium text-zinc-700 mb-2">Correct answer</p>
                    <div className="flex gap-2" role="radiogroup" aria-label={`Correct answer for question ${i + 1}`}>
                      {(['a', 'b', 'c', 'd'] as OptionKey[]).map((key) => (
                        <button key={key} type="button" role="radio" aria-checked={q.correctOption === key}
                          onClick={() => updateQuestion(i, { correctOption: key })}
                          className={`w-11 h-11 rounded-lg border text-[15px] font-semibold transition-colors ${
                            q.correctOption === key ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-zinc-600 border-zinc-300 hover:bg-zinc-50'
                          }`}>
                          {key.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-zinc-700 mb-2 block" htmlFor={`marks-${i}`}>Marks</label>
                    <input id={`marks-${i}`} type="number" min={1} value={q.marks ?? 1}
                      onChange={(e) => updateQuestion(i, { marks: Number(e.target.value) || 1 })}
                      className="w-24 text-[15px] rounded-lg px-3 py-2.5 border border-zinc-300 bg-white focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400" />
                  </div>
                </div>
              </div>
            ))}

            {questions.length > 0 && (
              <button onClick={addQuestion} type="button"
                className="w-full flex items-center justify-center gap-1.5 text-sm font-medium py-4 rounded-2xl border-2 border-dashed border-violet-300 text-violet-700 hover:bg-violet-50 transition-colors">
                <PlusIcon className="w-4 h-4" /> Add another question
              </button>
            )}
          </section>
        )}
      </div>

      {/* Action bar */}
      <div className="sticky bottom-0 z-30 bg-white/95 backdrop-blur border-t border-zinc-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0 text-sm">
            {type === 'mcq' && (
              <p className="text-zinc-700">
                {questions.length} question{questions.length === 1 ? '' : 's'} - total marks{' '}
                <span className="font-inter font-semibold">{totalMcqMarks}</span>
              </p>
            )}
            {problems.length > 0 ? (
              <p className="text-amber-700 truncate" title={problems.join('. ')}>{problems[0]}{problems.length > 1 ? ` (+${problems.length - 1} more)` : ''}</p>
            ) : (
              <p className="text-emerald-700">Ready to schedule</p>
            )}
          </div>
          <div className="flex gap-3">
            <Link href="/admin/tests" className="px-5 py-2.5 rounded-lg border border-zinc-300 text-zinc-600 text-[15px] hover:bg-zinc-50 transition-colors">
              Cancel
            </Link>
            <button onClick={handleSubmit} disabled={problems.length > 0 || submitting}
              className="px-6 py-2.5 rounded-lg text-white text-[15px] transition-colors disabled:opacity-40"
              style={{ backgroundColor: ACCENT }}>
              {submitting ? 'Scheduling...' : 'Schedule test'}
            </button>
          </div>
        </div>
      </div>

      {showBank && <QuestionBankModal onClose={() => setShowBank(false)} onImport={importQuestions} />}
    </div>
  )
}
