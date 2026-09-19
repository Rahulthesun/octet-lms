'use client'

// Admin > Alumni
//
// Graduated students, moved out of the active student list. Every value on
// this page comes from /api/alumni (the alumni table plus the live
// attendance / test / exam-document history that stays linked to each
// student). Nothing here is static.

import { useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { authedFetch } from '@/lib/apiClient'

interface AlumniRow {
  id: string
  student_id: string
  admission_number: string | null
  name: string
  email: string | null
  mobile_number: string | null
  class_grade: string | null
  preferred_batch: string | null
  learning_mode: string | null
  batch_year: string
  graduation_date: string
  archived_at: string
}

interface AlumniFilters {
  years: string[]
  batches: string[]
  total: number
}

interface AttendanceRecord {
  date: string
  batchName: string | null
  status: 'present' | 'absent'
  attendanceStatus?: string
}

interface AlumniDetail extends AlumniRow {
  profile: Record<string, string | string[] | null>
  attendance: {
    totalSessions: number
    presentCount: number
    absentCount: number
    attendancePct: number | null
    records: AttendanceRecord[]
  } | null
  testResults: {
    id: string
    title: string | null
    type: string | null
    scheduledStart: string | null
    status: string
    marksAwarded: number | null
    maxMarks: number | null
  }[]
  examSubmissions: {
    id: string
    kind: 'HALL_TICKET' | 'MARKSHEET'
    entryMode: 'UPLOAD' | 'MANUAL'
    fileName: string | null
    marksObtained: number | null
    maxMarks: number | null
    grade: string | null
    submittedAt: string
    examName: string | null
    examDate: string | null
  }[]
}

function formatDate(iso: string | null | undefined) {
  if (!iso) return '-'
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-sm text-gray-400 mb-0.5">{label}</p>
      <p className="text-base text-primary break-words">{value || '-'}</p>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <h3 className="text-base text-primary mb-4">{title}</h3>
      {children}
    </div>
  )
}

