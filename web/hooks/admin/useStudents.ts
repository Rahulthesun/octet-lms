'use client'

/**
 * hooks/admin/useStudents.ts
 * ─────────────────────────────────────────────────────────────
 * Wraps /api/students endpoints for the admin Students page.
 * Mirrors the shapes actually returned by students.service.js —
 * do not add fields that aren't in the `students` table schema.
 * ─────────────────────────────────────────────────────────────
 */

import { useState, useCallback, useEffect } from 'react'
// TODO: fix this import path if your authedFetch utility lives elsewhere
import { authedFetch } from '../../lib/apiClient'

// NOTE: authedFetch already prepends its own BASE internally and already
// returns parsed JSON (not a Response) — every call below passes a bare
// path only, and none of them call .ok / .json() on the result.

// ─── Types (mirrors `students` table columns — see schema) ────────────────

export type StudentStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export interface StudentRecord {
  id: string
  auth_user_id: string | null
  admission_number: string | null

  name: string
  email: string
  username: string | null

  date_of_birth: string | null

  mobile_number: string | null
  whatsapp_number: string | null
  telegram_number: string | null

  tenth_school: string | null
  tenth_score: string | null
  class_grade: string | null
  school_college: string | null
  subjects: string[] | null

  maths_tuition: string | null
  physics_tuition: string | null
  other_tuition: string | null

  neet_jee_details: string | null
  future_plan: string | null

  preferred_batch: string | null
  learning_mode: string | null

  father_name: string | null
  father_mobile: string | null
  father_whatsapp: string | null
  father_telegram: string | null
  father_email: string | null
  father_profession: string | null

  mother_name: string | null
  mother_mobile: string |null
  mother_whatsapp: string | null
  mother_telegram: string | null
  mother_email: string | null
  mother_profession: string | null

  address: string | null
  landmark: string | null
  city: string | null
  pincode: string | null

  marksheet_10th_url: string | null
  school_id_card_url: string | null
  uniform_photo_url: string | null

  status: StudentStatus | null

  admin_notes: string | null

  created_at: string | null
  updated_at: string | null

  blocked: boolean
}

interface ListFilters {
  batch?: string
  mode?: string
  status?: string
  search?: string
  limit?: number
  offset?: number
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useStudents() {
const [applications, setApplications] = useState<StudentRecord[]>([]);

const [students, setStudents] = useState<StudentRecord[]>([]);
  
const [rejectedStudents, setRejectedStudents] =
useState<StudentRecord[]>([])
  const [loadingApplications, setLoadingApplications] = useState(false)
  const [loadingStudents, setLoadingStudents] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // GET /api/students/pending
  // NOTE: applications currently come only from students.status = 'PENDING'.
  // TODO: `admission_requests` (raw_data jsonb, processed bool) is a separate
  // intake table with no route/service yet — once that lands, this fetch
  // should also pull unprocessed admission_requests rows and merge/label them.
  const fetchApplications = useCallback(async () => {
    setLoadingApplications(true)
    setError(null)
    try {
      const json = await authedFetch('/api/students/pending')
      setApplications(json.applications ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load applications')
    } finally {
      setLoadingApplications(false)
    }
  }, [])

  // GET /api/students?status=APPROVED&...
  // Database tab only ever shows approved students (pending live in the
  // Applications tab; rejected aren't "students" in any meaningful sense).
  const fetchStudents = useCallback(async (filters: ListFilters = {}) => {
    setLoadingStudents(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      params.set('status', 'APPROVED')
      if (filters.batch) params.set('batch', filters.batch)
      if (filters.mode) params.set('mode', filters.mode)
      if (filters.search) params.set('search', filters.search)
      if (filters.limit) params.set('limit', String(filters.limit))
      if (filters.offset) params.set('offset', String(filters.offset))

      const json = await authedFetch(`/api/students?${params.toString()}`)
      setStudents(json.data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load students')
    } finally {
      setLoadingStudents(false)
    }
  }, [])

  const fetchRejectedStudents = useCallback(async () => {
  try {
    const json = await authedFetch("/api/students/rejected");

    alert(JSON.stringify(json));

    setRejectedStudents(
      Array.isArray(json)
        ? json
        : json.data ?? json.students ?? []
    );
  } catch (err) {
    console.error(err);
  }
}, []);

  // POST /api/students/:id/approve
  const approveStudent = useCallback(async (id: string) => {
    const json = await authedFetch(`/api/students/${id}/approve`, {
        method: "POST",
    });

    setApplications((prev) => prev.filter((a) => a.id !== id));

    await fetchStudents();

    return json;
}, [fetchStudents]);

  // POST /api/students/:id/reject
  const rejectStudent = useCallback(async (id: string, reason?: string) => {
    const json = await authedFetch(`/api/students/${id}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: reason ?? "" }),
    });

    setApplications((prev) => prev.filter((a) => a.id !== id));

    // 👇 Refresh rejected students
    await fetchRejectedStudents();

    return json;
}, [fetchRejectedStudents]);

  // PUT /api/students/:id  { blocked: true|false }
  const setBlocked = useCallback(async (id: string, blocked: boolean) => {
    const json = await authedFetch(`/api/students/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ blocked }),
    })
    setStudents((prev) => prev.map((s) => (s.id === id ? { ...s, blocked } : s)))
    return json
  }, [])

  useEffect(() => {
    fetchApplications();
    fetchStudents();
    fetchRejectedStudents();
}, [
    fetchApplications,
    fetchStudents,
    fetchRejectedStudents,
]);

  return {
    applications,
    students,
    rejectedStudents,
    loadingApplications,
    loadingStudents,
    error,
    fetchApplications,
    fetchStudents,
    fetchRejectedStudents,
    approveStudent,
    rejectStudent,
    setBlocked,
  }
}

// ─── Single-student detail hook ────────────────────────────────────────────
// Used by /admin/students/[id]. Separate from useStudents() since the detail
// page needs one record + its own loading/error/save state, not a list.

export function useStudentDetail(id: string | undefined) {
  const [student, setStudent] = useState<StudentRecord | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // GET /api/students/:id
  const fetchStudent = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const json = await authedFetch(`/api/students/${id}`)
      setStudent(json.data ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load student')
    } finally {
      setLoading(false)
    }
  }, [id])

  // PUT /api/students/:id — generic partial update, used for both the
  // edit form (contact/parent fields) and the block toggle.
  const updateStudent = useCallback(async (updates: Partial<StudentRecord>) => {
    if (!id) return
    setSaving(true)
    setError(null)
    try {
      const json = await authedFetch(`/api/students/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      })
      setStudent((prev) => (prev ? { ...prev, ...json.data } : json.data))
      return json.data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save changes')
      throw err
    } finally {
      setSaving(false)
    }
  }, [id])

  useEffect(() => {
    fetchStudent()
  }, [fetchStudent])

  return { student, loading, error, saving, fetchStudent, updateStudent }
}