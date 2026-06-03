'use client'

import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { IconCheckCircle, IconXCircle, IconDocument } from '@/components/ui/SvgIcons'

// ─── Types ────────────────────────────────────────────────────────────────────

type AppStatus = 'pending' | 'approved' | 'rejected'
type StudentStatus = 'active' | 'blocked'

interface Application {
  id: string; name: string; grade: string; batch: string
  phone: string; email: string; appliedDate: string
  status: AppStatus; board: string
}

interface Student {
  id: string; name: string; roll: string; grade: string; batch: string
  phone: string; email: string; joinedDate: string
  onlineAtt: number | null; offlineAtt: number | null
  status: StudentStatus; avgScore: number
}

// ─── Mock Data ────────────────────────────────────────────────────────────────

const initialApplications: Application[] = [
  { id: 'APP001', name: 'Rohan Suresh',  grade: '12th', batch: 'Offline Batch A', phone: '9876540001', email: 'rohan@gmail.com',  appliedDate: '20 May 2026', status: 'pending', board: 'CBSE'     },
  { id: 'APP002', name: 'Lakshmi Devi', grade: '11th', batch: 'Online Batch B',  phone: '9876540002', email: 'lakshmi@gmail.com', appliedDate: '21 May 2026', status: 'pending', board: 'TN Board' },
  { id: 'APP003', name: 'Vishnu Rajan', grade: 'JEE',  batch: 'Online Batch A',  phone: '9876540003', email: 'vishnu@gmail.com',  appliedDate: '22 May 2026', status: 'pending', board: 'JEE'      },
  { id: 'APP004', name: 'Pooja Nair',   grade: 'NEET', batch: 'Online Batch A',  phone: '9876540004', email: 'pooja@gmail.com',   appliedDate: '22 May 2026', status: 'pending', board: 'NEET'     },
  { id: 'APP005', name: 'Ajay Krishnan',grade: '12th', batch: 'Offline Batch A', phone: '9876540005', email: 'ajay@gmail.com',    appliedDate: '23 May 2026', status: 'pending', board: 'CBSE'     },
]

