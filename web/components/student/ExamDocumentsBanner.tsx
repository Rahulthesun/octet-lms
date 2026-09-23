'use client'

// Dashboard reminder shown until the student has uploaded every requested
// exam document (hall ticket / marksheet). Driven entirely by
// /api/exam-documents/me/pending, so it disappears as soon as they submit.

import Link from 'next/link'
import { useMyPendingExamDocuments } from '@/hooks/useExamDocuments'

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function ExamDocumentsBanner() {
  const { pending } = useMyPendingExamDocuments()
  if (pending.length === 0) return null

  return (
    <div className="space-y-3" role="region" aria-label="Exam documents required">
      {pending.map((p) => (
        <div
          key={`${p.eventId}-${p.kind}`}
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4"
        >
          <div>
            <p className="text-base text-amber-900">
              {p.kind === 'HALL_TICKET'
                ? `Upload your hall ticket for ${p.examName}`
                : `Submit your 12th marksheet or marks for ${p.examName}`}
            </p>
            <p className="text-sm text-amber-800">Exam date: {formatDate(p.examDate)}</p>
          </div>
          <Link
            href={p.link}
            className="shrink-0 px-5 py-2 text-base bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors text-center"
          >
            {p.kind === 'HALL_TICKET' ? 'Upload hall ticket' : 'Submit marksheet'}
          </Link>
        </div>
      ))}
    </div>
  )
}
