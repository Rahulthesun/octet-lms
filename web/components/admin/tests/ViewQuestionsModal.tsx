'use client'

// components/admin/tests/ViewQuestionsModal.tsx
//
// Read-only "View questions" panel for a conducted MCQ test — every
// question with its 4 options and the correct answer highlighted, fetched
// from the same GET /api/tests/:id endpoint the edit form already uses
// (it already returns full questions with correctOption). Watermarked the
// same way the question-bank views are, since this is another place full
// question content + answers are visible to an admin.

import { useAdminTestDetail } from '@/hooks/useTests'
import QuestionContent from '@/components/shared/QuestionContent'
import { Watermark, useExamGuard } from '@/components/shared/ExamSecurity'
import { XIcon } from './icons'

export default function ViewQuestionsModal({ testId, title, onClose }: {
  testId: string
  title: string
  onClose: () => void
}) {
  const { test, loading, error } = useAdminTestDetail(testId)
  const questions = test?.questions || []
  const { blurred } = useExamGuard(true)

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className={`bg-white rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-y-auto transition-[filter] duration-150 ${blurred ? 'blur-xl select-none' : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white border-b border-zinc-200 px-5 py-4 flex items-center justify-between z-30">
          <div>
            <p className="text-[15px] font-medium text-zinc-900">{title}</p>
            <p className="text-sm text-zinc-500">Questions &amp; answer key (read-only)</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-500">
            <XIcon className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {loading && <p className="text-sm text-zinc-400">Loading questions…</p>}
          {error && <p className="text-sm text-rose-600">{error}</p>}
          {!loading && !error && questions.length === 0 && (
            <p className="text-sm text-zinc-400">No questions found for this test.</p>
          )}
          {questions.map((q, i) => (
            <div key={i} className="relative overflow-hidden border border-zinc-200 rounded-xl p-4">
              <Watermark lines={['OCTET']} />
              <p className="text-xs text-zinc-400 mb-1.5">Question {i + 1} · {q.marks} mark{q.marks === 1 ? '' : 's'}</p>
              <div className="text-[15px] text-zinc-900 mb-3">
                <QuestionContent q={q} field="question" alt={`Question ${i + 1}`} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(['a', 'b', 'c', 'd'] as const).map((k) => {
                  const field = `option${k.toUpperCase()}` as 'optionA' | 'optionB' | 'optionC' | 'optionD'
                  const isCorrect = q.correctOption === k
                  return (
                    <div
                      key={k}
                      className={`flex items-start gap-2 px-3 py-2 rounded-lg border text-sm ${
                        isCorrect ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-zinc-200 text-zinc-600'
                      }`}
                    >
                      <span className="font-inter uppercase shrink-0">{k}.</span>
                      <QuestionContent q={q} field={field} alt={`Option ${k.toUpperCase()}`} />
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
