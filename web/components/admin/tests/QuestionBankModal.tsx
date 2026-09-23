'use client'

// "Import from question bank": lists past tests by name (with search), shows
// the questions of one, and lets the admin tick the ones to copy into the test
// being created (or take the whole test). Everything comes from
// /api/question-bank; imported questions are independent copies.

import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { authedFetch } from '@/lib/apiClient'
import QuestionContent from '@/components/shared/QuestionContent'
import type { OptionKey, QuestionContentFields, TestQuestionInput } from '@/hooks/useTests'

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
  questionImageKey: string | null
  optionAImageKey: string | null
  optionBImageKey: string | null
  optionCImageKey: string | null
  optionDImageKey: string | null
}

/** A bank question becomes a fresh copy for the new test; the bank id is kept only as a tracking reference. */
export function copyForNewTest(b: BankQuestion): TestQuestionInput {
  return {
    questionType: b.questionType,
    questionText: b.questionText ?? '',
    questionImageKey: b.questionImageKey,
    questionImageUrl: b.questionImageUrl ?? null,
    optionAType: b.optionAType,
    optionA: b.optionA ?? '',
    optionAImageKey: b.optionAImageKey,
    optionAImageUrl: b.optionAImageUrl ?? null,
    optionBType: b.optionBType,
    optionB: b.optionB ?? '',
    optionBImageKey: b.optionBImageKey,
    optionBImageUrl: b.optionBImageUrl ?? null,
    optionCType: b.optionCType,
    optionC: b.optionC ?? '',
    optionCImageKey: b.optionCImageKey,
    optionCImageUrl: b.optionCImageUrl ?? null,
    optionDType: b.optionDType,
    optionD: b.optionD ?? '',
    optionDImageKey: b.optionDImageKey,
    optionDImageUrl: b.optionDImageUrl ?? null,
    correctOption: b.correctOption,
    marks: b.marks,
    bankQuestionId: b.bankQuestionId,
  }
}

function groupQuery(g: BankGroup) {
  return g.sourceTestId ? `sourceTestId=${encodeURIComponent(g.sourceTestId)}` : `title=${encodeURIComponent(g.title)}`
}

