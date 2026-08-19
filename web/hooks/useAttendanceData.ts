'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase/client'

const API_BASE = process.env.NEXT_PUBLIC_SERVER_URL ?? ''

async function getToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}

async function authedFetch(path: string, init?: RequestInit) {
  const token = await getToken()
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.error || body?.message || `Request failed: ${res.status}`)
  }
  if (res.status === 204) return null
  return res.json()
}

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Batch {
  id: string
  grade: string
  name: string
  mode: 'online' | 'offline' | null
  meet_link?: string | null
  location?: string | null
  days?: string | null
  start_time?: string | null
  end_time?: string | null
}

export interface Student {
  id: string
  name: string
  roll: string
  grade: string
  attendancePct: number | null
  unblocked: boolean
}

export interface EligibleStudent {
  id: string
  name: string
  roll: string
  currentBatchName: string | null
}

export interface AttendanceEntry {
  studentId: string
  present: boolean
}

export interface TrendPoint {
  label: string
  pct: number
}

export interface BatchSummary {
  totalStudents: number
  totalSessions: number
  avgAttendancePct: number | null
  todaySessionActive: boolean
  presentToday: number
  absentToday: number | null
}

export interface StudentReportRecord {
  date: string
  batchName: string | null
  deliveryType: string | null
  status: 'present' | 'absent'
  time: string | null
  source?: 'OFFLINE' | 'GOOGLE_MEET'
  classTitle?: string | null
  attendanceStatus?: AttendanceTriState
  attendancePct?: number | null
  durationMinutes?: number | null
  wasOverridden?: boolean
}

export interface StudentReport {
  student: { id: string; name: string; roll: string | null; grade: string | null; batch: string | null }
  totalSessions: number
  presentCount: number
  absentCount: number
  attendancePct: number | null
  records: StudentReportRecord[]
}

export interface BatchStudentStat {
  studentId: string
  name: string
  roll: string | null
  presentCount: number
  partialCount: number
  absentCount: number
  totalSessions: number
  attendancePct: number | null
}

export interface BatchDailyStat {
  sessionId: string
  date: string
  source: 'OFFLINE' | 'GOOGLE_MEET'
  classTitle: string | null
  syncStatus: string | null
  presentCount: number
  partialCount: number
  absentCount: number
  totalStudents: number
  attendancePct: number | null
}

export type AttendanceTriState = 'present' | 'partial' | 'absent'

export interface UnmatchedParticipant {
  googleUserId: string | null
  displayName: string
  isAnonymous: boolean
  minutes: number
}

export interface SessionRosterEntry {
  studentId: string
  name: string
  roll: string | null
  durationMinutes: number | null
  automaticPct: number | null
  automaticStatus: AttendanceTriState | null
  finalPct: number | null
  finalStatus: AttendanceTriState
  wasOverridden: boolean
  overrideReason: string | null
  overrideAt: string | null
  markedAt: string | null
}

export interface SessionAttendanceDetail {
  session: {
    id: string
    batchId: string
    batchName: string | null
    date: string
    source: 'OFFLINE' | 'GOOGLE_MEET'
    syncStatus: string | null
    lastSyncedAt: string | null
    syncError: string | null
    onlineClassId: string | null
    onlineClassTitle: string | null
    subjectName: string | null
    unmatchedParticipants: UnmatchedParticipant[]
  }
  counts: { present: number; partial: number; absent: number }
  roster: SessionRosterEntry[]
}

export interface BatchReport {
  batch: { id: string; name: string; mode: string | null; days: string | null; startTime: string | null; endTime: string | null }
  totalStudents: number
  totalSessions: number
  studentStats: BatchStudentStat[]
  dailyBreakdown: BatchDailyStat[]
}

// ─── Batches for a grade ──────────────────────────────────────────────────────
// (`grade` is accepted for API shape reasons but currently ignored server-side —
// pass any string, e.g. 'all', to fetch every batch.)

