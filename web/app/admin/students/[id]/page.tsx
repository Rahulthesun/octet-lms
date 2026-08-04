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

function IconEye({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none">
      <path d="M 1,8 C 2.5,4.5 5,3 8,3 C 11,3 13.5,4.5 15,8 C 13.5,11.5 11,13 8,13 C 5,13 2.5,11.5 1,8 Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  )
}

function IconDownload({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none">
      <path d="M 8,2 L 8,10 M 4.5,7 L 8,10.5 L 11.5,7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M 2.5,12.5 L 2.5,13.5 C 2.5,14 3,14.5 3.5,14.5 L 12.5,14.5 C 13,14.5 13.5,14 13.5,13.5 L 13.5,12.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

// Turns "11" into "11th Std", leaves already-formatted strings alone
function formatGrade(grade: string | null | undefined) {
  if (!grade) return null
  if (/^\d+$/.test(grade.trim())) {
    const n = grade.trim()
    const suffix = n === '1' ? 'st' : n === '2' ? 'nd' : n === '3' ? 'rd' : 'th'
    return `${n}${suffix} Std`
  }
  return grade
}

function formatSubjects(subjects: unknown) {
  if (Array.isArray(subjects)) return subjects.join(', ')
  if (typeof subjects === 'string') return subjects
  return null
}

// ─── Small reusable pieces ─────────────────────────────────────────────────────

function ReadField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <label className="text-sm text-gray-400 block mb-1">{label}</label>
      <p className="text-base text-primary">{value || '—'}</p>
    </div>
  )
}

function EditField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <label className="text-sm text-gray-400 block mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-gray-200 px-3 py-2 text-base text-primary outline-none focus:border-gray-400"
      />
    </div>
  )
}

function SectionCard({
  icon,
  title,
  children,
  delay = 0,
}: {
  icon: string
  title: string
  children: React.ReactNode
  delay?: number
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="bg-white shadow-sm p-5"
    >
      <h2 className="text-base text-primary mb-4 flex items-center gap-2">
        <span>{icon}</span>
        {title}
      </h2>
      {children}
    </motion.div>
  )
}