function DetailPanel({
  id,
  onClose,
  onRestore,
  restoring,
}: {
  id: string
  onClose: () => void
  onRestore: (row: AlumniDetail) => void
  restoring: boolean
}) {
  const [detail, setDetail] = useState<AlumniDetail | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    setDetail(null)
    setError(null)
    authedFetch(`/api/alumni/${id}`)
      .then((json) => active && setDetail(json))
      .catch((e) => active && setError(e instanceof Error ? e.message : 'Failed to load record'))
    return () => {
      active = false
    }
  }, [id])

  const p = detail?.profile ?? {}
  const text = (k: string) => (typeof p[k] === 'string' ? (p[k] as string) : null)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/40 flex justify-end"
      onClick={onClose}
    >
      <motion.div
        initial={{ x: 60, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 60, opacity: 0 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-3xl h-full bg-[#f6f5f8] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
        data-lenis-prevent
      >
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl text-primary">{detail?.name ?? 'Loading...'}</h2>
            {detail && (
              <p className="text-base text-gray-600">
                {detail.admission_number || 'No admission number'} - Batch year {detail.batch_year} - Graduated {formatDate(detail.graduation_date)}
              </p>
            )}
          </div>
          <div className="flex gap-2 shrink-0">
            {detail && (
              <button
                onClick={() => onRestore(detail)}
                disabled={restoring}
                className="px-4 py-2 text-base border border-primary text-primary rounded-lg hover:bg-primary hover:text-white transition-colors disabled:opacity-50"
              >
                {restoring ? 'Restoring...' : 'Restore student'}
              </button>
            )}
            <button onClick={onClose} className="px-4 py-2 text-base border border-gray-300 text-gray-600 rounded-lg hover:bg-white">
              Close
            </button>
          </div>
        </div>

        {error && <div className="px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-base rounded-lg">{error}</div>}
        {!detail && !error && <p className="text-base text-gray-600">Loading record...</p>}

        {detail && (
          <div className="flex flex-col gap-5">
            <Section title="Profile and contact">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                <Field label="Email" value={detail.email} />
                <Field label="Mobile" value={detail.mobile_number} />
                <Field label="WhatsApp" value={text('whatsapp_number')} />
                <Field label="Telegram" value={text('telegram_number')} />
                <Field label="Date of birth" value={text('date_of_birth') ? formatDate(text('date_of_birth')) : null} />
                <Field label="Class / grade" value={detail.class_grade} />
                <Field label="School / college" value={text('school_college')} />
                <Field label="Batch" value={detail.preferred_batch} />
                <Field label="Learning mode" value={detail.learning_mode} />
                <Field label="10th school" value={text('tenth_school')} />
                <Field label="10th score" value={text('tenth_score')} />
                <Field label="Future plan" value={text('future_plan')} />
              </div>
            </Section>

            <Section title="Parent information">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
                <Field label="Father name" value={text('father_name')} />
                <Field label="Father mobile" value={text('father_mobile')} />
                <Field label="Father email" value={text('father_email')} />
                <Field label="Father profession" value={text('father_profession')} />
                <Field label="Mother name" value={text('mother_name')} />
                <Field label="Mother mobile" value={text('mother_mobile')} />
                <Field label="Mother email" value={text('mother_email')} />
                <Field label="Mother profession" value={text('mother_profession')} />
                <Field
                  label="Address"
                  value={[text('address'), text('landmark'), text('city'), text('pincode')].filter(Boolean).join(', ')}
                />
              </div>
            </Section>

            <Section title="Uploaded documents">
              <div className="flex flex-wrap gap-3">
                {[
                  { label: '10th marksheet', url: text('marksheet_10th_url') },
                  { label: 'School ID card', url: text('school_id_card_url') },
                  { label: 'Uniform photo', url: text('uniform_photo_url') },
                ].map((d) =>
                  d.url ? (
                    <a
                      key={d.label}
                      href={d.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 text-base border border-primary text-primary rounded-md hover:bg-primary hover:text-white transition-colors"
                    >
                      {d.label}
                    </a>
                  ) : (
                    <span key={d.label} className="px-3 py-1.5 text-base border border-dashed border-gray-300 text-gray-400 rounded-md">
                      {d.label}: not uploaded
                    </span>
                  )
                )}
              </div>
              <h4 className="text-sm text-gray-400 mt-5 mb-2">Board exam documents</h4>
              {detail.examSubmissions.length === 0 ? (
                <p className="text-base text-gray-500">No hall tickets or marksheets on record.</p>
              ) : (
                <div className="divide-y divide-gray-100 border border-gray-100 rounded-lg">
                  {detail.examSubmissions.map((s) => (
                    <div key={s.id} className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-base">
                      <span className="text-primary">
                        {s.examName} - {s.kind === 'HALL_TICKET' ? 'Hall ticket' : 'Marksheet'}
                      </span>
                      <span className="text-gray-600">
                        {s.entryMode === 'MANUAL'
                          ? `Entered marks: ${s.marksObtained}/${s.maxMarks}${s.grade ? ` (${s.grade})` : ''}`
                          : s.fileName}{' '}
                        - {formatDate(s.submittedAt)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            <Section title="Attendance history">
              {detail.attendance ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
                    <Field label="Sessions" value={String(detail.attendance.totalSessions)} />
                    <Field label="Present" value={String(detail.attendance.presentCount)} />
                    <Field label="Absent" value={String(detail.attendance.absentCount)} />
                    <Field
                      label="Attendance"
                      value={detail.attendance.attendancePct !== null ? `${detail.attendance.attendancePct}%` : null}
                    />
                  </div>
                  <div className="max-h-64 overflow-y-auto border border-gray-100 rounded-lg divide-y divide-gray-100">
                    {detail.attendance.records.length === 0 ? (
                      <p className="px-4 py-3 text-base text-gray-500">No sessions recorded.</p>
                    ) : (
                      detail.attendance.records.map((r, i) => (
                        <div key={`${r.date}-${i}`} className="px-4 py-2 flex justify-between text-base">
                          <span className="text-gray-700">{formatDate(r.date)} - {r.batchName ?? 'Session'}</span>
                          <span className={r.status === 'present' ? 'text-green-700' : 'text-red-600'}>
                            {r.attendanceStatus ?? r.status}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </>
              ) : (
                <p className="text-base text-gray-500">Attendance history could not be loaded.</p>
              )}
            </Section>

            <Section title="Test results">
              {detail.testResults.length === 0 ? (
                <p className="text-base text-gray-500">No test attempts on record.</p>
              ) : (
                <div className="divide-y divide-gray-100 border border-gray-100 rounded-lg">
                  {detail.testResults.map((t) => (
                    <div key={t.id} className="px-4 py-2.5 flex flex-wrap justify-between gap-2 text-base">
                      <span className="text-primary">{t.title ?? 'Test'}</span>
                      <span className="text-gray-600">
                        {t.marksAwarded !== null && t.maxMarks !== null ? `${t.marksAwarded}/${t.maxMarks}` : t.status}
                        {t.scheduledStart ? ` - ${formatDate(t.scheduledStart)}` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}

export default function AlumniPage() {
  const [rows, setRows] = useState<AlumniRow[]>([])
  const [total, setTotal] = useState(0)
  const [filters, setFilters] = useState<AlumniFilters>({ years: [], batches: [], total: 0 })
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [batch, setBatch] = useState('')
  const [year, setYear] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [restoringId, setRestoringId] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  const loadFilters = useCallback(async () => {
    try {
      setFilters(await authedFetch('/api/alumni/filters'))
    } catch {
      // filters are a convenience; the list still works without them
    }
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams()
      if (debouncedSearch) params.set('search', debouncedSearch)
      if (batch) params.set('batch', batch)
      if (year) params.set('year', year)
      params.set('limit', '200')
      const json = await authedFetch(`/api/alumni?${params.toString()}`)
      setRows(json.data ?? [])
      setTotal(json.pagination?.total ?? 0)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load alumni')
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, batch, year])

  useEffect(() => {
    loadFilters()
  }, [loadFilters])

  useEffect(() => {
    load()
  }, [load])

  const restore = async (row: { id: string; name: string }) => {
    const ok = window.confirm(
      `Restore ${row.name}? Their graduation date is cleared, they return to the active student list with their batch, and their access is switched back on.`
    )
    if (!ok) return
    setRestoringId(row.id)
    setNotice(null)
    try {
      await authedFetch(`/api/alumni/${row.id}/restore`, { method: 'POST' })
      setNotice(`${row.name} was restored to the active students list.`)
      setOpenId(null)
      await Promise.all([load(), loadFilters()])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Restore failed')
    } finally {
      setRestoringId(null)
    }
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Alumni</h1>
        <p className="text-base text-gray-600 mt-1">
          Graduated students. Access is revoked on the graduation date; their full record is kept here.
        </p>
      </div>

      {error && <div className="mb-6 px-4 py-3 bg-red-50 border border-red-200 text-red-700 text-base rounded-lg">{error}</div>}
      {notice && <div className="mb-6 px-4 py-3 bg-green-50 border border-green-200 text-green-700 text-base rounded-lg">{notice}</div>}

      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, roll, batch or year"
          className="flex-1 px-4 py-3 border border-gray-200 rounded-full text-base text-gray-800 placeholder-gray-400 outline-none focus:border-gray-400 bg-transparent"
        />
        <select
          value={batch}
          onChange={(e) => setBatch(e.target.value)}
          className="px-4 py-3 border border-gray-200 rounded-full text-base text-gray-700 bg-white outline-none focus:border-primary"
          aria-label="Filter by batch"
        >
          <option value="">All batches</option>
          {filters.batches.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
        <select
          value={year}
          onChange={(e) => setYear(e.target.value)}
          className="px-4 py-3 border border-gray-200 rounded-full text-base text-gray-700 bg-white outline-none focus:border-primary"
          aria-label="Filter by batch year"
        >
          <option value="">All batch years</option>
          {filters.years.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        <div className="hidden lg:grid lg:grid-cols-[1fr_150px_140px_110px_140px_180px] gap-3 px-5 py-3 text-base text-gray-600 border-b border-gray-200 bg-gray-50">
          <span>Student</span>
          <span>Roll</span>
          <span>Batch</span>
          <span>Batch year</span>
          <span>Graduated</span>
          <span className="text-right">Actions</span>
        </div>
        <div className="divide-y divide-gray-100">
          {loading ? (
            <div className="py-12 text-center text-gray-600 text-base">Loading alumni...</div>
          ) : rows.length === 0 ? (
            <div className="py-12 text-center text-gray-600 text-base">
              {filters.total === 0 ? 'No alumni yet. Students appear here once their graduation date arrives.' : 'No alumni match your filters.'}
            </div>
          ) : (
            rows.map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap lg:grid lg:grid-cols-[1fr_150px_140px_110px_140px_180px] gap-3 px-5 py-4 hover:bg-gray-50 transition-colors items-center"
              >
                <div className="min-w-0 flex-1 lg:flex-none">
                  <p className="text-base text-primary truncate">{r.name}</p>
                  <p className="text-base text-gray-600 truncate">{r.email || '-'}</p>
                  <p className="text-sm text-gray-500 font-inter">{r.mobile_number || '-'}</p>
                </div>
                <span className="text-base font-inter text-gray-600">{r.admission_number || '-'}</span>
                <span className="text-base text-gray-600">{r.preferred_batch || '-'}</span>
                <span className="text-base font-inter text-gray-700">{r.batch_year}</span>
                <span className="text-base text-gray-600">{formatDate(r.graduation_date)}</span>
                <div className="flex gap-2 justify-end ml-auto lg:ml-0">
                  <button
                    onClick={() => setOpenId(r.id)}
                    className="px-3 py-1.5 text-base border border-gray-200 text-primary rounded-md hover:border-primary transition-colors"
                  >
                    View record
                  </button>
                  <button
                    onClick={() => restore(r)}
                    disabled={restoringId === r.id}
                    className="px-3 py-1.5 text-base border border-gray-200 text-gray-600 rounded-md hover:border-gray-400 transition-colors disabled:opacity-50"
                  >
                    {restoringId === r.id ? 'Restoring...' : 'Restore'}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <p className="text-sm text-gray-400 mt-4 text-center">
        Showing {rows.length} of {total} alumni
      </p>

      <AnimatePresence>
        {openId && (
          <DetailPanel
            key={openId}
            id={openId}
            onClose={() => setOpenId(null)}
            onRestore={(d) => restore(d)}
            restoring={restoringId === openId}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