export function useBatches(grade: string | null) {
  const [batches, setBatches] = useState<Batch[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(() => {
    if (!grade) { setBatches([]); return }
    setLoading(true)
    setError(null)
    authedFetch(`/api/attendance/batches?grade=${encodeURIComponent(grade)}`)
      .then(d => setBatches(d.batches))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [grade])

  useEffect(() => { refetch() }, [refetch])

  const addBatch = useCallback(async (
    name: string,
    mode: 'online' | 'offline',
    extra?: { days?: string; start_time?: string; end_time?: string; meet_link?: string; location?: string }
  ) => {
    if (!grade) return null
    const d = await authedFetch(`/api/attendance/batches`, {
      method: 'POST',
      body: JSON.stringify({ grade, name, mode, ...extra }),
    })
    setBatches(prev => [...prev, d.batch])
    return d.batch as Batch
  }, [grade])

  return { batches, loading, error, refetch, addBatch }
}

// ─── Students in a batch ──────────────────────────────────────────────────────

export function useBatchStudents(batchId: string | null, date: string) {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(() => {
    if (!batchId) { setStudents([]); return }
    setLoading(true)
    setError(null)
    authedFetch(`/api/attendance/batches/${batchId}/students?date=${date}`)
      .then(d => setStudents(d.students))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [batchId, date])

  useEffect(() => { refetch() }, [refetch])

  return { students, loading, error, refetch }
}

// ─── Eligible (unassigned) students, fetched on demand for the Add modal ─────

export function useEligibleStudents(grade: string | null, batchId: string | null) {
  const [students, setStudents] = useState<EligibleStudent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!grade || !batchId) return
    setLoading(true)
    authedFetch(`/api/attendance/batches/${batchId}/eligible-students?grade=${encodeURIComponent(grade)}`)
      .then(d => setStudents(d.students))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [grade, batchId])

  return { students, loading, error }
}

// ─── Batch summary (admin dashboard) — real aggregate stats from Supabase ────

export function useBatchSummary(batchId: string | null) {
  const [summary, setSummary] = useState<BatchSummary | null>(null)
  const [loading, setLoading] = useState(false)

  const refetch = useCallback(() => {
    if (!batchId) { setSummary(null); return }
    setLoading(true)
    authedFetch(`/api/attendance/batches/${batchId}/summary`)
      .then(d => setSummary(d))
      .catch(() => setSummary(null))
      .finally(() => setLoading(false))
  }, [batchId])

  useEffect(() => { refetch() }, [refetch])

  return { summary, loading, refetch }
}

// ─── Per-student full attendance report (admin Students → Attendance) ────────

export function useStudentReport(studentId: string | null) {
  const [report, setReport] = useState<StudentReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!studentId) { setReport(null); return }
    setLoading(true)
    setError(null)
    authedFetch(`/api/attendance/students/${studentId}/report`)
      .then(d => setReport(d))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [studentId])

  return { report, loading, error }
}

// ─── Per-batch full statistics report (admin Students → Attendance) ──────────

export function useBatchReport(batchId: string | null) {
  const [report, setReport] = useState<BatchReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!batchId) { setReport(null); return }
    setLoading(true)
    setError(null)
    authedFetch(`/api/attendance/batches/${batchId}/report`)
      .then(d => setReport(d))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [batchId])

  return { report, loading, error }
}

// ─── Per-session attendance detail, override, unmatched-participant review ───
// Shared by the QR/offline roster drill-down and the Google Meet online-class
// attendance view — same session concept either way.

