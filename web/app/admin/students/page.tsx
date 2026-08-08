'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { IconCheckCircle, IconXCircle, IconDocument } from '@/components/ui/SvgIcons'
import { useStudents, type StudentRecord } from '@/hooks/admin/useStudents'
import AttendanceReportsTab from '@/components/admin/AttendanceReportsTab'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('')
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ─── Application Card ─────────────────────────────────────────────────────────

function ApplicationCard({
  app,
  onApprove,
  onReject,
  busy,
}: {
  app: StudentRecord
  onApprove: (id: string) => void
  onReject: (id: string) => void
  busy: boolean
})
 {

  return (
    <motion.div layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}
      className="bg-white rounded-2xl shadow-sm p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-lg text-primary">{app.name}</h3>
            {app.class_grade && (
  <span className="text-sm border border-gray-200 px-2 py-0.5 text-gray-600 rounded-full">
    {app.class_grade === "11"
      ? "11th Std"
      : app.class_grade === "12"
      ? "12th Std"
      : app.class_grade}
  </span>
)}
          </div>
          <p className="text-base text-gray-600 mt-0.5">
            {[app.learning_mode, app.preferred_batch].filter(Boolean).join(' · ') || 'Batch not set'}
            {app.school_college ? ` · ${app.school_college}` : ''}
          </p>
          <p className="text-base text-gray-600">{app.email} · <span className="font-inter">{app.mobile_number || '—'}</span></p>
          <p className="text-base text-gray-600">Applied on <span className="font-inter">{formatDate(app.created_at)}</span></p>
        </div>
        <div className="flex items-start gap-2">

  <Link
  href={`/admin/students/${app.id}`}
  title="View Full Details"
  className="w-10 h-10 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:border-primary hover:text-primary hover:bg-gray-50 transition-all"
>
  <span className="text-lg">👁️</span>
</Link>

  <div className="w-10 h-10 bg-gray-100 flex items-center justify-center text-primary text-base shrink-0 rounded-lg">
    {initials(app.name)}
  </div>

</div>
      </div>

      {/* Document links — pulled from marksheet_10th_url / school_id_card_url */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: '10th ID Card', sub: 'Identity proof', url: app.school_id_card_url },
          { label: '10th Marksheet', sub: 'Academic proof', url: app.marksheet_10th_url },
        ].map(({ label, sub, url }) => (
          <div key={label} className="border border-dashed border-gray-300 flex flex-col items-center justify-center gap-1.5 py-3 bg-gray-50">
            <IconDocument className="w-4 h-4" />
            <div className="text-center">
              <p className="text-sm text-primary">{label}</p>
              <p className="text-sm text-gray-500">{sub}</p>
            </div>
            {url ? (
              <div className="flex items-center gap-2 mt-1">
                <a href={url} target="_blank" rel="noopener noreferrer"
                  className="px-2.5 py-1 text-sm border border-primary text-primary hover:bg-primary hover:text-white transition-colors rounded-md">
                  View
                </a>
                <a href={url} download target="_blank" rel="noopener noreferrer"
                  className="px-2.5 py-1 text-sm border border-gray-300 text-gray-600 hover:bg-gray-100 transition-colors rounded-md">
                  Download
                </a>
              </div>
            ) : (
              <span className="text-sm text-gray-300 cursor-not-allowed">Not uploaded</span>
            )}
          </div>
        ))}
      </div>

      <div className="flex gap-3">
        <button disabled={busy} onClick={() => onReject(app.id)}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-red-300 text-red-600 text-base hover:bg-red-50 transition-colors disabled:opacity-50 rounded-lg">
          <IconXCircle className="w-4 h-4" />Reject
        </button>
        <button disabled={busy} onClick={() => onApprove(app.id)}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-600 text-white text-base hover:bg-green-700 transition-colors disabled:opacity-50 rounded-lg">
          <IconCheckCircle className="w-4 h-4" />Approve
        </button>
      </div>
    </motion.div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const STATUSES = ['All', 'active', 'blocked'] as const