export default function QuestionBankModal({ onClose, onImport }: {
  onClose: () => void
  onImport: (questions: TestQuestionInput[]) => void
}) {
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [groups, setGroups] = useState<BankGroup[]>([])
  const [loadingGroups, setLoadingGroups] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [openGroup, setOpenGroup] = useState<BankGroup | null>(null)
  const [questions, setQuestions] = useState<BankQuestion[]>([])
  const [loadingQuestions, setLoadingQuestions] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [importingId, setImportingId] = useState<string | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 250)
    return () => clearTimeout(t)
  }, [search])

  const loadGroups = useCallback(async () => {
    setLoadingGroups(true)
    setError(null)
    try {
      const qs = debounced ? `?search=${encodeURIComponent(debounced)}` : ''
      setGroups(await authedFetch(`/api/question-bank/groups${qs}`))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load the question bank')
    } finally {
      setLoadingGroups(false)
    }
  }, [debounced])

  useEffect(() => {
    loadGroups()
  }, [loadGroups])

  async function fetchQuestions(g: BankGroup): Promise<BankQuestion[]> {
    return authedFetch(`/api/question-bank/questions?${groupQuery(g)}`)
  }

  async function open(g: BankGroup) {
    setOpenGroup(g)
    setQuestions([])
    setSelected(new Set())
    setLoadingQuestions(true)
    setError(null)
    try {
      setQuestions(await fetchQuestions(g))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load questions')
    } finally {
      setLoadingQuestions(false)
    }
  }

  async function importWholeTest(g: BankGroup) {
    setImportingId(g.sourceTestId ?? g.title)
    setError(null)
    try {
      const all = await fetchQuestions(g)
      onImport(all.map(copyForNewTest))
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed')
    } finally {
      setImportingId(null)
    }
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const allSelected = questions.length > 0 && selected.size === questions.length

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={(e) => { e.stopPropagation(); onClose() }}
    >
      <div
        className="bg-white w-full sm:max-w-3xl shadow-2xl rounded-t-2xl sm:rounded-2xl border border-zinc-200 overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-lg font-semibold text-zinc-900">
              {openGroup ? openGroup.title : 'Import from question bank'}
            </h3>
            <p className="text-sm text-zinc-500 mt-0.5">
              {openGroup
                ? 'Tick the questions to copy into your new test.'
                : 'Every question from every past test is kept here. Imported questions are copies.'}
            </p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 text-2xl leading-none" aria-label="Close">&times;</button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-3">
          {error && <div className="text-sm px-4 py-3 rounded-lg bg-rose-50 text-rose-700 border border-rose-100">{error}</div>}

          {!openGroup ? (
            <>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search past tests by name"
                className="w-full text-[15px] rounded-lg px-4 py-2.5 border border-zinc-300 bg-white focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400"
              />
              {loadingGroups ? (
                <p className="text-sm text-zinc-500 py-6 text-center">Loading...</p>
              ) : groups.length === 0 ? (
                <p className="text-sm text-zinc-500 py-8 text-center">
                  {debounced ? 'No past tests match your search.' : 'The question bank is empty. Questions are saved here automatically when you schedule an MCQ test.'}
                </p>
              ) : (
                <div className="divide-y divide-zinc-100 border border-zinc-200 rounded-xl">
                  {groups.map((g) => {
                    const id = g.sourceTestId ?? g.title
                    return (
                      <div key={id} className="px-4 py-3 flex flex-wrap items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[15px] text-zinc-900 truncate">{g.title}</p>
                          <p className="text-sm text-zinc-500">
                            {g.questionCount} question{g.questionCount === 1 ? '' : 's'}
                            {g.testExists ? '' : ' - test since deleted'}
                          </p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <button onClick={() => open(g)}
                            className="text-sm px-3 py-1.5 rounded-lg border border-zinc-300 text-zinc-700 hover:bg-zinc-50">
                            View questions
                          </button>
                          <button onClick={() => importWholeTest(g)} disabled={importingId === id}
                            className="text-sm px-3 py-1.5 rounded-lg text-white disabled:opacity-50" style={{ backgroundColor: ACCENT }}>
                            {importingId === id ? 'Importing...' : 'Import whole test'}
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <button onClick={() => setOpenGroup(null)} className="text-sm text-violet-700 hover:underline">Back to past tests</button>
                {questions.length > 0 && (
                  <label className="flex items-center gap-2 text-sm text-zinc-700 cursor-pointer">
                    <input type="checkbox" checked={allSelected} className="accent-violet-600 w-4 h-4"
                      onChange={() => setSelected(allSelected ? new Set() : new Set(questions.map((q) => q.bankQuestionId)))} />
                    Select all ({questions.length})
                  </label>
                )}
              </div>
              {loadingQuestions ? (
                <p className="text-sm text-zinc-500 py-6 text-center">Loading questions...</p>
              ) : questions.length === 0 ? (
                <p className="text-sm text-zinc-500 py-6 text-center">No questions found.</p>
              ) : (
                <div className="space-y-3">
                  {questions.map((q, i) => (
                    <label key={q.bankQuestionId}
                      className={`block rounded-xl border p-4 cursor-pointer transition-colors ${
                        selected.has(q.bankQuestionId) ? 'border-violet-400 bg-violet-50/50' : 'border-zinc-200 hover:bg-zinc-50'
                      }`}>
                      <div className="flex items-start gap-3">
                        <input type="checkbox" checked={selected.has(q.bankQuestionId)} onChange={() => toggle(q.bankQuestionId)}
                          className="accent-violet-600 w-4 h-4 mt-1 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="text-[15px] text-zinc-900 mb-2">
                            <span className="text-zinc-400 mr-1">{i + 1}.</span>
                            <QuestionContent q={q} field="question" alt={`Question ${i + 1}`} />
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-sm">
                            {(['a', 'b', 'c', 'd'] as const).map((key) => {
                              const field = `option${key.toUpperCase()}` as 'optionA' | 'optionB' | 'optionC' | 'optionD'
                              return (
                                <div key={key} className={`flex items-start gap-1.5 px-2.5 py-1.5 rounded-md border ${
                                  q.correctOption === key ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-zinc-200 text-zinc-600'
                                }`}>
                                  <span className="font-semibold shrink-0">{key.toUpperCase()}.</span>
                                  <QuestionContent q={q} field={field} alt={`Option ${key.toUpperCase()}`} />
                                </div>
                              )
                            })}
                          </div>
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
            <button onClick={onClose} className="px-5 py-2.5 rounded-lg border border-zinc-300 text-zinc-600 text-[15px] hover:bg-zinc-50">
              Cancel
            </button>
            <button
              disabled={selected.size === 0}
              onClick={() => {
                onImport(questions.filter((q) => selected.has(q.bankQuestionId)).map(copyForNewTest))
                onClose()
              }}
              className="px-5 py-2.5 rounded-lg text-white text-[15px] disabled:opacity-40" style={{ backgroundColor: ACCENT }}>
              Import {selected.size > 0 ? `${selected.size} selected` : 'selected'}
            </button>
          </div>
        )}
      </div>
    </motion.div>
  )
}
