'use client'

// Student > Exam documents > one exam
//
// The screen the hall ticket / marksheet notifications link to. The student
// uploads a JPG, PNG or PDF (straight to R2 via a presigned URL) or, for the
// marksheet, enters their marks manually. All state comes from the API.
//
// Before uploading, the chosen file is previewed and can be removed or
// swapped; after uploading, the submitted file can be viewed, replaced or
// deleted while the window is open.

import { Suspense, useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { authedFetch } from '@/lib/apiClient'
import {
  ACCEPTED_TYPES,
  MAX_UPLOAD_BYTES,
  deleteExamSubmission,
  submitManualMarks,
  uploadExamFile,
  validateFile,
  type ExamKind,
  type MyExamEvent,
  type MySubmission,
} from '@/hooks/useExamDocuments'
import PageHeader from '@/components/ui/PageHeader'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { btnPrimary, btnSecondarySm, btnDangerSm } from '@/components/ui/buttonStyles'

function formatDate(iso: string | null | undefined) {
  if (!iso) return '-'
  const d = iso.length === 10 ? new Date(`${iso}T00:00:00`) : new Date(iso)
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatSize(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(2)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`
}

function FileIcon({ pdf }: { pdf: boolean }) {
  return (
    <div className={`w-12 h-12 rounded-lg flex items-center justify-center shrink-0 ${pdf ? 'bg-rose-50 text-rose-600' : 'bg-violet-50 text-violet-700'}`}>
      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M7 3h7l5 5v13H7z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M14 3v5h5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    </div>
  )
}

/** Full-screen preview of an image the student is about to upload. */
function ImagePreview({ src, name, onClose }: { src: string; name: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="fixed inset-0 z-[60] bg-black/80 flex flex-col" onClick={onClose} role="dialog" aria-modal="true" aria-label={`Preview of ${name}`}>
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <p className="text-sm truncate">{name}</p>
        <button onClick={onClose} className="text-sm px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20">Close</button>
      </div>
      <div className="flex-1 flex items-center justify-center p-4 min-h-0">
        {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
        <img src={src} alt={name} className="max-w-full max-h-full object-contain rounded-md" onClick={(e) => e.stopPropagation()} />
      </div>
    </div>
  )
}

function SubmissionSummary({ sub, onDelete }: { sub: MySubmission; onDelete?: () => void }) {
  if (sub.status !== 'submitted') return null
  return (
    <div className="mb-5 rounded-xl border border-green-200 bg-green-50 px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-green-800">Submitted on {formatDate(sub.submittedAt)}</p>
          {sub.entryMode === 'MANUAL' ? (
            <p className="text-sm text-green-800 mt-0.5">
              Marks entered: {sub.marksObtained} out of {sub.maxMarks}
              {sub.grade ? ` (grade ${sub.grade})` : ''}
            </p>
          ) : (
            <p className="text-sm text-green-800 mt-0.5 truncate">{sub.fileName}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {sub.fileUrl && (
            <a href={sub.fileUrl} target="_blank" rel="noopener noreferrer" className={btnSecondarySm}>
              View
            </a>
          )}
          {onDelete && <button onClick={onDelete} className={btnDangerSm}>Delete</button>}
        </div>
      </div>
      {onDelete && <p className="text-xs text-green-700 mt-2">Wrong document? Delete it, or choose a new file below to replace it.</p>}
    </div>
  )
}

function UploadBox({ eventId, kind, hasSubmission, onDone }: {
  eventId: string
  kind: ExamKind
  hasSubmission: boolean
  onDone: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)
  const [progress, setProgress] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [confirmReplace, setConfirmReplace] = useState(false)

  // A local object URL so the student can check the file before it is sent.
  useEffect(() => {
    if (!file) { setPreviewUrl(null); return }
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  const clear = () => {
    setFile(null)
    setError(null)
    setProgress(0)
    if (inputRef.current) inputRef.current.value = ''
  }

  const choose = (f: File | null) => {
    setSuccess(false)
    setProgress(0)
    if (!f) {
      clear()
      return
    }
    const invalid = validateFile(f)
    setError(invalid)
    setFile(invalid ? null : f)
    if (invalid && inputRef.current) inputRef.current.value = ''
  }

  const upload = async () => {
    if (!file) return
    setConfirmReplace(false)
    setError(null)
    setUploading(true)
    setProgress(0)
    try {
      await uploadExamFile(eventId, kind, file, setProgress)
      setSuccess(true)
      clear()
      onDone()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  const isPdf = file?.type === 'application/pdf'

  return (
    <div>
      {!file ? (
        <label
          htmlFor={`file-${kind}`}
          className="block border-2 border-dashed border-gray-300 rounded-xl px-6 py-8 text-center cursor-pointer hover:border-action transition-colors"
        >
          <p className="text-base text-gray-900">{hasSubmission ? 'Choose a new file to replace it' : 'Choose a JPG, PNG or PDF file'}</p>
          <p className="text-sm text-gray-500 mt-1">Maximum size {MAX_UPLOAD_BYTES / (1024 * 1024)} MB</p>
        </label>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500 mb-3">Check your file before uploading</p>
          <div className="flex items-center gap-4">
            {previewUrl && !isPdf ? (
              <button
                type="button"
                onClick={() => setShowPreview(true)}
                className="w-16 h-16 rounded-lg overflow-hidden border border-gray-200 bg-white shrink-0"
                aria-label="Open full preview"
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
                <img src={previewUrl} alt="" className="w-full h-full object-cover" />
              </button>
            ) : (
              <FileIcon pdf={isPdf} />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
              <p className="text-xs text-gray-500">{isPdf ? 'PDF' : 'Image'} · {formatSize(file.size)}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 mt-4">
            <button
              type="button"
              onClick={() => (isPdf ? previewUrl && window.open(previewUrl, '_blank', 'noopener') : setShowPreview(true))}
              disabled={uploading}
              className={btnSecondarySm}
            >
              Preview
            </button>
            <label htmlFor={`file-${kind}`} className={`${btnSecondarySm} cursor-pointer ${uploading ? 'pointer-events-none opacity-40' : ''}`}>
              Change file
            </label>
            <button type="button" onClick={clear} disabled={uploading} className={btnDangerSm}>
              Remove
            </button>
          </div>
        </div>
      )}
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
            <div className="h-full bg-action transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-sm text-gray-600 mt-1">Uploading {progress}%</p>
        </div>
      )}

      {error && (
        <div className="mt-4 px-4 py-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm" role="alert">
          {error}
        </div>
      )}
      {success && !error && (
        <div className="mt-4 px-4 py-3 rounded-lg border border-green-200 bg-green-50 text-green-700 text-sm">
          Uploaded successfully.
        </div>
      )}

      <button
        onClick={() => (hasSubmission ? setConfirmReplace(true) : upload())}
        disabled={!file || uploading}
        className={`${btnPrimary} mt-4`}
      >
        {uploading ? 'Uploading...' : hasSubmission ? 'Upload and replace' : 'Upload'}
      </button>

      {showPreview && previewUrl && file && !isPdf && (
        <ImagePreview src={previewUrl} name={file.name} onClose={() => setShowPreview(false)} />
      )}

      <ConfirmDialog
        open={confirmReplace}
        title="Replace your submitted document?"
        description="Your earlier upload will be removed and this file will be sent instead."
        confirmLabel="Replace"
        onConfirm={upload}
        onCancel={() => setConfirmReplace(false)}
      />
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

  const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-base text-gray-900 outline-none focus:border-action'

  return (
    <form onSubmit={submit}>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="text-sm text-gray-500 block mb-1" htmlFor="marks-obtained">Marks obtained</label>
          <input id="marks-obtained" type="number" min="0" step="any" value={obtained} onChange={(e) => setObtained(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="text-sm text-gray-500 block mb-1" htmlFor="marks-max">Maximum marks</label>
          <input id="marks-max" type="number" min="1" step="any" value={max} onChange={(e) => setMax(e.target.value)} className={inputCls} />
        </div>
        <div>
          <label className="text-sm text-gray-500 block mb-1" htmlFor="marks-grade">Grade (optional)</label>
          <input id="marks-grade" type="text" maxLength={20} value={grade} onChange={(e) => setGrade(e.target.value)} className={inputCls} />
        </div>
      </div>
      {error && (
        <div className="mt-4 px-4 py-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-sm" role="alert">
          {error}
        </div>
      )}
      {success && !error && (
        <div className="mt-4 px-4 py-3 rounded-lg border border-green-200 bg-green-50 text-green-700 text-sm">Marks saved.</div>
      )}
      <button type="submit" disabled={saving} className={`${btnPrimary} mt-4`}>
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
    <div className={`bg-white rounded-2xl shadow-sm p-6 border-2 ${highlight ? 'border-violet-300' : 'border-transparent'}`}>
      <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
      <p className="text-sm text-gray-500 mb-5">{sub}</p>
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
  const [deleteKind, setDeleteKind] = useState<ExamKind | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

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

  const confirmDelete = async () => {
    if (!deleteKind || !event) return
    setDeleting(true)
    setDeleteError(null)
    try {
      await deleteExamSubmission(event.id, deleteKind)
      setDeleteKind(null)
      await load()
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : 'Could not delete the document.')
    } finally {
      setDeleting(false)
    }
  }

  if (loading) return <div className="text-base text-muted">Loading...</div>
  if (error || !event) {
    return (
      <div className="px-4 py-3 rounded-lg border border-red-200 bg-red-50 text-red-700 text-base">
        {error ?? 'Exam not found.'}
      </div>
    )
  }

  const hallCard = (
    <Card key="hall" title="Hall ticket" sub="Upload a clear photo or PDF of your hall ticket." highlight={focus === 'hall-ticket'}>
      {event.hallTicket.closed ? (
        <>
          <SubmissionSummary sub={event.hallTicket} />
          <p className="text-base text-muted">The hall ticket window for this exam has closed.</p>
        </>
      ) : !event.hallTicket.open ? (
        <p className="text-base text-muted">Hall ticket uploads have not been opened for this exam yet.</p>
      ) : (
        <>
          <SubmissionSummary sub={event.hallTicket} onDelete={() => { setDeleteKind('hall-ticket'); setDeleteError(null) }} />
          <UploadBox eventId={event.id} kind="hall-ticket" hasSubmission={event.hallTicket.status === 'submitted'} onDone={load} />
        </>
      )}
    </Card>
  )

  const marksCard = (
    <Card key="marks" title="12th marksheet" sub="Upload your marksheet, or type in your marks." highlight={focus === 'marksheet'}>
      {event.marksheet.closed ? (
        <>
          <SubmissionSummary sub={event.marksheet} />
          <p className="text-base text-muted">The marksheet window for this exam has closed.</p>
        </>
      ) : !event.marksheet.open ? (
        <p className="text-base text-muted">Results have not been opened for this exam yet.</p>
      ) : (
        <>
          <SubmissionSummary sub={event.marksheet} onDelete={() => { setDeleteKind('marksheet'); setDeleteError(null) }} />
          <div className="inline-flex items-center gap-1 p-1 bg-gray-100 rounded-lg mb-5" role="group" aria-label="How to submit">
            {(['upload', 'manual'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMarksMode(m)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  marksMode === m ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                {m === 'upload' ? 'Upload marksheet' : 'Enter marks'}
              </button>
            ))}
          </div>
          {marksMode === 'upload' ? (
            <UploadBox eventId={event.id} kind="marksheet" hasSubmission={event.marksheet.status === 'submitted'} onDone={load} />
          ) : (
            <ManualMarks eventId={event.id} onDone={load} />
          )}
        </>
      )}
    </Card>
  )

  return (
    <div className="max-w-3xl">
      <PageHeader
        back={
          <Link href="/student/exam-documents" className="text-sm text-muted hover:text-action">
            ← Back to exam documents
          </Link>
        }
        title={event.name}
        subtitle={`Exam date: ${formatDate(event.examDate)}`}
      />
      <div className="flex flex-col gap-6">{focus === 'marksheet' ? [marksCard, hallCard] : [hallCard, marksCard]}</div>

      <ConfirmDialog
        open={!!deleteKind}
        title={deleteKind === 'marksheet' ? 'Delete your marksheet submission?' : 'Delete your hall ticket?'}
        description="It will be removed from your record. You can submit again any time while this window is open."
        confirmLabel="Delete"
        tone="danger"
        busy={deleting}
        error={deleteError}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteKind(null)}
      />
    </div>
  )
}

export default function ExamDocumentPage() {
  return (
    <Suspense fallback={<div className="text-base text-muted">Loading...</div>}>
      <ExamDocumentContent />
    </Suspense>
  )
}
