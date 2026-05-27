'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { attendance } from '@/lib/mockData'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

function AttendanceRing({ percentage, label, color }: { percentage: number; label: string; color: string }) {
  const r = 52
  const circumference = 2 * Math.PI * r
  const offset = circumference - (percentage / 100) * circumference

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative w-32 h-32">
        <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
          <circle cx="60" cy="60" r={r} fill="none" stroke="#e9deb5" strokeWidth="10" />
          <circle
            cx="60" cy="60" r={r} fill="none"
            stroke={color} strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${circumference}`}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 1s ease' }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl text-primary font-mono">{percentage}%</span>
          <span className="text-[14px] text-muted">{label}</span>
        </div>
      </div>
    </div>
  )
}

export default function AttendancePage() {
  const [showHistory, setShowHistory] = useState(false)

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-6">
        <h1 className="text-2xl text-primary mb-1">Attendance</h1>
        <p className="text-muted text-[14px]">Track your online and offline class attendance</p>
      </motion.div>

      {/* Overview cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="bg-white rounded-2xl p-6 border border-[#e2d5f0] shadow-[0_2px_12px_rgba(94,64,117,0.06)]"
        >
          <div className="flex items-center gap-6">
            <AttendanceRing percentage={attendance.online.percentage} label="Online" color="#5e4075" />
            <div className="flex-1">
              <h3 className="text-primary text-base mb-4">Online Classes</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted text-base">Total Classes</span>
                  <span className="text-primary text-base font-mono">{attendance.online.total}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted text-base">Attended</span>
                  <span className="text-primary text-base font-mono">{attendance.online.attended}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted text-base">Absent</span>
                  <span className="text-primary text-base font-mono">{attendance.online.total - attendance.online.attended}</span>
                </div>
              </div>
              <div className="mt-4 h-2 bg-accent1/50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-1000"
                  style={{ width: `${attendance.online.percentage}%` }}
                />
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="bg-white rounded-2xl p-6 border border-[#e2d5f0] shadow-[0_2px_12px_rgba(94,64,117,0.06)]"
        >
          <div className="flex items-center gap-6">
            <AttendanceRing percentage={attendance.offline.percentage} label="Offline" color="#8b6fa0" />
            <div className="flex-1">
              <h3 className="text-primary text-base mb-4">Offline Classes</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted text-base">Total Classes</span>
                  <span className="text-primary text-base font-mono">{attendance.offline.total}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted text-base">Attended</span>
                  <span className="text-primary text-base font-mono">{attendance.offline.attended}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted text-base">Absent</span>
                  <span className="text-primary text-base font-mono">{attendance.offline.total - attendance.offline.attended}</span>
                </div>
              </div>
              <div className="mt-4 h-2 bg-accent1/50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-muted rounded-full transition-all duration-1000"
                  style={{ width: `${attendance.offline.percentage}%` }}
                />
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Monthly chart */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="bg-white rounded-2xl p-6 border border-[#e2d5f0] shadow-[0_2px_12px_rgba(94,64,117,0.06)] mb-6"
      >
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-primary text-base">Monthly Attendance (%)</h2>
          <div className="flex items-center gap-4 text-[14px]">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-primary" />
              <span className="text-muted">Online</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-muted" />
              <span className="text-muted">Offline</span>
            </div>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={attendance.monthlyData} barGap={4} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 4" stroke="#e9deb5" vertical={false} />
            <XAxis dataKey="month" tick={{ fill: '#8b6fa0', fontSize: 12, fontFamily: 'Contralto' }} axisLine={false} tickLine={false} />
            <YAxis domain={[60, 100]} tick={{ fill: '#8b6fa0', fontSize: 11, fontFamily: 'monospace' }} axisLine={false} tickLine={false} />
            <Tooltip
              contentStyle={{ background: '#f8f9ed', border: '1px solid #e9deb5', borderRadius: 12, fontFamily: 'Contralto', fontSize: 13 }}
              labelStyle={{ color: '#5e4075' }}
              formatter={(value) => [`${value}%`]}
            />
            <Bar dataKey="online" fill="#5e4075" radius={[4, 4, 0, 0]} name="Online" />
            <Bar dataKey="offline" fill="#8b6fa0" radius={[4, 4, 0, 0]} name="Offline" />
          </BarChart>
        </ResponsiveContainer>
      </motion.div>

      {/* History toggle */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.25 }}
        className="bg-white rounded-2xl border border-[#e2d5f0] shadow-[0_2px_12px_rgba(94,64,117,0.06)] overflow-hidden"
      >
        <button
          onClick={() => setShowHistory(!showHistory)}
          className="w-full flex items-center justify-between p-5 hover:bg-accent1/10 transition-colors"
        >
          <h2 className="text-primary text-base">Attendance History</h2>
          <svg
            className={`w-5 h-5 text-muted transition-transform duration-200 ${showHistory ? 'rotate-180' : ''}`}
            viewBox="0 0 20 20" fill="none"
          >
            <path d="M 5,8 L 10,13 L 15,8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {showHistory && (
          <div className="border-t border-[#e2d5f0] divide-y divide-[#f0e8f8]">
            {attendance.history.map((record) => (
              <div key={record.id} className="flex items-center gap-4 px-5 py-3.5">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                  record.status === 'present' ? 'bg-accent2/60 text-[#3d7a5e]' : 'bg-accent3/60 text-[#c06060]'
                }`}>
                  {record.status === 'present' ? (
                    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none">
                      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M 6.5,10 L 9,12.5 L 13.5,8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none">
                      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M 7,7 L 13,13 M 13,7 L 7,13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-primary text-[15px]">
                    Arjun Sharma was marked{' '}
                    <span className={record.status === 'present' ? 'text-[#3d7a5e]' : 'text-[#7a3d3d]'}>
                      {record.status}
                    </span>{' '}
                    for{' '}
                    <span className="text-muted">{record.type}</span> class
                  </p>
                  <p className="text-border text-[14px] font-mono mt-0.5">
                    {record.date} at {record.time}
                  </p>
                </div>
                <span className={`text-[14px] px-3 py-1.5 rounded-full ${
                  record.type === 'online'
                    ? 'bg-accent1/60 text-primary'
                    : 'bg-accent2/60 text-[#3d7a5e]'
                }`}>
                  {record.type}
                </span>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  )
}