const students: Student[] = [
  { id: 'S01', name: 'Arjun Kumar',      roll: 'CO-001', grade: '12th', batch: 'Offline A', phone: '9876543210', email: 'arjun@gmail.com',    joinedDate: '01 Jun 2025', onlineAtt: 82, offlineAtt: 78,   status: 'active',  avgScore: 84 },
  { id: 'S02', name: 'Sneha Rajan',      roll: 'CO-002', grade: '12th', batch: 'Online A',  phone: '9876543211', email: 'sneha@gmail.com',    joinedDate: '01 Jun 2025', onlineAtt: 94, offlineAtt: null, status: 'active',  avgScore: 92 },
  { id: 'S03', name: 'Karthik S.',       roll: 'CO-003', grade: '11th', batch: 'Offline B', phone: '9876543212', email: 'karthik@gmail.com',  joinedDate: '15 Jun 2025', onlineAtt: 72, offlineAtt: 68,   status: 'blocked', avgScore: 58 },
  { id: 'S04', name: 'Priya Thirumalai', roll: 'CO-004', grade: 'JEE',  batch: 'Online B',  phone: '9876543213', email: 'priya@gmail.com',    joinedDate: '01 Jun 2025', onlineAtt: 88, offlineAtt: null, status: 'active',  avgScore: 76 },
  { id: 'S05', name: 'Meenakshi A.',     roll: 'CO-005', grade: '12th', batch: 'Offline A', phone: '9876543214', email: 'meenakshi@gmail.com',joinedDate: '01 Jun 2025', onlineAtt: 91, offlineAtt: 89,   status: 'active',  avgScore: 88 },
  { id: 'S06', name: 'Rahul Venkat',     roll: 'CO-006', grade: 'NEET', batch: 'Online A',  phone: '9876543215', email: 'rahul@gmail.com',    joinedDate: '15 Jun 2025', onlineAtt: 73, offlineAtt: null, status: 'active',  avgScore: 69 },
  { id: 'S07', name: 'Divya Krishnan',   roll: 'CO-007', grade: '11th', batch: 'Offline B', phone: '9876543216', email: 'divya@gmail.com',    joinedDate: '01 Jun 2025', onlineAtt: 65, offlineAtt: 60,   status: 'blocked', avgScore: 52 },
  { id: 'S08', name: 'Ananya Lakshmi',   roll: 'CO-008', grade: 'NEET', batch: 'Online B',  phone: '9876543217', email: 'ananya@gmail.com',   joinedDate: '01 Jun 2025', onlineAtt: 97, offlineAtt: null, status: 'active',  avgScore: 94 },
  { id: 'S09', name: 'Siva Prakash',     roll: 'CO-009', grade: '12th', batch: 'Offline A', phone: '9876543218', email: 'siva@gmail.com',     joinedDate: '15 Jun 2025', onlineAtt: 85, offlineAtt: 83,   status: 'active',  avgScore: 78 },
  { id: 'S10', name: 'Arun Shankar',     roll: 'CO-010', grade: 'JEE',  batch: 'Online A',  phone: '9876543219', email: 'arun@gmail.com',     joinedDate: '01 Jun 2025', onlineAtt: 79, offlineAtt: null, status: 'active',  avgScore: 71 },
  { id: 'S11', name: 'Deepak Mohan',     roll: 'CO-011', grade: '11th', batch: 'Offline B', phone: '9876543220', email: 'deepak@gmail.com',   joinedDate: '01 Jun 2025', onlineAtt: 88, offlineAtt: 85,   status: 'active',  avgScore: 80 },
  { id: 'S12', name: 'Kaviya Raj',       roll: 'CO-012', grade: '12th', batch: 'Online B',  phone: '9876543221', email: 'kaviya@gmail.com',   joinedDate: '15 Jun 2025', onlineAtt: 92, offlineAtt: null, status: 'active',  avgScore: 86 },
  { id: 'S13', name: 'Surya Kumar',      roll: 'CO-013', grade: 'NEET', batch: 'Offline A', phone: '9876543222', email: 'surya@gmail.com',    joinedDate: '01 Jun 2025', onlineAtt: 71, offlineAtt: 69,   status: 'active',  avgScore: 65 },
  { id: 'S14', name: 'Nithya Saravanan', roll: 'CO-014', grade: '11th', batch: 'Online A',  phone: '9876543223', email: 'nithya@gmail.com',   joinedDate: '01 Jun 2025', onlineAtt: 96, offlineAtt: null, status: 'active',  avgScore: 91 },
  { id: 'S15', name: 'Praveen Raman',    roll: 'CO-015', grade: 'JEE',  batch: 'Offline B', phone: '9876543224', email: 'praveen@gmail.com',  joinedDate: '15 Jun 2025', onlineAtt: 76, offlineAtt: 74,   status: 'active',  avgScore: 73 },
  { id: 'S16', name: 'Riya Sharma',      roll: 'CO-016', grade: '12th', batch: 'Online A',  phone: '9876543225', email: 'riya@gmail.com',     joinedDate: '01 Jun 2025', onlineAtt: 89, offlineAtt: null, status: 'active',  avgScore: 82 },
  { id: 'S17', name: 'Venkat Suresh',    roll: 'CO-017', grade: '11th', batch: 'Offline A', phone: '9876543226', email: 'venkat@gmail.com',   joinedDate: '15 Jun 2025', onlineAtt: 63, offlineAtt: 58,   status: 'blocked', avgScore: 48 },
  { id: 'S18', name: 'Pooja Nair',       roll: 'CO-018', grade: 'NEET', batch: 'Online B',  phone: '9876543227', email: 'pooja2@gmail.com',   joinedDate: '01 Jun 2025', onlineAtt: 93, offlineAtt: null, status: 'active',  avgScore: 89 },
  { id: 'S19', name: 'Manoj Pillai',     roll: 'CO-019', grade: '12th', batch: 'Offline B', phone: '9876543228', email: 'manoj@gmail.com',    joinedDate: '01 Jun 2025', onlineAtt: 80, offlineAtt: 77,   status: 'active',  avgScore: 74 },
  { id: 'S20', name: 'Lakshmi Devi',     roll: 'CO-020', grade: '11th', batch: 'Online A',  phone: '9876543229', email: 'lakshmi2@gmail.com', joinedDate: '01 Jun 2025', onlineAtt: 98, offlineAtt: null, status: 'active',  avgScore: 95 },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

const GRADES   = ['All', '11th', '12th', 'JEE', 'NEET'] as const
const STATUSES = ['All', 'active', 'blocked'] as const

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('')
}

// ─── Application Card ─────────────────────────────────────────────────────────

