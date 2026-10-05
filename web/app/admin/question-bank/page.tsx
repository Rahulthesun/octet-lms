'use client'

// Standalone Question Bank page: lists every group of bank questions (one per
// past test, or one per manually-added label) and lets an admin add new
// questions straight to the bank without creating a test.
//
// Reuses the same backend as the "Import from question bank" modal
// (QuestionBankModal.tsx, used from ScheduleTestForm.tsx) — that flow is left
// completely untouched by this page.

import { useCallback, useEffect, useState } from 'react'
import { authedFetch } from '@/lib/apiClient'
import { uploadQuestionImage } from '@/lib/questionImages'
import QuestionContent from '@/components/shared/QuestionContent'
import { Watermark } from '@/components/shared/ExamSecurity'
import type { ContentType, OptionKey, QuestionContentFields } from '@/hooks/useTests'

const ACCENT = '#5B21B6'

interface BankGroup {
  sourceTestId: string | null
  title: string
  questionCount: number
  lastAdded: string
  testExists: boolean
}

interface BankQuestion extends QuestionContentFields {
  bankQuestionId: string
  correctOption: OptionKey
  marks: number
}

function groupQuery(g: BankGroup) {
  return g.sourceTestId ? `sourceTestId=${encodeURIComponent(g.sourceTestId)}` : `title=${encodeURIComponent(g.title)}`
}

function groupKey(g: BankGroup) {
  return g.sourceTestId ?? `title:${g.title}`
}

// ── Manual add form types ───────────────────────────────────────────────

type FieldKey = 'question' | 'optionA' | 'optionB' | 'optionC' | 'optionD'

interface FieldValue {
  type: ContentType
  text: string
  imageKey: string | null
  previewUrl: string | null
}

interface DraftQuestion {
  question: FieldValue
  optionA: FieldValue
  optionB: FieldValue
  optionC: FieldValue
  optionD: FieldValue
  correctOption: OptionKey
  marks: number
}

function emptyField(): FieldValue {
  return { type: 'text', text: '', imageKey: null, previewUrl: null }
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

function fieldHasContent(v: FieldValue) {
  return v.type === 'image' ? !!v.imageKey : v.text.trim().length > 0
}

const FIELD_LABELS: Record<FieldKey, string> = {
  question: 'Question',
  optionA: 'Option A',
  optionB: 'Option B',
  optionC: 'Option C',
  optionD: 'Option D',
}

function FieldEditor({ label, value, onChange }: { label: string; value: FieldValue; onChange: (v: FieldValue) => void }) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleFile(file: File | null) {
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const uploaded = await uploadQuestionImage(file)
      onChange({ ...value, imageKey: uploaded.key, previewUrl: uploaded.previewUrl })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Image upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-sm font-medium text-zinc-700">{label}</label>
        <div className="flex gap-1 text-xs">
          <button type="button"
            onClick={() => onChange({ ...value, type: 'text' })}
            className={`px-2 py-1 rounded-md border ${value.type === 'text' ? 'border-violet-400 bg-violet-50 text-violet-700' : 'border-zinc-200 text-zinc-500'}`}>
            Text
          </button>
          <button type="button"
            onClick={() => onChange({ ...value, type: 'image' })}
            className={`px-2 py-1 rounded-md border ${value.type === 'image' ? 'border-violet-400 bg-violet-50 text-violet-700' : 'border-zinc-200 text-zinc-500'}`}>
            Image
          </button>
        </div>
      </div>
      {value.type === 'text' ? (
        <textarea
          value={value.text}
          onChange={(e) => onChange({ ...value, text: e.target.value })}
          rows={2}
          className="w-full text-sm rounded-lg px-3 py-2 border border-zinc-300 bg-white focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400"
          placeholder={`${label} text`}
        />
      ) : (
        <div className="space-y-2">
          {value.previewUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value.previewUrl} alt={label} className="max-h-32 rounded-lg border border-zinc-200" />
          )}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,image/bmp"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-zinc-600"
          />
          {uploading && <p className="text-xs text-zinc-500">Uploading...</p>}
          {error && <p className="text-xs text-rose-600">{error}</p>}
        </div>
      )}
    </div>
  )
}