export function useSessionAttendanceDetail(sessionId: string | null) {
  const [detail, setDetail] = useState<SessionAttendanceDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(() => {
    if (!sessionId) { setDetail(null); return }
    setLoading(true)
    setError(null)
    authedFetch(`/api/attendance/sessions/${sessionId}/detail`)
      .then((d) => setDetail(d))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [sessionId])

  useEffect(() => { refetch() }, [refetch])

  const override = useCallback(async (studentId: string, status: AttendanceTriState, reason?: string) => {
    if (!sessionId) return
    const d = await authedFetch(`/api/attendance/sessions/${sessionId}/override`, {
      method: 'POST',
      body: JSON.stringify({ studentId, status, reason }),
    })
    setDetail(d)
    return d as SessionAttendanceDetail
  }, [sessionId])

  const assignUnmatched = useCallback(async (participantIndex: number, studentId: string) => {
    if (!sessionId) return
    const d = await authedFetch(`/api/attendance/sessions/${sessionId}/unmatched/${participantIndex}/assign`, {
      method: 'POST',
      body: JSON.stringify({ studentId }),
    })
    setDetail(d)
    return d as SessionAttendanceDetail
  }, [sessionId])

  const ignoreUnmatched = useCallback(async (participantIndex: number) => {
    if (!sessionId) return
    const d = await authedFetch(`/api/attendance/sessions/${sessionId}/unmatched/${participantIndex}/ignore`, {
      method: 'POST',
    })
    setDetail(d)
    return d as SessionAttendanceDetail
  }, [sessionId])

  const markReviewed = useCallback(async () => {
    if (!sessionId) return
    const d = await authedFetch(`/api/attendance/sessions/${sessionId}/mark-reviewed`, { method: 'POST' })
    setDetail(d)
    return d as SessionAttendanceDetail
  }, [sessionId])

  return { detail, loading, error, refetch, override, assignUnmatched, ignoreUnmatched, markReviewed }
}

// ─── Authenticated file download (CSV/PDF) ───────────────────────────────────
// A plain <a href> can't attach a Bearer token, so we fetch as a blob with the
// auth header and trigger the save via a temporary object URL.

export async function downloadAttendanceFile(path: string, filename: string) {
  const token = await getToken()
  const res = await fetch(`${API_BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.error || body?.message || `Download failed: ${res.status}`)
  }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

// ─── Live QR session: starts a session, rotates the token, drives countdown ──
//
// Session creation is gated behind an explicit `startSession()` call instead
// of firing automatically whenever this hook is mounted/active, so merely
// opening the QR tab no longer creates a phantom attendance_sessions row.

export function useAttendanceSession(batchId: string | null, date: string, active: boolean) {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [qrToken, setQrToken] = useState('')
  const [refreshSeconds, setRefreshSeconds] = useState(30)
  const [countdown, setCountdown] = useState(30)
  const [error, setError] = useState<string | null>(null)
  const [started, setStarted] = useState(false)

  const startSession = useCallback(() => setStarted(true), [])
  const stopSession = useCallback(() => {
    setStarted(false)
    setSessionId(null)
    setQrToken('')
  }, [])

  useEffect(() => {
    setStarted(false)
    setSessionId(null)
    setQrToken('')
  }, [batchId, date])

  useEffect(() => {
    if (!active || !batchId || !started) {
      return
    }
    let cancelled = false
    let refreshTimer: ReturnType<typeof setInterval>

    authedFetch(`/api/attendance/sessions`, {
      method: 'POST',
      body: JSON.stringify({ batchId, date }),
    })
      .then(d => {
        if (cancelled) return
        const session = d.session
        setSessionId(session.sessionId)
        setQrToken(session.qrToken)
        setRefreshSeconds(session.refreshIntervalSeconds)
        setCountdown(session.refreshIntervalSeconds)

        refreshTimer = setInterval(async () => {
          try {
            const r = await authedFetch(`/api/attendance/sessions/${session.sessionId}/refresh`, {
              method: 'POST',
            })
            if (!cancelled) {
              setQrToken(r.qrToken)
              setCountdown(session.refreshIntervalSeconds)
            }
          } catch (e: unknown) {
            if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to refresh QR code')
          }
        }, session.refreshIntervalSeconds * 1000)
      })
      .catch((e: Error) => { if (!cancelled) setError(e.message) })

    return () => {
      cancelled = true
      if (refreshTimer) clearInterval(refreshTimer)
    }
  }, [active, batchId, date, started])

  useEffect(() => {
    if (!active || !started) return
    const t = setInterval(() => setCountdown(p => (p > 0 ? p - 1 : refreshSeconds)), 1000)
    return () => clearInterval(t)
  }, [active, started, refreshSeconds])

  return { sessionId, qrToken, countdown, refreshSeconds, error, started, startSession, stopSession }
}

// ─── Roster: present/absent for the active session, polled ───────────────────

export function useRoster(sessionId: string | null, pollMs = 4000) {
  const [entries, setEntries] = useState<AttendanceEntry[]>([])

  const refetch = useCallback(() => {
    if (!sessionId) return
    authedFetch(`/api/attendance/sessions/${sessionId}/roster`)
      .then(d => setEntries(d.entries))
      .catch(() => {})
  }, [sessionId])

  useEffect(() => {
    if (!sessionId) { setEntries([]); return }
    refetch()
    const t = setInterval(refetch, pollMs)
    return () => clearInterval(t)
  }, [sessionId, refetch, pollMs])

  return { entries, refetch }
}

// ─── Student trend, fetched on demand for the graph modal ────────────────────

export function useStudentTrend(studentId: string | null) {
  const [points, setPoints] = useState<TrendPoint[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!studentId) return
    setLoading(true)
    authedFetch(`/api/attendance/students/${studentId}/trend?sessions=5`)
      .then(d => setPoints(d.points))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [studentId])

  return { points, loading, error }
}
