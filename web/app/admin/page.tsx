'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { authedFetch } from '@/lib/apiClient'
import { formatTimeInZone, toTitleCase } from '@/lib/helpers'
import { getSession } from '@/lib/auth'
import PersonalTasksWidget from '@/components/shared/PersonalTasksWidget'

const ACCENT = '#5e4075'
const GOOD = '#3e7450'
const WARN = '#9e7438'
const BAD = '#9e4a4a'

// ─── Backend shape (api/services/dashboard.service.js → getAdminOverview) ────

interface OnlineClassLite {
  id: string
  title: string
  batchName: string | null
  subjectName: string | null
  scheduledStart: string
  scheduledEnd: string
  timezone: string
  meetUrl: string | null
  status: string
}

interface RecentApplication {
  id: string
  name: string
  email: string
  created_at: string
  preferred_batch: string | null
  class_grade: string | null
}

interface AdminOverview {
  students: {
    total: number
    pending: number
    approved: number
    rejected: number
    by_batch: Record<string, number>
    by_mode: Record<string, number>
  }
  attendance: {
    avgAttendancePct: number | null
    liveSessionsToday: number
    presentTodayCount: number
    presentThreshold: number
    belowThresholdCount: number
  }
  onlineClasses: {
    today: OnlineClassLite[]
    upcoming: OnlineClassLite[]
  }
  storage: {
    totalBytes: number
    totalPdfs: number
    totalVideos: number
  }
  recentApplications: RecentApplication[]
  pendingApplicationsCount: number
  subjectsCount: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function formatGB(bytes: number) {
  return (bytes / 1024 / 1024 / 1024).toFixed(1)
}

function attendanceColor(pct: number | null) {
  if (pct === null) return '#9CA3AF'
  if (pct < 75) return BAD
  if (pct < 90) return WARN
  return GOOD
}

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()
}

// ─── Icons — thin line style, no fills, no emoji ───────────────────────────────

