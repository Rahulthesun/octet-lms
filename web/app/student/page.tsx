'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { student, lastWatched, tests, performanceHistory, courses, attendance } from '@/lib/mockData'
import { AreaChart, Area, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { IconCalendar, IconDocument, IconBarChart, IconPlay } from '@/components/ui/SvgIcons'

const card = 'bg-white rounded-md border border-[#e2e5ec] shadow-[0_2px_12px_rgba(15,23,42,0.06)]'

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: { value: number }[]
  label?: string
}) {
  if (!active || !payload || !payload.length) return null
  return (
    <div className="rounded-lg bg-[#2c2540] px-4 py-3 shadow-[0_10px_30px_rgba(15,23,42,0.3)]">
      <p className="text-white/55 text-xs mb-1.5">{label}</p>
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: '#9b8bc0' }} />
        <span className="text-white/75 text-sm">Score:</span>
        <span className="text-white text-sm font-data font-semibold">{payload[0].value}%</span>
      </div>
    </div>
  )
}

const upcomingTests = tests.filter((t) => t.status === 'upcoming').length
const lastTest = tests.filter((t) => t.status === 'completed').pop()

// Cross-section dashboard stats (no overlap with the Tests page)
const gradeTopics = courses
  .filter((c) => c.grade === student.grade)
  .flatMap((c) => c.chapters.flatMap((ch) => ch.subtopics))
const watchedLessons = gradeTopics.filter((t) => t.watched).length
const totalLessons = gradeTopics.length

const completedTests = tests.filter((t) => t.status === 'completed')
const avgScore = Math.round(
  completedTests.reduce((sum, t) => sum + (t.percentage ?? 0), 0) / completedTests.length,
)
const bestRank = Math.min(...completedTests.map((t) => t.rank ?? Infinity))

const overallAttendance = Math.round(
  ((attendance.online.attended + attendance.offline.attended) /
    (attendance.online.total + attendance.offline.total)) *
    100,
)

