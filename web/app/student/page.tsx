'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { authedFetch } from '@/lib/apiClient'
import { formatTimeInZone } from '@/lib/helpers'
import { useStudentName } from '@/hooks/useStudentName'
import PersonalTasksWidget from '@/components/shared/PersonalTasksWidget'

// ─── Backend shape (api/services/dashboard.service.js → getStudentOverview) ──

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

interface TodayClass {
  batchId: string
  batchName: string
  startTime: string | null
  endTime: string | null
  deliveryType: 'online' | 'offline' | 'hybrid'
  meetLink: string | null
  location: string | null
  sessionLive: boolean
}

interface StudentOverview {
  attendance: {
    totalSessions: number
    presentCount: number
    absentCount: number
    attendancePct: number | null
  }
  todayClasses: TodayClass[]
  upcomingClasses: OnlineClassLite[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function attendanceColor(pct: number | null) {
  if (pct === null) return 'text-muted'
  if (pct < 75) return 'text-rose-600'
  if (pct < 90) return 'text-amber-600'
  return 'text-emerald-600'
}

// ─── Icons — thin line style, no fills, no emoji ───────────────────────────────

function IconChevron({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none">
      <path d="M 6,3.5 L 10.5,8 L 6,12.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconPlay({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <rect x="2" y="5" width="11" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M 13,9 L 18,6 L 18,14 L 13,11 Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

function IconNotes({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <path d="M 6,2.5 L 15,2.5 L 19,6.5 L 19,21.5 Q 19,21.5 18,21.5 L 6,21.5 Q 5,21.5 5,20.5 L 5,3.5 Q 5,2.5 6,2.5 Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M 15,2.5 L 15,6.5 L 19,6.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M 8.5,13 L 15.5,13 M 8.5,16.5 L 13,16.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

function IconAttendance({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
      <path d="M 12,6.5 L 12,12 L 16,14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
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

function IconFeedback({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none">
      <path d="M3 5.5C3 4.119 4.119 3 5.5 3h9C15.881 3 17 4.119 17 5.5v7c0 1.381-1.119 2.5-2.5 2.5H11l-4 3v-3H5.5C4.119 15 3 13.881 3 12.5v-7z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M7 8h6M7 11h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function IconProfile({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" />
      <path d="M 4,21 Q 4,15 12,15 Q 20,15 20,21" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

const QUICK_LINKS = [
  { href: '/student/courses', label: 'Video Lessons', icon: IconPlay, tint: '#F1EEF5', color: '#7A6B96' },
  { href: '/student/notes', label: 'PDF Notes', icon: IconNotes, tint: '#eef2f6', color: '#475569' },
  { href: '/student/attendance', label: 'Attendance', icon: IconAttendance, tint: '#eafaf1', color: '#3e7450' },
  { href: '/student/classes', label: 'Online Classes', icon: IconOnlineClass, tint: '#eef3fb', color: '#3e5e8a' },
  { href: '/student/feedback', label: 'Feedback', icon: IconFeedback, tint: '#fdf3e9', color: '#9e7438' },
  { href: '/student/profile', label: 'Profile', icon: IconProfile, tint: '#F1EEF5', color: '#635580' },
]

// ─── Page ───────────────────────────────────────────────────────────────────

export default function StudentDashboard() {
  const studentName = useStudentName()
  const [data, setData] = useState<StudentOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
  })

  useEffect(() => {
    let cancelled = false
    authedFetch('/api/dashboard/me')
      .then((res: StudentOverview) => {
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

  const joinableToday = (data?.todayClasses ?? []).filter((c) => c.deliveryType !== 'offline' && c.meetLink)

  const stats = data
    ? [
        {
          value: data.attendance.attendancePct !== null ? `${data.attendance.attendancePct}%` : '—',
          label: 'Attendance',
          color: attendanceColor(data.attendance.attendancePct),
        },
        { value: data.attendance.presentCount, label: 'Sessions present' },
        { value: data.attendance.absentCount, label: 'Sessions absent' },
        { value: data.attendance.totalSessions, label: 'Total sessions' },
      ]
    : []

  return (
    <div className="p-6 lg:p-10 max-w-[1200px] mx-auto space-y-10">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 pb-6 border-b border-[#e2e5ec]"
      >
        <div>
          <p className="text-xs font-medium tracking-[0.2em] uppercase text-muted mb-2">{greeting()}</p>
          <h1 className="text-4xl font-bold text-primary tracking-tight">
            {studentName ?? 'Welcome back'}
          </h1>
        </div>
        <p className="text-base text-muted shrink-0">{today}</p>
      </motion.div>

      {loading ? (
        <div className="py-24 text-center text-muted text-base">Loading dashboard…</div>
      ) : error ? (
        <div className="py-24 text-center text-base text-rose-600">{error}</div>
      ) : data ? (
        <>
          {/* Hero stat strip — no boxes, hairline dividers only */}
          <motion.div
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05 }}
            className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-[#e2e5ec] border-y border-[#e2e5ec]"
          >
            {stats.map((s) => (
              <div key={s.label} className="px-5 py-6 first:pl-0">
                <p className={`text-3xl lg:text-4xl font-bold font-data ${s.color ?? 'text-primary'}`}>
                  {s.value}
                </p>
                <p className="text-sm text-muted mt-1.5 leading-snug">{s.label}</p>
              </div>
            ))}
          </motion.div>

          {/* Personal Tasks — the interactive centrepiece, not a stat */}
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.08 }}>
            <PersonalTasksWidget
              accentColor="#7A6B96"
              borderColor="#e2e5ec"
              headingClassName="text-primary"
              mutedClassName="text-muted"
            />
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-x-14 gap-y-10">
            {/* ── Left: classes ── */}
            <div className="space-y-10">
              <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
                <div className="flex items-baseline justify-between mb-3">
                  <h2 className="text-lg font-semibold text-primary">Today&apos;s classes</h2>
                  <Link href="/student/classes" className="text-sm text-brand hover:underline">
                    View all
                  </Link>
                </div>
                {data.todayClasses.length === 0 ? (
                  <p className="text-base text-muted py-4">No classes scheduled for you today.</p>
                ) : (
                  <div className="divide-y divide-[#e2e5ec] border-t border-[#e2e5ec]">
                    {data.todayClasses.map((c) => (
                      <div key={c.batchId} className="flex items-center gap-4 py-3.5">
                        <span className="w-24 shrink-0 text-sm font-data text-muted">
                          {c.startTime ? c.startTime.slice(0, 5) : '—'}
                          {c.endTime ? `–${c.endTime.slice(0, 5)}` : ''}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[15px] text-primary truncate">{c.batchName}</p>
                          <p className="text-sm text-muted truncate">
                            {c.deliveryType === 'offline' ? (c.location || 'On campus') : (c.sessionLive ? 'Live now' : 'Online')}
                          </p>
                        </div>
                        {c.deliveryType !== 'offline' && c.meetLink && (
                          <a
                            href={c.meetLink} target="_blank" rel="noopener noreferrer"
                            className="shrink-0 px-4 py-1.5 rounded-full bg-brand text-white text-sm font-medium hover:bg-brand-dark transition-colors"
                          >
                            Join
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </motion.section>

              {data.upcomingClasses.length > 0 && (
                <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }}>
                  <div className="flex items-baseline justify-between mb-3">
                    <h2 className="text-lg font-semibold text-primary">Upcoming classes</h2>
                  </div>
                  <div className="divide-y divide-[#e2e5ec] border-t border-[#e2e5ec]">
                    {data.upcomingClasses.map((c) => (
                      <div key={c.id} className="flex items-center gap-4 py-3.5">
                        <span className="w-28 shrink-0 text-sm text-muted">
                          {new Date(c.scheduledStart).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                          {' · '}
                          <span className="font-data">{formatTimeInZone(c.scheduledStart, c.timezone)}</span>
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[15px] text-primary truncate">{c.title}</p>
                          <p className="text-sm text-muted truncate">
                            {c.batchName}{c.subjectName ? ` · ${c.subjectName}` : ''}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.section>
              )}

              {joinableToday.length === 0 && data.upcomingClasses.length === 0 && (
                <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.15 }}>
                  <p className="text-base text-muted">
                    Nothing else scheduled right now — catch up with your{' '}
                    <Link href="/student/notes" className="text-brand hover:underline">notes</Link> or{' '}
                    <Link href="/student/courses" className="text-brand hover:underline">video lessons</Link>.
                  </p>
                </motion.section>
              )}
            </div>

            {/* ── Right: quick links ── */}
            <div>
              <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
                <h2 className="text-xs font-medium tracking-[0.2em] uppercase text-muted mb-3">Quick links</h2>
                <nav className="divide-y divide-[#e2e5ec] border-t border-b border-[#e2e5ec]">
                  {QUICK_LINKS.map(({ href, label, icon: Icon, tint, color }) => (
                    <Link key={href} href={href} className="flex items-center gap-3 py-3.5 group">
                      <span
                        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                        style={{ backgroundColor: tint, color }}
                      >
                        <Icon className="w-4 h-4" />
                      </span>
                      <span className="flex-1 min-w-0 text-[15px] text-primary">
                        {label}
                      </span>
                      <IconChevron className="w-3.5 h-3.5 text-gray-300 group-hover:text-muted group-hover:translate-x-0.5 transition-all shrink-0" />
                    </Link>
                  ))}
                </nav>
              </motion.section>
            </div>
          </div>
        </>
      ) : null}
    </div>
  )
}
