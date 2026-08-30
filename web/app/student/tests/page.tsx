'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useMyTests, type StudentTestListItem } from '@/hooks/useTests'
import DescriptiveAnswerPanel from '@/components/student/tests/DescriptiveAnswerPanel'

const card = 'bg-white rounded-lg border border-[#e2e5ec] shadow-[0_2px_12px_rgba(15,23,42,0.06)]'

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function statusOf(test: StudentTestListItem): { label: string; text: string; bar: string; chip: string; dot: string } {
  const a = test.myAttempt
  if (a?.status === 'evaluated') return { label: 'Evaluated', text: 'text-emerald-600', bar: 'border-l-emerald-500', chip: 'bg-emerald-50 text-emerald-700', dot: '#059669' }
  if (test.window === 'ended' && (!a || a.status === 'not_started')) return { label: 'Missed', text: 'text-rose-600', bar: 'border-l-rose-500', chip: 'bg-rose-50 text-rose-700', dot: '#e11d48' }
  if (a?.status === 'submitted') return { label: 'Awaiting grading', text: 'text-sky-600', bar: 'border-l-sky-500', chip: 'bg-sky-50 text-sky-700', dot: '#0284c7' }
  if (test.window === 'live') return { label: a?.status === 'in_progress' ? 'In progress' : 'Live now', text: 'text-amber-600', bar: 'border-l-amber-500', chip: 'bg-amber-50 text-amber-700', dot: '#d97706' }
  return { label: 'Upcoming', text: 'text-zinc-500', bar: 'border-l-zinc-300', chip: 'bg-zinc-100 text-zinc-600', dot: '#a1a1aa' }
}

