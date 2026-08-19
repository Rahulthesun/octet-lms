'use client'

import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { useMyOnlineClasses, type OnlineClass } from '@/hooks/useOnlineClasses'
import { formatDateInZone, formatTimeInZone, isoToZonedParts } from '@/lib/helpers'

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function statusDotColor(cls: OnlineClass) {
  if (cls.status === 'cancelled') return 'bg-rose-500'
  return 'bg-brand'
}

// ─── Month calendar, linked to the class list below ────────────────────────

function ClassCalendar({ classes, selectedDate, onSelectDate }: {
  classes: OnlineClass[]
  selectedDate: string | null
  onSelectDate: (date: string | null) => void
}) {
  const now = new Date()
  const [current, setCurrent] = useState({ year: now.getFullYear(), month: now.getMonth() })

  const monthLabel = new Date(current.year, current.month, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
  const firstDay = new Date(current.year, current.month, 1).getDay()
  const daysInMonth = new Date(current.year, current.month + 1, 0).getDate()

  const classesByDay = useMemo(() => {
    const map: Record<number, OnlineClass[]> = {}
    classes.forEach((c) => {
      const { date } = isoToZonedParts(c.scheduledStart, c.timezone)
      const [y, m, d] = date.split('-').map(Number)
      if (y === current.year && m - 1 === current.month) {
        map[d] = map[d] ? [...map[d], c] : [c]
      }
    })
    return map
  }, [classes, current])

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  return (
    <div className="bg-white rounded-lg border border-[#e2e5ec] shadow-[0_2px_12px_rgba(15,23,42,0.06)] overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#e2e5ec]">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrent((c) => ({ year: c.month === 0 ? c.year - 1 : c.year, month: c.month === 0 ? 11 : c.month - 1 }))}
            className="w-7 h-7 flex items-center justify-center rounded-md text-muted hover:bg-accent1/20 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h2 className="text-primary text-base min-w-[140px] text-center">{monthLabel}</h2>
          <button
            onClick={() => setCurrent((c) => ({ year: c.month === 11 ? c.year + 1 : c.year, month: c.month === 11 ? 0 : c.month + 1 }))}
            className="w-7 h-7 flex items-center justify-center rounded-md text-muted hover:bg-accent1/20 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        {selectedDate && (
          <button onClick={() => onSelectDate(null)} className="text-xs text-muted hover:text-brand transition-colors">
            Clear date
          </button>
        )}
      </div>

      <div className="px-5 py-6">
        <div className="grid grid-cols-7">
          {WEEKDAY_LABELS.map((label, i) => (
            <div key={i} className="text-center text-[11px] font-medium text-muted/70">{label}</div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {cells.map((day, i) => {
            if (day === null) return <div key={`blank-${i}`} />
            const dayClasses = classesByDay[day] ?? []
            const dateStr = `${current.year}-${String(current.month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
            const isSelected = selectedDate === dateStr
            const isToday = current.year === now.getFullYear() && current.month === now.getMonth() && day === now.getDate()

            return (
              <button
                key={day}
                onClick={() => dayClasses.length > 0 && onSelectDate(isSelected ? null : dateStr)}
                className={`flex flex-col items-center justify-center gap-2 py-3 rounded-lg transition-colors ${
                  isSelected ? 'bg-brand/10' : isToday ? 'bg-primary/5' : dayClasses.length > 0 ? 'hover:bg-gray-50 cursor-pointer' : 'cursor-default'
                }`}
              >
                <div className="relative flex items-center justify-center w-4 h-4">
                  {isToday && <span className="absolute inset-0 rounded-full ring-2 ring-primary ring-offset-2" />}
                  <div className={`rounded-full ${dayClasses.length > 0 ? `w-2.5 h-2.5 ${statusDotColor(dayClasses[0])}` : 'w-1.5 h-1.5 bg-gray-300'}`} />
                </div>
                <span className={`text-[12px] tabular-nums ${isToday ? 'font-bold text-primary' : dayClasses.length > 0 ? 'font-medium text-primary' : 'text-gray-400'}`}>
                  {day}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Class card ─────────────────────────────────────────────────────────────

function ClassCard({ cls }: { cls: OnlineClass }) {
  const isCancelled = cls.status === 'cancelled'
  return (
    <div className={`bg-white rounded-lg border shadow-[0_2px_12px_rgba(15,23,42,0.06)] p-5 ${isCancelled ? 'border-rose-100 opacity-70' : 'border-[#e2e5ec]'}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          {cls.subjectName && <p className="text-muted text-sm mb-0.5">{cls.subjectName}</p>}
          <h3 className="text-primary text-lg leading-snug">{cls.title}</h3>
          {cls.batchName && <p className="text-muted text-sm mt-0.5">{cls.batchName}</p>}
        </div>
        <span className={`shrink-0 text-[11px] tracking-wide uppercase px-2.5 py-1 rounded-md ${
          isCancelled ? 'bg-rose-50 text-rose-600' : 'bg-[#F1EEF5] text-brand'
        }`}>
          {isCancelled ? 'Cancelled' : 'Online Class'}
        </span>
      </div>

      <p className="text-primary text-[15px] font-data mb-1">{formatDateInZone(cls.scheduledStart, cls.timezone)}</p>
      <p className="text-muted text-sm mb-4">
        {formatTimeInZone(cls.scheduledStart, cls.timezone)} – {formatTimeInZone(cls.scheduledEnd, cls.timezone)}
      </p>

      {cls.description && <p className="text-muted text-sm mb-4">{cls.description}</p>}

      {isCancelled ? (
        <p className="text-rose-600 text-sm">This class has been cancelled.</p>
      ) : cls.meetUrl ? (
        <a
          href={cls.meetUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center w-full sm:w-auto px-5 py-2.5 rounded-full bg-brand text-white text-sm font-medium hover:bg-brand-dark transition-colors"
        >
          Join Google Meet
        </a>
      ) : (
        <p className="text-muted text-sm">Meet link not available yet.</p>
      )}
    </div>
  )
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function StudentClassesPage() {
  const { classes, loading, error } = useMyOnlineClasses()
  const [selectedDate, setSelectedDate] = useState<string | null>(null)

  const visibleClasses = useMemo(() => {
    if (selectedDate) {
      return classes.filter((c) => isoToZonedParts(c.scheduledStart, c.timezone).date === selectedDate)
    }
    const now = Date.now()
    return classes
      .filter((c) => c.status === 'cancelled' || new Date(c.scheduledEnd).getTime() >= now)
      .sort((a, b) => new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime())
  }, [classes, selectedDate])

  return (
    <div className="p-5 lg:p-8 max-w-screen mx-auto pb-10 space-y-5">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <h1 className="text-3xl text-primary mb-1">Online Classes</h1>
        <p className="text-muted text-base">Join your scheduled Google Meet classes, or browse the calendar below</p>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 order-2 lg:order-1 space-y-4">
          <h2 className="text-primary text-lg">
            {selectedDate ? 'Classes on selected date' : 'Upcoming Online Classes'}
          </h2>

          {loading ? (
            <div className="text-center py-12 text-muted">Loading classes…</div>
          ) : error ? (
            <div className="text-center py-12 text-rose-600">{error}</div>
          ) : visibleClasses.length === 0 ? (
            <div className="bg-white rounded-lg border border-[#e2e5ec] p-8 text-center text-muted">
              {selectedDate ? 'No classes on this date.' : 'No upcoming online classes have been scheduled yet.'}
            </div>
          ) : (
            <div className="space-y-4">
              {visibleClasses.map((cls, i) => (
                <motion.div key={cls.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: i * 0.04 }}>
                  <ClassCard cls={cls} />
                </motion.div>
              ))}
            </div>
          )}
        </div>

        <div className="lg:col-span-1 order-1 lg:order-2">
          <div className="lg:sticky lg:top-6">
            <ClassCalendar classes={classes} selectedDate={selectedDate} onSelectDate={setSelectedDate} />
          </div>
        </div>
      </div>
    </div>
  )
}