export default function StudentsPage() {
  const {
    applications,
    students,
    rejectedStudents,
    loadingApplications,
    loadingStudents,
    error,
    approveStudent,
    rejectStudent,
    setBlocked,
  } = useStudents()

  const [activeTab, setActiveTab] = useState<'applications' | 'database' | 'rejected' | 'attendance'>('applications')
  const [search, setSearch] = useState('')
  const [gradeFilter, setGradeFilter] = useState<string>('All')
  const [statusFilter, setStatusFilter] = useState<typeof STATUSES[number]>('All')
  const [filterOpen, setFilterOpen] = useState(false)
  const [pendingActionId, setPendingActionId] = useState<string | null>(null)

  // class_grade is free text in the DB (no enum constraint) — derive options
  // from what's actually present rather than hardcoding a list.
  const gradeOptions = useMemo(() => {
    const set = new Set<string>()
    students.forEach((s) => s.class_grade && set.add(s.class_grade))
    return ['All', ...Array.from(set).sort()]
  }, [students])

  const approve = async (id: string) => {
    setPendingActionId(id)
    try {
      await approveStudent(id)
    } catch (e) {
      console.error(e)
    } finally {
      setPendingActionId(null)
    }
  }

  const reject = async (id: string) => {
    setPendingActionId(id)
    try {
      await rejectStudent(id)
    } catch (e) {
      console.error(e)
    } finally {
      setPendingActionId(null)
    }
  }

  const toggleBlock = async (id: string, currentlyBlocked: boolean) => {
    try {
      await setBlocked(id, !currentlyBlocked)
    } catch (e) {
      console.error(e)
    }
  }

  const filteredStudents = useMemo(
    () =>
      students.filter((s) => {
        const q = search.toLowerCase()
        const matchSearch =
          s.name.toLowerCase().includes(q) ||
          (s.admission_number ?? '').toLowerCase().includes(q) ||
          s.email.toLowerCase().includes(q)
        const matchGrade = gradeFilter === 'All' || s.class_grade === gradeFilter
        const matchStatus =
          statusFilter === 'All' ||
          (statusFilter === 'blocked' ? s.blocked : !s.blocked)
        return matchSearch && matchGrade && matchStatus
      }),
    [students, search, gradeFilter, statusFilter]
  )

  const activeFilterCount = (gradeFilter !== 'All' ? 1 : 0) + (statusFilter !== 'All' ? 1 : 0)

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Students</h1>
        <p className="text-base text-gray-600 mt-1">Verify applications and manage the student database.</p>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-base rounded-lg">
          {error}
        </div>
      )}

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-200 mb-8">
        <button onClick={() => { setActiveTab('applications'); setSearch('') }}
          className={`flex items-center gap-2 px-5 py-2.5 text-base border-b-2 transition-colors -mb-px ${
            activeTab === 'applications' ? 'border-primary text-primary' : 'border-transparent text-gray-600 hover:text-gray-800'
          }`}>
          New Applications
          {applications.length > 0 && (
            <span className="text-sm px-2 py-0.5 bg-primary text-white font-inter rounded-full">{applications.length}</span>
          )}
        </button>
        <button onClick={() => { setActiveTab('database'); setSearch('') }}
          className={`flex items-center gap-2 px-5 py-2.5 text-base border-b-2 transition-colors -mb-px ${
            activeTab === 'database' ? 'border-primary text-primary' : 'border-transparent text-gray-600 hover:text-gray-800'
          }`}>
          Student Database
          <span className="text-sm px-2 py-0.5 border border-gray-200 text-gray-500 font-inter rounded-full">{students.length}</span>
        </button>
        <button
  onClick={() => setActiveTab("rejected")}
  className={`flex items-center gap-2 px-5 py-2.5 text-base border-b-2 transition-colors -mb-px ${
    activeTab === "rejected"
      ? "border-primary text-primary"
      : "border-transparent text-gray-600 hover:text-gray-800"
  }`}
>
  Rejected Students

  <span className="text-sm px-2 py-0.5 border border-gray-200 text-gray-500 rounded-full">
    {rejectedStudents.length}
  </span>
