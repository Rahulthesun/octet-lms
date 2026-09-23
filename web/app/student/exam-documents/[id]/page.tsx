'use client'

// Student > Exam documents > one exam
//
// The screen the hall ticket / marksheet notifications link to. The student
// uploads a JPG, PNG or PDF (straight to R2 via a presigned URL) or, for the
// marksheet, enters their marks manually. All state comes from the API.

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { authedFetch } from '@/lib/apiClient'
import {
  ACCEPTED_TYPES,
  MAX_UPLOAD_BYTES,
  submitManualMarks,
  uploadExamFile,
  validateFile,
  type ExamKind,
  type MyExamEvent,
  type MySubmission,
} from '@/hooks/useExamDocuments'

function formatDate(iso: string | null | undefined) {
  if (!iso) return '-'
  const d = iso.length === 10 ? new Date(`${iso}T00:00:00`) : new Date(iso)
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function SubmissionSummary({ sub }: { sub: MySubmission }) {
  if (sub.status !== 'submitted') return null
  return (
    <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
      <p className="text-base text-green-800">Submitted on {formatDate(sub.submittedAt)}</p>
      {sub.entryMode === 'MANUAL' ? (
        <p className="text-base text-green-800">
          Marks entered: {sub.marksObtained} out of {sub.maxMarks}
          {sub.grade ? ` (grade ${sub.grade})` : ''}
        </p>
      ) : (
        <p className="text-base text-green-800 flex flex-wrap items-center gap-3">
          <span>{sub.fileName}</span>
          {sub.fileUrl && (
            <a href={sub.fileUrl} target="_blank" rel="noopener noreferrer" className="underline underline-offset-2">
              View file
            </a>
          )}
        </p>
      )}
      <p className="text-sm text-green-700 mt-1">You can upload again to replace it.</p>
    </div>
  )
}

function UploadBox({ eventId, kind, onDone }: { eventId: string; kind: ExamKind; onDone: () => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [progress, setProgress] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const choose = (f: File | null) => {
    setSuccess(false)
    setProgress(0)
    if (!f) {
      setFile(null)
      setError(null)
      return
    }
    const invalid = validateFile(f)
    setError(invalid)
    setFile(invalid ? null : f)
  }

  const upload = async () => {
    if (!file) return
    setError(null)
    setUploading(true)
    setProgress(0)
    try {
      await uploadExamFile(eventId, kind, file, setProgress)
      setSuccess(true)
      setFile(null)
      if (inputRef.current) inputRef.current.value = ''
      onDone()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div>
      <label
        htmlFor={`file-${kind}`}
        className="block border-2 border-dashed border-gray-300 rounded-xl px-6 py-8 text-center cursor-pointer hover:border-primary transition-colors"
      >
        <p className="text-base text-primary">{file ? file.name : 'Choose a JPG, PNG or PDF file'}</p>
        <p className="text-sm text-gray-500 mt-1">
          Maximum size {MAX_UPLOAD_BYTES / (1024 * 1024)} MB
          {file ? ` - selected ${(file.size / (1024 * 1024)).toFixed(2)} MB` : ''}
        </p>
      </label>
      <input
        ref={inputRef}
        id={`file-${kind}`}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        className="sr-only"
        onChange={(e) => choose(e.target.files?.[0] ?? null)}
        disabled={uploading}
      />

      {uploading && (
        <div className="mt-4" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-2 rounded-full bg-gray-200 overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-sm text-gray-600 mt-1">Uploading {progress}%</p>
        </div>
      )}

      {error && (
        <div className="mt-4 px-4 py-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-base" role="alert">
          {error}
        </div>
      )}
      {success && !error && (
        <div className="mt-4 px-4 py-3 rounded-lg border border-green-200 bg-green-50 text-green-700 text-base">
          Uploaded successfully.
        </div>
      )}

      <button
        onClick={upload}
        disabled={!file || uploading}
        className="mt-4 px-6 py-2.5 bg-primary text-white text-base rounded-lg hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {uploading ? 'Uploading...' : 'Upload'}
      </button>
    </div>
  )
}

function ManualMarks({ eventId, onDone }: { eventId: string; onDone: () => void }) {
  const [obtained, setObtained] = useState('')
  const [max, setMax] = useState('')
  const [grade, setGrade] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    const o = Number(obtained)
    const m = Number(max)
    if (obtained === '' || Number.isNaN(o) || o < 0) return setError('Enter the marks you obtained.')
    if (max === '' || Number.isNaN(m) || m <= 0) return setError('Enter the maximum marks.')
    if (o > m) return setError('Marks obtained cannot be more than the maximum marks.')
    setSaving(true)
    try {
      await submitManualMarks(eventId, { marksObtained: o, maxMarks: m, grade: grade.trim() || undefined })
      setSuccess(true)
      onDone()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save your marks.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit}>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="text-sm text-gray-500 block mb-1" htmlFor="marks-obtained">Marks obtained</label>
          <input
            id="marks-obtained"
            type="number"
            min="0"
            step="any"
            value={obtained}
            onChange={(e) => setObtained(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-base text-primary outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="text-sm text-gray-500 block mb-1" htmlFor="marks-max">Maximum marks</label>
          <input
            id="marks-max"
            type="number"
            min="1"
            step="any"
            value={max}
            onChange={(e) => setMax(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-base text-primary outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="text-sm text-gray-500 block mb-1" htmlFor="marks-grade">Grade (optional)</label>
          <input
            id="marks-grade"
            type="text"
            maxLength={20}
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-base text-primary outline-none focus:border-primary"
          />
        </div>
      </div>
      {error && (
        <div className="mt-4 px-4 py-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-base" role="alert">
          {error}
        </div>
      )}
      {success && !error && (
        <div className="mt-4 px-4 py-3 rounded-lg border border-green-200 bg-green-50 text-green-700 text-base">Marks saved.</div>
      )}
      <button
        type="submit"
        disabled={saving}
        className="mt-4 px-6 py-2.5 bg-primary text-white text-base rounded-lg hover:opacity-90 disabled:opacity-40"
      >
        {saving ? 'Saving...' : 'Save marks'}
      </button>
    </form>
  )
}

function Card({
  title,
  sub,
  children,
  highlight,
}: {
  title: string
  sub: string
  children: React.ReactNode
  highlight: boolean
}) {
  return (
    <div className={`bg-white rounded-2xl shadow-sm p-6 border-2 ${highlight ? 'border-primary/40' : 'border-transparent'}`}>
      <h2 className="text-xl text-primary">{title}</h2>
      <p className="text-base text-muted mb-5">{sub}</p>
      {children}
    </div>
  )
}

function ExamDocumentContent() {
  const params = useParams()
  const search = useSearchParams()
  const id = typeof params.id === 'string' ? params.id : ''
  const focus = search.get('kind') === 'marksheet' ? 'marksheet' : 'hall-ticket'

  const [event, setEvent] = useState<MyExamEvent | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [marksMode, setMarksMode] = useState<'upload' | 'manual'>('upload')

  const load = useCallback(async () => {
    if (!id) return
    setError(null)
    try {
      setEvent(await authedFetch(`/api/exam-documents/me/events/${id}`))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load this exam')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => {
    load()
  }, [load])

  if (loading) return <div className="p-8 text-base text-muted">Loading...</div>
  if (error || !event) {
    return (
      <div className="p-8">
        <div className="px-4 py-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-base">
          {error ?? 'Exam not found.'}
        </div>
      </div>
    )
  }

  const hallCard = (
    <Card key="hall" title="Hall ticket" sub="Upload a clear photo or PDF of your hall ticket." highlight={focus === 'hall-ticket'}>
      {!event.hallTicket.open ? (
        <p className="text-base text-muted">Hall ticket uploads have not been opened for this exam yet.</p>
      ) : (
        <>
          <SubmissionSummary sub={event.hallTicket} />
          <UploadBox eventId={event.id} kind="hall-ticket" onDone={load} />
        </>
      )}
    </Card>
  )

  const marksCard = (
    <Card key="marks" title="12th marksheet" sub="Upload your marksheet, or type in your marks." highlight={focus === 'marksheet'}>
      {!event.marksheet.open ? (
        <p className="text-base text-muted">Results have not been opened for this exam yet.</p>
      ) : (
        <>
          <SubmissionSummary sub={event.marksheet} />
          <div className="flex border border-gray-200 rounded-full overflow-hidden w-fit mb-5">
            {(['upload', 'manual'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMarksMode(m)}
                className={`px-4 py-1.5 text-base transition-colors ${
                  marksMode === m ? 'bg-primary text-white' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {m === 'upload' ? 'Upload marksheet' : 'Enter marks'}
              </button>
            ))}
          </div>
          {marksMode === 'upload' ? (
            <UploadBox eventId={event.id} kind="marksheet" onDone={load} />
          ) : (
            <ManualMarks eventId={event.id} onDone={load} />
          )}
        </>
      )}
    </Card>
  )

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <Link href="/student/exam-documents" className="text-base text-muted hover:text-primary">
        Back to exam documents
      </Link>
      <div className="mt-3 mb-6">
        <h1 className="text-3xl md:text-4xl text-primary mb-1">{event.name}</h1>
        <p className="text-muted text-base">Exam date: {formatDate(event.examDate)}</p>
      </div>
      <div className="flex flex-col gap-6">{focus === 'marksheet' ? [marksCard, hallCard] : [hallCard, marksCard]}</div>
    </div>
  )
}

export default function ExamDocumentPage() {
  return (
    <Suspense fallback={<div className="p-8 text-base text-muted">Loading...</div>}>
      <ExamDocumentContent />
    </Suspense>
  )
}
