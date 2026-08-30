'use client'

import { useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAdminTests, useAdminAttempts, type TestSummary, type CreateTestInput } from '@/hooks/useTests'
import { useBatches } from '@/hooks/useAttendanceData'
import ScheduleTestModal from '@/components/admin/tests/ScheduleTestModal'
import AttemptDetailModal from '@/components/admin/tests/AttemptDetailModal'
import { CalendarIcon, ClockIcon, UploadIcon, CheckCircleIcon, TrashIcon } from '@/components/admin/tests/icons'

const ACCENT = '#5B21B6'

function windowOf(test: TestSummary): 'upcoming' | 'live' | 'ended' {
  const now = Date.now()
  const start = new Date(test.scheduledStart).getTime()
  const end = new Date(test.scheduledEnd).getTime()
  if (test.status === 'cancelled') return 'ended'
  if (now < start) return 'upcoming'
  if (now > end) return 'ended'
  return 'live'
}

function formatRange(startIso: string, endIso: string) {
  const start = new Date(startIso)
  const end = new Date(endIso)
  const dateStr = start.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  const startStr = start.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  const endStr = end.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  return `${dateStr} · ${startStr} – ${endStr}`
}

const WINDOW_BADGE: Record<string, { label: string; cls: string }> = {
  live: { label: 'Live now', cls: 'bg-emerald-50 text-emerald-700' },
  upcoming: { label: 'Upcoming', cls: 'bg-amber-50 text-amber-700' },
  ended: { label: 'Ended', cls: 'bg-zinc-100 text-zinc-600' },
}

