'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { tests } from '@/lib/mockData'
import { IconClipboard, IconRuler, IconBook } from '@/components/ui/SvgIcons'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

type Test = typeof tests[0]

const card = 'bg-white rounded-lg border border-[#e2e5ec] shadow-[0_2px_12px_rgba(15,23,42,0.06)]'

// Status accents (multi-color)
const STATUS: Record<string, { label: string; text: string; bar: string; chip: string; dot: string }> = {
  completed: { label: 'Completed', text: 'text-emerald-600', bar: 'border-l-emerald-500', chip: 'bg-emerald-50 text-emerald-700', dot: '#059669' },
  upcoming: { label: 'Upcoming', text: 'text-amber-600', bar: 'border-l-amber-500', chip: 'bg-amber-50 text-amber-700', dot: '#d97706' },
  missed: { label: 'Missed', text: 'text-rose-600', bar: 'border-l-rose-500', chip: 'bg-rose-50 text-rose-700', dot: '#e11d48' },
}

function TestCalendar({ selectedDate, onSelectDate }: { selectedDate: string | null; onSelectDate: (d: string) => void }) {
  const today = new Date(2024, 11, 10) // Dec 10, 2024
  const [current, setCurrent] = useState({ year: 2024, month: 11 })

  const firstDay = new Date(current.year, current.month, 1).getDay()
  const daysInMonth = new Date(current.year, current.month + 1, 0).getDate()

  const testDates: Record<string, Test> = {}
  tests.forEach((t) => {
    const [y, m, d] = t.date.split('-').map(Number)
    if (y === current.year && m - 1 === current.month) testDates[d.toString()] = t
  })

  return (
    <div className={`${card} p-5`}>
      <div className="flex items-center justify-between mb-5">
        <button
          onClick={() => setCurrent((c) => ({ year: c.month === 0 ? c.year - 1 : c.year, month: c.month === 0 ? 11 : c.month - 1 }))}
          className="w-8 h-8 rounded-md hover:bg-accent1/60 flex items-center justify-center text-muted hover:text-brand transition-colors"
        >
          ←
        </button>
        <h3 className="text-primary text-[15px] font-data">{MONTHS[current.month]} {current.year}</h3>
        <button
          onClick={() => setCurrent((c) => ({ year: c.month === 11 ? c.year + 1 : c.year, month: c.month === 11 ? 0 : c.month + 1 }))}
          className="w-8 h-8 rounded-md hover:bg-accent1/60 flex items-center justify-center text-muted hover:text-brand transition-colors"
        >
          →
        </button>
      </div>

      <div className="grid grid-cols-7 mb-2">
        {DAYS.map((d) => (
          <div key={d} className="text-center text-[13px] text-muted py-1">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-0.5">
        {Array.from({ length: firstDay }).map((_, i) => <div key={`e-${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1
          const test = testDates[day.toString()]
          const isToday = current.year === today.getFullYear() && current.month === today.getMonth() && day === today.getDate()
          const isSel = test && test.date === selectedDate
          return (
            <button
              key={day}
              onClick={() => test && onSelectDate(test.date)}
              className={`relative aspect-square flex items-center justify-center rounded-md text-[14px] font-data transition-all duration-150 ${
                test ? 'hover:bg-accent1/60 cursor-pointer' : 'cursor-default'
              } ${isSel ? 'bg-brand text-white' : isToday ? 'ring-1 ring-brand/40' : ''}`}
            >
              <span className={isSel ? 'text-white' : test ? 'text-primary' : 'text-muted'}>{day}</span>
              {test && !isSel && (
                <div className="absolute bottom-1 w-1.5 h-1.5 rounded-full" style={{ backgroundColor: STATUS[test.status].dot }} />
              )}
            </button>
          )
        })}
      </div>

      <div className="flex items-center justify-center gap-4 mt-5 pt-4 border-t border-[#F4F1F8]">
        {(['completed', 'upcoming', 'missed'] as const).map((k) => (
          <div key={k} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: STATUS[k].dot }} />
            <span className="text-[13px] text-muted">{STATUS[k].label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function MetaItem({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="min-w-0">
      <p className="text-muted text-[13px] mb-0.5">{label}</p>
      <p className="text-primary text-[15px] font-data truncate">{value}</p>
    </div>
  )
}

function TestCard({ test }: { test: Test }) {
  const st = STATUS[test.status]

  const studyMaterialIcon = (type: string) => {
    if (type === 'Cheat Sheet') return <IconClipboard className="w-5 h-5" />
    if (type === 'Formula Sheet') return <IconRuler className="w-5 h-5" />
    return <IconBook className="w-5 h-5" />
  }

  return (
    <div className={`${card} border-l-4 ${st.bar} p-5`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h3 className="text-primary text-base leading-snug mb-1.5">{test.title}</h3>
          <span className={`inline-flex items-center gap-1.5 text-[13px] px-2.5 py-1 rounded-md ${
            test.type === 'online' ? 'bg-[#F1EEF5] text-brand' : 'bg-slate-100 text-slate-600'
          }`}>
            {test.type === 'online' ? 'Online' : 'Offline'} · {test.duration}
          </span>
        </div>
        <span className={`shrink-0 text-[13px] px-2.5 py-1 rounded-md ${st.chip}`}>{st.label}</span>
      </div>

      {/* Meta line */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pb-1">
        <MetaItem label="Date" value={test.date} />
        <MetaItem label="Time" value={test.time} />
        <MetaItem label="Duration" value={test.duration} />
        <MetaItem label="Total Marks" value={test.totalMarks} />
      </div>

      {/* Conditional block */}
      {test.status === 'completed' && test.marksObtained !== null && (
        <div className="mt-4 pt-4 border-t border-[#F4F1F8]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-muted text-[14px]">Score</span>
            <span className="text-primary text-[15px] font-data">{test.marksObtained}/{test.totalMarks} ({test.percentage}%)</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${test.percentage}%` }} />
          </div>
          <p className="text-muted text-[14px] mt-2">Rank <span className="font-data">{test.rank}</span> out of <span className="font-data">{test.totalStudents}</span> students</p>
        </div>
      )}

      {test.status === 'upcoming' && test.studyMaterials && test.studyMaterials.length > 0 && (
        <div className="mt-4 pt-4 border-t border-[#F4F1F8]">
          <p className="text-primary text-[15px] mb-3">Study Materials for this Test</p>
          <div className="space-y-2">
            {test.studyMaterials.map((m) => (
              <div key={m.id} className="flex items-center gap-3 p-3 bg-amber-50 rounded-md">
                <span className="text-amber-600">{studyMaterialIcon(m.type)}</span>
                <div>
                  <p className="text-primary text-[15px]">{m.title}</p>
                  <p className="text-muted text-[14px]">{m.type}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {test.status === 'missed' && (
        <div className="mt-4 pt-4 border-t border-[#F4F1F8]">
          <p className="text-rose-600 text-[15px]">You missed this test. Contact your instructor if you need to reschedule.</p>
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

  const summary = [
    { label: 'Total Tests', val: tests.length, color: 'text-slate-700' },
    { label: 'Completed', val: tests.filter((t) => t.status === 'completed').length, color: 'text-emerald-600' },
    { label: 'Upcoming', val: tests.filter((t) => t.status === 'upcoming').length, color: 'text-amber-600' },
    { label: 'Missed', val: tests.filter((t) => t.status === 'missed').length, color: 'text-rose-600' },
  ]

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-6">
        <h1 className="text-3xl md:text-4xl text-primary mb-1">Tests</h1>
        <p className="text-muted text-base">Track your upcoming, completed, and missed tests</p>
      </motion.div>

      {/* Summary tiles */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
      >
        {summary.map(({ label, val, color }) => (
          <div key={label} className={`${card} p-5`}>
            <p className={`text-3xl font-data leading-none mb-1.5 ${color}`}>{val}</p>
            <p className="text-muted text-sm">{label}</p>
          </div>
        ))}
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Test list */}
        <div className="lg:col-span-2 order-2 lg:order-1">
          {/* Filter tabs */}
          <div className="flex flex-wrap items-center gap-2 mb-5">
            {(['all', 'upcoming', 'completed', 'missed'] as const).map((f) => (
              <button
                key={f}
                onClick={() => { setFilter(f); setSelectedDate(null) }}
                className={`px-4 py-2 rounded-md text-[15px] capitalize transition-all duration-150 ${
                  filter === f && !selectedDate
                    ? 'bg-brand text-white'
                    : 'bg-white border border-border text-primary hover:bg-accent1/50'
                }`}
              >
                {f}
              </button>
            ))}
            {selectedDate && (
              <button
                onClick={() => setSelectedDate(null)}
                className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-md text-[15px] text-muted hover:text-brand hover:bg-accent1/50 transition-all"
              >
                Clear date
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
                transition={{ duration: 0.4, delay: i * 0.05 }}
              >
                <TestCard test={test} />
              </motion.div>
            ))}
            {displayTests.length === 0 && (
              <div className="text-center py-12 text-muted">
                <p className="text-[15px]">No tests for this filter.</p>
              </div>
            )}
          </div>
        </div>

        {/* Calendar (sticky) */}
        <div className="lg:col-span-1 order-1 lg:order-2">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="lg:sticky lg:top-6"
          >
            <TestCalendar selectedDate={selectedDate} onSelectDate={(d) => setSelectedDate(d === selectedDate ? null : d)} />
          </motion.div>
        </div>
      </div>
    </div>
  )
}
