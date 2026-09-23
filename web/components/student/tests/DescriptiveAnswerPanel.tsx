'use client'

import { useRef, useState } from 'react'
import { startMyAttempt, submitMyAttempt, type StudentTestListItem } from '@/hooks/useTests'

const card = 'bg-white rounded-lg border border-[#e2e5ec]'

export default function DescriptiveAnswerPanel({ test, onSubmitted }: {
  test: StudentTestListItem
  onSubmitted: () => void
}) {
  const [answerText, setAnswerText] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleSubmit() {
    if (!answerText.trim() && !file) return
    setSubmitting(true)
    setError(null)
    try {
      if (!test.myAttempt) await startMyAttempt(test.id)
      await submitMyAttempt(test.id, { answerText: answerText.trim(), answerFile: file || undefined })
      onSubmitted()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to submit your answer')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={`${card} p-5 mt-3`}>
      {(test.questionText || test.questionFileUrl) && (
        <div className="mb-4">
          <p className="text-muted text-[13px] mb-1">Question</p>
          {test.questionText && <p className="text-primary text-[15px] whitespace-pre-wrap">{test.questionText}</p>}
          {test.questionFileUrl && (
            <a href={test.questionFileUrl} target="_blank" rel="noreferrer" className="text-brand text-[14px] underline">
              View question paper
            </a>
          )}
        </div>
      )}

      <p className="text-muted text-[13px] mb-1.5">Your answer</p>
      <textarea value={answerText} onChange={(e) => setAnswerText(e.target.value)} rows={6}
        placeholder="Type your answer here…"
        className="w-full text-[15px] rounded-md px-4 py-3 border border-[#e2e5ec] focus:outline-none focus:ring-2 focus:ring-brand/20 resize-none mb-3" />

      <div className="flex items-center gap-3 mb-4">
        <button type="button" onClick={() => fileRef.current?.click()}
          className="px-3.5 py-2 rounded-md border border-[#e2e5ec] text-[14px] text-primary hover:bg-accent1/40 transition-colors">
          {file ? `Change file (${file.name})` : 'Or upload a file instead'}
        </button>
        {file && (
          <button type="button" onClick={() => setFile(null)} className="text-[13px] text-muted hover:text-rose-600">Remove</button>
        )}
        <input ref={fileRef} type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] || null)} />
      </div>

      {error && <p className="text-[14px] text-rose-600 mb-3">{error}</p>}

      <button onClick={handleSubmit} disabled={submitting || (!answerText.trim() && !file)}
        className="px-5 py-2.5 rounded-md bg-brand text-white text-[15px] hover:opacity-90 transition-opacity disabled:opacity-40">
        {submitting ? 'Submitting…' : 'Submit Answer'}
      </button>
      <p className="text-muted text-[13px] mt-2">Your answer will be manually graded and the result emailed to you and your parents once evaluated.</p>
    </div>
  )
}
