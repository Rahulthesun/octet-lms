// Assumes authedFetch lives at '@/lib/api/authedFetch' and already attaches
// the Bearer token + Content-Type: application/json. Fix the import path
// below if that's not where it lives in your codebase.

// ─── Types ──────────────────────────────────────────────────────────────────
// These are the shapes your Express controllers need to return.

export interface Batch {
  id: string
  grade: string
  name: string
  mode: 'online' | 'offline'
}

export interface Student {
  id: string
  name: string
  roll: string
  grade: string
  /** Pre-computed by the backend for this batch's mode (online/offline). null if no record. */
  attendancePct: number | null
  /** Manual override flag, persisted server-side. */
  unblocked: boolean
}

export interface EligibleStudent {
  id: string
  name: string
  roll: string
  /** Batch name the student is currently in, if any — shown in the Add Students modal. */
  currentBatchName: string | null
}

export interface AttendanceEntry {
  studentId: string
  present: boolean
}

export interface AttendanceSession {
  sessionId: string
  qrToken: string
  expiresAt: string // ISO timestamp
  refreshIntervalSeconds: number
}

export interface TrendPoint {
  label: string // e.g. "S1"
  pct: number
}

// ─── Shared request helper ───────────────────────────────────────────────────
async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, init)
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.error || body?.message || `Request failed: ${res.status}`)
  }
  // 204 No Content etc.
  if (res.status === 204) return undefined as T
  return res.json()
}

// ─── Batches ──────────────────────────────────────────────────────────────────

// GET /api/attendance/batches?grade=:grade
export const fetchBatches = (grade: string) =>
  request<{ batches: Batch[] }>(
    `/api/attendance/batches?grade=${encodeURIComponent(grade)}`
  ).then(d => d.batches)

// POST /api/attendance/batches  { grade, name, mode }
export const createBatch = (grade: string, name: string, mode: 'online' | 'offline') =>
  request<{ batch: Batch }>(`/api/attendance/batches`, {
    method: 'POST',
    body: JSON.stringify({ grade, name, mode }),
  }).then(d => d.batch)

// ─── Students ─────────────────────────────────────────────────────────────────

// GET /api/attendance/batches/:batchId/students?date=:date
export const fetchBatchStudents = (batchId: string, date: string) =>
  request<{ students: Student[] }>(
    `/api/attendance/batches/${batchId}/students?date=${date}`
  ).then(d => d.students)

// GET /api/attendance/batches/:batchId/eligible-students?grade=:grade
// Returns students of this grade who are NOT already in this (or any) batch.
export const fetchEligibleStudents = (grade: string, batchId: string) =>
  request<{ students: EligibleStudent[] }>(
    `/api/attendance/batches/${batchId}/eligible-students?grade=${encodeURIComponent(grade)}`
  ).then(d => d.students)

// POST /api/attendance/batches/:batchId/students  { studentIds }
export const addStudentsToBatch = (batchId: string, studentIds: string[]) =>
  request<void>(`/api/attendance/batches/${batchId}/students`, {
    method: 'POST',
    body: JSON.stringify({ studentIds }),
  })

// POST /api/attendance/students/:studentId/override  { batchId, unblocked }
export const overrideStudentBlock = (studentId: string, batchId: string, unblocked: boolean) =>
  request<void>(`/api/attendance/students/${studentId}/override`, {
    method: 'POST',
    body: JSON.stringify({ batchId, unblocked }),
  })

// ─── Sessions / QR ──────────────────────────────────────────────────────────

// POST /api/attendance/sessions  { batchId, date }
// Idempotent: returns the existing session for that batch+date if one already exists.
export const startSession = (batchId: string, date: string) =>
  request<{ session: AttendanceSession }>(`/api/attendance/sessions`, {
    method: 'POST',
    body: JSON.stringify({ batchId, date }),
  }).then(d => d.session)

// POST /api/attendance/sessions/:sessionId/refresh
// Rotates the QR token server-side. Call every refreshIntervalSeconds.
export const refreshSessionToken = (sessionId: string) =>
  request<{ qrToken: string; expiresAt: string }>(
    `/api/attendance/sessions/${sessionId}/refresh`,
    { method: 'POST' }
  )

// GET /api/attendance/sessions/:sessionId/roster
export const fetchRoster = (sessionId: string) =>
  request<{ entries: AttendanceEntry[] }>(
    `/api/attendance/sessions/${sessionId}/roster`
  ).then(d => d.entries)

// POST /api/attendance/sessions/:sessionId/manual-mark  { studentId, present }
// Used by the admin demo button AND any manual correction flow.
export const manualMark = (sessionId: string, studentId: string, present: boolean) =>
  request<void>(`/api/attendance/sessions/${sessionId}/manual-mark`, {
    method: 'POST',
    body: JSON.stringify({ studentId, present }),
  })

// POST /api/attendance/scan  { qrToken }
// This is the REAL scan path: called from the student's own authenticated
// device after it scans the QR. The backend identifies the student from the
// JWT (not from the body), validates the token belongs to a batch the
// student is enrolled in, and marks them present. Not wired into this admin
// page, but you'll want it for the actual student-facing scan flow.
export const scanQrToken = (qrToken: string) =>
  request<{ success: boolean }>(`/api/attendance/scan`, {
    method: 'POST',
    body: JSON.stringify({ qrToken }),
  })

// ─── Trend ──────────────────────────────────────────────────────────────────

// GET /api/attendance/students/:studentId/trend?sessions=5
export const fetchStudentTrend = (studentId: string, sessions = 5) =>
  request<{ points: TrendPoint[] }>(
    `/api/attendance/students/${studentId}/trend?sessions=${sessions}`
  ).then(d => d.points)