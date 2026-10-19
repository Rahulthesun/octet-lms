'use client'

// Shared "Subject → Unit → Class" section for the Q&A / Practice Questions
// content categories. Rendered twice (category="qa" and category="practice")
// directly inline inside the main Content Manager page
// (app/admin/content/page.tsx), right below the existing PDF/video notes
// panel, per the user's explicit requirement that these appear in the SAME
// page rather than behind a separate link. Also reused by the standalone
// /admin/qa-content route for a direct-link fallback.
//
// Reuses the existing Subject → Chapter(Unit) → Subtopic(Class) hierarchy
// (same tables/services as the Notes Content Manager, just rows with
// subjects.category = 'qa' or 'practice' — see api/sql/content_category.sql)
// via useContentTree(true, category). Leaf "Class" nodes hold MCQ questions
// (question_bank rows scoped by subtopic_id) added by manual entry, import
// from the Question Bank, or an attached PDF/Word resource file.

import { useCallback, useEffect, useState } from 'react'
import { authedFetch } from '@/lib/apiClient'
import { useContentTree, authHeaders } from '@/hooks/admin/useContentTree'
import QuestionContent from '@/components/shared/QuestionContent'
import QuestionFieldEditor, { emptyField, type FieldValue } from '@/components/admin/qa/QuestionFieldEditor'
import type { OptionKey, QuestionContentFields } from '@/hooks/useTests'

const ACCENT = '#5B21B6'
const BASE = process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:8000'

export type Category = 'qa' | 'practice'

interface Chapter {
  id: string
  name: string
}
interface Subtopic {
  id: string
  name: string
  chapter_id: string
}
interface BankQuestion extends QuestionContentFields {
  bankQuestionId: string
  correctOption: OptionKey
  marks: number
  questionImageKey?: string | null
  optionAImageKey?: string | null
  optionBImageKey?: string | null
  optionCImageKey?: string | null
  optionDImageKey?: string | null
}
interface DescriptiveItem {
  id: string
  subtopicId: string
  question: { type: 'text' | 'image'; text: string | null; imageUrl: string | null }
  answer: { type: 'text' | 'image'; text: string | null; imageUrl: string | null }
  marks: number
  createdAt: string
}
interface Resource {
  id: string
  title: string
  filename: string | null
  mime_type: string | null
  size_bytes: number | null
  signedUrl: string
}
interface BankGroup {
  sourceTestId: string | null
  title: string
  questionCount: number
}