</button>
        <button
          onClick={() => { setActiveTab('attendance'); setSearch('') }}
          className={`flex items-center gap-2 px-5 py-2.5 text-base border-b-2 transition-colors -mb-px ${
            activeTab === 'attendance' ? 'border-primary text-primary' : 'border-transparent text-gray-600 hover:text-gray-800'
          }`}
        >
          Attendance
        </button>
      </div>

      <AnimatePresence mode="wait">
        {/* Applications tab */}
        {activeTab === 'applications' && (
          <motion.div key="applications" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.22 }}>
            {loadingApplications ? (
              <div className="text-center py-16 text-gray-600 text-base">Loading applications…</div>
            ) : applications.length === 0 ? (
              <div className="text-center py-16 text-gray-600 text-base">No pending applications.</div>
            ) : (
              <div className="mb-8">
                <h2 className="text-base text-gray-600 mb-4">
                  Pending Review <span className="bg-primary text-white text-base font-inter px-2 py-0.5 rounded-full">{applications.length}</span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  <AnimatePresence>
                    {applications.map((app) => (
                      <ApplicationCard
                        key={app.id}
                        app={app}
                        onApprove={approve}
                        onReject={reject}
                        busy={pendingActionId === app.id}
                      />
                    ))}
                    {/* Rejected Students */}

                  </AnimatePresence>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* Student database tab */}
        {activeTab === 'database' && (
          <motion.div key="database" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.22 }}>
            {/* Search + Filter row */}
            <div className="space-y-3 mb-6">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1 ">
                  <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" viewBox="0 0 16 16" fill="none">
                    <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.3" />
                    <path d="M 11,11 L 14,14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                  </svg>
                  <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search name, roll, or email…"
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-full text-base text-gray-800 placeholder-gray-400 outline-none focus:border-gray-400 bg-transparent" />
                </div>

                <button
                  onClick={() => setFilterOpen((o) => !o)}
                  className={`flex items-center gap-2 px-4 py-2.5 border text-base rounded-full transition-colors shrink-0 ${
                    filterOpen || activeFilterCount > 0
                      ? 'border-primary text-primary bg-white'
                      : 'border-gray-200 text-gray-600 bg-white hover:border-gray-400'
                  }`}
                >
                  <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
                    <path d="M 2,4 L 14,4 M 4,8 L 12,8 M 6,12 L 10,12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                  </svg>
                  Filter
                  {activeFilterCount > 0 && (
                    <span className="w-5 h-5 bg-primary text-white text-xs flex items-center justify-center font-inter leading-none rounded-full">{activeFilterCount}</span>
                  )}
                  <svg className={`w-3.5 h-3.5 transition-transform ${filterOpen ? 'rotate-180' : ''}`} viewBox="0 0 12 12" fill="none">
                    <path d="M 2,4 L 6,8 L 10,4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>

              <AnimatePresence>
                {filterOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-white border border-gray-200 shadow-sm p-4 space-y-4">
                      <div>
                        <p className="text-sm text-gray-400 uppercase tracking-wider mb-2">Grade</p>
                        <div className="flex flex-wrap gap-2">
                          {gradeOptions.map((g) => (
                            <button key={g} onClick={() => setGradeFilter(g)}
                              className={`px-3 py-1.5 text-base rounded-full transition-colors ${
                                gradeFilter === g ? 'bg-primary text-white' : 'border border-gray-200 text-gray-600 hover:border-gray-400'
                              }`}>
                              {g}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400 uppercase tracking-wider mb-2">Status</p>
                        <div className="flex gap-2">
                          {STATUSES.map((s) => (
                            <button key={s} onClick={() => setStatusFilter(s)}
                              className={`px-3 py-1.5 text-base capitalize rounded-full transition-colors ${
                                statusFilter === s ? 'bg-primary text-white' : 'border border-gray-200 text-gray-600 hover:border-gray-400'
                              }`}>
                              {s}
                            </button>
                          ))}
                        </div>
                      </div>
                      {activeFilterCount > 0 && (
                        <button onClick={() => { setGradeFilter('All'); setStatusFilter('All') }}
                          className="text-base text-gray-500 hover:text-primary underline underline-offset-2">
                          Clear all filters
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
              <div className="hidden lg:grid lg:grid-cols-[40px_1fr_160px_70px_140px_90px_100px_60px] gap-3 px-5 py-3 text-base text-gray-600 border-b border-gray-200 bg-gray-50">
                <span>ID</span>
                <span>Student</span>
                <span>Roll</span>
                <span>Grade</span>
                <span>Batch</span>
                {/* TODO: attendance columns don't exist on `students` — needs a join
                    against attendance_sessions/attendance_records once wired up. */}
                <span className="text-right">Attendance</span>
                <span className="text-right">Status</span>
                <span className="text-center">Actions</span>
              </div>
              <div className="divide-y divide-gray-100">
                {loadingStudents ? (
                  <div className="py-12 text-center text-gray-600 text-base">Loading students…</div>
                ) : filteredStudents.length === 0 ? (
                  <div className="py-12 text-center text-gray-600 text-base">No students match your filters.</div>
                ) : (
                  filteredStudents.map((s, i) => (
                    <div key={s.id}
                      className="flex flex-wrap lg:grid lg:grid-cols-[40px_1fr_160px_70px_140px_90px_100px_60px] gap-3 px-5 py-4 hover:bg-gray-50 transition-colors items-center">
                      <span className="text-base text-gray-400 font-inter w-10">{i + 1}</span>
                      <div className="flex items-center gap-3 min-w-0 flex-1 lg:flex-none">
                        <div className="w-8 h-8 bg-gray-100 flex items-center justify-center text-primary text-base shrink-0">
                          {initials(s.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-base text-primary truncate">{s.name}</p>
                          <p className="text-base text-gray-600 truncate">{s.email}</p>
                          <p className="text-sm text-gray-500 truncate font-inter">{s.mobile_number || '—'}</p>
                        </div>
                      </div>
                      <span className="text-base font-inter text-gray-600 hidden lg:block">{s.admission_number || '—'}</span>
                      <span className="text-base border border-gray-200 px-2 py-0.5 text-gray-600 w-fit hidden lg:block rounded-full">{s.class_grade || '—'}</span>
                      <div className="text-base text-gray-600 hidden lg:flex lg:flex-col lg:gap-0.5">
                        {s.preferred_batch && (
                          <span className="flex items-center gap-1">🟣 {s.preferred_batch}</span>
                        )}
                        {s.learning_mode && (
                          <span className="flex items-center gap-1">🏫 {s.learning_mode}</span>
                        )}
                        {!s.preferred_batch && !s.learning_mode && '—'}
                      </div>
                      <div className="text-right hidden lg:block">
                        <span className="text-base font-inter text-gray-400">—</span>
                      </div>
                      <div className="text-right hidden lg:block">
                        <button
                          onClick={() => toggleBlock(s.id, s.blocked)}
                          className={`inline-flex items-center gap-1 text-sm px-2 py-0.5 rounded-full hover:opacity-80 transition-opacity ${
                            s.blocked ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'
                          }`}
                        >
                          {s.blocked ? '🔴 Blocked' : '🟢 Active'}
                        </button>
                      </div>
                      <Link href={`/admin/students/${s.id}`}
                        title="Show Details"
                        className="w-9 h-9 border border-gray-200 flex items-center justify-center text-gray-400 hover:border-gray-400 hover:text-primary transition-all shrink-0 ml-auto lg:ml-0">
                        <span className="text-xl leading-none">⋮</span>
                      </Link>
                    </div>
                  ))
                )}
              </div>
            </div>

            <p className="text-sm text-gray-400 mt-4 text-center">
              Showing {filteredStudents.length} of {students.length} students
            </p>
          </motion.div>
        )}

        {activeTab === "rejected" && (
  <motion.div
    key="rejected"
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -10 }}
    transition={{ duration: 0.22 }}
  >

    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">

      <div className="hidden lg:grid lg:grid-cols-[40px_1fr_160px_70px_140px_100px_60px] gap-3 px-5 py-3 text-base text-gray-600 border-b border-gray-200 bg-gray-50">
        <span>ID</span>
        <span>Student</span>
        <span>Roll</span>
        <span>Grade</span>
        <span>Batch</span>
        <span>Status</span>
        <span className="text-center">View</span>
      </div>

      <div className="divide-y divide-gray-100">

        {rejectedStudents.length === 0 ? (

          <div className="py-12 text-center text-gray-500">
            No rejected students.
          </div>

        ) : (

          rejectedStudents.map((s, i) => (

            <div
              key={s.id}
              className="flex flex-wrap lg:grid lg:grid-cols-[40px_1fr_160px_70px_140px_100px_60px] gap-3 px-5 py-4 items-center hover:bg-gray-50"
            >

              <span>{i + 1}</span>

              <div>
                <p className="text-primary">{s.name}</p>
                <p>{s.email}</p>
                <p>{s.mobile_number}</p>
              </div>

              <span>{s.admission_number || "-"}</span>

              <span>{s.class_grade || "-"}</span>

              <span>{s.preferred_batch || "-"}</span>

              <span className="text-red-600">
                Rejected
              </span>

            <div className="flex justify-center">
              <Link
                href={`/admin/students/${s.id}`}
                className="text-center text-xl"
              >
                👁️
              </Link>
            </div>
            </div>

          ))

        )}

      </div>

    </div>

  </motion.div>
)}

        {activeTab === 'attendance' && (
          <motion.div
            key="attendance"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.22 }}
          >
            <AttendanceReportsTab />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}