function ApplicationCard({ app, onApprove, onReject }: {
  app: Application; onApprove: (id: string) => void; onReject: (id: string) => void
}) {
  const isPending = app.status === 'pending'

  return (
    <motion.div layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.96 }}
      className="bg-white rounded-2xl shadow-sm p-5 flex flex-col gap-4">
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-lg text-primary">{app.name}</h3>
            <span className="text-sm border border-gray-200 px-2 py-0.5 text-gray-600 rounded-full">{app.grade}</span>
            {!isPending && (
              <span className="text-sm px-2 py-0.5 border border-gray-200 text-gray-600 capitalize rounded-full">{app.status}</span>
            )}
          </div>
          <p className="text-base text-gray-600 mt-0.5">{app.batch} · {app.board} Board</p>
          <p className="text-base text-gray-600">{app.email} · <span className="font-inter">{app.phone}</span></p>
          <p className="text-base text-gray-600">Applied on <span className="font-inter">{app.appliedDate}</span></p>
        </div>
        <div className="w-10 h-10 bg-gray-100 flex items-center justify-center text-primary text-base shrink-0">
          {initials(app.name)}
        </div>
      </div>

      {/* Document placeholders */}
      <div className="grid grid-cols-2 gap-3">
        {[{ label: '10th ID Card', sub: 'Identity proof' }, { label: '10th Grade Paper', sub: 'Academic proof' }].map(({ label, sub }) => (
          <div key={label} className="border border-dashed border-gray-300 flex flex-col items-center justify-center gap-1.5 py-3 bg-gray-50">
            <IconDocument className="w-4 h-4" />
            <div className="text-center">
              <p className="text-sm text-primary">{label}</p>
              <p className="text-sm text-gray-500">{sub}</p>
            </div>
            <button className="text-sm text-primary hover:cursor-pointer hover:text-[#3d2652]">View Document</button>
          </div>
        ))}
      </div>

      {isPending && (
        <div className="flex gap-3">
          <button onClick={() => onReject(app.id)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 border border-gray-300 text-gray-600 text-base hover:bg-gray-50 transition-colors">
            <IconXCircle className="w-4 h-4" />Reject
          </button>
          <button onClick={() => onApprove(app.id)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary text-white text-base hover:bg-[#3d2652] transition-colors">
            <IconCheckCircle className="w-4 h-4" />Approve
          </button>
        </div>
      )}
    </motion.div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StudentsPage() {
  const [activeTab, setActiveTab] = useState<'applications' | 'database'>('applications')
  const [applications, setApplications] = useState<Application[]>(initialApplications)
  const [search, setSearch] = useState('')
  const [gradeFilter, setGradeFilter] = useState<typeof GRADES[number]>('All')
  const [statusFilter, setStatusFilter] = useState<typeof STATUSES[number]>('All')
  const [filterOpen, setFilterOpen] = useState(false)

  const pendingCount = applications.filter((a) => a.status === 'pending').length

  const approve = (id: string) => setApplications((prev) => prev.map((a) => a.id === id ? { ...a, status: 'approved' } : a))
  const reject  = (id: string) => setApplications((prev) => prev.map((a) => a.id === id ? { ...a, status: 'rejected' } : a))

  const filteredStudents = useMemo(
    () => students.filter((s) => {
      const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.roll.toLowerCase().includes(search.toLowerCase()) ||
        s.email.toLowerCase().includes(search.toLowerCase())
      const matchGrade  = gradeFilter === 'All' || s.grade === gradeFilter
      const matchStatus = statusFilter === 'All' || s.status === statusFilter
      return matchSearch && matchGrade && matchStatus
    }),
    [search, gradeFilter, statusFilter]
  )

  const activeFilterCount = (gradeFilter !== 'All' ? 1 : 0) + (statusFilter !== 'All' ? 1 : 0)

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Students</h1>
        <p className="text-base text-gray-600 mt-1">Verify applications and manage the student database.</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 border-b border-gray-200 mb-8">
        <button onClick={() => { setActiveTab('applications'); setSearch('') }}
          className={`flex items-center gap-2 px-5 py-2.5 text-base border-b-2 transition-colors -mb-px ${
            activeTab === 'applications' ? 'border-primary text-primary' : 'border-transparent text-gray-600 hover:text-gray-800'
          }`}>
          New Applications
          {pendingCount > 0 && (
            <span className="text-sm px-2 py-0.5 bg-primary text-white font-inter rounded-full">{pendingCount}</span>
          )}
        </button>
        <button onClick={() => { setActiveTab('database'); setSearch('') }}
          className={`flex items-center gap-2 px-5 py-2.5 text-base border-b-2 transition-colors -mb-px ${
            activeTab === 'database' ? 'border-primary text-primary' : 'border-transparent text-gray-600 hover:text-gray-800'
          }`}>
          Student Database
          <span className="text-sm px-2 py-0.5 border border-gray-200 text-gray-500 font-inter rounded-full">{students.length}</span>
        </button>
      </div>

      <AnimatePresence mode="wait">
        {/* Applications tab */}
        {activeTab === 'applications' && (
          <motion.div key="applications" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.22 }}>
            {pendingCount === 0 && applications.every((a) => a.status !== 'pending') && (
              <div className="text-center py-16 text-gray-600 text-base">No pending applications.</div>
            )}
            {pendingCount > 0 && (
              <div className="mb-8">
                <h2 className="text-base text-gray-600 mb-4">Pending Review <span className="bg-primary text-white text-base font-inter px-2 py-0.5 rounded-full">{pendingCount}</span></h2>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  <AnimatePresence>
                    {applications.filter((a) => a.status === 'pending').map((app) => (
                      <ApplicationCard key={app.id} app={app} onApprove={approve} onReject={reject} />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}
            {applications.some((a) => a.status !== 'pending') && (
              <div>
                <h2 className="text-base text-gray-600 mb-4">Processed</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  <AnimatePresence>
                    {applications.filter((a) => a.status !== 'pending').map((app) => (
                      <ApplicationCard key={app.id} app={app} onApprove={approve} onReject={reject} />
                    ))}
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

                {/* Filter toggle button — inline panel, no floating dropdown */}
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

              {/* Inline filter panel — in normal flow, no absolute positioning */}
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
                      {/* Grade filter */}
                      <div>
                        <p className="text-sm text-gray-400 uppercase tracking-wider mb-2">Grade</p>
                        <div className="flex flex-wrap gap-2">
                          {GRADES.map((g) => (
                            <button key={g} onClick={() => setGradeFilter(g)}
                              className={`px-3 py-1.5 text-base rounded-full transition-colors ${
                                gradeFilter === g ? 'bg-primary text-white' : 'border border-gray-200 text-gray-600 hover:border-gray-400'
                              }`}>
                              {g}
                            </button>
                          ))}
                        </div>
                      </div>
                      {/* Status filter */}
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
              <div className="hidden lg:grid lg:grid-cols-[40px_1fr_110px_80px_110px_110px_80px_44px] gap-3 px-5 py-3 text-base text-gray-600 border-b border-gray-200 bg-gray-50">
                <span>ID</span>
                <span>Student</span>
                <span>Roll</span>
                <span>Grade</span>
                <span>Batch</span>
                <span className="text-right">Attendance</span>
                <span className="text-right">Status</span>
                <span />
              </div>
              <div className="divide-y divide-gray-100">
                {filteredStudents.length === 0 ? (
                  <div className="py-12 text-center text-gray-600 text-base">No students match your filters.</div>
                ) : (
                  filteredStudents.map((s, i) => (
                    <div key={s.id}
                      className="flex flex-wrap lg:grid lg:grid-cols-[40px_1fr_110px_80px_110px_110px_80px_44px] gap-3 px-5 py-4 hover:bg-gray-50 transition-colors items-center">
                      <span className="text-base text-gray-400 font-inter w-10">{i + 1}</span>
                      <div className="flex items-center gap-3 min-w-0 flex-1 lg:flex-none">
                        <div className="w-8 h-8 bg-gray-100 flex items-center justify-center text-primary text-base shrink-0">
                          {initials(s.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-base text-primary truncate">{s.name}</p>
                          <p className="text-base text-gray-600 truncate">{s.email}</p>
                        </div>
                      </div>
                      <span className="text-base font-inter text-gray-600 hidden lg:block">{s.roll}</span>
                      <span className="text-base border border-gray-200 px-2 py-0.5 text-gray-600 w-fit hidden lg:block rounded-full">{s.grade}</span>
                      <span className="text-base text-gray-600 hidden lg:block">{s.batch}</span>
                      <div className="text-right hidden lg:block">
                        <span className="text-base font-inter font-bold text-primary">{s.onlineAtt}%</span>
                        {s.offlineAtt !== null && (
                          <span className="text-base font-inter text-gray-400"> / {s.offlineAtt}%</span>
                        )}
                      </div>
                      <span className={`text-base text-right hidden lg:block ${s.status === 'blocked' ? 'text-red-500' : 'text-green-600'}`}>
                        {s.status === 'blocked' ? 'Blocked' : 'Active'}
                      </span>
                      <Link href={`/admin/students/${s.id}`}
                        className="w-9 h-9 border border-gray-200 flex items-center justify-center text-gray-400 hover:border-gray-400 hover:text-primary transition-all shrink-0 ml-auto lg:ml-0">
                        <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
                          <path d="M 6,4 L 10,8 L 6,12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
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
      </AnimatePresence>
    </div>
  )
}
