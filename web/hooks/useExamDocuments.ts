'use client'

// hooks/useExamDocuments.ts
//
// Student-side exam document collection (hall ticket + 12th marksheet).
// Files are uploaded straight from the browser to Cloudflare R2 with a
// presigned URL — the bytes never pass through the API server. The flow is:
//   1. POST upload-url   -> API validates type/size, returns a presigned PUT URL
//   2. PUT file to R2    -> browser -> R2 directly
//   3. POST confirm      -> API verifies the stored object and records it

import { useCallback, useEffect, useState } from 'react'
import { authedFetch } from '@/lib/apiClient'

export type ExamKind = 'hall-ticket' | 'marksheet'

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024
export const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'application/pdf']

export interface MySubmission {
  open: boolean
  status: 'submitted' | 'pending'
  entryMode?: 'UPLOAD' | 'MANUAL'
  fileName?: string | null
  fileUrl?: string | null
  marksObtained?: number | null
  maxMarks?: number | null
  grade?: string | null
  submittedAt?: string
}

export interface MyExamEvent {
  id: string
  name: string
  examDate: string
  hallTicketOpenedAt: string | null
  resultsOpenedAt: string | null
  hallTicket: MySubmission
  marksheet: MySubmission
}

export interface PendingPrompt {
  eventId: string
  examName: string
  examDate: string
  kind: 'HALL_TICKET' | 'MARKSHEET'
  link: string
}

/** Client-side pre-check so the student gets an immediate, clear error before any upload starts. */
export function validateFile(file: File): string | null {
  if (!ACCEPTED_TYPES.includes(file.type)) return 'Only JPG, PNG or PDF files are accepted.'
  if (file.size <= 0) return 'The selected file is empty.'
  if (file.size > MAX_UPLOAD_BYTES) {
    return `The file is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). The maximum size is ${MAX_UPLOAD_BYTES / (1024 * 1024)} MB.`
  }
  return null
}

export function useMyExamEvents() {
  const [events, setEvents] = useState<MyExamEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setError(null)
    try {
      setEvents(await authedFetch('/api/exam-documents/me/events'))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load exam documents')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { events, loading, error, refetch }
}

/** Outstanding prompts for the dashboard banner. Silent on failure (a banner must never break the dashboard). */
export function useMyPendingExamDocuments() {
  const [pending, setPending] = useState<PendingPrompt[]>([])

  const refetch = useCallback(async () => {
    try {
      setPending(await authedFetch('/api/exam-documents/me/pending'))
    } catch {
      setPending([])
    }
  }, [])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { pending, refetch }
}

/** Uploads a file to R2 via a presigned URL and records it. Reports progress 0-100. */
export async function uploadExamFile(
  eventId: string,
  kind: ExamKind,
  file: File,
  onProgress?: (pct: number) => void
): Promise<void> {
  const invalid = validateFile(file)
  if (invalid) throw new Error(invalid)

  const presign = await authedFetch(`/api/exam-documents/me/events/${eventId}/${kind}/upload-url`, {
    method: 'POST',
    body: JSON.stringify({ fileName: file.name, contentType: file.type, sizeBytes: file.size }),
  })

  // XHR (not fetch) so real upload progress is available.
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', presign.uploadUrl)
    Object.entries((presign.headers ?? {}) as Record<string, string>).forEach(([k, v]) => xhr.setRequestHeader(k, v))
    xhr.upload.onprogress = (evt) => {
      if (evt.lengthComputable && onProgress) onProgress(Math.round((evt.loaded / evt.total) * 100))
    }
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve()
      else reject(new Error(`Upload failed (storage returned ${xhr.status}). Please try again.`))
    }
    xhr.onerror = () => reject(new Error('Upload failed: could not reach storage. Check your connection and try again.'))
    xhr.onabort = () => reject(new Error('Upload cancelled.'))
    xhr.send(file)
  })

  await authedFetch(`/api/exam-documents/me/events/${eventId}/${kind}/confirm`, {
    method: 'POST',
    body: JSON.stringify({ key: presign.key, fileName: file.name }),
  })
}

export async function submitManualMarks(
  eventId: string,
  marks: { marksObtained: number; maxMarks: number; grade?: string; remarks?: string }
) {
  return authedFetch(`/api/exam-documents/me/events/${eventId}/marksheet/manual`, {
    method: 'POST',
    body: JSON.stringify(marks),
  })
}