function DocumentRow({ label, url }: { label: string; url: string | null | undefined }) {
  return (
    <div className="px-5 py-4 flex items-center justify-between">
      <p className="text-base text-primary">{label}</p>
      <div className="flex items-center gap-2">
        {url ? (
          <>
            <a
    href={url}
    target="_blank"
    rel="noopener noreferrer"
    className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
>
    <IconEye className="w-4 h-4" />
    View
</a>
            <a
    href={url}
    download
    className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
>
    <IconDownload className="w-4 h-4" />
    Download
</a>
          </>
        ) : (
          <span className="text-sm text-gray-400 italic">Not uploaded</span>
        )}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function StudentDetailPage() {
  const params = useParams()
  const id = typeof params.id === 'string' ? params.id : undefined
  const { student, loading, error, saving, updateStudent } = useStudentDetail(id)

  const [editing, setEditing] = useState(false)
  const [saved, setSaved] = useState(false)
  const [blockActionError, setBlockActionError] = useState<string | null>(null)

  // Only contact/address fields are editable — everything else comes from the admission form
  const [form, setForm] = useState({
    mobile_number: '',
    whatsapp_number: '',
    telegram_number: '',
    email: '',
    address: '',
    landmark: '',
    city: '',
    pincode: '',
  })

  // Sync form when the real record arrives (or changes underneath us)
  useEffect(() => {
    if (student) {
      setForm({
        mobile_number: student.mobile_number ?? '',
        whatsapp_number: student.whatsapp_number ?? '',
        telegram_number: student.telegram_number ?? '',
        email: student.email ?? '',
        address: student.address ?? '',
        landmark: student.landmark ?? '',
        city: student.city ?? '',
        pincode: student.pincode ?? '',
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
                <span className="text-sm border border-gray-200 px-2 py-0.5 text-gray-600">{formatGrade(student.class_grade)}</span>
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
              Edit Contact Details
            </button>
          </div>
        </div>
        {blockActionError && (
          <p className="text-sm text-red-600 mt-3">{blockActionError}</p>
        )}
      </motion.div>

      {/* Full-width stacked layout */}
      <div className="flex flex-col gap-6">

        {/* Personal Information */}
        <SectionCard icon="👤" title="Personal Information" delay={0.06}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
            <ReadField label="Full Name" value={student.name} />
            {editing ? (
              <EditField label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
            ) : (
              <ReadField label="Email" value={student.email} />
            )}
            <ReadField label="Date of Birth" value={formatDate(student.date_of_birth)} />
            {editing ? (
              <EditField label="Mobile Number" value={form.mobile_number} onChange={(v) => setForm({ ...form, mobile_number: v })} />
            ) : (
              <ReadField label="Mobile Number" value={student.mobile_number} />
            )}
            {editing ? (
              <EditField label="WhatsApp Number" value={form.whatsapp_number} onChange={(v) => setForm({ ...form, whatsapp_number: v })} />
            ) : (
              <ReadField label="WhatsApp Number" value={student.whatsapp_number} />
            )}
            {editing ? (
              <EditField label="Telegram Number" value={form.telegram_number} onChange={(v) => setForm({ ...form, telegram_number: v })} />
            ) : (
              <ReadField label="Telegram Number" value={student.telegram_number} />
            )}
          </div>
        </SectionCard>

        {/* Academic Information */}
        <SectionCard icon="🎓" title="Academic Information" delay={0.1}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
            <ReadField label="10th School" value={student.tenth_school} />
            <ReadField label="10th Score" value={student.tenth_score} />
            <ReadField label="Current Grade" value={formatGrade(student.class_grade)} />
            <ReadField label="Current School" value={student.school_college} />
            <ReadField label="Subjects" value={formatSubjects(student.subjects)} />
            <ReadField label="Math Tuition" value={student.maths_tuition} />
            <ReadField label="Physics Tuition" value={student.physics_tuition} />
            <ReadField label="Other Tuition" value={student.other_tuition} />
            <ReadField label="NEET/JEE Details" value={student.neet_jee_details} />
            <ReadField label="Future Plan" value={student.future_plan} />
            <ReadField label="Preferred Batch" value={student.preferred_batch} />
            <ReadField label="Learning Mode" value={student.learning_mode} />
          </div>
        </SectionCard>

        {/* Father Details */}
        <SectionCard icon="👨" title="Father Details" delay={0.14}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
            <ReadField label="Father Name" value={student.father_name} />
            <ReadField label="Mobile" value={student.father_mobile} />
            <ReadField label="WhatsApp" value={student.father_whatsapp} />
            <ReadField label="Telegram" value={student.father_telegram} />
            <ReadField label="Email" value={student.father_email} />
            <ReadField label="Profession" value={student.father_profession} />
          </div>
        </SectionCard>

        {/* Mother Details */}
        <SectionCard icon="👩" title="Mother Details" delay={0.18}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
            <ReadField label="Mother Name" value={student.mother_name} />
            <ReadField label="Mobile" value={student.mother_mobile} />
            <ReadField label="WhatsApp" value={student.mother_whatsapp} />
            <ReadField label="Telegram" value={student.mother_telegram} />
            <ReadField label="Email" value={student.mother_email} />
            <ReadField label="Profession" value={student.mother_profession} />
          </div>
        </SectionCard>

        {/* Address */}
        <SectionCard icon="🏠" title="Address" delay={0.22}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
            {editing ? (
              <>
                <div className="sm:col-span-2">
                  <EditField label="Address" value={form.address} onChange={(v) => setForm({ ...form, address: v })} />
                </div>
                <EditField label="Landmark" value={form.landmark} onChange={(v) => setForm({ ...form, landmark: v })} />
                <EditField label="City" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
                <EditField label="Pincode" value={form.pincode} onChange={(v) => setForm({ ...form, pincode: v })} />
              </>
            ) : (
              <>
                <div className="sm:col-span-2">
                  <ReadField label="Address" value={student.address} />
                </div>
                <ReadField label="Landmark" value={student.landmark} />
                <ReadField label="City" value={student.city} />
                <ReadField label="Pincode" value={student.pincode} />
              </>
            )}
          </div>
        </SectionCard>

        {/* Save/Cancel — applies to Personal Info + Address editable fields above */}
        {editing && (
          <div className="bg-white shadow-sm p-5 flex gap-3">
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
          <div className="flex items-center gap-2 text-gray-600 text-sm -mt-3">
            <IconCheckCircle className="w-4 h-4" />
            Changes saved successfully.
          </div>
        )}
        {error && (
          <p className="text-sm text-red-600 -mt-3">{error}</p>
        )}

        {/* Documents */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.26 }}
          className="bg-white shadow-sm overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-gray-200">
            <h2 className="text-base text-primary flex items-center gap-2">
              <span>📄</span>
              Documents
            </h2>
          </div>

          <div className="divide-y divide-gray-100">
            <DocumentRow label="10th ID Card" url={student.school_id_card_url} />
            <DocumentRow label="10th Marksheet" url={student.marksheet_10th_url} />
          </div>
        </motion.div>

        {/* Application Information */}
        <SectionCard icon="📋" title="Application Information" delay={0.3}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
            <ReadField label="Application ID" value={student.admission_number || student.id} />
            <ReadField label="Admission Number" value={student.admission_number} />
            <ReadField label="Status" value={student.status} />
            <ReadField label="Submitted On" value={formatDate(student.created_at)} />
          </div>
        </SectionCard>

      </div>
    </div>
  )
}