export default function Dashboard() {
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="p-6 lg:p-6 max-w-7xl mx-auto">
      {/* Header + compact stats, side by side */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mb-7">
        {/* Greeting */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <p className="text-primary/70 text-lg md:text-xl mb-1">{greeting},</p>
          <h1 className="text-3xl md:text-4xl text-primary leading-tight">{student.name}</h1>
          <p className="text-muted font-extralight text-md mt-1"> Grade <span className="font-data font-semibold">{student.grade}</span> ▪ Roll No <span className="font-data font-semibold">{student.rollNumber}</span></p>
        </motion.div>

        {/* Stats — compact, color-stroked, parallel to the greeting */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.06 }}
          className="grid grid-cols-2 lg:grid-cols-4 gap-2 w-full lg:flex-1 lg:max-w-4xl"
        >
          {[
            { label: 'Lessons Watched', value: `${watchedLessons} / ${totalLessons}`, stroke: '#7A6B96' },
            { label: 'Avg Score (%)', value: `${avgScore}%`, stroke: '#5B9A8B' },
            { label: 'Best Rank', value: `${bestRank}`, stroke: '#C99A4B' },
            { label: 'Attendance (%)', value: `${overallAttendance}%`, stroke: '#6E7BB0' },
          ].map(({ label, value, stroke }) => (
            <div
              key={label}
              className={`${card} border-l-3 pl-5 pr-4 py-3 hover:shadow-[0_4px_20px_rgba(15,23,42,0.1)] transition-shadow duration-200`}
              style={{ borderLeftColor: stroke }}
            >
              <p className="text-2xl text-primary font-data leading-none mb-2.5">{value}</p>
              <p className="text-muted text-md truncate">{label}</p>
            </div>
          ))}
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        {/* Continue Watching */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className={`lg:col-span-2 ${card} p-5`}
        >
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-primary text-lg">Continue Watching</h2>
            <Link href="/student/courses" className="text-muted text-sm hover:text-brand transition-colors">
              View All →
            </Link>
          </div>
          <div className="flex flex-col sm:flex-row gap-5 sm:items-center">
            <div className="relative w-full sm:w-40 h-32 sm:h-24 bg-linear-to-br from-brand to-brand-dark rounded-lg overflow-hidden shrink-0 flex items-center justify-center">
              <div className="relative z-10 w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <svg className="w-5 h-5 ml-0.5" viewBox="0 0 16 16" fill="white">
                  <path d="M 5,4 L 13,8 L 5,12 Z" />
                </svg>
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-white/20">
                <div className="h-full bg-accent1" style={{ width: `${lastWatched.progress}%` }} />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-muted text-sm mb-1.5">{lastWatched.courseTitle}</p>
              <p className="text-primary text-base leading-snug mb-3">{lastWatched.topicTitle}</p>
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-accent1 rounded-full overflow-hidden">
                  <div className="h-full bg-brand rounded-full" style={{ width: `${lastWatched.progress}%` }} />
                </div>
                <span className="text-muted text-sm font-data shrink-0">{lastWatched.progress}%</span>
              </div>
              <Link href="/student/courses" className="inline-flex items-center gap-1.5 mt-3 text-primary text-sm hover:gap-2.5 transition-all">
                Resume →
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Last test */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.13 }}
          className={`${card} p-5`}
        >
          <h2 className="text-primary text-lg mb-5">Test Score</h2>
          {lastTest && (
            <div className="flex items-center justify-between gap-4">
              {/* Left: title, mark, rank */}
              <div className="min-w-0 space-y-3">
                <div className="flex items-baseline gap-3">
                  <span className="text-muted text-sm w-12 shrink-0">Title</span>
                  <span className="text-primary text-base line-clamp-1">{lastTest.title}</span>
                </div>
                <div className="flex items-baseline gap-3">
                  <span className="text-muted text-sm w-12 shrink-0">Mark</span>
                  <span className="text-primary text-base font-data">{lastTest.marksObtained}/{lastTest.totalMarks}</span>
                </div>
                <div className="flex items-baseline gap-3">
                  <span className="text-muted text-sm w-12 shrink-0">Rank</span>
                  <span className="text-primary text-base font-data">{lastTest.rank}/{lastTest.totalStudents}</span>
                </div>
              </div>

              {/* Right: score ring */}
              <div className="relative w-24 h-24 shrink-0">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="#e2e8f0" strokeWidth="8" />
                  <circle cx="50" cy="50" r="42" fill="none" stroke="#7A6B96" strokeWidth="8" strokeLinecap="round"
                    strokeDasharray={`${(lastTest.percentage! / 100) * 264} 264`} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-xl text-primary font-data">{lastTest.percentage}%</span>
                  <span className="text-xs text-muted">Score</span>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* Performance chart */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.16 }}
        className={`${card} p-6 mb-5`}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-primary text-lg">Performance History</h2>
          <Link href="/student/tests" className="text-muted text-sm hover:text-brand transition-colors">
            View All Tests →
          </Link>
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={performanceHistory} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <defs>
              <linearGradient id="scoreFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#7A6B96" stopOpacity={0.28} />
                <stop offset="100%" stopColor="#7A6B96" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 4" stroke="#F4F1F8" vertical={false} />
            <XAxis dataKey="test" tick={{ fill: '#64748b', fontSize: 13 }} axisLine={false} tickLine={false} />
            <YAxis domain={[60, 100]} tick={{ fill: '#64748b', fontSize: 13, fontFamily: 'Space Grotesk' }} axisLine={false} tickLine={false} />
            <Tooltip
              content={<ChartTooltip />}
              cursor={{ stroke: '#cbd5e1', strokeWidth: 1 }}
            />
            <Area
              type="monotone"
              dataKey="score"
              stroke="#7A6B96"
              strokeWidth={2.5}
              fill="url(#scoreFill)"
              dot={{ fill: '#7A6B96', r: 4 }}
              activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Quick links */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.19 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {[
          { href: '/student/notes', label: 'PDF Notes', Icon: IconDocument, desc: '7 materials', color: 'text-brand' },
          { href: '/student/attendance', label: 'Attendance', Icon: IconBarChart, desc: '87% online', color: 'text-[#635580]' },
          { href: '/student/tests', label: 'Upcoming Tests', Icon: IconCalendar, desc: `${upcomingTests} tests`, color: 'text-[#8F7BA0]' },
          { href: '/student/courses', label: 'Video Lessons', Icon: IconPlay, desc: 'Physical Chem', color: 'text-slate-500' },
        ].map(({ href, label, Icon, desc, color }) => (
          <Link key={href} href={href}
            className={`${card} flex items-center gap-4 p-3 hover:bg-brand hover:border-brand hover:shadow-[0_8px_24px_rgba(122,107,150,0.35)] hover:-translate-y-0.5 transition-all duration-200 group`}
          >
            <Icon className={`w-7 h-7 shrink-0 ${color} group-hover:text-white transition-colors duration-200`} />
            <div className="min-w-0">
              <p className="text-primary text-base group-hover:text-white mb-0.5 truncate transition-colors duration-200">{label}</p>
              <p className="text-muted text-sm group-hover:text-white truncate transition-colors duration-200">{desc}</p>
            </div>
          </Link>
        ))}
      </motion.div>
    </div>
  )
}
