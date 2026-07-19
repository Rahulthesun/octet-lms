'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { useStudentDetail } from '@/hooks/admin/useStudents'

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconPencil({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none">
      <path d="M 2,12 L 4,14 L 14,4 L 12,2 Z M 2,12 L 2,14 L 4,14" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  )
}

function IconCheck({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none">
      <path d="M 3,8 L 6.5,11.5 L 13,5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconCheckCircle({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3" />
      <path d="M 5,8 L 7,10 L 11,6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StudentDetailPage() {
  const params = useParams()
  const id = typeof params.id === 'string' ? params.id : undefined
  const { student, loading, error, saving, updateStudent } = useStudentDetail(id)

  const [editing, setEditing] = useState(false)
  const [saved, setSaved] = useState(false)
  const [blockActionError, setBlockActionError] = useState<string | null>(null)
  const [form, setForm] = useState({
    mobile_number: '',
    email: '',
    father_name: '',
    father_mobile: '',
  })

  // Sync form when the real record arrives (or changes underneath us)
  useEffect(() => {
    if (student) {
      setForm({
        mobile_number: student.mobile_number ?? '',
        email: student.email ?? '',
        father_name: student.father_name ?? '',
        father_mobile: student.father_mobile ?? '',
      })
    }
  }, [student])

  const handleSave = async () => {
    try {
      await updateStudent(form)
      setEditing(false)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      // error state already surfaced via hook's `error`
    }
  }

  const toggleBlock = async () => {
    if (!student) return
    setBlockActionError(null)
    try {
      await updateStudent({ blocked: !student.blocked })
    } catch (e) {
      setBlockActionError(e instanceof Error ? e.message : 'Failed to update block status')
    }
  }

  if (loading) {
    return <div className="p-8 text-base text-gray-600">Loading student…</div>
  }

  if (error && !student) {
    return (
      <div className="p-8">
        <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-base rounded-lg">{error}</div>
      </div>
    )
  }

  if (!student) {
    return <div className="p-8 text-base text-gray-600">Student not found.</div>
  }

  return (
    <div className="p-8">
      {/* Back */}
      <Link href="/admin/students"
        className="inline-flex items-center gap-2 text-base text-gray-500 hover:text-primary transition-colors mb-6">
        <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
          <path d="M 10,3 L 5,8 L 10,13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back to Students
      </Link>

      {/* Hero card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="bg-white shadow-sm p-6 mb-6"
      >
        <div className="flex flex-col sm:flex-row items-start gap-5">
          <div className="w-16 h-16 bg-gray-100 flex items-center justify-center text-primary text-2xl shrink-0">
            {student.name.charAt(0)}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-2xl text-primary">{student.name}</h1>
              {student.class_grade && (
                <span className="text-sm border border-gray-200 px-2 py-0.5 text-gray-600">{student.class_grade}</span>
              )}
              <span className={`text-sm border border-gray-200 px-2 py-0.5 ${student.blocked ? 'text-red-500' : 'text-green-600'}`}>
                {student.blocked ? 'Blocked' : 'Active'}
              </span>
            </div>
            <p className="text-lg text-gray-600">
              {student.admission_number || 'No admission number'} ·{' '}
              {[student.learning_mode, student.preferred_batch].filter(Boolean).join(' · ') || 'Batch not set'} · Joined {formatDate(student.created_at)}
            </p>
          </div>

          <div className="flex gap-2 shrink-0">
            <button
              onClick={toggleBlock}
              disabled={saving}
              className="px-5 py-2.5 text-base border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
            >
              {student.blocked ? 'Unblock Student' : 'Block Student'}
            </button>
            <button
              onClick={() => setEditing(!editing)}
              className="flex items-center gap-2 px-5 py-2.5 border border-gray-200 text-primary text-base hover:bg-gray-50 transition-colors"
            >
              <IconPencil className="w-4 h-4" />
              Edit
            </button>
          </div>
        </div>
        {blockActionError && (
          <p className="text-sm text-red-600 mt-3">{blockActionError}</p>
        )}
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Personal info */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.08 }}
          className="bg-white shadow-sm p-5"
        >
          <h2 className="text-base text-primary mb-4">Personal Information</h2>
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            {/* Left: Phone, Email */}
            <div className="space-y-4">
              {([
                { label: 'Phone', key: 'mobile_number' as const },
                { label: 'Email', key: 'email' as const },
              ] as { label: string; key: keyof typeof form }[]).map(({ label, key }) => (
                <div key={key}>
                  <label className="text-sm text-gray-400 block mb-1">{label}</label>
                  {editing ? (
                    <input type="text" value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                      className="w-full border border-gray-200 px-3 py-2 text-base text-primary outline-none focus:border-gray-400" />
                  ) : (
                    <p className="text-base text-primary">{form[key] || '—'}</p>
                  )}
                </div>
              ))}
            </div>
            {/* Right: Father's Name, Father's Phone */}
            {/* NOTE: schema has both father_* and mother_* contact fields —
                showing father's here to match the original single-field
                layout. Swap to mother_name/mother_mobile or show both if
                that's not the right call. */}
            <div className="space-y-4">
              {([
                { label: "Father's Name",  key: 'father_name'   as const },
                { label: "Father's Phone", key: 'father_mobile' as const },
              ] as { label: string; key: keyof typeof form }[]).map(({ label, key }) => (
                <div key={key}>
                  <label className="text-sm text-gray-400 block mb-1">{label}</label>
                  {editing ? (
                    <input type="text" value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                      className="w-full border border-gray-200 px-3 py-2 text-base text-primary outline-none focus:border-gray-400" />
                  ) : (
                    <p className="text-base text-primary">{form[key] || '—'}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
          {editing && (
            <div className="flex gap-3 mt-5">
              <button onClick={() => setEditing(false)}
                className="flex-1 py-2.5 border border-gray-200 text-gray-500 text-base hover:bg-gray-50">
                Cancel
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary text-white text-base hover:bg-[#3d2652] transition-colors disabled:opacity-50">
                <IconCheck className="w-4 h-4" />
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          )}
          {saved && (
            <div className="flex items-center gap-2 text-gray-600 text-sm mt-3">
              <IconCheckCircle className="w-4 h-4" />
              Changes saved successfully.
            </div>
          )}
          {error && (
            <p className="text-sm text-red-600 mt-3">{error}</p>
          )}
        </motion.div>

        {/* Attendance */}
        {/* TODO: `students` has no attendance columns — real attendance lives
            in attendance_sessions/attendance_records per the attendance
            system. This section is a placeholder until that's joined in. */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.12 }}
          className="bg-white shadow-sm p-6"
        >
          <h2 className="text-base text-primary mb-5">Attendance</h2>
          <p className="text-base text-gray-400 italic">Attendance data not connected yet.</p>
        </motion.div>
      </div>

      {/* Test history */}
      {/* TODO: no tests/marks table exists in the schema or backend service —
          this section has no data source yet. Left as an explicit "not
          available" state rather than mock numbers. */}
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.16 }}
        className="bg-white shadow-sm overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-gray-200">
          <h2 className="text-base text-primary">Test History</h2>
        </div>
        <div className="px-5 py-8 text-base text-gray-400 text-center">
          Test history isn't connected to a backend source yet.
        </div>
      </motion.div>
    </div>
  )
}