function TestRow({ test, isOpen, onToggle, onDelete, onUploadQ, onUploadKey }: {
  test: TestSummary
  isOpen: boolean
  onToggle: () => void
  onDelete: (id: string) => void
  onUploadQ: (id: string, file: File) => void
  onUploadKey: (id: string, file: File) => void
}) {
  const w = windowOf(test)
  const badge = WINDOW_BADGE[w]
  const { attempts, loading: attemptsLoading, refetch } = useAdminAttempts(isOpen ? test.id : null)
  const [selectedAttemptId, setSelectedAttemptId] = useState<string | null>(null)
  const qRef = useRef<HTMLInputElement>(null)
  const keyRef = useRef<HTMLInputElement>(null)

  const gradedCount = attempts.filter((a) => a.status === 'evaluated').length
  const classAvg = useMemo(() => {
    const scored = attempts.filter((a) => a.marksAwarded !== null && a.maxMarks)
    if (scored.length === 0) return null
    const avgPct = scored.reduce((s, a) => s + (a.marksAwarded! / a.maxMarks!) * 100, 0) / scored.length
    return Math.round(avgPct)
  }, [attempts])

  return (
    <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-zinc-50 transition-colors">
        <span className="text-xs font-medium border border-zinc-200 px-2.5 py-1 rounded-full text-zinc-600 shrink-0">
          {test.batchName || 'No batch'}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] text-zinc-900 truncate">{test.title}</p>
          <p className="text-sm text-zinc-500 flex items-center gap-1.5 mt-0.5">
            <CalendarIcon className="w-3.5 h-3.5 shrink-0" />
            {formatRange(test.scheduledStart, test.scheduledEnd)}
            <span className="mx-1">·</span>
            <span className="uppercase font-inter text-xs">{test.type}</span>
            <span className="mx-1">·</span>
            Max <span className="font-inter">{test.maxMarks}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-xs px-2.5 py-1 rounded-full ${badge.cls}`}>{badge.label}</span>
          <svg className={`w-4 h-4 text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} viewBox="0 0 12 12" fill="none">
            <path d="M2,4 L6,8 L10,4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
            transition={{ duration: 0.2 }} className="overflow-hidden border-t border-zinc-200">
            <div className="p-5 bg-zinc-50 space-y-4">
              {test.instructions && <p className="text-sm text-zinc-600">{test.instructions}</p>}

              {test.type === 'descriptive' && (
                <div className="flex gap-2 flex-wrap">
                  <button onClick={() => qRef.current?.click()}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                      test.questionFileName ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-zinc-300 text-zinc-600 hover:bg-white'
                    }`}>
                    <UploadIcon className="w-4 h-4" />
                    {test.questionFileName ? `QP: ${test.questionFileName}` : 'Upload Question Paper'}
                  </button>
                  <input ref={qRef} type="file" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) onUploadQ(test.id, f); e.target.value = '' }} />

                  <button onClick={() => keyRef.current?.click()}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                      test.answerKeyFileName ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-zinc-300 text-zinc-600 hover:bg-white'
                    }`}>
                    <CheckCircleIcon className="w-4 h-4" />
                    {test.answerKeyFileName ? `Key: ${test.answerKeyFileName}` : 'Upload Answer Key'}
                  </button>
                  <input ref={keyRef} type="file" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) onUploadKey(test.id, f); e.target.value = '' }} />

                  <button onClick={() => onDelete(test.id)}
                    className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-zinc-300 text-zinc-500 hover:border-rose-300 hover:text-rose-600 transition-colors">
                    <TrashIcon className="w-4 h-4" /> Delete test
                  </button>
                </div>
              )}
              {test.type === 'mcq' && (
                <div className="flex justify-end">
                  <button onClick={() => onDelete(test.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border border-zinc-300 text-zinc-500 hover:border-rose-300 hover:text-rose-600 transition-colors">
                    <TrashIcon className="w-4 h-4" /> Delete test
                  </button>
                </div>
              )}

              <div className="flex items-center gap-4 text-sm text-zinc-500">
                <span>{attempts.length} attempt{attempts.length === 1 ? '' : 's'}</span>
                <span>{gradedCount} evaluated</span>
                {classAvg !== null && <span>Class average: <span className="font-inter text-zinc-700">{classAvg}%</span></span>}
              </div>

              <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
                <div className="grid grid-cols-[1fr_100px_100px_90px] gap-2 px-4 py-2.5 bg-zinc-100 text-xs text-zinc-500 uppercase tracking-wide">
                  <span>Student</span><span>Status</span><span>Marks</span><span className="text-right">%</span>
                </div>
                {attemptsLoading && <div className="px-4 py-4 text-sm text-zinc-400">Loading attempts…</div>}
                {!attemptsLoading && attempts.length === 0 && (
                  <div className="px-4 py-4 text-sm text-zinc-400">No student has attempted this test yet.</div>
                )}
                {attempts.map((a) => {
                  const pct = a.marksAwarded !== null && a.maxMarks ? Math.round((a.marksAwarded / a.maxMarks) * 100) : null
                  const clickable = a.status === 'submitted' || a.status === 'evaluated'
                  return (
                    <button key={a.id} disabled={!clickable} onClick={() => setSelectedAttemptId(a.id)}
                      className={`w-full grid grid-cols-[1fr_100px_100px_90px] gap-2 px-4 py-2.5 border-b border-zinc-50 last:border-0 text-left ${
                        clickable ? 'hover:bg-zinc-50 cursor-pointer' : 'cursor-default opacity-70'
                      }`}>
                      <span className="text-[15px] text-zinc-800 truncate">{a.studentName}</span>
                      <span className="text-sm text-zinc-500 capitalize">{a.status.replace('_', ' ')}</span>
                      <span className="text-sm font-inter text-zinc-700">{a.marksAwarded !== null ? `${a.marksAwarded}/${a.maxMarks}` : '—'}</span>
                      <span className="text-sm font-inter text-zinc-500 text-right">{pct !== null ? `${pct}%` : '—'}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {selectedAttemptId && (
        <AttemptDetailModal test={test} attemptId={selectedAttemptId}
          onClose={() => setSelectedAttemptId(null)}
          onGraded={refetch} />
      )}
    </div>
  )
}

export default function AdminTestsPage() {
  const { batches } = useBatches('all')
  const [batchFilter, setBatchFilter] = useState('')
  const { tests, loading, error, createTest, deleteTest, uploadQuestionFile, uploadAnswerKeyFile } =
    useAdminTests(batchFilter ? { batchId: batchFilter } : undefined)

  const [showSchedule, setShowSchedule] = useState(false)
  const [openTestId, setOpenTestId] = useState<string | null>(null)

  const withWindow = useMemo(() => tests.map((t) => ({ test: t, window: windowOf(t) })), [tests])
  const live = withWindow.filter((x) => x.window === 'live')
  const upcoming = withWindow.filter((x) => x.window === 'upcoming')
  const ended = withWindow.filter((x) => x.window === 'ended')

  async function handleCreate(input: CreateTestInput) {
    await createTest(input)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this test? This removes all student attempts and cannot be undone.')) return
    await deleteTest(id)
  }

  const stats = [
    { label: 'Total Tests', value: tests.length },
    { label: 'Live Now', value: live.length },
    { label: 'Upcoming', value: upcoming.length },
    { label: 'Completed', value: ended.length },
  ]

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Tests</h1>
          <p className="text-[15px] text-zinc-500 mt-1">Schedule MCQ and descriptive tests, and grade student answers.</p>
        </div>
        <button onClick={() => setShowSchedule(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-white text-[15px] transition-colors w-fit"
          style={{ backgroundColor: ACCENT }}>
          <ClockIcon className="w-4 h-4" />
          Schedule New Test
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {stats.map((s) => (
          <div key={s.label} className="bg-white border border-zinc-200 rounded-xl px-5 py-4">
            <p className="text-2xl font-inter font-semibold text-zinc-900">{s.value}</p>
            <p className="text-sm text-zinc-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        <button onClick={() => setBatchFilter('')}
          className={`px-3.5 py-1.5 text-sm rounded-full border transition-colors ${
            !batchFilter ? 'text-white border-transparent' : 'border-zinc-300 text-zinc-600 hover:border-zinc-400'
          }`} style={!batchFilter ? { backgroundColor: ACCENT } : undefined}>
          All batches
        </button>
        {batches.map((b) => (
          <button key={b.id} onClick={() => setBatchFilter(b.id)}
            className={`px-3.5 py-1.5 text-sm rounded-full border transition-colors ${
              batchFilter === b.id ? 'text-white border-transparent' : 'border-zinc-300 text-zinc-600 hover:border-zinc-400'
            }`} style={batchFilter === b.id ? { backgroundColor: ACCENT } : undefined}>
            {b.name}
          </button>
        ))}
      </div>

      {error && <div className="text-sm px-4 py-3 rounded-lg bg-rose-50 text-rose-700 border border-rose-100 mb-4">{error}</div>}
      {loading && <p className="text-sm text-zinc-400">Loading tests…</p>}

      {!loading && tests.length === 0 && (
        <div className="py-16 text-center text-zinc-400 text-[15px]">No tests scheduled yet.</div>
      )}

      <div className="space-y-6">
        {live.length > 0 && (
          <section>
            <h2 className="text-sm font-medium text-zinc-500 mb-2.5">Live now</h2>
            <div className="space-y-2">
              {live.map(({ test }) => (
                <TestRow key={test.id} test={test} isOpen={openTestId === test.id}
                  onToggle={() => setOpenTestId(openTestId === test.id ? null : test.id)}
                  onDelete={handleDelete} onUploadQ={uploadQuestionFile} onUploadKey={uploadAnswerKeyFile} />
              ))}
            </div>
          </section>
        )}
        {upcoming.length > 0 && (
          <section>
            <h2 className="text-sm font-medium text-zinc-500 mb-2.5">Upcoming</h2>
            <div className="space-y-2">
              {upcoming.map(({ test }) => (
                <TestRow key={test.id} test={test} isOpen={openTestId === test.id}
                  onToggle={() => setOpenTestId(openTestId === test.id ? null : test.id)}
                  onDelete={handleDelete} onUploadQ={uploadQuestionFile} onUploadKey={uploadAnswerKeyFile} />
              ))}
            </div>
          </section>
        )}
        {ended.length > 0 && (
          <section>
            <h2 className="text-sm font-medium text-zinc-500 mb-2.5">Completed / ended</h2>
            <div className="space-y-2">
              {ended.map(({ test }) => (
                <TestRow key={test.id} test={test} isOpen={openTestId === test.id}
                  onToggle={() => setOpenTestId(openTestId === test.id ? null : test.id)}
                  onDelete={handleDelete} onUploadQ={uploadQuestionFile} onUploadKey={uploadAnswerKeyFile} />
              ))}
            </div>
          </section>
        )}
      </div>

      <AnimatePresence>
        {showSchedule && <ScheduleTestModal onClose={() => setShowSchedule(false)} onCreate={handleCreate} />}
      </AnimatePresence>
    </div>
  )
}
