'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { authedFetch } from '@/lib/apiClient'
import QuestionContent from '@/components/shared/QuestionContent'
import { Watermark } from '@/components/shared/ExamSecurity'
import { SkeletonList } from '@/components/ui/Skeleton'

type Category = 'qa' | 'practice'

interface UnitItem {
  id: string
  name: string
  subjectId: string
  subtopicId: string
  grade: number
  category: Category
  mcqCount: number
  descriptiveCount: number
  resourcesCount: number
  totalQuestions: number
}

function Chevron({ open, className = 'w-3.5 h-3.5' }: { open: boolean; className?: string }) {
  return (
    <svg
      className={`${className} transition-transform duration-200 ${open ? 'rotate-90' : ''}`}
      viewBox="0 0 16 16"
      fill="none"
    >
      <path
        d="M 6,4 L 10,8 L 6,12"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function UnitDetailView({ unit }: { unit: UnitItem }) {
  const [content, setContent] = useState<{
    unit: any
    subtopicId: string
    mcqs: any[]
    descriptive: any[]
    resources: any[]
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [revealedMcqs, setRevealedMcqs] = useState<Set<string>>(new Set())
  const [revealedDesc, setRevealedDesc] = useState<Set<string>>(new Set())

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    authedFetch(`/api/qa-content/units/${unit.id}/content`)
      .then((data) => {
        if (!cancelled) setContent(data)
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load content')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [unit.id])

  const toggleMcq = (id: string) => {
    setRevealedMcqs((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleDesc = (id: string) => {
    setRevealedDesc((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  if (loading) {
    return (
      <div className="p-5">
        <SkeletonList count={3} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 text-sm text-red-600 bg-red-50 rounded-lg border border-red-100">
        {error}
      </div>
    )
  }

  const mcqs = content?.mcqs || []
  const descriptive = content?.descriptive || []
  const resources = content?.resources || []

  return (
    <div className="relative p-5 space-y-6 overflow-hidden">
      <Watermark />

      {/* Resources if any */}
      {resources.length > 0 && (
        <div className="bg-purple-50/70 border border-purple-100 rounded-xl p-4">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-purple-900 mb-2">
            Unit Resources
          </h4>
          <div className="space-y-1.5">
            {resources.map((r: any) => (
              <a
                key={r.id}
                href={r.signedUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-primary hover:underline font-medium flex items-center gap-2"
              >
                <span>📄</span> {r.title}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* MCQs */}
      {mcqs.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <span>Multiple Choice Questions</span>
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-normal">
              {mcqs.length}
            </span>
          </h4>
          <div className="space-y-4">
            {mcqs.map((q: any, idx: number) => {
              const qId = q.bankQuestionId || q.id
              const isRevealed = revealedMcqs.has(qId)
              return (
                <div
                  key={qId}
                  className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs"
                >
                  <div className="text-[15px] text-gray-900 mb-3 font-medium">
                    <span className="text-purple-700 font-bold mr-2">Q{idx + 1}.</span>
                    <QuestionContent q={q} field="question" alt={`Question ${idx + 1}`} />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm mb-3">
                    {(['a', 'b', 'c', 'd'] as const).map((key) => {
                      const field = `option${key.toUpperCase()}` as
                        | 'optionA'
                        | 'optionB'
                        | 'optionC'
                        | 'optionD'
                      const isCorrect = isRevealed && q.correctOption === key
                      return (
                        <div
                          key={key}
                          className={`flex items-start gap-2 p-2.5 rounded-lg border text-sm transition-colors ${
                            isCorrect
                              ? 'border-emerald-400 bg-emerald-50 text-emerald-900 font-medium'
                              : 'border-gray-200 bg-gray-50/50 text-gray-700'
                          }`}
                        >
                          <span className="font-bold text-xs uppercase px-1.5 py-0.5 rounded bg-white border border-gray-200 text-gray-600">
                            {key}
                          </span>
                          <div className="flex-1">
                            <QuestionContent
                              q={q}
                              field={field}
                              alt={`Option ${key.toUpperCase()}`}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <button
                      onClick={() => toggleMcq(qId)}
                      className="text-xs font-semibold text-purple-700 hover:text-purple-900 transition-colors cursor-pointer"
                    >
                      {isRevealed ? 'Hide Answer' : 'Show Answer'}
                    </button>
                    {isRevealed && (
                      <span className="text-xs text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        Correct: Option {String(q.correctOption).toUpperCase()}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Descriptive */}
      {descriptive.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2">
            <span>Descriptive Questions & Solutions</span>
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-normal">
              {descriptive.length}
            </span>
          </h4>
          <div className="space-y-4">
            {descriptive.map((d: any, idx: number) => {
              const isRevealed = revealedDesc.has(d.id)
              return (
                <div
                  key={d.id}
                  className="bg-white rounded-xl border border-gray-200 p-4 shadow-xs"
                >
                  <div className="text-[15px] text-gray-900 mb-3 font-medium">
                    <span className="text-purple-700 font-bold mr-2">Q{idx + 1}.</span>
                    <span>{d.question_text || d.question}</span>
                    {d.question_image_url && (
                      <img
                        src={d.question_image_url}
                        alt="Question"
                        className="mt-2 max-h-48 rounded border border-gray-200"
                      />
                    )}
                  </div>

                  {isRevealed && (
                    <div className="mt-3 p-3 bg-purple-50/60 border border-purple-200 rounded-lg">
                      <p className="text-xs font-semibold text-purple-900 uppercase tracking-wide mb-1">
                        Model Solution / Answer
                      </p>
                      <p className="text-sm text-gray-800 whitespace-pre-wrap">
                        {d.answer_text || d.answer || 'No solution provided.'}
                      </p>
                      {d.answer_image_url && (
                        <img
                          src={d.answer_image_url}
                          alt="Answer"
                          className="mt-2 max-h-48 rounded border border-gray-200"
                        />
                      )}
                    </div>
                  )}

                  <div className="pt-2 border-t border-gray-100 mt-3">
                    <button
                      onClick={() => toggleDesc(d.id)}
                      className="text-xs font-semibold text-purple-700 hover:text-purple-900 transition-colors cursor-pointer"
                    >
                      {isRevealed ? 'Hide Solution' : 'Show Solution / Answer'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {mcqs.length === 0 && descriptive.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-4">
          No questions uploaded in this unit yet.
        </p>
      )}
    </div>
  )
}

export function StudentQaSection({
  category,
  title,
  studentGrade,
}: {
  category: Category
  title: string
  studentGrade?: number
}) {
  const [open, setOpen] = useState(false)
  const [units, setUnits] = useState<UnitItem[]>([])
  const [loading, setLoading] = useState(false)
  const [openUnitId, setOpenUnitId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const grade = studentGrade === 11 ? 11 : 12
    authedFetch(`/api/qa-content/units?category=${category}&grade=${grade}`)
      .then((data) => {
        if (!cancelled) setUnits(Array.isArray(data) ? data : [])
      })
      .catch(() => {
        if (!cancelled) setUnits([])
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [category, studentGrade])

  const toggleUnit = (id: string) => {
    setOpenUnitId((prev) => (prev === id ? null : id))
  }

  return (
    <div className="bg-white rounded-lg border border-[#e2e5ec] border-l-4 border-l-[#5B21B6] shadow-[0_2px_12px_rgba(15,23,42,0.06)] overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-[#F4F1F8] transition-colors cursor-pointer"
      >
        <Chevron open={open} className="w-4 h-4 text-muted shrink-0" />
        <span className="text-[#5B21B6] shrink-0 font-bold">
          <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none">
            <path
              d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-4l-4 4v-4H5a2 2 0 01-2-2V5z"
              stroke="currentColor"
              strokeWidth="1.5"
            />
          </svg>
        </span>
        <span className="flex-1 text-primary text-base font-semibold">{title}</span>
        <span className="text-muted text-[14px] shrink-0 font-data">
          {units.length} unit{units.length !== 1 ? 's' : ''}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: 'easeInOut' }}
            className="overflow-hidden border-t border-[#F4F1F8]"
          >
            {loading ? (
              <div className="p-4">
                <SkeletonList count={3} />
              </div>
            ) : units.length === 0 ? (
              <div className="p-5 text-sm text-gray-400 text-center">
                No {title} units published yet.
              </div>
            ) : (
              <div className="divide-y divide-[#F4F1F8]">
                {units.map((unit, idx) => {
                  const unitOpen = openUnitId === unit.id
                  return (
                    <div key={unit.id}>
                      <button
                        onClick={() => toggleUnit(unit.id)}
                        className="w-full flex items-center gap-3 pl-8 pr-5 py-3 text-left hover:bg-[#F4F1F8] transition-colors cursor-pointer"
                      >
                        <Chevron open={unitOpen} className="w-3.5 h-3.5 text-muted shrink-0" />
                        <span className="text-muted text-[14px] w-auto shrink-0 font-medium">
                          Unit - {idx + 1}
                        </span>
                        <span className="flex-1 text-primary/90 text-[15px] font-medium leading-snug">
                          {unit.name}
                        </span>
                        <span className="text-muted text-[13px] shrink-0 bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full">
                          {unit.totalQuestions} question{unit.totalQuestions !== 1 ? 's' : ''}
                        </span>
                      </button>

                      <AnimatePresence initial={false}>
                        {unitOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2, ease: 'easeInOut' }}
                            className="overflow-hidden bg-[#FAF9FB]"
                          >
                            <UnitDetailView unit={unit} />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  )
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