function QuestionForm({ draft, index, onChange, onRemove, removable }: {
  draft: DraftQuestion
  index: number
  onChange: (d: DraftQuestion) => void
  onRemove: () => void
  removable: boolean
}) {
  function setField(key: FieldKey, v: FieldValue) {
    onChange({ ...draft, [key]: v })
  }
  return (
    <div className="border border-zinc-200 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-zinc-700">Question {index + 1}</p>
        {removable && (
          <button type="button" onClick={onRemove} className="text-xs text-rose-600 hover:underline">Remove</button>
        )}
      </div>
      <FieldEditor label={FIELD_LABELS.question} value={draft.question} onChange={(v) => setField('question', v)} />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {(['optionA', 'optionB', 'optionC', 'optionD'] as const).map((key) => (
          <FieldEditor key={key} label={FIELD_LABELS[key]} value={draft[key]} onChange={(v) => setField(key, v)} />
        ))}
      </div>
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-700">Correct option</span>
          {(['a', 'b', 'c', 'd'] as const).map((k) => (
            <label key={k} className="flex items-center gap-1 text-sm text-zinc-600 cursor-pointer">
              <input type="radio" name={`correct-${index}`} checked={draft.correctOption === k}
                onChange={() => onChange({ ...draft, correctOption: k })} className="accent-violet-600" />
              {k.toUpperCase()}
            </label>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-zinc-700">Marks</span>
          <input type="number" min={1} value={draft.marks}
            onChange={(e) => onChange({ ...draft, marks: Number(e.target.value) || 1 })}
            className="w-20 text-sm rounded-lg px-2 py-1.5 border border-zinc-300" />
        </div>
      </div>
    </div>
  )
}

function AddQuestionsModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [label, setLabel] = useState('')
  const [drafts, setDrafts] = useState<DraftQuestion[]>([emptyDraft()])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function updateDraft(i: number, d: DraftQuestion) {
    setDrafts((prev) => prev.map((p, idx) => (idx === i ? d : p)))
  }

  function addAnother() {
    setDrafts((prev) => [...prev, emptyDraft()])
  }

  function removeDraft(i: number) {
    setDrafts((prev) => prev.filter((_, idx) => idx !== i))
  }

  function validate(): string | null {
    if (!label.trim()) return 'A label for this group is required'
    for (let i = 0; i < drafts.length; i++) {
      const d = drafts[i]
      const fields: FieldKey[] = ['question', 'optionA', 'optionB', 'optionC', 'optionD']
      for (const f of fields) {
        if (!fieldHasContent(d[f])) return `Question ${i + 1}: ${FIELD_LABELS[f]} needs text or an image`
      }
    }
    return null
  }

  async function handleSave() {
    const err = validate()
    if (err) {
      setError(err)
      return
    }
    setSaving(true)
    setError(null)
    try {
      const questions = drafts.map((d) => ({
        questionType: d.question.type,
        questionText: d.question.type === 'text' ? d.question.text.trim() : null,
        questionImageKey: d.question.type === 'image' ? d.question.imageKey : null,
        optionAType: d.optionA.type,
        optionA: d.optionA.type === 'text' ? d.optionA.text.trim() : null,
        optionAImageKey: d.optionA.type === 'image' ? d.optionA.imageKey : null,
        optionBType: d.optionB.type,
        optionB: d.optionB.type === 'text' ? d.optionB.text.trim() : null,
        optionBImageKey: d.optionB.type === 'image' ? d.optionB.imageKey : null,
        optionCType: d.optionC.type,
        optionC: d.optionC.type === 'text' ? d.optionC.text.trim() : null,
        optionCImageKey: d.optionC.type === 'image' ? d.optionC.imageKey : null,
        optionDType: d.optionD.type,
        optionD: d.optionD.type === 'text' ? d.optionD.text.trim() : null,
        optionDImageKey: d.optionD.type === 'image' ? d.optionD.imageKey : null,
        correctOption: d.correctOption,
        marks: d.marks,
      }))
      await authedFetch('/api/question-bank/manual', {
        method: 'POST',
        body: JSON.stringify({ label: label.trim(), questions }),
      })
      onSaved()
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={(e) => { e.stopPropagation(); onClose() }}>
      <div className="bg-white w-full sm:max-w-3xl shadow-2xl rounded-t-2xl sm:rounded-2xl border border-zinc-200 overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-lg font-semibold text-zinc-900">Add questions to the bank</h3>
            <p className="text-sm text-zinc-500 mt-0.5">Not tied to any test. Give this group a label.</p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 text-2xl leading-none" aria-label="Close">&times;</button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          {error && <div className="text-sm px-4 py-3 rounded-lg bg-rose-50 text-rose-700 border border-rose-100">{error}</div>}
          <div>
            <label className="text-sm font-medium text-zinc-700 block mb-1.5">Label</label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. Organic Chemistry — Chapter 4"
              className="w-full text-[15px] rounded-lg px-4 py-2.5 border border-zinc-300 bg-white focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400"
            />
          </div>

          <div className="space-y-4">
            {drafts.map((d, i) => (
              <QuestionForm key={i} draft={d} index={i}
                onChange={(nd) => updateDraft(i, nd)}
                onRemove={() => removeDraft(i)}
                removable={drafts.length > 1}
              />
            ))}
          </div>

          <button type="button" onClick={addAnother} className="text-sm text-violet-700 hover:underline">
            + Add another question
          </button>
        </div>

        <div className="px-6 py-4 border-t border-zinc-200 flex justify-end gap-3 shrink-0">
          <button onClick={onClose} className="px-5 py-2.5 rounded-lg border border-zinc-300 text-zinc-600 text-[15px] hover:bg-zinc-50">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2.5 rounded-lg text-white text-[15px] disabled:opacity-50" style={{ backgroundColor: ACCENT }}>
            {saving ? 'Saving...' : 'Save to bank'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────

export default function QuestionBankPage() {
  const [groups, setGroups] = useState<BankGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [showAdd, setShowAdd] = useState(false)

  const [openKey, setOpenKey] = useState<string | null>(null)
  const [questions, setQuestions] = useState<BankQuestion[]>([])
  const [loadingQuestions, setLoadingQuestions] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 250)
    return () => clearTimeout(t)
  }, [search])

  const loadGroups = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const qs = debounced ? `?search=${encodeURIComponent(debounced)}` : ''
      const data: BankGroup[] = await authedFetch(`/api/question-bank/groups${qs}`)
      setGroups([...data].sort((a, b) => new Date(b.lastAdded).getTime() - new Date(a.lastAdded).getTime()))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load the question bank')
    } finally {
      setLoading(false)
    }
  }, [debounced])

  useEffect(() => {
    loadGroups()
  }, [loadGroups])

  async function toggleGroup(g: BankGroup) {
    const key = groupKey(g)
    if (openKey === key) {
      setOpenKey(null)
      return
    }
    setOpenKey(key)
    setQuestions([])
    setLoadingQuestions(true)
    try {
      setQuestions(await authedFetch(`/api/question-bank/questions?${groupQuery(g)}`))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load questions')
    } finally {
      setLoadingQuestions(false)
    }
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Question Bank</h1>
          <p className="text-[15px] text-zinc-500 mt-1">Every question saved from past tests, plus any added here directly.</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-white text-[15px] transition-colors w-fit"
          style={{ backgroundColor: ACCENT }}>
          <span className="text-lg leading-none">+</span>
          Add Questions
        </button>
      </div>

      <div className="mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by label"
          className="w-full sm:max-w-sm text-[15px] rounded-lg px-4 py-2.5 border border-zinc-300 bg-white focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400"
        />
      </div>

      {error && <div className="text-sm px-4 py-3 rounded-lg bg-rose-50 text-rose-700 border border-rose-100 mb-4">{error}</div>}

      {loading ? (
        <p className="text-sm text-zinc-500 py-8 text-center">Loading...</p>
      ) : groups.length === 0 ? (
        <p className="text-sm text-zinc-500 py-12 text-center bg-white border border-zinc-200 rounded-xl">
          {debounced ? 'No groups match your search.' : 'The question bank is empty. Questions are saved automatically when you schedule an MCQ test, or add them directly here.'}
        </p>
      ) : (
        <div className="bg-white border border-zinc-200 rounded-xl divide-y divide-zinc-100">
          {groups.map((g) => {
            const key = groupKey(g)
            const isOpen = openKey === key
            return (
              <div key={key}>
                <div className="px-5 py-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0 cursor-pointer" onClick={() => toggleGroup(g)}>
                    <p className="text-[15px] text-zinc-900 truncate">{g.title}</p>
                    <p className="text-sm text-zinc-500 mt-0.5">
                      {g.questionCount} question{g.questionCount === 1 ? '' : 's'}
                      {' · '}
                      {new Date(g.lastAdded).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      {' · '}
                      {g.sourceTestId ? (g.testExists ? 'From an active test' : 'Test since deleted') : 'Added directly'}
                    </p>
                  </div>
                  <button onClick={() => toggleGroup(g)}
                    className="text-sm px-3 py-1.5 rounded-lg border border-zinc-300 text-zinc-700 hover:bg-zinc-50 shrink-0">
                    {isOpen ? 'Hide' : 'View questions'}
                  </button>
                </div>
                {isOpen && (
                  <div className="relative px-5 pb-5 space-y-3">
                    {questions.length > 0 && !loadingQuestions && <Watermark lines={['OCTET']} />}
                    {loadingQuestions ? (
                      <p className="text-sm text-zinc-500 py-4 text-center">Loading questions...</p>
                    ) : questions.length === 0 ? (
                      <p className="text-sm text-zinc-500 py-4 text-center">No questions found.</p>
                    ) : (
                      questions.map((q, i) => (
                        <div key={q.bankQuestionId} className="rounded-xl border border-zinc-200 p-4">
                          <div className="text-[15px] text-zinc-900 mb-2">
                            <span className="text-zinc-400 mr-1">{i + 1}.</span>
                            <QuestionContent q={q} field="question" alt={`Question ${i + 1}`} />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-sm">
                            {(['a', 'b', 'c', 'd'] as const).map((k) => {
                              const field = `option${k.toUpperCase()}` as 'optionA' | 'optionB' | 'optionC' | 'optionD'
                              return (
                                <div key={k} className={`flex items-start gap-1.5 px-2.5 py-1.5 rounded-md border ${
                                  q.correctOption === k ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-zinc-200 text-zinc-600'
                                }`}>
                                  <span className="font-semibold shrink-0">{k.toUpperCase()}.</span>
                                  <QuestionContent q={q} field={field} alt={`Option ${k.toUpperCase()}`} />
                                </div>
                              )
                            })}
                          </div>
                          <p className="text-xs text-zinc-400 mt-2">{q.marks} mark{q.marks === 1 ? '' : 's'}</p>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showAdd && (
        <AddQuestionsModal onClose={() => setShowAdd(false)} onSaved={loadGroups} />
      )}
    </div>
  )
}
