'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useParams } from 'next/navigation'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Student {
  id: string; name: string; roll: string; grade: string; batch: string
  phone: string; email: string; joinedDate: string
  onlineAtt: number | null; offlineAtt: number | null
  board: string; parent: string; parentPhone: string; avgScore: number
}

interface TestRecord {
  id: string; name: string; date: string; maxMarks: number
  marks: number | null; type: 'MCQ' | 'Descriptive'
}

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

// ─── Mock Data ────────────────────────────────────────────────────────────────

const students: Student[] = [
  { id: 'S01', name: 'Arjun Kumar',      roll: 'CO-001', grade: '12th', batch: 'Offline A', phone: '9876543210', email: 'arjun@gmail.com',    joinedDate: '01 Jun 2025', onlineAtt: 82, offlineAtt: 78,   board: 'CBSE',     parent: 'Suresh Kumar',     parentPhone: '9876543200', avgScore: 84 },
  { id: 'S02', name: 'Sneha Rajan',      roll: 'CO-002', grade: '12th', batch: 'Online A',  phone: '9876543211', email: 'sneha@gmail.com',    joinedDate: '01 Jun 2025', onlineAtt: 94, offlineAtt: null, board: 'CBSE',     parent: 'Rajan V.',         parentPhone: '9876543201', avgScore: 92 },
  { id: 'S03', name: 'Karthik S.',       roll: 'CO-003', grade: '11th', batch: 'Offline B', phone: '9876543212', email: 'karthik@gmail.com',  joinedDate: '15 Jun 2025', onlineAtt: 72, offlineAtt: 68,   board: 'TN Board', parent: 'Senthil Kumar',    parentPhone: '9876543202', avgScore: 58 },
  { id: 'S04', name: 'Priya Thirumalai', roll: 'CO-004', grade: 'JEE',  batch: 'Online B',  phone: '9876543213', email: 'priya@gmail.com',    joinedDate: '01 Jun 2025', onlineAtt: 88, offlineAtt: null, board: 'JEE',      parent: 'Thirumalai',       parentPhone: '9876543203', avgScore: 87 },
  { id: 'S05', name: 'Meenakshi A.',     roll: 'CO-005', grade: '12th', batch: 'Offline A', phone: '9876543214', email: 'meenakshi@gmail.com',joinedDate: '01 Jun 2025', onlineAtt: 91, offlineAtt: 89,   board: 'CBSE',     parent: 'Anand M.',         parentPhone: '9876543204', avgScore: 88 },
  { id: 'S06', name: 'Rahul Venkat',     roll: 'CO-006', grade: 'NEET', batch: 'Online A',  phone: '9876543215', email: 'rahul@gmail.com',    joinedDate: '15 Jun 2025', onlineAtt: 73, offlineAtt: null, board: 'NEET',     parent: 'Venkat R.',        parentPhone: '9876543205', avgScore: 69 },
  { id: 'S07', name: 'Divya Krishnan',   roll: 'CO-007', grade: '11th', batch: 'Offline B', phone: '9876543216', email: 'divya@gmail.com',    joinedDate: '01 Jun 2025', onlineAtt: 65, offlineAtt: 60,   board: 'TN Board', parent: 'Krishnan P.',      parentPhone: '9876543206', avgScore: 52 },
  { id: 'S08', name: 'Ananya Lakshmi',   roll: 'CO-008', grade: 'NEET', batch: 'Online B',  phone: '9876543217', email: 'ananya@gmail.com',   joinedDate: '01 Jun 2025', onlineAtt: 97, offlineAtt: null, board: 'NEET',     parent: 'Lakshmi S.',       parentPhone: '9876543207', avgScore: 94 },
  { id: 'S09', name: 'Siva Prakash',     roll: 'CO-009', grade: '12th', batch: 'Offline A', phone: '9876543218', email: 'siva@gmail.com',     joinedDate: '15 Jun 2025', onlineAtt: 85, offlineAtt: 83,   board: 'CBSE',     parent: 'Prakash S.',       parentPhone: '9876543208', avgScore: 78 },
  { id: 'S10', name: 'Arun Shankar',     roll: 'CO-010', grade: 'JEE',  batch: 'Online A',  phone: '9876543219', email: 'arun@gmail.com',     joinedDate: '01 Jun 2025', onlineAtt: 79, offlineAtt: null, board: 'JEE',      parent: 'Shankar A.',       parentPhone: '9876543209', avgScore: 71 },
  { id: 'S11', name: 'Deepak Mohan',     roll: 'CO-011', grade: '11th', batch: 'Offline B', phone: '9876543220', email: 'deepak@gmail.com',   joinedDate: '01 Jun 2025', onlineAtt: 88, offlineAtt: 85,   board: 'TN Board', parent: 'Mohan D.',         parentPhone: '9876543210', avgScore: 80 },
  { id: 'S12', name: 'Kaviya Raj',       roll: 'CO-012', grade: '12th', batch: 'Online B',  phone: '9876543221', email: 'kaviya@gmail.com',   joinedDate: '15 Jun 2025', onlineAtt: 92, offlineAtt: null, board: 'CBSE',     parent: 'Raj K.',           parentPhone: '9876543211', avgScore: 86 },
  { id: 'S13', name: 'Surya Kumar',      roll: 'CO-013', grade: 'NEET', batch: 'Offline A', phone: '9876543222', email: 'surya@gmail.com',    joinedDate: '01 Jun 2025', onlineAtt: 71, offlineAtt: 69,   board: 'NEET',     parent: 'Kumar S.',         parentPhone: '9876543212', avgScore: 65 },
  { id: 'S14', name: 'Nithya Saravanan',roll: 'CO-014', grade: '11th', batch: 'Online A',  phone: '9876543223', email: 'nithya@gmail.com',   joinedDate: '01 Jun 2025', onlineAtt: 96, offlineAtt: null, board: 'TN Board', parent: 'Saravanan N.',     parentPhone: '9876543213', avgScore: 91 },
  { id: 'S15', name: 'Praveen Raman',    roll: 'CO-015', grade: 'JEE',  batch: 'Offline B', phone: '9876543224', email: 'praveen@gmail.com',  joinedDate: '15 Jun 2025', onlineAtt: 76, offlineAtt: 74,   board: 'JEE',      parent: 'Raman P.',         parentPhone: '9876543214', avgScore: 73 },
  { id: 'S16', name: 'Riya Sharma',      roll: 'CO-016', grade: '12th', batch: 'Online A',  phone: '9876543225', email: 'riya@gmail.com',     joinedDate: '01 Jun 2025', onlineAtt: 89, offlineAtt: null, board: 'CBSE',     parent: 'Sharma R.',        parentPhone: '9876543215', avgScore: 82 },
  { id: 'S17', name: 'Venkat Suresh',    roll: 'CO-017', grade: '11th', batch: 'Offline A', phone: '9876543226', email: 'venkat@gmail.com',   joinedDate: '15 Jun 2025', onlineAtt: 63, offlineAtt: 58,   board: 'TN Board', parent: 'Suresh V.',        parentPhone: '9876543216', avgScore: 48 },
  { id: 'S18', name: 'Pooja Nair',       roll: 'CO-018', grade: 'NEET', batch: 'Online B',  phone: '9876543227', email: 'pooja2@gmail.com',   joinedDate: '01 Jun 2025', onlineAtt: 93, offlineAtt: null, board: 'NEET',     parent: 'Nair P.',          parentPhone: '9876543217', avgScore: 89 },
  { id: 'S19', name: 'Manoj Pillai',     roll: 'CO-019', grade: '12th', batch: 'Offline B', phone: '9876543228', email: 'manoj@gmail.com',    joinedDate: '01 Jun 2025', onlineAtt: 80, offlineAtt: 77,   board: 'CBSE',     parent: 'Pillai M.',        parentPhone: '9876543218', avgScore: 74 },
  { id: 'S20', name: 'Lakshmi Devi',     roll: 'CO-020', grade: '11th', batch: 'Online A',  phone: '9876543229', email: 'lakshmi2@gmail.com', joinedDate: '01 Jun 2025', onlineAtt: 98, offlineAtt: null, board: 'TN Board', parent: 'Devi L.',          parentPhone: '9876543219', avgScore: 95 },
]

