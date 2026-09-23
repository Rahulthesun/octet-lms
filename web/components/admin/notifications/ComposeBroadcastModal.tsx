'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useBatches, useEligibleStudents } from '@/hooks/useAttendanceData'
import { sendBroadcast } from '@/hooks/useNotifications'

const ACCENT = '#5B21B6'
const inputCls = 'w-full text-[15px] rounded-lg px-4 py-3 border border-zinc-300 bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400'
const labelCls = 'block text-sm font-medium text-zinc-700 mb-2'

export default function ComposeBroadcastModal({ onClose, onSent }: { onClose: () => void; onSent: () => void }) {
  const { batches } = useBatches('all')
  const [batchId, setBatchId] = useState('')
  const [allApproved, setAllApproved] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [alsoEmail, setAlsoEmail] = useState(true)

  const [extraStudentIds, setExtraStudentIds] = useState<string[]>([])
  const [studentSearch, setStudentSearch] = useState('')
  const [showExtraStudents, setShowExtraStudents] = useState(false)

  // Same placeholder-grade trick used by the online-classes scheduler — the
  // backend never actually filters by grade, it only needs batchId, and the
  // batches list here never carries a real grade field.
  const { students: eligibleStudents } = useEligibleStudents(batchId ? 'all' : null, batchId || null)
  const studentDropdownOptions = eligibleStudents
    .filter((s) => !extraStudentIds.includes(s.id))
    .filter((s) => s.name.toLowerCase().includes(studentSearch.trim().toLowerCase()))

  function addExtraStudent(id: string) {
    setExtraStudentIds((prev) => (prev.includes(id) ? prev : [...prev, id]))
    setStudentSearch('')
  }
  function removeExtraStudent(id: string) {
    setExtraStudentIds((prev) => prev.filter((x) => x !== id))
  }

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ notificationCount: number; emailCount: number } | null>(null)

  const canSubmit = title.trim() && body.trim() && (allApproved || batchId || extraStudentIds.length > 0)

  async function handleSend() {
    if (!canSubmit) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await sendBroadcast({
        title: title.trim(),
        body: body.trim(),
        batchIds: !allApproved && batchId ? [batchId] : [],
        studentIds: !allApproved ? extraStudentIds : [],
        allApproved,
        email: alsoEmail,
      })
      setResult(res)
      onSent()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to send notification')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 24, opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="bg-white w-full sm:max-w-2xl shadow-2xl rounded-t-2xl sm:rounded-2xl border border-zinc-200 overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-8 py-5 border-b border-zinc-200 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-lg font-semibold text-zinc-900">Send Message</h3>
            <p className="text-sm text-zinc-500 mt-0.5">Reaches the in-app inbox, and email if enabled below.</p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 text-2xl leading-none">&times;</button>
        </div>

        {result ? (
          <div className="px-8 py-10 text-center">
            <p className="text-lg font-medium text-zinc-900 mb-1">Sent</p>
            <p className="text-sm text-zinc-500">
              {result.notificationCount} recipient{result.notificationCount === 1 ? '' : 's'} notified
              {result.emailCount > 0 ? `, ${result.emailCount} email${result.emailCount === 1 ? '' : 's'} queued` : ''}.
            </p>
            <button onClick={onClose} className="mt-6 px-5 py-2.5 rounded-lg text-white text-[15px]" style={{ backgroundColor: ACCENT }}>
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="overflow-y-auto flex-1 px-8 py-6 space-y-5">
              {error && <div className="text-sm px-4 py-3 rounded-lg bg-rose-50 text-rose-700 border border-rose-100">{error}</div>}

              <div>
                <label className={labelCls}>Title</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Portal maintenance this weekend" className={inputCls} />
              </div>

              <div>
                <label className={labelCls}>Message</label>
                <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5}
                  placeholder="Type your message…" className={`${inputCls} resize-none`} />
              </div>

              <div className="pt-2 border-t border-zinc-100">
                <label className="flex items-center gap-2 mb-3">
                  <input type="checkbox" checked={allApproved} onChange={(e) => { setAllApproved(e.target.checked); if (e.target.checked) { setBatchId(''); setExtraStudentIds([]) } }}
                    className="w-4 h-4 accent-violet-600" />
                  <span className="text-sm font-medium text-zinc-700">Send to every approved student</span>
                </label>

                {!allApproved && (
                  <>
                    <label className={labelCls}>Batch</label>
                    <select value={batchId} onChange={(e) => { setBatchId(e.target.value); setExtraStudentIds([]); setStudentSearch(''); setShowExtraStudents(false) }}
                      className={inputCls}>
                      <option value="">Select a batch (optional)…</option>
                      {batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>

                    {batchId && (
                      <div className="mt-3">
                        <button type="button" onClick={() => setShowExtraStudents((v) => !v)}
                          className="text-sm font-medium hover:underline underline-offset-2" style={{ color: ACCENT }}>
                          {showExtraStudents ? 'Hide' : '+ Add'} individual students outside this batch
                        </button>

                        {showExtraStudents && (
                          <div className="mt-3 space-y-2">
                            <input type="text" value={studentSearch} onChange={(e) => setStudentSearch(e.target.value)}
                              placeholder="Search students by name…"
                              className="w-full text-sm rounded-lg px-3.5 py-2.5 border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400" />
                            <div className="max-h-40 overflow-y-auto border border-zinc-200 rounded-lg divide-y divide-zinc-100">
                              {studentDropdownOptions.length === 0 ? (
                                <div className="px-3.5 py-3 text-sm text-zinc-400">No matching students.</div>
                              ) : studentDropdownOptions.map((s) => (
                                <button key={s.id} type="button" onClick={() => addExtraStudent(s.id)}
                                  className="w-full text-left px-3.5 py-2.5 text-sm hover:bg-zinc-50 transition-colors flex items-center justify-between">
                                  <span className="text-zinc-800">{s.name}</span>
                                  <span className="text-zinc-400 text-xs">{s.currentBatchName || 'Unassigned'}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}

                        {extraStudentIds.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2.5">
                            {extraStudentIds.map((id) => {
                              const s = eligibleStudents.find((x) => x.id === id)
                              return (
                                <span key={id} className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-violet-50 text-violet-700 border border-violet-100">
                                  {s?.name || id}
                                  <button type="button" onClick={() => removeExtraStudent(id)} className="text-violet-400 hover:text-violet-700">&times;</button>
                                </span>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              <label className="flex items-center gap-2 pt-2 border-t border-zinc-100">
                <input type="checkbox" checked={alsoEmail} onChange={(e) => setAlsoEmail(e.target.checked)} className="w-4 h-4 accent-violet-600" />
                <span className="text-sm font-medium text-zinc-700">Also send as email</span>
              </label>
            </div>

            <div className="px-8 py-5 border-t border-zinc-200 flex justify-end gap-3 shrink-0">
              <button onClick={onClose} className="px-5 py-2.5 rounded-lg border border-zinc-300 text-zinc-600 text-[15px] hover:bg-zinc-50 transition-colors">
                Cancel
              </button>
              <button onClick={handleSend} disabled={!canSubmit || submitting}
                className="px-5 py-2.5 rounded-lg text-white text-[15px] transition-colors disabled:opacity-40"
                style={{ backgroundColor: ACCENT }}>
                {submitting ? 'Sending…' : 'Send'}
              </button>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  )
}