function fmtBytes(n: number | null) {
  if (!n) return ''
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

// ─── Manual "+ Add Questions" modal ────────────────────────────────────────

interface DraftQuestion {
  question: FieldValue
  optionA: FieldValue
  optionB: FieldValue
  optionC: FieldValue
  optionD: FieldValue
  correctOption: OptionKey
  marks: number
}

function emptyDraft(): DraftQuestion {
  return {
    question: emptyField(),
    optionA: emptyField(),
    optionB: emptyField(),
    optionC: emptyField(),
    optionD: emptyField(),
    correctOption: 'a',
    marks: 1,
  }
}

interface DescriptiveDraft {
  question: FieldValue
  answer: FieldValue
  marks: number
}

function emptyDescriptiveDraft(): DescriptiveDraft {
  return { question: emptyField(), answer: emptyField(), marks: 1 }
}

function AddQuestionsModal({ subtopicId, onClose, onSaved }: { subtopicId: string; onClose: () => void; onSaved: () => void }) {
  const [mode, setMode] = useState<'mcq' | 'descriptive'>('mcq')
  const [drafts, setDrafts] = useState<DraftQuestion[]>([emptyDraft()])
  const [descDrafts, setDescDrafts] = useState<DescriptiveDraft[]>([emptyDescriptiveDraft()])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function updateDraft(i: number, patch: Partial<DraftQuestion>) {
    setDrafts((prev) => prev.map((d, idx) => (idx === i ? { ...d, ...patch } : d)))
  }

  function updateDescDraft(i: number, patch: Partial<DescriptiveDraft>) {
    setDescDrafts((prev) => prev.map((d, idx) => (idx === i ? { ...d, ...patch } : d)))
  }

  function toPayload(d: DraftQuestion) {
    const field = (f: FieldValue, apiKey: string) => ({
      [`${apiKey}Type`]: f.type,
      [apiKey]: f.type === 'text' ? f.text : '',
      [`${apiKey}ImageKey`]: f.type === 'image' ? f.imageKey : null,
      [`${apiKey}ImageContentHash`]: f.type === 'image' ? f.imageContentHash : null,
      [`${apiKey}ImagePerceptualHash`]: f.type === 'image' ? f.imagePerceptualHash : null,
    })
    return {
      ...field(d.question, 'question'),
      ...field(d.optionA, 'optionA'),
      ...field(d.optionB, 'optionB'),
      ...field(d.optionC, 'optionC'),
      ...field(d.optionD, 'optionD'),
      correctOption: d.correctOption,
      marks: d.marks,
    }
  }

  function toDescPayload(d: DescriptiveDraft) {
    const field = (f: FieldValue, apiKey: string) => ({
      [`${apiKey}Type`]: f.type,
      [apiKey]: f.type === 'text' ? f.text : '',
      [`${apiKey}ImageKey`]: f.type === 'image' ? f.imageKey : null,
      [`${apiKey}ImageContentHash`]: f.type === 'image' ? f.imageContentHash : null,
      [`${apiKey}ImagePerceptualHash`]: f.type === 'image' ? f.imagePerceptualHash : null,
    })
    return { ...field(d.question, 'question'), ...field(d.answer, 'answer'), marks: d.marks }
  }

  async function save() {
    setSaving(true)
    setError(null)
    try {
      if (mode === 'mcq') {
        await authedFetch(`/api/qa-content/subtopics/${subtopicId}/questions`, {
          method: 'POST',
          body: JSON.stringify({ questions: drafts.map(toPayload), label: 'Manual entry' }),
        })
      } else {
        await authedFetch(`/api/qa-content/subtopics/${subtopicId}/descriptive`, {
          method: 'POST',
          body: JSON.stringify({ items: descDrafts.map(toDescPayload) }),
        })
      }
      onSaved()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save questions')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-zinc-200 max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between shrink-0">
          <h3 className="text-lg font-semibold text-zinc-900">Add questions</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 text-2xl leading-none">&times;</button>
        </div>
        <div className="px-6 pt-4 shrink-0">
          <div className="inline-flex rounded-lg border border-zinc-300 overflow-hidden">
            <button
              onClick={() => setMode('mcq')}
              className={`px-4 py-1.5 text-sm ${mode === 'mcq' ? 'text-white' : 'text-zinc-600 hover:bg-zinc-50'}`}
              style={mode === 'mcq' ? { backgroundColor: ACCENT } : undefined}
            >
              MCQ
            </button>
            <button
              onClick={() => setMode('descriptive')}
              className={`px-4 py-1.5 text-sm border-l border-zinc-300 ${mode === 'descriptive' ? 'text-white' : 'text-zinc-600 hover:bg-zinc-50'}`}
              style={mode === 'descriptive' ? { backgroundColor: ACCENT } : undefined}
            >
              Descriptive
            </button>
          </div>
          <p className="text-xs text-zinc-500 mt-1.5">
            {mode === 'mcq' ? 'Question with 4 options and one correct answer.' : 'Question with a written model answer — no fixed options.'}
          </p>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">
          {error && <div className="text-sm px-4 py-3 rounded-lg bg-rose-50 text-rose-700 border border-rose-100">{error}</div>}
          {mode === 'descriptive' ? (
            <>
              {descDrafts.map((d, i) => (
                <div key={i} className="border border-zinc-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-zinc-700">Item {i + 1}</p>
                    {descDrafts.length > 1 && (
                      <button onClick={() => setDescDrafts((prev) => prev.filter((_, idx) => idx !== i))} className="text-xs text-rose-600">
                        Remove
                      </button>
                    )}
                  </div>
                  <QuestionFieldEditor label="Question" value={d.question} onChange={(v) => updateDescDraft(i, { question: v })} />
                  <QuestionFieldEditor label="Model answer" value={d.answer} onChange={(v) => updateDescDraft(i, { answer: v })} />
                  <div className="flex items-center gap-2">
                    <label className="text-sm text-zinc-700">Marks:</label>
                    <input
                      type="number"
                      min={1}
                      value={d.marks}
                      onChange={(e) => updateDescDraft(i, { marks: Number(e.target.value) || 1 })}
                      className="w-16 text-sm rounded-lg px-2 py-1 border border-zinc-300"
                    />
                  </div>
                </div>
              ))}
              <button
                onClick={() => setDescDrafts((prev) => [...prev, emptyDescriptiveDraft()])}
                className="text-sm text-violet-700 hover:underline"
              >
                + Add another item
              </button>
            </>
          ) : (
          drafts.map((d, i) => (
            <div key={i} className="border border-zinc-200 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-zinc-700">Question {i + 1}</p>
                {drafts.length > 1 && (
                  <button onClick={() => setDrafts((prev) => prev.filter((_, idx) => idx !== i))} className="text-xs text-rose-600">
                    Remove
                  </button>
                )}
              </div>
              <QuestionFieldEditor label="Question" value={d.question} onChange={(v) => updateDraft(i, { question: v })} />
              {(['optionA', 'optionB', 'optionC', 'optionD'] as const).map((key, idx) => (
                <QuestionFieldEditor
                  key={key}
                  label={`Option ${String.fromCharCode(65 + idx)}`}
                  value={d[key]}
                  onChange={(v) => updateDraft(i, { [key]: v } as Partial<DraftQuestion>)}
                />
              ))}
              <div className="flex items-center gap-4">
                <label className="text-sm text-zinc-700">Correct option:</label>
                <div className="flex gap-2">
                  {(['a', 'b', 'c', 'd'] as const).map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => updateDraft(i, { correctOption: k })}
                      className={`w-8 h-8 rounded-full border text-sm ${
                        d.correctOption === k ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-zinc-300 text-zinc-500'
                      }`}
                    >
                      {k.toUpperCase()}
                    </button>
                  ))}
                </div>
                <label className="text-sm text-zinc-700 ml-auto">Marks:</label>
                <input
                  type="number"
                  min={1}
                  value={d.marks}
                  onChange={(e) => updateDraft(i, { marks: Number(e.target.value) || 1 })}
                  className="w-16 text-sm rounded-lg px-2 py-1 border border-zinc-300"
                />
              </div>
            </div>
          ))
          )}
          {mode === 'mcq' && (
            <button
              onClick={() => setDrafts((prev) => [...prev, emptyDraft()])}
              className="text-sm text-violet-700 hover:underline"
            >
              + Add another question
            </button>
          )}
        </div>
        <div className="px-6 py-4 border-t border-zinc-200 flex justify-end gap-3 shrink-0">
          <button onClick={onClose} className="px-5 py-2.5 rounded-lg border border-zinc-300 text-zinc-600 text-[15px]">
            Cancel
          </button>
          <button
            disabled={saving}
            onClick={save}
            className="px-5 py-2.5 rounded-lg text-white text-[15px] disabled:opacity-50"
            style={{ backgroundColor: ACCENT }}
          >
            {saving ? 'Saving...' : 'Save questions'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Edit an already-saved question ────────────────────────────────────────

function bankQuestionToDraft(q: BankQuestion): DraftQuestion {
  function field(type: FieldValue['type'], text: string | null, imageUrl: string | null | undefined, imageKey: string | null | undefined): FieldValue {
    return { type, text: text ?? '', imageKey: imageKey ?? null, imageUrl: imageUrl ?? null, imageContentHash: null, imagePerceptualHash: null }
  }
  return {
    question: field(q.questionType, q.questionText, q.questionImageUrl, q.questionImageKey),
    optionA: field(q.optionAType, q.optionA, q.optionAImageUrl, q.optionAImageKey),
    optionB: field(q.optionBType, q.optionB, q.optionBImageUrl, q.optionBImageKey),
    optionC: field(q.optionCType, q.optionC, q.optionCImageUrl, q.optionCImageKey),
    optionD: field(q.optionDType, q.optionD, q.optionDImageUrl, q.optionDImageKey),
    correctOption: q.correctOption,
    marks: q.marks,
  }
}

function EditQuestionModal({ question, onClose, onSaved }: {
  question: BankQuestion
  onClose: () => void
  onSaved: (updated: BankQuestion) => void
}) {
  const [draft, setDraft] = useState<DraftQuestion>(() => bankQuestionToDraft(question))
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function toPayload(d: DraftQuestion) {
    const field = (f: FieldValue, apiKey: string) => ({
      [`${apiKey}Type`]: f.type,
      [apiKey]: f.type === 'text' ? f.text : '',
      [`${apiKey}ImageKey`]: f.type === 'image' ? f.imageKey : null,
      [`${apiKey}ImageContentHash`]: f.type === 'image' ? f.imageContentHash : null,
      [`${apiKey}ImagePerceptualHash`]: f.type === 'image' ? f.imagePerceptualHash : null,
    })
    return {
      ...field(d.question, 'question'),
      ...field(d.optionA, 'optionA'),
      ...field(d.optionB, 'optionB'),
      ...field(d.optionC, 'optionC'),
      ...field(d.optionD, 'optionD'),
      correctOption: d.correctOption,
      marks: d.marks,
    }
  }

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const updated: BankQuestion = await authedFetch(`/api/qa-content/questions/${question.bankQuestionId}`, {
        method: 'PATCH',
        body: JSON.stringify(toPayload(draft)),
      })
      onSaved(updated)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-zinc-200 max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between shrink-0">
          <h3 className="text-lg font-semibold text-zinc-900">Edit question</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 text-2xl leading-none">&times;</button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-3">
          {error && <div className="text-sm px-4 py-3 rounded-lg bg-rose-50 text-rose-700 border border-rose-100">{error}</div>}
          <QuestionFieldEditor label="Question" value={draft.question} onChange={(v) => setDraft((d) => ({ ...d, question: v }))} />
          {(['optionA', 'optionB', 'optionC', 'optionD'] as const).map((key, idx) => (
            <QuestionFieldEditor
              key={key}
              label={`Option ${String.fromCharCode(65 + idx)}`}
              value={draft[key]}
              onChange={(v) => setDraft((d) => ({ ...d, [key]: v }))}
            />
          ))}
          <div className="flex items-center gap-4">
            <label className="text-sm text-zinc-700">Correct option:</label>
            <div className="flex gap-2">
              {(['a', 'b', 'c', 'd'] as const).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setDraft((d) => ({ ...d, correctOption: k }))}
                  className={`w-8 h-8 rounded-full border text-sm ${
                    draft.correctOption === k ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-zinc-300 text-zinc-500'
                  }`}
                >
                  {k.toUpperCase()}
                </button>
              ))}
            </div>
            <label className="text-sm text-zinc-700 ml-auto">Marks:</label>
            <input
              type="number"
              min={1}
              value={draft.marks}
              onChange={(e) => setDraft((d) => ({ ...d, marks: Number(e.target.value) || 1 }))}
              className="w-16 text-sm rounded-lg px-2 py-1 border border-zinc-300"
            />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-zinc-200 flex justify-end gap-3 shrink-0">
          <button onClick={onClose} className="px-5 py-2.5 rounded-lg border border-zinc-300 text-zinc-600 text-[15px]">
            Cancel
          </button>
          <button
            disabled={saving}
            onClick={save}
            className="px-5 py-2.5 rounded-lg text-white text-[15px] disabled:opacity-50"
            style={{ backgroundColor: ACCENT }}
          >
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

