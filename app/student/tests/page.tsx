'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { tests, notes } from '@/lib/mockData'
import { IconClipboard, IconRuler, IconBook } from '@/components/ui/SvgIcons'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

type Test = typeof tests[0]

function TestCalendar({ onSelectDate }: { onSelectDate: (d: string) => void }) {
  const today = new Date(2024, 11, 10) // Dec 10, 2024
  const [current, setCurrent] = useState({ year: 2024, month: 11 }) // Dec

  const firstDay = new Date(current.year, current.month, 1).getDay()
  const daysInMonth = new Date(current.year, current.month + 1, 0).getDate()

  const testDates: Record<string, Test> = {}
  tests.forEach((t) => {
    const [y, m, d] = t.date.split('-').map(Number)
    if (y === current.year && m - 1 === current.month) {
      testDates[d.toString()] = t
    }
  })

  const statusColor: Record<string, string> = {
    completed: '#5e4075',
    upcoming: '#e9ae40',
    missed: '#c06060',
  }

  return (
    <div className="bg-white rounded-2xl border border-[#e2d5f0] shadow-[0_2px_12px_rgba(94,64,117,0.06)] p-5">
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={() => setCurrent((c) => {
            const m = c.month === 0 ? 11 : c.month - 1
            const y = c.month === 0 ? c.year - 1 : c.year
            return { year: y, month: m }
          })}
          className="w-8 h-8 rounded-lg hover:bg-[#e9deb5]/40 flex items-center justify-center text-[#8b6fa0] hover:text-[#5e4075] transition-colors"
        >
          ←
        </button>
        <h3 className="text-[#5e4075] text-[15px]">{MONTHS[current.month]} {current.year}</h3>
        <button
          onClick={() => setCurrent((c) => {
            const m = c.month === 11 ? 0 : c.month + 1
            const y = c.month === 11 ? c.year + 1 : c.year
            return { year: y, month: m }
          })}
          className="w-8 h-8 rounded-lg hover:bg-[#e9deb5]/40 flex items-center justify-center text-[#8b6fa0] hover:text-[#5e4075] transition-colors"
        >
          →
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-2">
        {DAYS.map((d) => (
          <div key={d} className="text-center text-[14px] text-[#8b6fa0] py-1">{d}</div>
        ))}
      </div>

      {/* Dates */}
      <div className="grid grid-cols-7 gap-0.5">
        {Array.from({ length: firstDay }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1
          const test = testDates[day.toString()]
          const isToday = current.year === today.getFullYear() && current.month === today.getMonth() && day === today.getDate()

          return (
            <button
              key={day}
              onClick={() => test && onSelectDate(test.date)}
              className={`relative aspect-square flex flex-col items-center justify-center rounded-xl text-[15px] transition-all duration-150 ${
                test
                  ? 'hover:bg-[#e9deb5]/30 cursor-pointer'
                  : 'cursor-default'
              } ${isToday ? 'ring-1 ring-[#5e4075]/30' : ''}`}
            >
              <span className={`leading-none ${test ? 'text-[#5e4075]' : 'text-[#c8b8d8]'} ${isToday ? 'text-[#5e4075]' : ''}`}>
                {day}
              </span>
              {test && (
                <div
                  className="absolute bottom-1.5 w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: statusColor[test.status] }}
                />
              )}
            </button>
          )
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-5 mt-5 pt-4 border-t border-[#e2d5f0]">
        {[
          { label: 'Completed', color: '#5e4075' },
          { label: 'Upcoming', color: '#e9ae40' },
          { label: 'Missed', color: '#c06060' },
        ].map(({ label, color }) => (
          <div key={label} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-[14px] text-[#8b6fa0]">{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function TestCard({ test }: { test: Test }) {
  const statusConfig: Record<string, { label: string; color: string }> = {
    completed: { label: 'Completed', color: '#5e4075' },
    upcoming: { label: 'Upcoming', color: '#7a5c00' },
    missed: { label: 'Missed', color: '#7a3d3d' },
  }
  const config = statusConfig[test.status]

  const studyMaterialIcon = (type: string) => {
    if (type === 'Cheat Sheet') return <IconClipboard className="w-5 h-5" />
    if (type === 'Formula Sheet') return <IconRuler className="w-5 h-5" />
    return <IconBook className="w-5 h-5" />
  }

  return (
    <div className="bg-white rounded-2xl border border-[#e2d5f0] shadow-[0_2px_12px_rgba(94,64,117,0.06)] p-6">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-3">
            <span className={`flex items-center gap-1.5 text-[14px] px-3 py-1.5 rounded-full ${
              test.type === 'online' ? 'bg-[#e9deb5]/60 text-[#5e4075]' : 'bg-[#daeae4]/60 text-[#3d7a5e]'
            }`}>
              {test.type === 'online' ? (
                <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.3" />
                  <ellipse cx="7" cy="7" rx="2.5" ry="6" stroke="currentColor" strokeWidth="1.1" />
                  <path d="M 1.5,5 L 12.5,5 M 1.5,9 L 12.5,9" stroke="currentColor" strokeWidth="1.1" />
                </svg>
              ) : (
                <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none">
                  <path d="M 1,13 L 13,13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                  <path d="M 2,13 L 2,6 L 7,2 L 12,6 L 12,13" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                  <rect x="5" y="9" width="4" height="4" rx="0.5" stroke="currentColor" strokeWidth="1.1" />
                </svg>
              )}
              {test.type === 'online' ? 'Online' : 'Offline'}
            </span>
            <span className="text-[14px] px-3 py-1.5 rounded-full" style={{ color: config.color }}>
              {config.label}
            </span>
          </div>
          <h3 className="text-[#5e4075] text-[15px] leading-snug">{test.title}</h3>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <div>
          <p className="text-[#8b6fa0] text-[14px]">Date</p>
          <p className="text-[#5e4075] text-[15px]">{test.date}</p>
        </div>
        <div>
          <p className="text-[#8b6fa0] text-[14px]">Time</p>
          <p className="text-[#5e4075] text-[15px]">{test.time}</p>
        </div>
        <div>
          <p className="text-[#8b6fa0] text-[14px]">Duration</p>
          <p className="text-[#5e4075] text-[15px]">{test.duration}</p>
        </div>
        <div>
          <p className="text-[#8b6fa0] text-[14px]">Total Marks</p>
          <p className="text-[#5e4075] text-[15px] font-mono">{test.totalMarks}</p>
        </div>
      </div>

      {test.status === 'completed' && test.marksObtained !== null && (
        <div className="pt-4 border-t border-[#e2d5f0]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[#8b6fa0] text-[14px]">Score</span>
            <span className="text-[#5e4075] text-[15px] font-mono">{test.marksObtained}/{test.totalMarks} ({test.percentage}%)</span>
          </div>
          <div className="h-2 bg-[#e9deb5]/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#5e4075] rounded-full"
              style={{ width: `${test.percentage}%` }}
            />
          </div>
          <p className="text-[#8b6fa0] text-[14px] mt-2">Rank {test.rank} out of {test.totalStudents} students</p>
        </div>
      )}

      {test.status === 'upcoming' && test.studyMaterials && test.studyMaterials.length > 0 && (
        <div className="pt-4 border-t border-[#e2d5f0]">
          <p className="text-[#5e4075] text-[15px] mb-3">Study Materials for this Test</p>
          <div className="space-y-2">
            {test.studyMaterials.map((m) => (
              <div key={m.id} className="flex items-center gap-3 p-3 bg-[#e9deb5]/20 rounded-xl">
                <span className="text-[#5e4075]">{studyMaterialIcon(m.type)}</span>
                <div>
                  <p className="text-[#5e4075] text-[15px]">{m.title}</p>
                  <p className="text-[#8b6fa0] text-[14px]">{m.type}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {test.status === 'missed' && (
        <div className="pt-4 border-t border-[#e2d5f0]">
          <p className="text-[#c06060] text-[15px]">You missed this test. Contact your instructor if you need to reschedule.</p>
        </div>
      )}
    </div>
  )
}

export default function TestsPage() {
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'completed' | 'missed'>('all')
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const displayTests = selectedDate
    ? tests.filter((t) => t.date === selectedDate)
    : filter === 'all'
    ? tests
    : tests.filter((t) => t.status === filter)

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-6">
        <h1 className="text-2xl text-[#5e4075] mb-1">Tests</h1>
        <p className="text-[#8b6fa0] text-[15px]">Track your upcoming, completed, and missed tests</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-1 space-y-4">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}>
            <TestCalendar onSelectDate={(d) => setSelectedDate(d === selectedDate ? null : d)} />
          </motion.div>

          {/* Summary stats */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="bg-white rounded-2xl border border-[#e2d5f0] shadow-[0_2px_12px_rgba(94,64,117,0.06)] p-5"
          >
            <h3 className="text-[#5e4075] text-base mb-4">Test Summary</h3>
            {[
              { label: 'Total Tests', val: tests.length, color: '#5e4075' },
              { label: 'Completed', val: tests.filter((t) => t.status === 'completed').length, color: '#5e4075' },
              { label: 'Upcoming', val: tests.filter((t) => t.status === 'upcoming').length, color: '#e9ae40' },
              { label: 'Missed', val: tests.filter((t) => t.status === 'missed').length, color: '#c06060' },
            ].map(({ label, val, color }) => (
              <div key={label} className="flex items-center justify-between py-2.5 border-b border-[#f0e8f8] last:border-0">
                <span className="text-[#8b6fa0] text-[15px]">{label}</span>
                <span className="text-[15px] font-mono" style={{ color }}>{val}</span>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Test list */}
        <div className="lg:col-span-2">
          {/* Filter tabs */}
          <div className="flex items-center gap-2 mb-5">
            {(['all', 'upcoming', 'completed', 'missed'] as const).map((f) => (
              <button
                key={f}
                onClick={() => { setFilter(f); setSelectedDate(null) }}
                className={`px-4 py-2.5 rounded-xl text-[15px] capitalize transition-all duration-150 ${
                  filter === f && !selectedDate
                    ? 'bg-[#5e4075] text-[#f8f9ed]'
                    : 'bg-[#e9deb5]/40 text-[#5e4075] hover:bg-[#e9deb5]/70'
                }`}
              >
                {f}
              </button>
            ))}
            {selectedDate && (
              <button
                onClick={() => setSelectedDate(null)}
                className="ml-auto flex items-center gap-1.5 px-3 py-2.5 rounded-xl text-[15px] text-[#8b6fa0] hover:text-[#5e4075] hover:bg-[#e9deb5]/40 transition-all"
              >
                Clear date filter
                <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none">
                  <path d="M 3,3 L 11,11 M 11,3 L 3,11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            )}
          </div>

          <div className="space-y-4">
            {displayTests.map((test, i) => (
              <motion.div
                key={test.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
              >
                <TestCard test={test} />
              </motion.div>
            ))}
            {displayTests.length === 0 && (
              <div className="text-center py-12 text-[#8b6fa0]">
                <p className="text-[15px]">No tests for this filter.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
