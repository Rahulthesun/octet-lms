'use client'

// Student > Exam documents: every exam the student has been asked for
// documents on, with what is submitted and what is still pending.

import Link from 'next/link'
import { useMyExamEvents, type MySubmission } from '@/hooks/useExamDocuments'

function formatDate(iso: string) {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function StatusPill({ label, sub }: { label: string; sub: MySubmission }) {
  const text = !sub.open ? 'Not open yet' : sub.status === 'submitted' ? 'Submitted' : 'Pending'
  const cls = !sub.open
    ? 'bg-gray-100 text-gray-600'
    : sub.status === 'submitted'
      ? 'bg-green-50 text-green-700'
      : 'bg-amber-50 text-amber-700'
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-base text-gray-700">{label}</span>
      <span className={`text-sm px-2.5 py-0.5 rounded-full ${cls}`}>{text}</span>
    </div>
  )
}

export default function StudentExamDocumentsPage() {
  const { events, loading, error } = useMyExamEvents()

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl md:text-4xl text-primary mb-1">Exam documents</h1>
        <p className="text-muted text-base">
          Upload your hall ticket before each board exam and your marksheet after the results.
        </p>
      </div>

      {loading && <p className="text-base text-muted py-8 text-center">Loading...</p>}
      {error && <div className="px-4 py-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-base">{error}</div>}
      {!loading && !error && events.length === 0 && (
        <div className="py-16 text-center text-muted text-base">Nothing has been requested from you yet.</div>
      )}

      <div className="flex flex-col gap-4">
        {events.map((ev) => (
          <div key={ev.id} className="bg-white rounded-2xl shadow-sm p-5">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
              <div>
                <h2 className="text-xl text-primary">{ev.name}</h2>
                <p className="text-base text-muted">Exam date: {formatDate(ev.examDate)}</p>
              </div>
              <Link
                href={`/student/exam-documents/${ev.id}?kind=${
                  ev.marksheet.open && ev.marksheet.status === 'pending' ? 'marksheet' : 'hall-ticket'
                }`}
                className="px-5 py-2 text-base bg-primary text-white rounded-lg hover:opacity-90"
              >
                Open
              </Link>
            </div>
            <div className="flex flex-col gap-2">
              <StatusPill label="Hall ticket" sub={ev.hallTicket} />
              <StatusPill label="12th marksheet" sub={ev.marksheet} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