function EditDescriptiveModal({ item, onClose, onSaved }: {
  item: DescriptiveItem
  onClose: () => void
  onSaved: (updated: DescriptiveItem) => void
}) {
  const [question, setQuestion] = useState<FieldValue>({
    type: item.question.type, text: item.question.text || '', imageKey: null, imageUrl: item.question.imageUrl, imageContentHash: null, imagePerceptualHash: null,
  })
  const [answer, setAnswer] = useState<FieldValue>({
    type: item.answer.type, text: item.answer.text || '', imageKey: null, imageUrl: item.answer.imageUrl, imageContentHash: null, imagePerceptualHash: null,
  })
  const [marks, setMarks] = useState(item.marks)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const field = (f: FieldValue, apiKey: string) => ({
        [`${apiKey}Type`]: f.type,
        [apiKey]: f.type === 'text' ? f.text : '',
        [`${apiKey}ImageKey`]: f.type === 'image' ? f.imageKey : null,
        [`${apiKey}ImageContentHash`]: f.type === 'image' ? f.imageContentHash : null,
        [`${apiKey}ImagePerceptualHash`]: f.type === 'image' ? f.imagePerceptualHash : null,
      })
      const updated: DescriptiveItem = await authedFetch(`/api/qa-content/descriptive/${item.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ ...field(question, 'question'), ...field(answer, 'answer'), marks }),
      })
      onSaved(updated)
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-zinc-200 max-h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between shrink-0">
          <h3 className="text-lg font-semibold text-zinc-900">Edit descriptive item</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 text-2xl leading-none">&times;</button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-3">
          {error && <div className="text-sm px-4 py-3 rounded-lg bg-rose-50 text-rose-700 border border-rose-100">{error}</div>}
          <QuestionFieldEditor label="Question" value={question} onChange={setQuestion} />
          <QuestionFieldEditor label="Model answer" value={answer} onChange={setAnswer} />
          <div className="flex items-center gap-2">
            <label className="text-sm text-zinc-700">Marks:</label>
            <input type="number" min={1} value={marks} onChange={(e) => setMarks(Number(e.target.value) || 1)} className="w-16 text-sm rounded-lg px-2 py-1 border border-zinc-300" />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-zinc-200 flex justify-end gap-3 shrink-0">
          <button onClick={onClose} className="px-5 py-2.5 rounded-lg border border-zinc-300 text-zinc-600 text-[15px]">Cancel</button>
          <button disabled={saving} onClick={save} className="px-5 py-2.5 rounded-lg text-white text-[15px] disabled:opacity-50" style={{ backgroundColor: ACCENT }}>
            {saving ? 'Saving...' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── "Import from Question Bank" modal ─────────────────────────────────────

function ImportBankModal({ subtopicId, onClose, onImported }: { subtopicId: string; onClose: () => void; onImported: () => void }) {
  const [groups, setGroups] = useState<BankGroup[]>([])
  const [loadingGroups, setLoadingGroups] = useState(true)
  const [openGroup, setOpenGroup] = useState<BankGroup | null>(null)
  const [questions, setQuestions] = useState<BankQuestion[]>([])
  const [loadingQuestions, setLoadingQuestions] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [importing, setImporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    authedFetch('/api/question-bank/groups')
      .then((g) => setGroups(g))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load question bank'))
      .finally(() => setLoadingGroups(false))
  }, [])

  async function open(g: BankGroup) {
    setOpenGroup(g)
    setLoadingQuestions(true)
    setSelected(new Set())
    try {
      const qs = g.sourceTestId
        ? `sourceTestId=${encodeURIComponent(g.sourceTestId)}`
        : `title=${encodeURIComponent(g.title)}`
      setQuestions(await authedFetch(`/api/question-bank/questions?${qs}`))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load questions')
    } finally {
      setLoadingQuestions(false)
    }
  }

  async function doImport() {
    setImporting(true)
    setError(null)
    try {
      await authedFetch(`/api/qa-content/subtopics/${subtopicId}/import`, {
        method: 'POST',
        body: JSON.stringify({ bankQuestionIds: [...selected] }),
      })
      onImported()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-[70] flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-zinc-200 max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between shrink-0">
          <h3 className="text-lg font-semibold text-zinc-900">{openGroup ? openGroup.title : 'Import from question bank'}</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 text-2xl leading-none">&times;</button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-3">
          {error && <div className="text-sm px-4 py-3 rounded-lg bg-rose-50 text-rose-700 border border-rose-100">{error}</div>}
          {!openGroup ? (
            loadingGroups ? (
              <p className="text-sm text-zinc-500 text-center py-6">Loading...</p>
            ) : groups.length === 0 ? (
              <p className="text-sm text-zinc-500 text-center py-6">The question bank is empty.</p>
            ) : (
              <div className="divide-y divide-zinc-100 border border-zinc-200 rounded-xl">
                {groups.map((g) => (
                  <button
                    key={g.sourceTestId ?? g.title}
                    onClick={() => open(g)}
                    className="w-full text-left px-4 py-3 flex items-center justify-between hover:bg-zinc-50"
                  >
                    <span className="text-[15px] text-zinc-900">{g.title}</span>
                    <span className="text-sm text-zinc-500">{g.questionCount} questions</span>
                  </button>
                ))}
              </div>
            )
          ) : (
            <>
              <button onClick={() => setOpenGroup(null)} className="text-sm text-violet-700 hover:underline">
                Back
              </button>
              {loadingQuestions ? (
                <p className="text-sm text-zinc-500 text-center py-6">Loading...</p>
              ) : (
                <div className="space-y-2">
                  {questions.map((q, i) => (
                    <label
                      key={q.bankQuestionId}
                      className={`block rounded-xl border p-3 cursor-pointer ${
                        selected.has(q.bankQuestionId) ? 'border-violet-400 bg-violet-50/50' : 'border-zinc-200'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={selected.has(q.bankQuestionId)}
                          onChange={() =>
                            setSelected((prev) => {
                              const next = new Set(prev)
                              if (next.has(q.bankQuestionId)) next.delete(q.bankQuestionId)
                              else next.add(q.bankQuestionId)
                              return next
                            })
                          }
                          className="accent-violet-600 w-4 h-4 mt-1"
                        />
                        <div className="text-[15px] text-zinc-900">
                          <span className="text-zinc-400 mr-1">{i + 1}.</span>
                          <QuestionContent q={q} field="question" alt={`Question ${i + 1}`} />
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
        {openGroup && (
          <div className="px-6 py-4 border-t border-zinc-200 flex justify-end gap-3 shrink-0">
            <button onClick={onClose} className="px-5 py-2.5 rounded-lg border border-zinc-300 text-zinc-600 text-[15px]">
              Cancel
            </button>
            <button
              disabled={selected.size === 0 || importing}
              onClick={doImport}
              className="px-5 py-2.5 rounded-lg text-white text-[15px] disabled:opacity-40"
              style={{ backgroundColor: ACCENT }}
            >
              {importing ? 'Importing...' : `Import ${selected.size > 0 ? selected.size : ''} selected`}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Class (subtopic) manager — questions + resources ──────────────────────

function ClassManager({ subtopic, onClose }: { subtopic: Subtopic; onClose: () => void }) {
  const [questions, setQuestions] = useState<BankQuestion[]>([])
  const [descriptiveItems, setDescriptiveItems] = useState<DescriptiveItem[]>([])
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<BankQuestion | null>(null)
  const [editingDescriptive, setEditingDescriptive] = useState<DescriptiveItem | null>(null)
  const [resTitle, setResTitle] = useState('')
  const [resFile, setResFile] = useState<File | null>(null)
  const [uploadingRes, setUploadingRes] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [qs, ds, rs] = await Promise.all([
        authedFetch(`/api/qa-content/subtopics/${subtopic.id}/questions`),
        authedFetch(`/api/qa-content/subtopics/${subtopic.id}/descriptive`),
        authedFetch(`/api/qa-content/subtopics/${subtopic.id}/resources`),
      ])
      setQuestions(qs)
      setDescriptiveItems(ds)
      setResources(rs)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [subtopic.id])

  useEffect(() => {
    load()
  }, [load])

  async function deleteQuestion(id: string) {
    if (!confirm('Delete this question?')) return
    try {
      await authedFetch(`/api/qa-content/questions/${id}`, { method: 'DELETE' })
      setQuestions((prev) => prev.filter((q) => q.bankQuestionId !== id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete question')
    }
  }

  async function deleteDescriptive(id: string) {
    if (!confirm('Delete this item?')) return
    try {
      await authedFetch(`/api/qa-content/descriptive/${id}`, { method: 'DELETE' })
      setDescriptiveItems((prev) => prev.filter((d) => d.id !== id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete item')
    }
  }

  async function uploadResource() {
    if (!resFile || !resTitle.trim()) return
    setUploadingRes(true)
    setError(null)
    try {
      const headers = await authHeaders()
      const form = new FormData()
      form.append('title', resTitle.trim())
      form.append('file', resFile)
      const res = await fetch(`${BASE}/api/qa-content/subtopics/${subtopic.id}/resources/upload`, {
        method: 'POST',
        headers,
        body: form,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Upload failed')
      setResources((prev) => [data, ...prev])
      setResTitle('')
      setResFile(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploadingRes(false)
    }
  }

  async function deleteResource(id: string) {
    if (!confirm('Delete this resource?')) return
    try {
      await authedFetch(`/api/qa-content/resources/${id}`, { method: 'DELETE' })
      setResources((prev) => prev.filter((r) => r.id !== id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete resource')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-zinc-200 max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between shrink-0">
          <h3 className="text-lg font-semibold text-zinc-900">{subtopic.name}</h3>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 text-2xl leading-none">&times;</button>
        </div>
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">
          {error && <div className="text-sm px-4 py-3 rounded-lg bg-rose-50 text-rose-700 border border-rose-100">{error}</div>}

          <div className="flex gap-3">
            <button
              onClick={() => setShowAdd(true)}
              className="text-sm px-3 py-1.5 rounded-lg text-white"
              style={{ backgroundColor: ACCENT }}
            >
              + Add Questions
            </button>
            <button
              onClick={() => setShowImport(true)}
              className="text-sm px-3 py-1.5 rounded-lg border border-zinc-300 text-zinc-700"
            >
              Import from Question Bank
            </button>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-zinc-700 mb-2">Questions ({questions.length})</h4>
            {loading ? (
              <p className="text-sm text-zinc-500">Loading...</p>
            ) : questions.length === 0 ? (
              <p className="text-sm text-zinc-500">No questions yet.</p>
            ) : (
              <div className="space-y-2">
                {questions.map((q, i) => (
                  <div key={q.bankQuestionId} className="border border-zinc-200 rounded-xl p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-[15px] text-zinc-900 min-w-0">
                        <span className="text-zinc-400 mr-1">{i + 1}.</span>
                        <QuestionContent q={q} field="question" alt={`Question ${i + 1}`} />
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button onClick={() => setEditingQuestion(q)} className="text-xs px-2 py-1 rounded-md border border-zinc-300 text-zinc-700 hover:bg-zinc-50">
                          Edit
                        </button>
                        <button onClick={() => deleteQuestion(q.bankQuestionId)} className="text-xs px-2 py-1 rounded-md border border-rose-200 text-rose-600 hover:bg-rose-50">
                          Delete
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-sm mt-2">
                      {(['a', 'b', 'c', 'd'] as const).map((key) => {
                        const field = `option${key.toUpperCase()}` as 'optionA' | 'optionB' | 'optionC' | 'optionD'
                        return (
                          <div
                            key={key}
                            className={`flex items-start gap-1.5 px-2.5 py-1.5 rounded-md border ${
                              q.correctOption === key ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-zinc-200 text-zinc-600'
                            }`}
                          >
                            <span className="font-semibold shrink-0">{key.toUpperCase()}.</span>
                            <QuestionContent q={q} field={field} alt={`Option ${key.toUpperCase()}`} />
                          </div>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h4 className="text-sm font-semibold text-zinc-700 mb-2">Descriptive items ({descriptiveItems.length})</h4>
            {loading ? (
              <p className="text-sm text-zinc-500">Loading...</p>
            ) : descriptiveItems.length === 0 ? (
              <p className="text-sm text-zinc-500">No descriptive items yet.</p>
            ) : (
              <div className="space-y-2">
                {descriptiveItems.map((item, i) => (
                  <div key={item.id} className="border border-zinc-200 rounded-xl p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="text-[15px] text-zinc-900 min-w-0">
                        <span className="text-zinc-400 mr-1">{i + 1}.</span>
                        {item.question.type === 'text' ? (
                          <span>{item.question.text}</span>
                        ) : item.question.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.question.imageUrl} alt={`Question ${i + 1}`} className="max-w-full rounded-lg" />
                        ) : null}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button onClick={() => setEditingDescriptive(item)} className="text-xs px-2 py-1 rounded-md border border-zinc-300 text-zinc-700 hover:bg-zinc-50">
                          Edit
                        </button>
                        <button onClick={() => deleteDescriptive(item.id)} className="text-xs px-2 py-1 rounded-md border border-rose-200 text-rose-600 hover:bg-rose-50">
                          Delete
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 px-2.5 py-1.5 rounded-md border border-emerald-200 bg-emerald-50 text-emerald-800 text-sm">
                      <span className="font-semibold mr-1.5">Answer:</span>
                      {item.answer.type === 'text' ? (
                        <span>{item.answer.text}</span>
                      ) : item.answer.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={item.answer.imageUrl} alt={`Answer ${i + 1}`} className="max-w-full rounded-lg mt-1" />
                      ) : null}
                    </div>
                    <p className="text-xs text-zinc-400 mt-1.5">{item.marks} mark{item.marks === 1 ? '' : 's'}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <h4 className="text-sm font-semibold text-zinc-700 mb-2">Attached resources ({resources.length})</h4>
            <div className="flex flex-wrap gap-2 mb-3">
              <input
                type="text"
                placeholder="Resource title"
                value={resTitle}
                onChange={(e) => setResTitle(e.target.value)}
                className="text-sm rounded-lg px-3 py-1.5 border border-zinc-300 flex-1 min-w-[160px]"
              />
              <input
                type="file"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={(e) => setResFile(e.target.files?.[0] ?? null)}
                className="text-sm"
              />
              <button
                disabled={!resFile || !resTitle.trim() || uploadingRes}
                onClick={uploadResource}
                className="text-sm px-3 py-1.5 rounded-lg text-white disabled:opacity-50"
                style={{ backgroundColor: ACCENT }}
              >
                {uploadingRes ? 'Uploading...' : 'Upload'}
              </button>
            </div>
            {resources.length === 0 ? (
              <p className="text-sm text-zinc-500">No resources attached.</p>
            ) : (
              <div className="divide-y divide-zinc-100 border border-zinc-200 rounded-xl">
                {resources.map((r) => (
                  <div key={r.id} className="px-4 py-2.5 flex items-center justify-between gap-3">
                    <a href={r.signedUrl} target="_blank" rel="noreferrer" className="text-sm text-violet-700 hover:underline truncate">
                      {r.title} {r.size_bytes ? `(${fmtBytes(r.size_bytes)})` : ''}
                    </a>
                    <button onClick={() => deleteResource(r.id)} className="text-xs text-rose-600 shrink-0">
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showAdd && (
        <AddQuestionsModal
          subtopicId={subtopic.id}
          onClose={() => setShowAdd(false)}
          onSaved={load}
        />
      )}
      {showImport && (
        <ImportBankModal
          subtopicId={subtopic.id}
          onClose={() => setShowImport(false)}
          onImported={load}
        />
      )}
      {editingQuestion && (
        <EditQuestionModal
          question={editingQuestion}
          onClose={() => setEditingQuestion(null)}
          onSaved={(updated) => {
            setQuestions((prev) => prev.map((q) => (q.bankQuestionId === updated.bankQuestionId ? updated : q)))
          }}
        />
      )}
      {editingDescriptive && (
        <EditDescriptiveModal
          item={editingDescriptive}
          onClose={() => setEditingDescriptive(null)}
          onSaved={(updated) => {
            setDescriptiveItems((prev) => prev.map((d) => (d.id === updated.id ? updated : d)))
          }}
        />
      )}
    </div>
  )
}

// ─── One Subject → Unit → Class section ────────────────────────────────────

export function QaCategorySection({ category, title, embedded = false }: { category: Category; title: string; embedded?: boolean }) {
  const tree = useContentTree(false, category)
  const [openSubjectId, setOpenSubjectId] = useState<string | null>(null)
  const [openChapterId, setOpenChapterId] = useState<string | null>(null)
  const [subtopicsMap, setSubtopicsMap] = useState<Record<string, Subtopic[]>>({})
  const [newSubjectName, setNewSubjectName] = useState('')
  const [newSubjectGrade, setNewSubjectGrade] = useState<11 | 12>(11)
  const [newChapterName, setNewChapterName] = useState<Record<string, string>>({})
  const [newSubtopicName, setNewSubtopicName] = useState<Record<string, string>>({})
  const [activeSubtopic, setActiveSubtopic] = useState<Subtopic | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function toggleSubject(subjectId: string) {
    const next = openSubjectId === subjectId ? null : subjectId
    setOpenSubjectId(next)
    setOpenChapterId(null)
    if (next) await tree.loadChapters(subjectId)
  }

  async function toggleChapter(chapterId: string) {
    const next = openChapterId === chapterId ? null : chapterId
    setOpenChapterId(next)
    if (next && subtopicsMap[chapterId] === undefined) {
      try {
        const headers = await authHeaders()
        const res = await fetch(`${BASE}/api/subtopics/chapter/${chapterId}`, { headers })
        const data = res.ok ? await res.json() : []
        setSubtopicsMap((prev) => ({ ...prev, [chapterId]: Array.isArray(data) ? data : [] }))
      } catch {
        setSubtopicsMap((prev) => ({ ...prev, [chapterId]: [] }))
      }
    }
  }

  async function addSubject() {
    const name = newSubjectName.trim()
    if (!name) return
    try {
      await tree.createSubject(name, newSubjectGrade)
      setNewSubjectName('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add subject')
    }
  }

  async function addChapterTo(subjectId: string) {
    const name = (newChapterName[subjectId] || '').trim()
    if (!name) return
    try {
      const headers = await authHeaders()
      const res = await fetch(`${BASE}/api/chapters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ subjectId, name }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to add unit')
      tree.addChapter(subjectId, { id: data.id, name: data.name })
      setNewChapterName((prev) => ({ ...prev, [subjectId]: '' }))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add unit')
    }
  }

  async function addSubtopicTo(chapterId: string) {
    const name = (newSubtopicName[chapterId] || '').trim()
    if (!name) return
    try {
      const headers = await authHeaders()
      const res = await fetch(`${BASE}/api/subtopics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify({ chapterId, name }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.error || 'Failed to add class')
      setSubtopicsMap((prev) => ({ ...prev, [chapterId]: [...(prev[chapterId] || []), data] }))
      setNewSubtopicName((prev) => ({ ...prev, [chapterId]: '' }))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add class')
    }
  }

  async function removeSubject(subjectId: string, name: string) {
    if (!confirm(`Delete subject "${name}"? This also deletes every unit and class under it.`)) return
    try {
      await tree.deleteSubject(subjectId)
      if (openSubjectId === subjectId) setOpenSubjectId(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete subject')
    }
  }

  async function removeChapter(subjectId: string, chapterId: string, name: string) {
    if (!confirm(`Delete unit "${name}"? This also deletes every class under it.`)) return
    try {
      await tree.deleteChapter(subjectId, chapterId)
      if (openChapterId === chapterId) setOpenChapterId(null)
      setSubtopicsMap((prev) => {
        const next = { ...prev }
        delete next[chapterId]
        return next
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete unit')
    }
  }

  async function removeSubtopic(chapterId: string, subtopicId: string, name: string) {
    if (!confirm(`Delete class "${name}"? This also deletes its questions and attached resources.`)) return
    try {
      await authedFetch(`/api/subtopics/${subtopicId}`, { method: 'DELETE' })
      setSubtopicsMap((prev) => ({
        ...prev,
        [chapterId]: (prev[chapterId] || []).filter((s) => s.id !== subtopicId),
      }))
      if (activeSubtopic?.id === subtopicId) setActiveSubtopic(null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete class')
    }
  }

  const body = (
      <div className={embedded ? 'space-y-3' : 'p-5 space-y-3'}>
        {error && <div className="text-sm px-4 py-3 rounded-lg bg-rose-50 text-rose-700 border border-rose-100">{error}</div>}

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="New subject name"
            value={newSubjectName}
            onChange={(e) => setNewSubjectName(e.target.value)}
            className="text-sm rounded-lg px-3 py-1.5 border border-zinc-300 flex-1"
          />
          <select
            value={newSubjectGrade}
            onChange={(e) => setNewSubjectGrade(Number(e.target.value) as 11 | 12)}
            className="text-sm rounded-lg px-2 py-1.5 border border-zinc-300"
          >
            <option value={11}>Grade 11</option>
            <option value={12}>Grade 12</option>
          </select>
          <button onClick={addSubject} className="text-sm px-3 py-1.5 rounded-lg text-white" style={{ backgroundColor: ACCENT }}>
            + Add subject
          </button>
        </div>

        {tree.loading ? (
          <p className="text-sm text-zinc-500">Loading...</p>
        ) : tree.subjects.length === 0 ? (
          <p className="text-sm text-zinc-500">No subjects yet.</p>
        ) : (
          <div className="divide-y divide-zinc-100 border border-zinc-200 rounded-xl">
            {tree.subjects.map((subject) => (
              <div key={subject.id}>
                <div className="w-full flex items-center gap-1 px-4 py-1.5 hover:bg-zinc-50">
                  <button
                    onClick={() => toggleSubject(subject.id)}
                    className="flex-1 text-left py-1.5 flex items-center justify-between"
                  >
                    <span className="text-[15px] text-zinc-900">{subject.name}</span>
                    <span className="text-xs text-zinc-500">Grade {subject.grade}</span>
                  </button>
                  <button
                    onClick={() => removeSubject(subject.id, subject.name)}
                    className="shrink-0 text-xs px-2 py-1 rounded-md text-rose-600 hover:bg-rose-50"
                    title="Delete subject"
                  >
                    Delete
                  </button>
                </div>
                {openSubjectId === subject.id && (
                  <div className="px-4 pb-3 space-y-2 bg-zinc-50/50">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="New unit name"
                        value={newChapterName[subject.id] || ''}
                        onChange={(e) => setNewChapterName((prev) => ({ ...prev, [subject.id]: e.target.value }))}
                        className="text-sm rounded-lg px-3 py-1.5 border border-zinc-300 flex-1"
                      />
                      <button
                        onClick={() => addChapterTo(subject.id)}
                        className="text-sm px-3 py-1.5 rounded-lg border border-zinc-300 text-zinc-700"
                      >
                        + Add Unit
                      </button>
                    </div>
                    {(tree.chaptersMap[subject.id] || []).map((chapter) => (
                      <div key={chapter.id} className="border border-zinc-200 rounded-lg bg-white">
                        <div className="w-full flex items-center gap-1 px-3 py-1 hover:bg-zinc-50">
                          <button
                            onClick={() => toggleChapter(chapter.id)}
                            className="flex-1 text-left py-1 text-sm text-zinc-800"
                          >
                            {chapter.name}
                          </button>
                          <button
                            onClick={() => removeChapter(subject.id, chapter.id, chapter.name)}
                            className="shrink-0 text-xs px-2 py-0.5 rounded-md text-rose-600 hover:bg-rose-50"
                            title="Delete unit"
                          >
                            Delete
                          </button>
                        </div>
                        {openChapterId === chapter.id && (
                          <div className="px-3 pb-2 space-y-1.5">
                            <div className="flex gap-2">
                              <input
                                type="text"
                                placeholder="New class name"
                                value={newSubtopicName[chapter.id] || ''}
                                onChange={(e) => setNewSubtopicName((prev) => ({ ...prev, [chapter.id]: e.target.value }))}
                                className="text-xs rounded-lg px-2 py-1 border border-zinc-300 flex-1"
                              />
                              <button
                                onClick={() => addSubtopicTo(chapter.id)}
                                className="text-xs px-2 py-1 rounded-lg border border-zinc-300 text-zinc-700"
                              >
                                + Add Class
                              </button>
                            </div>
                            {(subtopicsMap[chapter.id] || []).map((sub) => (
                              <div key={sub.id} className="w-full flex items-center gap-1 rounded-lg hover:bg-violet-50">
                                <button
                                  onClick={() => setActiveSubtopic(sub)}
                                  className="flex-1 text-left text-sm px-2 py-1.5 text-violet-800"
                                >
                                  {sub.name} →
                                </button>
                                <button
                                  onClick={() => removeSubtopic(chapter.id, sub.id, sub.name)}
                                  className="shrink-0 text-xs px-2 py-1 rounded-md text-rose-600 hover:bg-rose-100"
                                  title="Delete class"
                                >
                                  Delete
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
  )

  return (
    <>
      {embedded ? (
        body
      ) : (
        <div className="border border-zinc-200 rounded-2xl overflow-hidden bg-white">
          <div className="px-5 py-4 bg-zinc-50 border-b border-zinc-200">
            <h2 className="text-lg font-semibold text-zinc-900">{title}</h2>
          </div>
          {body}
        </div>
      )}
      {activeSubtopic && <ClassManager subtopic={activeSubtopic} onClose={() => setActiveSubtopic(null)} />}
    </>
  )
}
