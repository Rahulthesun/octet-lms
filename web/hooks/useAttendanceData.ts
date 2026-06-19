'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import * as api from '../lib/attendance'
import type { Batch, Student, AttendanceEntry, TrendPoint } from '../lib/attendance'

// ─── Batches for a grade ──────────────────────────────────────────────────────

export function useBatches(grade: string | null) {
  const [batches, setBatches] = useState<Batch[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(() => {
    if (!grade) { setBatches([]); return }
    setLoading(true)
    setError(null)
    api.fetchBatches(grade)
      .then(setBatches)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [grade])

  useEffect(() => { refetch() }, [refetch])

  const addBatch = useCallback(async (name: string, mode: 'online' | 'offline') => {
    if (!grade) return null
    const batch = await api.createBatch(grade, name, mode)
    setBatches(prev => [...prev, batch])
    return batch
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
    api.fetchBatchStudents(batchId, date)
      .then(setStudents)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [batchId, date])

  useEffect(() => { refetch() }, [refetch])

  return { students, loading, error, refetch }
}

// ─── Eligible (unassigned) students, fetched on demand for the Add modal ─────

export function useEligibleStudents(grade: string | null, batchId: string | null) {
  const [students, setStudents] = useState<api.EligibleStudent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!grade || !batchId) return
    setLoading(true)
    api.fetchEligibleStudents(grade, batchId)
      .then(setStudents)
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

    api.startSession(batchId, date)
      .then(session => {
        if (cancelled) return
        setSessionId(session.sessionId)
        setQrToken(session.qrToken)
        setRefreshSeconds(session.refreshIntervalSeconds)
        setCountdown(session.refreshIntervalSeconds)

        refreshTimer = setInterval(async () => {
          try {
            const { qrToken: token } = await api.refreshSessionToken(session.sessionId)
            if (!cancelled) {
              setQrToken(token)
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
    api.fetchRoster(sessionId).then(setEntries).catch(() => {})
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
    api.fetchStudentTrend(studentId, 5)
      .then(setPoints)
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [studentId])

  return { points, loading, error }
}