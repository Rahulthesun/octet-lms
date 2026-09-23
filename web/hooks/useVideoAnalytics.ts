'use client'

// hooks/useVideoAnalytics.ts
//
// Session-wise reports, drop-off analysis, and the engagement heatmap —
// backed by /api/video-analytics (services/videoAnalytics.service.js).
// All data is DB-backed; nothing here is mock data.

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

export interface WatchedVideoSummary {
  videoId: string
  title: string
  chapterId: string
  chapterTitle: string | null
  subjectTitle: string | null
  durationSecs: number | null
  watchedSecs: number
  completed: boolean
  lastWatchedAt: string
}

export interface WatchSessionRow {
  id: string
  startedAt: string
  endedAt: string | null
  watchedSecs: number
  maxPositionSecs: number
  completed: boolean
}

export interface BucketPoint {
  bucketIndex: number
  pctPosition: number
  hitCount?: number
  sessionsReached?: number
}

export interface StudentVideoReport {
  video: {
    id: string
    title: string
    chapterId: string
    chapterTitle: string | null
    subjectTitle: string | null
    durationSecs: number | null
  }
  sessionCount: number
  avgSessionDurationSecs: number
  totalWatchedSecs: number
  completionPct: number | null
  completed: boolean
  lastPositionSecs: number
  sessions: WatchSessionRow[]
  dropOff: BucketPoint[]
  heatmap: BucketPoint[]
  chapterWatchTimeSecs: number
  studentName?: string
}

export interface AdminPerStudentRow {
  userId: string
  studentName: string
  admissionNumber: string | null
  grade: string | null
  batch: string | null
  watchedSecs: number
  lastPositionSecs: number
  completed: boolean
  sessionCount: number
  avgSessionDurationSecs: number
  lastActivityAt: string | null
}

export interface AdminVideoReport {
  videoId: string
  title: string
  chapterTitle: string | null
  subjectTitle: string | null
  durationSecs: number | null
  uniqueViewers: number
  completedCount: number
  completionRate: number
  totalWatchedSecs: number
  avgWatchedSecs: number
  avgCompletionPct: number | null
  sessionCount: number
  avgSessionDurationSecs: number
  dropOff: BucketPoint[]
  heatmap: BucketPoint[]
  perStudent: AdminPerStudentRow[]
}

export interface BatchTopVideo {
  videoId: string
  title: string
  chapterTitle: string | null
  durationSecs: number | null
  totalWatchedSecs: number
  uniqueViewers: number
  completedCount: number
  avgCompletionPct: number | null
}

export interface BatchPerStudentRow {
  studentId: string
  name: string
  admissionNumber: string | null
  totalWatchedSecs: number
  videosWatchedCount: number
  avgCompletionPct: number | null
}

export interface BatchVideoReport {
  batch: { id: string; name: string }
  totalStudents: number
  totalWatchedSecs: number
  avgWatchedSecsPerStudent: number
  avgCompletionPct: number | null
  topVideos: BatchTopVideo[]
  perStudent: BatchPerStudentRow[]
}

// ─── Student: my own reports ────────────────────────────────────────────────

export function useMyWatchedVideos() {
  const [videos, setVideos] = useState<WatchedVideoSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(() => {
    setLoading(true)
    setError(null)
    authedFetch('/api/video-analytics/me/watched')
      .then((d) => setVideos(d))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { refetch() }, [refetch])

  return { videos, loading, error, refetch }
}

export function useMyVideoReport(videoId: string | null) {
  const [report, setReport] = useState<StudentVideoReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(() => {
    if (!videoId) { setReport(null); return }
    setLoading(true)
    setError(null)
    authedFetch(`/api/video-analytics/videos/${videoId}/me`)
      .then((d) => setReport(d))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [videoId])

  useEffect(() => { refetch() }, [refetch])

  return { report, loading, error, refetch }
}

// ─── Admin: any video / any student / any batch ─────────────────────────────

export function useAdminVideoReport(videoId: string | null) {
  const [report, setReport] = useState<AdminVideoReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(() => {
    if (!videoId) { setReport(null); return }
    setLoading(true)
    setError(null)
    authedFetch(`/api/video-analytics/videos/${videoId}`)
      .then((d) => setReport(d))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [videoId])

  useEffect(() => { refetch() }, [refetch])

  return { report, loading, error, refetch }
}

export function useStudentWatchedVideosAdmin(studentId: string | null) {
  const [videos, setVideos] = useState<WatchedVideoSummary[]>([])
  const [studentName, setStudentName] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(() => {
    if (!studentId) { setVideos([]); return }
    setLoading(true)
    setError(null)
    authedFetch(`/api/video-analytics/students/${studentId}/watched`)
      .then((d) => { setVideos(d.videos || []); setStudentName(d.studentName || '') })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [studentId])

  useEffect(() => { refetch() }, [refetch])

  return { videos, studentName, loading, error, refetch }
}

export function useStudentVideoReportAdmin(studentId: string | null, videoId: string | null) {
  const [report, setReport] = useState<StudentVideoReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(() => {
    if (!studentId || !videoId) { setReport(null); return }
    setLoading(true)
    setError(null)
    authedFetch(`/api/video-analytics/students/${studentId}/videos/${videoId}`)
      .then((d) => setReport(d))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [studentId, videoId])

  useEffect(() => { refetch() }, [refetch])

  return { report, loading, error, refetch }
}

export function useBatchVideoReport(batchId: string | null) {
  const [report, setReport] = useState<BatchVideoReport | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(() => {
    if (!batchId) { setReport(null); return }
    setLoading(true)
    setError(null)
    authedFetch(`/api/video-analytics/batches/${batchId}`)
      .then((d) => setReport(d))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [batchId])

  useEffect(() => { refetch() }, [refetch])

  return { report, loading, error, refetch }
}
