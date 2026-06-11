'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { student, lastWatched, tests, performanceHistory } from '@/lib/mockData'
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { IconClipboard, IconCheckCircle, IconCalendar, IconStar, IconDocument, IconBarChart, IconPlay } from '@/components/ui/SvgIcons'

const card = 'bg-white rounded-lg border border-[#e2e5ec] shadow-[0_2px_12px_rgba(15,23,42,0.06)]'

const totalTests = tests.length
const attendedTests = tests.filter((t) => t.status === 'completed').length
const upcomingTests = tests.filter((t) => t.status === 'upcoming').length
const lastTest = tests.filter((t) => t.status === 'completed').pop()

export default function Dashboard() {
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-7"
      >
        <p className="text-primary/70 text-lg md:text-xl mb-1">{greeting},</p>
        <h1 className="text-3xl md:text-4xl text-primary leading-tight">{student.name}</h1>
        <p className="text-muted text-base mt-2">Grade {student.grade} · Roll No. <span className="font-data">{student.rollNumber}</span></p>
      </motion.div>

      {/* Stats row */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.06 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
      >
        {[
          { label: 'Total Tests', value: totalTests, Icon: IconClipboard, color: 'text-brand' },
          { label: 'Tests Attended', value: attendedTests, Icon: IconCheckCircle, color: 'text-[#635580]' },
          { label: 'Upcoming Tests', value: upcomingTests, Icon: IconCalendar, color: 'text-[#8F7BA0]' },
          { label: 'New Courses', value: 1, Icon: IconStar, color: 'text-slate-500' },
        ].map(({ label, value, Icon, color }) => (
          <div key={label} className={`${card} p-5 flex items-center justify-between gap-3 hover:shadow-[0_4px_20px_rgba(15,23,42,0.1)] transition-shadow duration-200`}>
            <div className="min-w-0">
              <p className="text-3xl text-primary font-data leading-none mb-1.5">{value}</p>
              <p className="text-muted text-sm truncate">{label}</p>
            </div>
            <Icon className={`w-7 h-7 shrink-0 ${color}`} />
          </div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-5">
        {/* Continue Watching */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className={`lg:col-span-2 ${card} p-6`}
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
          className={`${card} p-6`}
        >
          <h2 className="text-primary text-lg mb-4">Last Test Score</h2>
          {lastTest && (
            <>
              <div className="relative w-28 h-28 mx-auto mb-4">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="#e2e8f0" strokeWidth="8" />
                  <circle cx="50" cy="50" r="42" fill="none" stroke="#7A6B96" strokeWidth="8" strokeLinecap="round"
                    strokeDasharray={`${(lastTest.percentage! / 100) * 264} 264`} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl text-primary font-data">{lastTest.percentage}%</span>
                  <span className="text-sm text-muted">Score</span>
                </div>
              </div>
              <p className="text-primary text-sm text-center line-clamp-1 mb-1">{lastTest.title}</p>
              <p className="text-muted text-sm text-center">Rank <span className="font-data">{lastTest.rank}/{lastTest.totalStudents}</span></p>
              <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#F4F1F8]">
                <span className="text-muted text-sm">Marks</span>
                <span className="text-primary text-sm font-data">{lastTest.marksObtained}/{lastTest.totalMarks}</span>
              </div>
            </>
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
          <LineChart data={performanceHistory} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 4" stroke="#F4F1F8" vertical={false} />
            <XAxis dataKey="test" tick={{ fill: '#64748b', fontSize: 13 }} axisLine={false} tickLine={false} />
            <YAxis domain={[60, 100]} tick={{ fill: '#64748b', fontSize: 13, fontFamily: 'Space Grotesk' }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: '#fff', border: '1px solid #e2e5ec', borderRadius: 12, fontSize: 13 }}
              labelStyle={{ color: '#7A6B96' }}
              itemStyle={{ color: '#7A6B96' }}
              formatter={(value) => [`${value}%`, 'Score']}
            />
            <Line type="monotone" dataKey="score" stroke="#7A6B96" strokeWidth={2.5} dot={{ fill: '#7A6B96', r: 5 }} activeDot={{ r: 7 }} />
          </LineChart>
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
            className={`${card} p-5 hover:shadow-[0_4px_20px_rgba(15,23,42,0.1)] transition-all duration-200 hover:-translate-y-0.5 group`}
          >
            <Icon className={`w-7 h-7 mb-3 ${color}`} />
            <p className="text-primary text-base group-hover:text-brand-dark mb-0.5">{label}</p>
            <p className="text-muted text-sm">{desc}</p>
          </Link>
        ))}
      </motion.div>
    </div>
  )
}
