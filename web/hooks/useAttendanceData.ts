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
  mode: 'online' | 'offline'
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

// ─── Batches for a grade ──────────────────────────────────────────────────────

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

  const addBatch = useCallback(async (name: string, mode: 'online' | 'offline') => {
    if (!grade) return null
    const d = await authedFetch(`/api/attendance/batches`, {
      method: 'POST',
      body: JSON.stringify({ grade, name, mode }),
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

// ─── Live QR session: starts a session, rotates the token, drives countdown ──

export function useAttendanceSession(batchId: string | null, date: string, active: boolean) {
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [qrToken, setQrToken] = useState('')
  const [refreshSeconds, setRefreshSeconds] = useState(30)
  const [countdown, setCountdown] = useState(30)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!active || !batchId) {
      setSessionId(null)
      setQrToken('')
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
  }, [active, batchId, date])

  // 1s visual ticker, independent of the actual refresh call
  useEffect(() => {
    if (!active) return
    const t = setInterval(() => setCountdown(p => (p > 0 ? p - 1 : refreshSeconds)), 1000)
    return () => clearInterval(t)
  }, [active, refreshSeconds])

  return { sessionId, qrToken, countdown, refreshSeconds, error }
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