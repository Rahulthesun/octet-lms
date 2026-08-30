'use client'

// hooks/useTests.ts
//
// Full test/exam system — admin authoring + grading, and the student
// attempt flow. All data comes from /api/tests (backed by tests.service.js
// / testAttempts.service.js) — nothing here is mock data.

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase/client'

const API_BASE = process.env.NEXT_PUBLIC_SERVER_URL ?? ''

async function getToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession()
  return data.session?.access_token ?? null
}

export async function authedFetch(path: string, init?: RequestInit) {
  const token = await getToken()
  const isFormData = init?.body instanceof FormData
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
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

export type TestType = 'mcq' | 'descriptive'
export type TestStatus = 'scheduled' | 'completed' | 'cancelled'
export type TestWindow = 'upcoming' | 'live' | 'ended'
export type OptionKey = 'a' | 'b' | 'c' | 'd'

export interface TestQuestionInput {
  questionText: string
  optionA: string
  optionB: string
  optionC: string
  optionD: string
  correctOption: OptionKey
  marks?: number
}

export interface TestQuestionAdmin extends TestQuestionInput {
  id: string
  orderIndex: number
  marks: number
}

export interface TestSummary {
  id: string
  title: string
  type: TestType
  subjectId: string | null
  subjectName: string | null
  batchId: string
  batchName: string | null
  status: TestStatus
  scheduledStart: string
  scheduledEnd: string
  maxMarks: number
  instructions: string | null
  questionText: string | null
  questionFileName: string | null
  answerKeyFileName: string | null
  createdAt: string
  updatedAt: string
}

export interface TestAdminDetail extends TestSummary {
  questions?: TestQuestionAdmin[]
  questionFileUrl?: string | null
  answerKeyFileUrl?: string | null
}

export interface CreateTestInput {
  title: string
  type: TestType
  subjectId?: string | null
  batchId: string
  scheduledStart: string // ISO
  scheduledEnd: string // ISO
  instructions?: string
  maxMarks?: number // descriptive only
  questionText?: string // descriptive only
  questions?: TestQuestionInput[] // mcq only
}

export interface MyAttemptSummary {
  status: 'not_started' | 'in_progress' | 'submitted' | 'evaluated'
  marksAwarded: number | null
  maxMarks: number | null
  submittedAt: string | null
}

export interface StudentTestListItem extends TestSummary {
  window: TestWindow
  myAttempt: MyAttemptSummary | null
  questionFileUrl?: string | null
}

export interface AttemptQuestion {
  id: string
  questionText: string
  optionA: string
  optionB: string
  optionC: string
  optionD: string
  marks: number
  selectedOption: OptionKey | null
  correctOption?: OptionKey
  isCorrect?: boolean
}

export interface MyAttemptDetail {
  test: TestSummary
  attempt: {
    id: string
    status: 'not_started' | 'in_progress' | 'submitted' | 'evaluated'
    startedAt: string | null
    submittedAt: string | null
    marksAwarded: number | null
    maxMarks: number | null
    evaluatorFeedback: string | null
  }
  serverNow: string
  questions?: AttemptQuestion[]
  descriptive?: {
    questionText: string | null
    questionFileUrl: string | null
    questionFileName: string | null
    answerText: string | null
    answerFileName: string | null
  }
}

export interface AdminAttemptRow {
  id: string
  studentId: string
  studentName: string
  admissionNumber: string | null
  grade: string | null
  batch: string | null
  status: 'not_started' | 'in_progress' | 'submitted' | 'evaluated'
  startedAt: string | null
  submittedAt: string | null
  autoSubmitted: boolean
  marksAwarded: number | null
  maxMarks: number | null
}

export interface AdminAttemptQuestion {
  id: string
  questionText: string
  optionA: string
  optionB: string
  optionC: string
  optionD: string
  correctOption: OptionKey
  marks: number
  selectedOption: OptionKey | null
  isCorrect: boolean
  marksAwarded: number
}

export interface AdminAttemptDetail {
  id: string
  student: { id: string; name: string; admissionNumber: string | null; grade: string | null; batch: string | null }
  status: 'not_started' | 'in_progress' | 'submitted' | 'evaluated'
  startedAt: string | null
  submittedAt: string | null
  autoSubmitted: boolean
  marksAwarded: number | null
  maxMarks: number | null
  evaluatorFeedback: string | null
  questions?: AdminAttemptQuestion[]
  descriptive?: {
    questionText: string | null
    questionFileUrl: string | null
    answerKeyFileUrl: string | null
    answerText: string | null
    answerFileUrl: string | null
    answerFileName: string | null
  }
}

// ─── Admin: manage tests ────────────────────────────────────────────────────

export function useAdminTests(params?: { batchId?: string; status?: string }) {
  const [tests, setTests] = useState<TestSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(() => {
    setLoading(true)
    setError(null)
    const qs = new URLSearchParams()
    if (params?.batchId) qs.set('batchId', params.batchId)
    if (params?.status) qs.set('status', params.status)
    const suffix = qs.toString() ? `?${qs.toString()}` : ''
    authedFetch(`/api/tests${suffix}`)
      .then((d) => setTests(d))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [params?.batchId, params?.status])

  useEffect(() => { refetch() }, [refetch])

  const createTest = useCallback(async (input: CreateTestInput) => {
    const test = await authedFetch('/api/tests', { method: 'POST', body: JSON.stringify(input) })
    await refetch()
    return test as TestSummary
  }, [refetch])

  const updateTest = useCallback(async (id: string, patch: Partial<CreateTestInput> & { status?: TestStatus }) => {
    const test = await authedFetch(`/api/tests/${id}`, { method: 'PATCH', body: JSON.stringify(patch) })
    await refetch()
    return test as TestSummary
  }, [refetch])

  const deleteTest = useCallback(async (id: string) => {
    await authedFetch(`/api/tests/${id}`, { method: 'DELETE' })
    setTests((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const uploadQuestionFile = useCallback(async (id: string, file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    const test = await authedFetch(`/api/tests/${id}/question-file`, { method: 'POST', body: fd })
    await refetch()
    return test as TestSummary
  }, [refetch])

  const uploadAnswerKeyFile = useCallback(async (id: string, file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    const test = await authedFetch(`/api/tests/${id}/answer-key-file`, { method: 'POST', body: fd })
    await refetch()
    return test as TestSummary
  }, [refetch])

  return { tests, loading, error, refetch, createTest, updateTest, deleteTest, uploadQuestionFile, uploadAnswerKeyFile }
}

export function useAdminTestDetail(testId: string | null) {
  const [test, setTest] = useState<TestAdminDetail | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(() => {
    if (!testId) { setTest(null); return }
    setLoading(true)
    setError(null)
    authedFetch(`/api/tests/${testId}`)
      .then((d) => setTest(d))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [testId])

  useEffect(() => { refetch() }, [refetch])

  return { test, loading, error, refetch }
}

// ─── Admin: attempts / grading ──────────────────────────────────────────────

export function useAdminAttempts(testId: string | null) {
  const [attempts, setAttempts] = useState<AdminAttemptRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(() => {
    if (!testId) { setAttempts([]); return }
    setLoading(true)
    setError(null)
    authedFetch(`/api/tests/${testId}/attempts`)
      .then((d) => setAttempts(d))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [testId])

  useEffect(() => { refetch() }, [refetch])

  return { attempts, loading, error, refetch }
}

export async function fetchAdminAttemptDetail(testId: string, attemptId: string): Promise<AdminAttemptDetail> {
  return authedFetch(`/api/tests/${testId}/attempts/${attemptId}`)
}

export async function gradeDescriptiveAttempt(testId: string, attemptId: string, marksAwarded: number, feedback: string) {
  return authedFetch(`/api/tests/${testId}/attempts/${attemptId}/grade`, {
    method: 'POST',
    body: JSON.stringify({ marksAwarded, feedback }),
  })
}

// ─── Student: my tests ──────────────────────────────────────────────────────

export function useMyTests() {
  const [tests, setTests] = useState<StudentTestListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(() => {
    setLoading(true)
    setError(null)
    authedFetch('/api/tests/me')
      .then((d) => setTests(d))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { refetch() }, [refetch])

  return { tests, loading, error, refetch }
}

// ─── Student: taking an attempt ─────────────────────────────────────────────

export async function startMyAttempt(testId: string) {
  return authedFetch(`/api/tests/${testId}/attempts/start`, { method: 'POST' })
}

export async function fetchMyAttempt(testId: string): Promise<MyAttemptDetail> {
  return authedFetch(`/api/tests/${testId}/attempts/me`)
}

export async function saveMyAnswer(testId: string, questionId: string, selectedOption: OptionKey) {
  return authedFetch(`/api/tests/${testId}/attempts/me/answer`, {
    method: 'POST',
    body: JSON.stringify({ questionId, selectedOption }),
  })
}

export async function submitMyAttempt(testId: string, opts?: { answerText?: string; answerFile?: File; autoSubmitted?: boolean }) {
  if (opts?.answerFile || opts?.answerText !== undefined) {
    const fd = new FormData()
    if (opts.answerText !== undefined) fd.append('answerText', opts.answerText)
    if (opts.answerFile) fd.append('answerFile', opts.answerFile)
    if (opts.autoSubmitted) fd.append('autoSubmitted', 'true')
    return authedFetch(`/api/tests/${testId}/attempts/me/submit`, { method: 'POST', body: fd })
  }
  return authedFetch(`/api/tests/${testId}/attempts/me/submit`, {
    method: 'POST',
    body: JSON.stringify({ autoSubmitted: !!opts?.autoSubmitted }),
  })
}