function IconChevron({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none">
      <path d="M 6,3.5 L 10.5,8 L 6,12.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconAttendance({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="5" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M 3,10 H 21 M 8,3 V 7 M 16,3 V 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M 7.5,15.5 L 10.5,18 L 17,12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconStudents({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <circle cx="9" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" />
      <path d="M 1,21 Q 1,16 9,16 Q 17,16 17,21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="19.5" cy="9" r="3" stroke="currentColor" strokeWidth="1.3" />
      <path d="M 18,16 Q 23,16 23,21" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

function IconContent({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M 2,9 Q 2,8 3,8 L 10,8 L 12,6 L 21,6 Q 22,6 22,7 L 22,18 Q 22,19 21,19 L 3,19 Q 2,19 2,18 Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M 12,11 L 12,15.5 M 9.5,13 L 12,11 L 14.5,13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconOnlineClass({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <rect x="2.5" y="5.5" width="14" height="13" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M 16.5,10.5 L 21.5,7.5 L 21.5,16.5 L 16.5,13.5 Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  )
}

function IconTests({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M 7,3 H 5 Q 4,3 4,4 V 20 Q 4,21 5,21 H 19 Q 20,21 20,20 V 4 Q 20,3 19,3 H 17 M 7,3 Q 7,2 12,2 Q 17,2 17,3 M 7,3 Q 7,4 12,4 Q 17,4 17,3" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M 8,17.5 L 10,15.5 L 12.5,18 L 16,14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

const QUICK_LINKS = [
  { href: '/admin/students', label: 'Students', icon: IconStudents, tint: '#f7f0ff', color: ACCENT },
  { href: '/admin/attendance', label: 'Attendance', icon: IconAttendance, tint: '#f0faf4', color: GOOD },
  { href: '/admin/online-classes', label: 'Online Classes', icon: IconOnlineClass, tint: '#f0f4fa', color: '#3e5e8a' },
  { href: '/admin/content', label: 'Content', icon: IconContent, tint: '#faf5eb', color: WARN },
  { href: '/admin/tests', label: 'Test Results', icon: IconTests, tint: '#faf0f0', color: BAD },
]

// ─── Page ───────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [data, setData] = useState<AdminOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  })

  useEffect(() => {
    let cancelled = false

    getSession().then((session) => {
      if (!cancelled) setEmail(session?.user?.email ?? null)
    }).catch(() => {})

    authedFetch('/api/dashboard/admin')
      .then((res: AdminOverview) => {
        if (!cancelled) setData(res)
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load dashboard')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [])

  const stats = data
    ? [
        { value: data.students.total, label: 'Total students' },
        {
          value: data.students.pending,
          label: 'Pending applications',
          color: data.students.pending > 0 ? WARN : undefined,
        },
        {
          value: data.attendance.avgAttendancePct !== null ? `${data.attendance.avgAttendancePct}%` : '—',
          label: 'Average attendance',
          color: attendanceColor(data.attendance.avgAttendancePct),
        },
        {
          value: data.attendance.belowThresholdCount,
          label: `Below ${data.attendance.presentThreshold}% attendance`,
          color: data.attendance.belowThresholdCount > 0 ? BAD : undefined,
        },
        { value: data.onlineClasses.today.length, label: "Classes today" },
        { value: `${formatGB(data.storage.totalBytes)} GB`, label: 'Storage used' },
      ]
    : []

  return (
    <div className="p-8 lg:p-10 max-w-[1400px] mx-auto space-y-10">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 pb-6 border-b border-gray-200"
      >
        <div>
          <p className="text-xs font-medium tracking-[0.2em] uppercase text-gray-400 mb-2">{greeting()}</p>
          <h1 className="text-4xl font-bold text-gray-900 tracking-tight">Dashboard</h1>
          {email && <p className="text-base text-gray-500 mt-1.5">{email}</p>}
        </div>
        <p className="text-base text-gray-500 shrink-0">{today}</p>
      </motion.div>

      {loading ? (
        <div className="py-24 text-center text-gray-400 text-base">Loading dashboard…</div>
      ) : error ? (
        <div className="py-24 text-center text-base" style={{ color: BAD }}>{error}</div>
      ) : data ? (
        <>
          {/* Hero stat strip — no boxes, hairline dividers only */}
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05 }}
            className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-x divide-gray-200 border-y border-gray-200"
          >
            {stats.map((s) => (
              <div key={s.label} className="px-5 py-6 first:pl-0">
                <p
                  className="text-3xl lg:text-4xl font-bold tabular-nums font-inter"
                  style={{ color: s.color ?? '#111827' }}
                >
                  {s.value}
                </p>
                <p className="text-sm text-gray-500 mt-1.5 leading-snug">{s.label}</p>
              </div>
            ))}
          </motion.div>

          {/* Personal Tasks — the interactive centrepiece, not a stat */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.08 }}>
            <PersonalTasksWidget
              accentColor={ACCENT}
              borderColor="#e5e7eb"
              headingClassName="text-gray-900"
              mutedClassName="text-gray-500"
            />
          </motion.div>

          {/* Two-column editorial layout */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-x-14 gap-y-10">
            {/* ── Left: Today + Applications ── */}
            <div className="space-y-10">
              <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
                <div className="flex items-baseline justify-between mb-3">
                  <h2 className="text-lg font-semibold text-gray-900">Today&apos;s online classes</h2>
                  <Link href="/admin/online-classes" className="text-sm hover:underline" style={{ color: ACCENT }}>
                    View all
                  </Link>
                </div>
                {data.onlineClasses.today.length === 0 ? (
                  <p className="text-base text-gray-400 py-4">No online classes scheduled for today.</p>
                ) : (
                  <div className="divide-y divide-gray-100 border-t border-gray-100">
                    {data.onlineClasses.today.map((c) => (
                      <div key={c.id} className="flex items-center gap-4 py-3.5">
                        <span className="w-16 shrink-0 text-sm font-inter text-gray-500 tabular-nums">
                          {formatTimeInZone(c.scheduledStart, c.timezone)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[15px] text-gray-800 truncate">{c.title}</p>
                          <p className="text-sm text-gray-400 truncate">
                            {c.batchName}{c.subjectName ? ` · ${c.subjectName}` : ''}
                          </p>
                        </div>
                        {c.meetUrl && (
                          <a
                            href={c.meetUrl} target="_blank" rel="noopener noreferrer"
                            className="text-sm shrink-0 hover:underline" style={{ color: ACCENT }}
                          >
                            Join
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </motion.section>

              {data.onlineClasses.upcoming.length > 0 && (
                <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }}>
                  <div className="flex items-baseline justify-between mb-3">
                    <h2 className="text-lg font-semibold text-gray-900">Upcoming classes</h2>
                  </div>
                  <div className="divide-y divide-gray-100 border-t border-gray-100">
                    {data.onlineClasses.upcoming.map((c) => (
                      <div key={c.id} className="flex items-center gap-4 py-3.5">
                        <span className="w-28 shrink-0 text-sm text-gray-500">
                          {new Date(c.scheduledStart).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                          {' · '}
                          <span className="font-inter tabular-nums">{formatTimeInZone(c.scheduledStart, c.timezone)}</span>
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[15px] text-gray-800 truncate">{c.title}</p>
                          <p className="text-sm text-gray-400 truncate">
                            {c.batchName}{c.subjectName ? ` · ${c.subjectName}` : ''}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.section>
              )}

              <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}>
                <div className="flex items-baseline justify-between mb-3">
                  <h2 className="text-lg font-semibold text-gray-900">Recent applications</h2>
                  <Link href="/admin/students" className="text-sm hover:underline" style={{ color: ACCENT }}>
                    Review all
                  </Link>
                </div>
                {data.recentApplications.length === 0 ? (
                  <p className="text-base text-gray-400 py-4">No pending applications right now.</p>
                ) : (
                  <div className="divide-y divide-gray-100 border-t border-gray-100">
                    {data.recentApplications.map((app) => (
                      <div key={app.id} className="flex items-center gap-4 py-3.5">
                        <span className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-sm text-gray-600 shrink-0">
                          {initials(app.name)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[15px] text-gray-800 truncate">{app.name}</p>
                          <p className="text-sm text-gray-400 truncate">{app.email}</p>
                        </div>
                        <span className="text-sm text-gray-400 shrink-0 hidden sm:block">
                          {new Date(app.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                        </span>
                        <Link href={`/admin/students/${app.id}`} className="text-sm shrink-0 hover:underline" style={{ color: ACCENT }}>
                          View
                        </Link>
                      </div>
                    ))}
                  </div>
                )}
              </motion.section>
            </div>

            {/* ── Right: Quick links + breakdowns ── */}
            <div className="space-y-10">
              <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
                <h2 className="text-xs font-medium tracking-[0.2em] uppercase text-gray-400 mb-3">Quick links</h2>
                <nav className="divide-y divide-gray-100 border-t border-b border-gray-100">
                  {QUICK_LINKS.map(({ href, label, icon: Icon, tint, color }) => (
                    <Link key={href} href={href} className="flex items-center gap-3 py-3.5 group">
                      <span
                        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                        style={{ backgroundColor: tint, color }}
                      >
                        <Icon className="w-4 h-4" />
                      </span>
                      <span className="flex-1 min-w-0 text-[15px] text-gray-800 group-hover:text-gray-950 transition-colors">
                        {label}
                      </span>
                      <IconChevron className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                    </Link>
                  ))}
                </nav>
              </motion.section>

              <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }}>
                <h2 className="text-xs font-medium tracking-[0.2em] uppercase text-gray-400 mb-3">Students by batch</h2>
                <div className="space-y-2.5">
                  {Object.entries(data.students.by_batch).map(([batch, count]) => (
                    <div key={batch} className="flex items-center justify-between text-[15px]">
                      <span className="text-gray-600">{toTitleCase(batch)}</span>
                      <span className="font-inter font-semibold text-gray-900 tabular-nums">{count}</span>
                    </div>
                  ))}
                </div>
              </motion.section>

              <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}>
                <h2 className="text-xs font-medium tracking-[0.2em] uppercase text-gray-400 mb-3">Learning mode</h2>
                <div className="space-y-2.5">
                  {Object.entries(data.students.by_mode).map(([mode, count]) => (
                    <div key={mode} className="flex items-center justify-between text-[15px]">
                      <span className="text-gray-600">{toTitleCase(mode)}</span>
                      <span className="font-inter font-semibold text-gray-900 tabular-nums">{count}</span>
                    </div>
                  ))}
                </div>
              </motion.section>

              <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.25 }}>
                <h2 className="text-xs font-medium tracking-[0.2em] uppercase text-gray-400 mb-3">Content library</h2>
                <div className="space-y-2.5 text-[15px]">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Subjects</span>
                    <span className="font-inter font-semibold text-gray-900 tabular-nums">{data.subjectsCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">PDF notes</span>
                    <span className="font-inter font-semibold text-gray-900 tabular-nums">{data.storage.totalPdfs}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Videos</span>
                    <span className="font-inter font-semibold text-gray-900 tabular-nums">{data.storage.totalVideos}</span>
                  </div>
                </div>
              </motion.section>
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
