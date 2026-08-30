'use client'

// hooks/useNotifications.ts
//
// In-app notification inbox (student + admin), the admin compose/broadcast
// tool, and the admin delivery-tracking dashboard — backed by
// /api/notifications (services/notifications.service.js). All DB-backed.

import { useCallback, useEffect, useRef, useState } from 'react'
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

export type NotificationType = 'announcement' | 'assignment_due' | 'video_uploaded' | 'test_result' | 'test_scheduled' | 'test_reminder'

export interface NotificationItem {
  id: string
  type: NotificationType
  title: string
  body: string
  link: string | null
  data: Record<string, unknown>
  read: boolean
  createdAt: string
}

export interface EmailLogRow {
  id: string
  notificationId: string | null
  type: NotificationType | null
  title: string
  recipientEmail: string
  subject: string
  status: 'queued' | 'sent' | 'delivered' | 'read' | 'failed'
  error: string | null
  sentAt: string | null
  deliveredAt: string | null
  readAt: string | null
  failedAt: string | null
  createdAt: string
}

export interface EmailLogSummary {
  queued: number
  sent: number
  delivered: number
  read: number
  failed: number
  total: number
}

export interface BroadcastInput {
  title: string
  body: string
  link?: string
  batchIds?: string[]
  studentIds?: string[]
  allApproved?: boolean
  email?: boolean
}

// ─── Inbox (self) ────────────────────────────────────────────────────────────

export function useMyNotifications() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(() => {
    setLoading(true)
    setError(null)
    authedFetch('/api/notifications/me')
      .then((d) => setNotifications(d))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { refetch() }, [refetch])

  const markRead = useCallback(async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
    try {
      await authedFetch(`/api/notifications/me/${id}/read`, { method: 'POST' })
    } catch {
      refetch()
    }
  }, [refetch])

  const markAllRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    try {
      await authedFetch('/api/notifications/me/read-all', { method: 'POST' })
    } catch {
      refetch()
    }
  }, [refetch])

  return { notifications, loading, error, refetch, markRead, markAllRead }
}

/** Polls the unread count for the sidebar badge — lightweight, no full list fetch. */
export function useUnreadNotificationCount(pollMs = 30000) {
  const [count, setCount] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const refetch = useCallback(() => {
    authedFetch('/api/notifications/me/unread-count')
      .then((d) => setCount(d?.count ?? 0))
      .catch(() => {})
  }, [])

  useEffect(() => {
    refetch()
    timerRef.current = setInterval(refetch, pollMs)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [refetch, pollMs])

  return { count, refetch }
}

// ─── Admin: compose & broadcast ─────────────────────────────────────────────

export async function sendBroadcast(input: BroadcastInput) {
  return authedFetch('/api/notifications/broadcast', { method: 'POST', body: JSON.stringify(input) })
}

// ─── Admin: delivery tracking ────────────────────────────────────────────────

export function useEmailLogSummary(pollMs = 20000) {
  const [summary, setSummary] = useState<EmailLogSummary | null>(null)
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(() => {
    authedFetch('/api/notifications/admin/email-log/summary')
      .then((d) => setSummary(d))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    refetch()
    const t = setInterval(refetch, pollMs)
    return () => clearInterval(t)
  }, [refetch, pollMs])

  return { summary, loading, refetch }
}

export function useEmailLog(status?: string, pollMs = 20000) {
  const [log, setLog] = useState<EmailLogRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(() => {
    const qs = status ? `?status=${encodeURIComponent(status)}` : ''
    authedFetch(`/api/notifications/admin/email-log${qs}`)
      .then((d) => setLog(d))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [status])

  useEffect(() => {
    refetch()
    const t = setInterval(refetch, pollMs)
    return () => clearInterval(t)
  }, [refetch, pollMs])

  return { log, loading, error, refetch }
}
