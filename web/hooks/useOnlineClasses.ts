'use client'

// hooks/useOnlineClasses.ts
//
// Google Calendar + Google Meet online classes — all data comes from the
// backend (which is the only thing that ever talks to Google); nothing here
// touches Google directly and no Google token ever reaches the browser.

import { useCallback, useEffect, useState } from 'react'
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

export type OnlineClassStatus = 'scheduled' | 'rescheduled' | 'cancelled'

export type SyncStatus = 'NOT_STARTED' | 'LIVE' | 'AWAITING_ATTENDANCE_SYNC' | 'SYNCED' | 'SYNC_FAILED' | 'MANUALLY_REVIEWED'

export interface OnlineClassAttendanceInfo {
  sessionId: string
  syncStatus: SyncStatus | null
  lastSyncedAt: string | null
  syncError: string | null
  unmatchedCount: number
}

export interface OnlineClass {
  id: string
  batchId: string
  batchName: string | null
  subjectId: string | null
  subjectName: string | null
  title: string
  description: string | null
  scheduledStart: string // ISO
  scheduledEnd: string // ISO
  timezone: string
  meetUrl: string | null
  status: OnlineClassStatus
  createdAt: string
  updatedAt: string
  attendance: OnlineClassAttendanceInfo | null
}

export interface ScheduleClassInput {
  batchId: string
  subjectId?: string
  title: string
  description?: string
  date: string // "YYYY-MM-DD"
  startTime: string // "HH:mm"
  endTime: string // "HH:mm"
  timezone?: string
  extraStudentIds?: string[]
  createGoogleMeet?: boolean
  sendNotification?: boolean
  idempotencyKey?: string
}

export interface RescheduleClassInput {
  title?: string
  description?: string
  date?: string
  startTime?: string
  endTime?: string
  timezone?: string
}

export interface Subject {
  id: string
  name: string
}

export interface GoogleAccountStatus {
  connected: boolean
  email: string | null
}

export interface AttendanceSettings {
  presentThreshold: number
  partialThreshold: number
  autoCalculate: boolean
  autoSync: boolean
  allowOverride: boolean
  syncDelayMinutes: number
  countTimeAfterClassEnd: boolean
  updatedAt: string
}

export interface GoogleIdentityStatus {
  linked: boolean
  email: string | null
  linkedAt: string | null
}

// ─── Admin: manage online classes ─────────────────────────────────────────────

export function useAdminOnlineClasses() {
  const [classes, setClasses] = useState<OnlineClass[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(() => {
    setLoading(true)
    setError(null)
    authedFetch('/api/online-classes')
      .then((d) => setClasses(d.classes))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { refetch() }, [refetch])

  const schedule = useCallback(async (input: ScheduleClassInput) => {
    const idempotencyKey = input.idempotencyKey || crypto.randomUUID()
    const d = await authedFetch('/api/online-classes', {
      method: 'POST',
      body: JSON.stringify({ ...input, idempotencyKey }),
    })
    setClasses((prev) => [d.class, ...prev])
    return d.class as OnlineClass
  }, [])

  const reschedule = useCallback(async (classId: string, input: RescheduleClassInput) => {
    const d = await authedFetch(`/api/online-classes/${classId}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    })
    setClasses((prev) => prev.map((c) => (c.id === classId ? d.class : c)))
    return d.class as OnlineClass
  }, [])

  const cancel = useCallback(async (classId: string) => {
    const d = await authedFetch(`/api/online-classes/${classId}/cancel`, { method: 'POST' })
    setClasses((prev) => prev.map((c) => (c.id === classId ? d.class : c)))
    return d.class as OnlineClass
  }, [])

  /** Re-fetches Google Meet data and recalculates attendance right now. Idempotent — safe to click repeatedly. */
  const syncAttendance = useCallback(async (classId: string) => {
    const result = await authedFetch(`/api/online-classes/${classId}/sync-attendance`, { method: 'POST' })
    await refetch() // pick up the updated sync status badge
    return result
  }, [refetch])

  return { classes, loading, error, refetch, schedule, reschedule, cancel, syncAttendance }
}

// ─── Student: my upcoming classes ─────────────────────────────────────────────

export function useMyOnlineClasses() {
  const [classes, setClasses] = useState<OnlineClass[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(() => {
    setLoading(true)
    setError(null)
    authedFetch('/api/online-classes/me/upcoming')
      .then((d) => setClasses(d.classes))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { refetch() }, [refetch])

  return { classes, loading, error, refetch }
}

// ─── Subjects (for the "Course/Subject" dropdown — real data, existing table) ─

export function useSubjects() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    authedFetch('/api/subjects')
      .then((d) => setSubjects(Array.isArray(d) ? d : d.subjects ?? d.data ?? []))
      .catch(() => setSubjects([]))
      .finally(() => setLoading(false))
  }, [])

  return { subjects, loading }
}

// ─── Google account connection (admin-only) ───────────────────────────────────

export function useGoogleAccountStatus() {
  const [status, setStatus] = useState<GoogleAccountStatus | null>(null)
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(() => {
    setLoading(true)
    authedFetch('/api/google/status')
      .then((d) => setStatus(d))
      .catch(() => setStatus({ connected: false, email: null }))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { refetch() }, [refetch])

  const connect = useCallback(async () => {
    const d = await authedFetch('/api/google/connect-url')
    window.location.href = d.url
  }, [])

  const disconnect = useCallback(async () => {
    await authedFetch('/api/google/disconnect', { method: 'POST' })
    await refetch()
  }, [refetch])

  return { status, loading, refetch, connect, disconnect }
}

// ─── Online-attendance settings (admin-only) ──────────────────────────────────

export function useAttendanceSettings() {
  const [settings, setSettings] = useState<AttendanceSettings | null>(null)
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(() => {
    setLoading(true)
    authedFetch('/api/attendance-settings')
      .then((d) => setSettings(d))
      .catch(() => setSettings(null))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { refetch() }, [refetch])

  const update = useCallback(async (patch: Partial<AttendanceSettings>) => {
    const d = await authedFetch('/api/attendance-settings', {
      method: 'PATCH',
      body: JSON.stringify(patch),
    })
    setSettings(d)
    return d as AttendanceSettings
  }, [])

  return { settings, loading, refetch, update }
}

// ─── Student Google identity link — makes Meet attendance matching reliable ──

export function useGoogleIdentity() {
  const [status, setStatus] = useState<GoogleIdentityStatus | null>(null)
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(() => {
    setLoading(true)
    authedFetch('/api/google-identity/status')
      .then((d) => setStatus(d))
      .catch(() => setStatus({ linked: false, email: null, linkedAt: null }))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { refetch() }, [refetch])

  const link = useCallback(async () => {
    const d = await authedFetch('/api/google-identity/connect-url')
    window.location.href = d.url
  }, [])

  const unlink = useCallback(async () => {
    await authedFetch('/api/google-identity/unlink', { method: 'POST' })
    await refetch()
  }, [refetch])

  return { status, loading, refetch, link, unlink }
}
