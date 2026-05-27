'use client'

import { motion } from 'framer-motion'
import Link from 'next/link'
import { student, lastWatched, tests, performanceHistory } from '@/lib/mockData'
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import { IconClipboard, IconCheckCircle, IconCalendar, IconStar, IconDocument, IconBarChart, IconPlay } from '@/components/ui/SvgIcons'

const card = 'bg-white rounded-2xl border border-[#e2d5f0] shadow-[0_2px_12px_rgba(94,64,117,0.06)]'

const totalTests = tests.length
const attendedTests = tests.filter((t) => t.status === 'completed').length
const upcomingTests = tests.filter((t) => t.status === 'upcoming').length
const lastTest = tests.filter((t) => t.status === 'completed').pop()

export default function Dashboard() {
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="p-8 lg:p-10 max-w-6xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-10"
      >
        <p className="text-muted text-[14px] mb-2">{greeting},</p>
        <h1 className="text-2xl md:text-3xl text-primary">{student.name}</h1>
        <p className="text-muted text-[15px] mt-2">Grade {student.grade} · Roll No. {student.rollNumber}</p>
      </motion.div>

      {/* Stats row */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.06 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-5 mb-7"
      >
        {[
          { label: 'Total Tests', value: totalTests, Icon: IconClipboard, color: '#e9deb5' },
          { label: 'Tests Attended', value: attendedTests, Icon: IconCheckCircle, color: '#daeae4' },
          { label: 'Upcoming Tests', value: upcomingTests, Icon: IconCalendar, color: '#d4c5e2' },
          { label: 'New Courses', value: 1, Icon: IconStar, color: '#c8e0da' },
        ].map(({ label, value, Icon, color }) => (
          <div key={label} className={`${card} p-8 hover:shadow-[0_4px_20px_rgba(94,64,117,0.1)] transition-shadow duration-200`}>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5 text-primary" style={{ backgroundColor: color }}>
              <Icon className="w-6 h-6" />
            </div>
            <p className="text-3xl text-primary font-mono mb-2">{value}</p>
            <p className="text-muted text-[15px]">{label}</p>
          </div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Continue Watching */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className={`lg:col-span-2 ${card} p-8`}
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-primary text-base">Continue Watching</h2>
            <Link href="/student/courses" className="text-muted text-[14px] hover:text-primary transition-colors">
              View All →
            </Link>
          </div>
          <div className="flex gap-6 items-center">
            <div className="relative w-40 h-28 bg-linear-to-br from-primary to-[#3d2652] rounded-xl overflow-hidden shrink-0 flex items-center justify-center">
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
              <p className="text-muted text-[14px] mb-2">{lastWatched.courseTitle}</p>
              <p className="text-primary text-[15px] leading-snug mb-4">{lastWatched.topicTitle}</p>
              <div className="flex items-center gap-4">
                <div className="flex-1 h-2 bg-accent1 rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${lastWatched.progress}%` }} />
                </div>
                <span className="text-muted text-[14px] font-mono shrink-0">{lastWatched.progress}%</span>
              </div>
              <Link href="/student/courses" className="inline-flex items-center gap-1.5 mt-4 text-primary text-[14px] hover:gap-2.5 transition-all">
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
          className={`${card} p-8`}
        >
          <h2 className="text-primary text-base mb-6">Last Test Score</h2>
          {lastTest && (
            <>
              <div className="relative w-32 h-32 mx-auto mb-6">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="#e9deb5" strokeWidth="8" />
                  <circle cx="50" cy="50" r="42" fill="none" stroke="#5e4075" strokeWidth="8" strokeLinecap="round"
                    strokeDasharray={`${(lastTest.percentage! / 100) * 264} 264`} />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl text-primary font-mono">{lastTest.percentage}%</span>
                  <span className="text-[14px] text-muted">Score</span>
                </div>
              </div>
              <p className="text-primary text-[14px] text-center line-clamp-1 mb-1">{lastTest.title}</p>
              <p className="text-muted text-[14px] text-center">Rank {lastTest.rank}/{lastTest.totalStudents}</p>
              <div className="flex items-center justify-between mt-5 pt-5 border-t border-[#f0e8f8]">
                <span className="text-muted text-[14px]">Marks</span>
                <span className="text-primary text-[14px] font-mono">{lastTest.marksObtained}/{lastTest.totalMarks}</span>
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
        className={`${card} p-8 mb-6`}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-primary text-base">Performance History</h2>
          <Link href="/student/tests" className="text-muted text-[14px] hover:text-primary transition-colors">
            View All Tests →
          </Link>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={performanceHistory} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 4" stroke="#f0e8f8" vertical={false} />
            <XAxis dataKey="test" tick={{ fill: '#8b6fa0', fontSize: 13 }} axisLine={false} tickLine={false} />
            <YAxis domain={[60, 100]} tick={{ fill: '#8b6fa0', fontSize: 13, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: '#fff', border: '1px solid #e2d5f0', borderRadius: 12, fontSize: 13 }}
              labelStyle={{ color: '#5e4075' }}
              itemStyle={{ color: '#5e4075' }}
              formatter={(value) => [`${value}%`, 'Score']}
            />
            <Line type="monotone" dataKey="score" stroke="#5e4075" strokeWidth={2.5} dot={{ fill: '#5e4075', r: 5 }} activeDot={{ r: 7 }} />
          </LineChart>
        </ResponsiveContainer>
      </motion.div>

      {/* Quick links */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.19 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-5"
      >
        {[
          { href: '/student/notes', label: 'View Notes', Icon: IconDocument, desc: '7 materials' },
          { href: '/student/attendance', label: 'Attendance', Icon: IconBarChart, desc: '87% online' },
          { href: '/student/tests', label: 'Upcoming Tests', Icon: IconCalendar, desc: `${upcomingTests} tests` },
          { href: '/student/courses', label: 'Continue Course', Icon: IconPlay, desc: 'Physical Chem' },
        ].map(({ href, label, Icon, desc }) => (
          <Link key={href} href={href}
            className={`${card} p-7 hover:shadow-[0_4px_20px_rgba(94,64,117,0.1)] transition-all duration-200 hover:-translate-y-0.5 group`}
          >
            <div className="text-primary mb-4">
              <Icon className="w-7 h-7" />
            </div>
            <p className="text-primary text-base group-hover:text-[#3d2652] mb-1">{label}</p>
            <p className="text-muted text-[14px]">{desc}</p>
          </Link>
        ))}
      </motion.div>
    </div>
  )
}
