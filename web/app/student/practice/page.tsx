'use client'

// Student-facing untimed practice view for the new Q&A / Practice Questions
// content categories. Browses the Subject → Unit → Class tree (read-only,
// via GET /api/qa-content/tree) and, once a Class is picked, shows its
// questions with a per-question "show answer" toggle plus any attached
// PDF/Word resources as direct download/view links.

import { useEffect, useState } from 'react'
import { authedFetch } from '@/lib/apiClient'
import QuestionContent from '@/components/shared/QuestionContent'
import type { OptionKey, QuestionContentFields } from '@/hooks/useTests'

type Category = 'qa' | 'practice'

interface Subtopic {
  id: string
  name: string
  is_visible: boolean
}
interface Chapter {
  id: string
  name: string
  is_visible: boolean
  subtopics: Subtopic[]
}
interface Subject {
  id: string
  name: string
  grade: number
  is_visible: boolean
  chapters: Chapter[]
}
interface BankQuestion extends QuestionContentFields {
  bankQuestionId: string
  correctOption: OptionKey
  marks: number
}
interface Resource {
  id: string
  title: string
  size_bytes: number | null
  mime_type: string | null
  signedUrl: string
}

function fmtBytes(n: number | null) {
  if (!n) return ''
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}

function ClassView({ subtopic, onBack }: { subtopic: Subtopic; onBack: () => void }) {
  const [questions, setQuestions] = useState<BankQuestion[]>([])
  const [resources, setResources] = useState<Resource[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [revealed, setRevealed] = useState<Set<string>>(new Set())

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      try {
        const [qs, rs] = await Promise.all([
          authedFetch(`/api/qa-content/subtopics/${subtopic.id}/questions`),
          authedFetch(`/api/qa-content/subtopics/${subtopic.id}/resources`),
        ])
        if (!cancelled) {
          setQuestions(qs)
          setResources(rs)
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [subtopic.id])

  function toggleReveal(id: string) {
    setRevealed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-5">
      <button onClick={onBack} className="text-sm text-primary hover:underline">
        ← Back
      </button>
      <h2 className="text-xl font-semibold text-gray-900">{subtopic.name}</h2>

      {error && <div className="text-sm px-4 py-3 rounded-lg bg-red-50 text-red-700 border border-red-100">{error}</div>}

      {resources.length > 0 && (
        <div className="border border-gray-200 rounded-xl p-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Attached resources</h3>
          <div className="space-y-1.5">
            {resources.map((r) => (
              <a
                key={r.id}
                href={r.signedUrl}
                target="_blank"
                rel="noreferrer"
                className="block text-sm text-primary hover:underline"
              >
                {r.title} {r.size_bytes ? `(${fmtBytes(r.size_bytes)})` : ''}
              </a>
            ))}
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-gray-500">Loading questions...</p>
      ) : questions.length === 0 ? (
        <p className="text-sm text-gray-500">No questions here yet.</p>
      ) : (
        <div className="space-y-4">
          {questions.map((q, i) => (
            <div key={q.bankQuestionId} className="border border-gray-200 rounded-xl p-4">
              <div className="text-[15px] text-gray-900 mb-3">
                <span className="text-gray-400 mr-1">{i + 1}.</span>
                <QuestionContent q={q} field="question" alt={`Question ${i + 1}`} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm mb-3">
                {(['a', 'b', 'c', 'd'] as const).map((key) => {
                  const field = `option${key.toUpperCase()}` as 'optionA' | 'optionB' | 'optionC' | 'optionD'
                  const isCorrect = revealed.has(q.bankQuestionId) && q.correctOption === key
                  return (
                    <div
                      key={key}
                      className={`flex items-start gap-1.5 px-3 py-2 rounded-md border ${
                        isCorrect ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-gray-200 text-gray-700'
                      }`}
                    >
                      <span className="font-semibold shrink-0">{key.toUpperCase()}.</span>
                      <QuestionContent q={q} field={field} alt={`Option ${key.toUpperCase()}`} />
                    </div>
                  )
                })}
              </div>
              <button
                onClick={() => toggleReveal(q.bankQuestionId)}
                className="text-xs font-medium text-primary hover:underline"
              >
                {revealed.has(q.bankQuestionId) ? 'Hide answer' : 'Show answer'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default function StudentPracticePage() {
  const [tab, setTab] = useState<Category>('qa')
  const [tree, setTree] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openSubjectId, setOpenSubjectId] = useState<string | null>(null)
  const [openChapterId, setOpenChapterId] = useState<string | null>(null)
  const [activeSubtopic, setActiveSubtopic] = useState<Subtopic | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setActiveSubtopic(null)
    authedFetch(`/api/qa-content/tree?category=${tab}`)
      .then((data) => {
        if (!cancelled) setTree(data)
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [tab])

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Q&amp;A / Practice Questions</h1>

      <div className="flex gap-2 border-b border-gray-200">
        {(['qa', 'practice'] as const).map((c) => (
          <button
            key={c}
            onClick={() => setTab(c)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              tab === c ? 'border-primary text-primary' : 'border-transparent text-gray-500'
            }`}
          >
            {c === 'qa' ? 'Q&A' : 'Practice Questions'}
          </button>
        ))}
      </div>

      {error && <div className="text-sm px-4 py-3 rounded-lg bg-red-50 text-red-700 border border-red-100">{error}</div>}

      {activeSubtopic ? (
        <ClassView subtopic={activeSubtopic} onBack={() => setActiveSubtopic(null)} />
      ) : loading ? (
        <p className="text-sm text-gray-500">Loading...</p>
      ) : tree.length === 0 ? (
        <p className="text-sm text-gray-500">Nothing published here yet.</p>
      ) : (
        <div className="divide-y divide-gray-100 border border-gray-200 rounded-xl">
          {tree.map((subject) => (
            <div key={subject.id}>
              <button
                onClick={() => setOpenSubjectId(openSubjectId === subject.id ? null : subject.id)}
                className="w-full text-left px-4 py-3 flex items-center justify-between hover:bg-gray-50"
              >
                <span className="text-[15px] text-gray-900">{subject.name}</span>
                <span className="text-xs text-gray-500">Grade {subject.grade}</span>
              </button>
              {openSubjectId === subject.id && (
                <div className="px-4 pb-3 space-y-1.5 bg-gray-50/60">
                  {subject.chapters.map((chapter) => (
                    <div key={chapter.id} className="border border-gray-200 rounded-lg bg-white">
                      <button
                        onClick={() => setOpenChapterId(openChapterId === chapter.id ? null : chapter.id)}
                        className="w-full text-left px-3 py-2 text-sm text-gray-800 hover:bg-gray-50"
                      >
                        {chapter.name}
                      </button>
                      {openChapterId === chapter.id && (
                        <div className="px-3 pb-2 space-y-1">
                          {chapter.subtopics.map((sub) => (
                            <button
                              key={sub.id}
                              onClick={() => setActiveSubtopic(sub)}
                              className="w-full text-left text-sm px-2 py-1.5 rounded-lg hover:bg-primary/5 text-primary"
                            >
                              {sub.name} →
                            </button>
                          ))}
                          {chapter.subtopics.length === 0 && (
                            <p className="text-xs text-gray-400 px-2 py-1">No classes yet.</p>
                          )}
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
}