const testHistory: Record<string, TestRecord[]> = {
  S01: [
    { id: 'T1', name: 'Unit Test 1 — Atomic Structure',  date: '10 May 2026', maxMarks: 50, marks: 44, type: 'MCQ' },
    { id: 'T2', name: 'Unit Test 2 — Chemical Bonding',  date: '17 May 2026', maxMarks: 50, marks: 42, type: 'MCQ' },
  ],
  S02: [
    { id: 'T1', name: 'Unit Test 1 — Atomic Structure', date: '10 May 2026', maxMarks: 50, marks: 47, type: 'MCQ' },
    { id: 'T2', name: 'Unit Test 2 — Chemical Bonding', date: '17 May 2026', maxMarks: 50, marks: 46, type: 'MCQ' },
  ],
  S04: [
    { id: 'T1', name: 'Unit Test 1 — Atomic Structure', date: '10 May 2026', maxMarks: 50, marks: 43, type: 'MCQ' },
    { id: 'T2', name: 'Unit Test 2 — Chemical Bonding', date: '17 May 2026', maxMarks: 50, marks: 44, type: 'MCQ' },
  ],
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StudentDetailPage() {
  const params = useParams()
  const student = students.find((s) => s.id === params.id) ?? students[0]

  const [blocked, setBlocked]   = useState(student.avgScore < 60)
  const [editing, setEditing]   = useState(false)
  const [saved, setSaved]       = useState(false)
  const [form, setForm]         = useState({
    phone:       student.phone,
    email:       student.email,
    parent:      student.parent,
    parentPhone: student.parentPhone,
  })

  const handleSave = () => {
    setEditing(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  const tests = testHistory[student.id] ?? []

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
              <span className="text-sm border border-gray-200 px-2 py-0.5 text-gray-600">{student.grade}</span>
              <span className={`text-sm border border-gray-200 px-2 py-0.5 ${blocked ? 'text-gray-500 line-through' : 'text-gray-600'}`}>
                {blocked ? 'Blocked' : 'Active'}
              </span>
            </div>
            <p className="text-lg text-gray-600">{student.roll} · {student.batch} · Joined {student.joinedDate}</p>
          </div>

          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => setBlocked(!blocked)}
              className="px-5 py-2.5 text-base border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
            >
              {blocked ? 'Unblock Student' : 'Block Student'}
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
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Personal info — 2 columns, no Batch */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.08 }}
          className="bg-white shadow-sm p-5"
        >
          <h2 className="text-base text-primary mb-4">Personal Information</h2>
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            {/* Left: Phone, Email */}
            <div className="space-y-4">
              {([
                { label: 'Phone', key: 'phone' as const },
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
            {/* Right: Parent's Name, Parent's Phone */}
            <div className="space-y-4">
              {([
                { label: "Parent's Name",  key: 'parent'      as const },
                { label: "Parent's Phone", key: 'parentPhone' as const },
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
              <button onClick={handleSave}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-primary text-white text-base hover:bg-[#3d2652] transition-colors">
                <IconCheck className="w-4 h-4" />
                Save Changes
              </button>
            </div>
          )}
          {saved && (
            <div className="flex items-center gap-2 text-gray-600 text-sm mt-3">
              <IconCheckCircle className="w-4 h-4" />
              Changes saved successfully.
            </div>
          )}
        </motion.div>

        {/* Attendance */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.12 }}
          className="bg-white shadow-sm p-6"
        >
          <h2 className="text-base text-primary mb-5">Attendance</h2>
          <div className="space-y-5">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-base text-gray-600">Online Classes</span>
                <span className="text-base font-inter text-primary">{student.onlineAtt}%</span>
              </div>
              <div className="h-2 bg-gray-100 overflow-hidden">
                <div className="h-full bg-primary transition-all" style={{ width: `${student.onlineAtt}%` }} />
              </div>
            </div>
            {student.offlineAtt !== null ? (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-base text-gray-600">Offline Classes</span>
                  <span className="text-base font-inter text-primary">{student.offlineAtt}%</span>
                </div>
                <div className="h-2 bg-gray-100 overflow-hidden">
                  <div className="h-full bg-primary transition-all" style={{ width: `${student.offlineAtt}%` }} />
                </div>
              </div>
            ) : (
              <p className="text-base text-gray-400 italic">Not enrolled in offline batch.</p>
            )}
          </div>
        </motion.div>
      </div>

      {/* Test history */}
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.16 }}
        className="bg-white shadow-sm overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-gray-200">
          <h2 className="text-base text-primary">Test History</h2>
        </div>
        {tests.length === 0 ? (
          <div className="px-5 py-8 text-base text-gray-400 text-center">No test records available.</div>
        ) : (
          <>
            <div className="grid grid-cols-[1fr_100px_80px_80px_60px] px-5 py-3 text-xs uppercase tracking-widest text-gray-400 bg-gray-50 border-b border-gray-100">
              <span>Test</span>
              <span>Date</span>
              <span className="text-right">Marks</span>
              <span className="text-right">Max</span>
              <span className="text-right">%</span>
            </div>
            <div className="divide-y divide-gray-50">
              {tests.map((t) => (
                <div key={t.id} className="grid grid-cols-[1fr_100px_80px_80px_60px] px-5 py-3 hover:bg-gray-50">
                  <div>
                    <span className="text-base text-gray-800">{t.name}</span>
                    <span className="ml-2 text-xs border border-gray-200 px-1.5 py-0.5 text-gray-500">{t.type}</span>
                  </div>
                  <span className="text-base text-gray-500 self-center">{t.date}</span>
                  <span className="text-base font-inter text-gray-700 text-right self-center">
                    {t.marks !== null ? t.marks : '—'}
                  </span>
                  <span className="text-base font-inter text-gray-500 text-right self-center">{t.maxMarks}</span>
                  <span className="text-base font-inter font-bold text-primary text-right self-center">
                    {t.marks !== null ? `${Math.round((t.marks / t.maxMarks) * 100)}%` : '—'}
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </motion.div>
    </div>
  )
}