function TestCard({ test, onRefetch }: { test: StudentTestListItem; onRefetch: () => void }) {
  const router = useRouter()
  const st = statusOf(test)
  const a = test.myAttempt
  const [showDescriptive, setShowDescriptive] = useState(false)

  const canStartMcq = test.type === 'mcq' && test.window === 'live' && (!a || a.status === 'not_started' || a.status === 'in_progress')
  const canAnswerDescriptive = test.type === 'descriptive' && test.window === 'live' && (!a || a.status === 'not_started' || a.status === 'in_progress')

  return (
    <div className={`${card} border-l-4 ${st.bar} p-5`}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h3 className="text-primary text-base leading-snug mb-1.5">{test.title}</h3>
          <span className="inline-flex items-center gap-1.5 text-[13px] px-2.5 py-1 rounded-md bg-[#F1EEF5] text-brand">
            {test.type === 'mcq' ? 'Multiple Choice' : 'Descriptive'} · {test.subjectName || 'General'}
          </span>
        </div>
        <span className={`shrink-0 text-[13px] px-2.5 py-1 rounded-md ${st.chip}`}>{st.label}</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pb-1">
        <div>
          <p className="text-muted text-[13px] mb-0.5">Starts</p>
          <p className="text-primary text-[15px]">{formatDateTime(test.scheduledStart)}</p>
        </div>
        <div>
          <p className="text-muted text-[13px] mb-0.5">Ends</p>
          <p className="text-primary text-[15px]">{formatDateTime(test.scheduledEnd)}</p>
        </div>
        <div>
          <p className="text-muted text-[13px] mb-0.5">Max Marks</p>
          <p className="text-primary text-[15px] font-data">{test.maxMarks}</p>
        </div>
      </div>

      {a?.status === 'evaluated' && a.marksAwarded !== null && a.maxMarks && (
        <div className="mt-4 pt-4 border-t border-[#F4F1F8]">
          <div className="flex items-center justify-between mb-2">
            <span className="text-muted text-[14px]">Score</span>
            <span className="text-primary text-[15px] font-data">
              {a.marksAwarded}/{a.maxMarks} ({Math.round((a.marksAwarded / a.maxMarks) * 100)}%)
            </span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${Math.round((a.marksAwarded / a.maxMarks) * 100)}%` }} />
          </div>
        </div>
      )}

      {a?.status === 'submitted' && (
        <div className="mt-4 pt-4 border-t border-[#F4F1F8]">
          <p className="text-sky-600 text-[15px]">Submitted — waiting for your teacher to grade it.</p>
        </div>
      )}

      {st.label === 'Missed' && (
        <div className="mt-4 pt-4 border-t border-[#F4F1F8]">
          <p className="text-rose-600 text-[15px]">You did not attempt this test before the window closed.</p>
        </div>
      )}

      {test.window === 'upcoming' && (
        <div className="mt-4 pt-4 border-t border-[#F4F1F8]">
          <p className="text-muted text-[14px]">Opens at {formatDateTime(test.scheduledStart)}. Come back then to start.</p>
        </div>
      )}

      {canStartMcq && (
        <div className="mt-4 pt-4 border-t border-[#F4F1F8]">
          <button onClick={() => router.push(`/student/tests/${test.id}/exam`)}
            className="px-5 py-2.5 rounded-md bg-brand text-white text-[15px] hover:opacity-90 transition-opacity">
            {a?.status === 'in_progress' ? 'Resume Test' : 'Start MCQ'}
          </button>
          <p className="text-muted text-[13px] mt-2">The test opens in full screen with a countdown timer. Questions are shown in a random order.</p>
        </div>
      )}

      {canAnswerDescriptive && !showDescriptive && (
        <div className="mt-4 pt-4 border-t border-[#F4F1F8]">
          <button onClick={() => setShowDescriptive(true)}
            className="px-5 py-2.5 rounded-md bg-brand text-white text-[15px] hover:opacity-90 transition-opacity">
            {a?.status === 'in_progress' ? 'Continue Answer' : 'Answer This Test'}
          </button>
        </div>
      )}
      {canAnswerDescriptive && showDescriptive && (
        <DescriptiveAnswerPanel test={test} onSubmitted={() => { setShowDescriptive(false); onRefetch() }} />
      )}
    </div>
  )
}

export default function StudentTestsPage() {
  const { tests, loading, error, refetch } = useMyTests()
  const [filter, setFilter] = useState<'all' | 'live' | 'upcoming' | 'ended'>('all')

  const displayTests = filter === 'all' ? tests : tests.filter((t) => t.window === filter)

  const summary = [
    { label: 'Total Tests', val: tests.length, color: 'text-slate-700' },
    { label: 'Live Now', val: tests.filter((t) => t.window === 'live').length, color: 'text-amber-600' },
    { label: 'Upcoming', val: tests.filter((t) => t.window === 'upcoming').length, color: 'text-zinc-500' },
    { label: 'Evaluated', val: tests.filter((t) => t.myAttempt?.status === 'evaluated').length, color: 'text-emerald-600' },
  ]

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-6">
        <h1 className="text-3xl md:text-4xl text-primary mb-1">Tests</h1>
        <p className="text-muted text-base">Attempt live tests and track your results</p>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05 }}
        className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {summary.map(({ label, val, color }) => (
          <div key={label} className={`${card} p-5`}>
            <p className={`text-3xl font-data leading-none mb-1.5 ${color}`}>{val}</p>
            <p className="text-muted text-sm">{label}</p>
          </div>
        ))}
      </motion.div>

      <div className="flex flex-wrap items-center gap-2 mb-5">
        {(['all', 'live', 'upcoming', 'ended'] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-md text-[15px] capitalize transition-all duration-150 ${
              filter === f ? 'bg-brand text-white' : 'bg-white border border-border text-primary hover:bg-accent1/50'
            }`}>
            {f === 'live' ? 'Live now' : f}
          </button>
        ))}
      </div>

      {error && <p className="text-rose-600 text-[15px] mb-4">{error}</p>}
      {loading && <p className="text-muted text-[15px]">Loading tests…</p>}

      <div className="space-y-4">
        {displayTests.map((test, i) => (
          <motion.div key={test.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: i * 0.05 }}>
            <TestCard test={test} onRefetch={refetch} />
          </motion.div>
        ))}
        {!loading && displayTests.length === 0 && (
          <div className="text-center py-12 text-muted">
            <p className="text-[15px]">{tests.length === 0 ? 'No tests have been scheduled for your batch yet.' : 'No tests for this filter.'}</p>
          </div>
        )}
      </div>
    </div>
  )
}
