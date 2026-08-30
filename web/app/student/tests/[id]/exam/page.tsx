'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  authedFetch, fetchMyAttempt, saveMyAnswer, startMyAttempt, submitMyAttempt,
  type MyAttemptDetail, type OptionKey, type StudentTestListItem,
} from '@/hooks/useTests'

function formatClock(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}

export default function ExamRunnerPage() {
  const params = useParams<{ id: string }>()
  const testId = params.id
  const router = useRouter()

  const [listItem, setListItem] = useState<StudentTestListItem | null>(null)
  const [detail, setDetail] = useState<MyAttemptDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [phase, setPhase] = useState<'intro' | 'exam' | 'result'>('intro')
  const [currentIdx, setCurrentIdx] = useState(0)
  const [serverOffsetMs, setServerOffsetMs] = useState(0)
  const [remainingMs, setRemainingMs] = useState(0)
  const [fullscreenWarning, setFullscreenWarning] = useState(false)
  const [exitCount, setExitCount] = useState(0)
  const [submitting, setSubmitting] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const autoSubmittedRef = useRef(false)
  const submittingRef = useRef(false)

  // The test may not have an attempt row yet (a student who hasn't clicked
  // "Begin" never has one — /attempts/me 404s until it exists), so the
  // intro screen is built from /api/tests/me instead, which always has the
  // test's own metadata regardless of attempt state. The full per-question
  // attempt detail is only fetched once an attempt actually exists — either
  // because grading already finished, or because the student just started
  // (or resumed) one via the button below.
  const loadInitial = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const list: StudentTestListItem[] = await authedFetch('/api/tests/me')
      const found = list.find((t) => t.id === testId)
      if (!found) {
        setError('This test is not available for your batch.')
        return
      }
      setListItem(found)

      if (found.myAttempt?.status === 'evaluated') {
        const d = await fetchMyAttempt(testId)
        setDetail(d)
        setPhase('result')
      } else {
        setPhase('intro')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load this test')
    } finally {
      setLoading(false)
    }
  }, [testId])

  useEffect(() => { loadInitial() }, [loadInitial])

  // ─── Countdown to the shared scheduled_end, corrected for client clock skew ──
  useEffect(() => {
    if (phase !== 'exam' || !detail) return
    const endMs = new Date(detail.test.scheduledEnd).getTime()
    const tick = () => {
      const now = Date.now() + serverOffsetMs
      const left = endMs - now
      setRemainingMs(left)
      if (left <= 0 && !autoSubmittedRef.current && !submittingRef.current) {
        autoSubmittedRef.current = true
        handleSubmit(true)
      }
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, detail, serverOffsetMs])

  // ─── Best-effort full-screen persistence ────────────────────────────────────
  // Browsers reserve Esc as an un-overridable full-screen exit — no page can
  // block that. This re-requests full screen the moment it's exited and
  // flags the attempt, which is the closest a web app can get to "always
  // full screen."
  useEffect(() => {
    if (phase !== 'exam') return
    function onFsChange() {
      if (!document.fullscreenElement) {
        setFullscreenWarning(true)
        setExitCount((c) => c + 1)
        containerRef.current?.requestFullscreen?.().catch(() => {})
      } else {
        setFullscreenWarning(false)
      }
    }
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [phase])

  useEffect(() => {
    if (phase !== 'exam') return
    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [phase])

  async function handleBegin() {
    setError(null)
    try {
      if (!listItem?.myAttempt || listItem.myAttempt.status === 'not_started') {
        await startMyAttempt(testId)
      }
      await containerRef.current?.requestFullscreen?.().catch(() => {})
      const d = await fetchMyAttempt(testId)
      setDetail(d)
      setServerOffsetMs(new Date(d.serverNow).getTime() - Date.now())
      setPhase('exam')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to start the test')
    }
  }

  async function handleSelect(questionId: string, option: OptionKey) {
    if (!detail?.questions) return
    setDetail((prev) => prev && prev.questions
      ? { ...prev, questions: prev.questions.map((q) => (q.id === questionId ? { ...q, selectedOption: option } : q)) }
      : prev)
    try {
      await saveMyAnswer(testId, questionId, option)
    } catch {
      // Autosave failure is silent here — the option stays selected locally
      // and will be resent the next time the student changes an answer;
      // final grading only ever reads what's on the server at submit time.
    }
  }

  async function handleSubmit(auto = false) {
    if (submittingRef.current) return
    submittingRef.current = true
    setSubmitting(true)
    try {
      await submitMyAttempt(testId, { autoSubmitted: auto })
      const d = await fetchMyAttempt(testId)
      setDetail(d)
      setPhase('result')
      if (document.fullscreenElement) await document.exitFullscreen().catch(() => {})
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to submit the test')
      submittingRef.current = false
    } finally {
      setSubmitting(false)
    }
  }

  const answeredCount = useMemo(
    () => detail?.questions?.filter((q) => q.selectedOption).length ?? 0,
    [detail]
  )

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted text-[15px]">Loading test…</div>
  }
  if (error && !listItem) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-rose-600 text-[15px]">{error}</p>
        <button onClick={() => router.push('/student/tests')} className="px-4 py-2 rounded-md bg-brand text-white text-[15px]">
          Back to Tests
        </button>
      </div>
    )
  }
  if (!listItem) return null

  // ─── Intro screen (test metadata comes from the list — no attempt needed yet) ──
  if (phase === 'intro') {
    const canBegin = listItem.window === 'live'
    return (
      <div ref={containerRef} className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="max-w-lg w-full">
          <h1 className="text-2xl text-primary mb-2">{listItem.title}</h1>
          <p className="text-muted text-[15px] mb-6">
            {listItem.maxMarks} marks · Ends at {new Date(listItem.scheduledEnd).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </p>
          {listItem.instructions && (
            <div className="rounded-lg border border-[#e2e5ec] p-4 mb-6 bg-[#FAF9FB]">
              <p className="text-primary text-[15px] whitespace-pre-wrap">{listItem.instructions}</p>
            </div>
          )}
          <ul className="text-muted text-[14px] space-y-1.5 mb-8 list-disc pl-5">
            <li>Questions are shown in a random order unique to you.</li>
            <li>The test opens in full screen and stays there until you submit.</li>
            <li>A countdown timer runs at the top right — the test auto-submits when it reaches zero.</li>
            <li>Your answers are saved automatically as you pick them.</li>
          </ul>
          {error && <p className="text-rose-600 text-[14px] mb-4">{error}</p>}
          {canBegin ? (
            <button onClick={handleBegin} className="px-6 py-3 rounded-md bg-brand text-white text-[15px] hover:opacity-90 transition-opacity">
              {listItem.myAttempt?.status === 'in_progress' ? 'Resume Exam (opens full screen)' : 'Begin Exam (opens full screen)'}
            </button>
          ) : (
            <p className="text-rose-600 text-[15px]">
              {listItem.window === 'upcoming' ? 'This test has not opened yet.' : "This test's window has closed."}
            </p>
          )}
        </div>
      </div>
    )
  }

  if (!detail) return null

  // ─── Result screen ──────────────────────────────────────────────────────────
  if (phase === 'result') {
    const pct = detail.attempt.marksAwarded !== null && detail.attempt.maxMarks
      ? Math.round((detail.attempt.marksAwarded / detail.attempt.maxMarks) * 100) : null
    return (
      <div className="min-h-screen bg-white px-6 py-10">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-2xl text-primary mb-1">{detail.test.title} — Result</h1>
          <p className="text-muted text-[15px] mb-6">Submitted {detail.attempt.submittedAt ? new Date(detail.attempt.submittedAt).toLocaleString('en-IN') : ''}</p>

          {detail.attempt.status === 'evaluated' ? (
            <div className="rounded-lg border border-[#e2e5ec] p-6 mb-8 text-center">
              <p className="text-4xl font-data text-primary mb-1">{detail.attempt.marksAwarded} / {detail.attempt.maxMarks}</p>
              {pct !== null && <p className="text-emerald-600 text-[15px]">{pct}%</p>}
            </div>
          ) : (
            <p className="text-sky-600 text-[15px] mb-8">Submitted — your answer is awaiting evaluation.</p>
          )}

          {detail.questions && (
            <div className="space-y-3">
              {detail.questions.map((q, i) => (
                <div key={q.id} className={`rounded-lg border p-4 ${q.isCorrect ? 'border-emerald-200 bg-emerald-50/40' : 'border-rose-200 bg-rose-50/40'}`}>
                  <p className="text-primary text-[15px] mb-2"><span className="text-muted mr-1">Q{i + 1}.</span>{q.questionText}</p>
                  <div className="grid grid-cols-2 gap-2 text-[14px]">
                    {(['a', 'b', 'c', 'd'] as const).map((key) => {
                      const text = { a: q.optionA, b: q.optionB, c: q.optionC, d: q.optionD }[key]
                      const isCorrect = q.correctOption === key
                      const isSelected = q.selectedOption === key
                      return (
                        <div key={key} className={`px-3 py-1.5 rounded-md border ${
                          isCorrect ? 'border-emerald-300 bg-emerald-100 text-emerald-800'
                          : isSelected ? 'border-rose-300 bg-rose-100 text-rose-800'
                          : 'border-[#e2e5ec] text-muted'
                        }`}>
                          <span className="font-semibold mr-1">{key.toUpperCase()}.</span>{text}
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          <button onClick={() => router.push('/student/tests')} className="mt-8 px-6 py-3 rounded-md bg-brand text-white text-[15px] hover:opacity-90 transition-opacity">
            Back to Tests
          </button>
        </div>
      </div>
    )
  }

  // ─── Exam screen (full screen) ──────────────────────────────────────────────
  const questions = detail.questions || []
  const current = questions[currentIdx]
  const urgent = remainingMs < 5 * 60 * 1000

  return (
    <div ref={containerRef} className="min-h-screen bg-white flex flex-col">
      {fullscreenWarning && (
        <div className="bg-rose-600 text-white text-center text-[14px] py-2">
          Full screen was exited — please stay in full screen for the rest of the test. ({exitCount} exit{exitCount === 1 ? '' : 's'} recorded)
        </div>
      )}

      <div className="flex items-center justify-between px-6 py-4 border-b border-[#e2e5ec]">
        <div>
          <p className="text-primary text-[15px]">{detail.test.title}</p>
          <p className="text-muted text-[13px]">{answeredCount} / {questions.length} answered</p>
        </div>
        <div className={`font-data text-2xl px-4 py-1.5 rounded-md ${urgent ? 'bg-rose-50 text-rose-600' : 'bg-[#F1EEF5] text-brand'}`}>
          {formatClock(remainingMs)}
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        <div className="flex-1 overflow-y-auto px-6 py-8">
          {current && (
            <div className="max-w-2xl mx-auto">
              <p className="text-muted text-[13px] mb-2">Question {currentIdx + 1} of {questions.length} · {current.marks} mark{current.marks === 1 ? '' : 's'}</p>
              <p className="text-primary text-[18px] mb-6">{current.questionText}</p>
              <div className="space-y-3">
                {(['a', 'b', 'c', 'd'] as const).map((key) => {
                  const text = { a: current.optionA, b: current.optionB, c: current.optionC, d: current.optionD }[key]
                  const selected = current.selectedOption === key
                  return (
                    <button key={key} onClick={() => handleSelect(current.id, key)}
                      className={`w-full flex items-center gap-3 text-left px-4 py-3.5 rounded-lg border transition-colors ${
                        selected ? 'border-brand bg-[#F1EEF5]' : 'border-[#e2e5ec] hover:bg-[#FAF9FB]'
                      }`}>
                      <span className={`w-6 h-6 shrink-0 rounded-full border flex items-center justify-center text-[13px] ${
                        selected ? 'bg-brand text-white border-brand' : 'border-[#c8b8d8] text-muted'
                      }`}>{key.toUpperCase()}</span>
                      <span className="text-primary text-[15px]">{text}</span>
                    </button>
                  )
                })}
              </div>

              <div className="flex items-center justify-between mt-8">
                <button onClick={() => setCurrentIdx((i) => Math.max(0, i - 1))} disabled={currentIdx === 0}
                  className="px-4 py-2 rounded-md border border-[#e2e5ec] text-primary text-[15px] disabled:opacity-30">
                  Previous
                </button>
                {currentIdx < questions.length - 1 ? (
                  <button onClick={() => setCurrentIdx((i) => Math.min(questions.length - 1, i + 1))}
                    className="px-4 py-2 rounded-md bg-brand text-white text-[15px]">
                    Next
                  </button>
                ) : (
                  <button onClick={() => handleSubmit(false)} disabled={submitting}
                    className="px-5 py-2.5 rounded-md bg-emerald-600 text-white text-[15px] hover:opacity-90 disabled:opacity-40">
                    {submitting ? 'Submitting…' : 'End Exam & Submit'}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="lg:w-72 border-t lg:border-t-0 lg:border-l border-[#e2e5ec] px-5 py-6 shrink-0">
          <p className="text-muted text-[13px] mb-3">Questions</p>
          <div className="grid grid-cols-6 lg:grid-cols-5 gap-2 mb-6">
            {questions.map((q, i) => (
              <button key={q.id} onClick={() => setCurrentIdx(i)}
                className={`aspect-square rounded-md text-[13px] font-data flex items-center justify-center border transition-colors ${
                  i === currentIdx ? 'border-brand ring-2 ring-brand/30' : 'border-transparent'
                } ${q.selectedOption ? 'bg-brand text-white' : 'bg-[#F4F1F8] text-muted'}`}>
                {i + 1}
              </button>
            ))}
          </div>
          <button onClick={() => handleSubmit(false)} disabled={submitting}
            className="w-full px-4 py-2.5 rounded-md bg-emerald-600 text-white text-[15px] hover:opacity-90 disabled:opacity-40">
            {submitting ? 'Submitting…' : 'End Exam & Submit'}
          </button>
        </div>
      </div>
    </div>
  )
}
