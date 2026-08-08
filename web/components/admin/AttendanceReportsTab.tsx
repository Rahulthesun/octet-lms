'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  useBatches,
  useBatchStudents,
  useStudentReport,
  useBatchReport,
  downloadAttendanceFile,
  type Batch,
} from '@/hooks/useAttendanceData'
import SessionAttendanceModal from '@/components/admin/SessionAttendanceModal'

const ACCENT = '#5B21B6'

function pctColor(pct: number | null) {
  if (pct === null) return '#9CA3AF'
  if (pct < 75) return '#DC2626'
  if (pct < 90) return '#D97706'
  return '#16A34A'
}

// ─── Student report modal ─────────────────────────────────────────────────

function StudentReportModal({ studentId, onClose }: { studentId: string; onClose: () => void }) {
  const { report, loading, error } = useStudentReport(studentId)
  const [downloading, setDownloading] = useState<'pdf' | 'csv' | null>(null)

  async function download(kind: 'pdf' | 'csv') {
    setDownloading(kind)
    try {
      const name = report ? `attendance_${report.student.roll || report.student.id}.${kind}` : `attendance.${kind}`
      await downloadAttendanceFile(`/api/attendance/students/${studentId}/report/${kind}`, name)
    } catch (e) {
      console.error(e)
    } finally {
      setDownloading(null)
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
        className="bg-white w-full sm:max-w-lg shadow-2xl rounded-t-xl sm:rounded-xl border border-zinc-200 overflow-hidden max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-zinc-200 flex items-start justify-between shrink-0">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900">Attendance Report</h3>
            {report && <p className="text-xs text-zinc-500 mt-0.5">{report.student.name} · {report.student.roll || '—'}</p>}
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 text-xl leading-none">&times;</button>
        </div>

        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="py-16 text-center text-sm text-zinc-400">Loading report…</div>
          ) : error ? (
            <div className="py-16 text-center text-sm text-red-600">{error}</div>
          ) : report ? (
            <>
              <div className="grid grid-cols-3 gap-3 px-6 py-4">
                <div className="bg-zinc-50 rounded-lg px-3 py-2.5 text-center">
                  <p className="text-lg font-semibold text-zinc-900 tabular-nums">{report.totalSessions}</p>
                  <p className="text-[10px] uppercase tracking-wide text-zinc-400 mt-0.5">Sessions</p>
                </div>
                <div className="bg-zinc-50 rounded-lg px-3 py-2.5 text-center">
                  <p className="text-lg font-semibold text-zinc-900 tabular-nums">{report.presentCount}</p>
                  <p className="text-[10px] uppercase tracking-wide text-zinc-400 mt-0.5">Present</p>
                </div>
                <div className="bg-zinc-50 rounded-lg px-3 py-2.5 text-center">
                  <p className="text-lg font-semibold tabular-nums" style={{ color: pctColor(report.attendancePct) }}>
                    {report.attendancePct !== null ? `${report.attendancePct}%` : '—'}
                  </p>
                  <p className="text-[10px] uppercase tracking-wide text-zinc-400 mt-0.5">Attendance</p>
                </div>
              </div>

              <div className="px-6 pb-4">
                <div className="border border-zinc-200 rounded-lg overflow-hidden">
                  <div className="grid grid-cols-[1fr_1fr_80px] px-3 py-2 bg-zinc-50 border-b border-zinc-200 text-[10px] uppercase tracking-wide text-zinc-400">
                    <span>Date</span>
                    <span>Batch</span>
                    <span className="text-right">Status</span>
                  </div>
                  <div className="divide-y divide-zinc-100 max-h-64 overflow-y-auto">
                    {report.records.length === 0 ? (
                      <div className="py-8 text-center text-sm text-zinc-400">No sessions recorded yet.</div>
                    ) : report.records.map((r, i) => (
                      <div key={i} className="grid grid-cols-[1fr_1fr_80px] px-3 py-2 text-sm items-center">
                        <span className="text-zinc-700">{r.date}{r.time ? ` · ${r.time}` : ''}</span>
                        <span className="text-zinc-500 truncate">{r.batchName || '—'}</span>
                        <span className={`text-right text-xs font-medium ${r.status === 'present' ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {r.status === 'present' ? 'Present' : 'Absent'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>

        <div className="flex gap-2 px-6 py-4 border-t border-zinc-200 bg-zinc-50 shrink-0">
          <button
            onClick={() => download('csv')}
            disabled={!report || downloading !== null}
            className="flex-1 py-2.5 text-sm font-medium text-zinc-700 border border-zinc-300 rounded-md hover:bg-zinc-100 transition-colors disabled:opacity-40"
          >
            {downloading === 'csv' ? 'Preparing…' : 'Download CSV'}
          </button>
          <button
            onClick={() => download('pdf')}
            disabled={!report || downloading !== null}
            className="flex-1 py-2.5 text-sm font-medium text-white rounded-md disabled:opacity-40 transition-colors"
            style={{ backgroundColor: ACCENT }}
          >
            {downloading === 'pdf' ? 'Preparing…' : 'Download PDF'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Batch statistics modal ────────────────────────────────────────────────

function BatchReportModal({ batchId, onClose }: { batchId: string; onClose: () => void }) {
  const { report, loading, error } = useBatchReport(batchId)
  const [downloading, setDownloading] = useState<'pdf' | 'csv' | null>(null)
  const [openSessionId, setOpenSessionId] = useState<string | null>(null)

  async function download(kind: 'pdf' | 'csv') {
    setDownloading(kind)
    try {
      const name = report ? `batch_${report.batch.name.replace(/\s+/g, '_')}.${kind}` : `batch_report.${kind}`
      await downloadAttendanceFile(`/api/attendance/batches/${batchId}/report/${kind}`, name)
    } catch (e) {
      console.error(e)
    } finally {
      setDownloading(null)
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
        className="bg-white w-full sm:max-w-2xl shadow-2xl rounded-t-xl sm:rounded-xl border border-zinc-200 overflow-hidden max-h-[88vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-zinc-200 flex items-start justify-between shrink-0">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900">Batch Statistics</h3>
            {report && <p className="text-xs text-zinc-500 mt-0.5">{report.batch.name}{report.batch.mode ? ` · ${report.batch.mode}` : ''}</p>}
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 text-xl leading-none">&times;</button>
        </div>

        <div className="overflow-y-auto flex-1">
          {loading ? (
            <div className="py-16 text-center text-sm text-zinc-400">Loading statistics…</div>
          ) : error ? (
            <div className="py-16 text-center text-sm text-red-600">{error}</div>
          ) : report ? (
            <>
              <div className="grid grid-cols-2 gap-3 px-6 py-4">
                <div className="bg-zinc-50 rounded-lg px-3 py-2.5 text-center">
                  <p className="text-lg font-semibold text-zinc-900 tabular-nums">{report.totalStudents}</p>
                  <p className="text-[10px] uppercase tracking-wide text-zinc-400 mt-0.5">Students</p>
                </div>
                <div className="bg-zinc-50 rounded-lg px-3 py-2.5 text-center">
                  <p className="text-lg font-semibold text-zinc-900 tabular-nums">{report.totalSessions}</p>
                  <p className="text-[10px] uppercase tracking-wide text-zinc-400 mt-0.5">Sessions held</p>
                </div>
              </div>

              <div className="px-6 pb-3">
                <p className="text-[10px] font-medium tracking-widest uppercase text-zinc-400 mb-2">Per-student</p>
                <div className="border border-zinc-200 rounded-lg overflow-hidden">
                  <div className="grid grid-cols-[1fr_60px_60px_60px] px-3 py-2 bg-zinc-50 border-b border-zinc-200 text-[10px] uppercase tracking-wide text-zinc-400">
                    <span>Student</span>
                    <span className="text-right">Present</span>
                    <span className="text-right">Absent</span>
                    <span className="text-right">%</span>
                  </div>
                  <div className="divide-y divide-zinc-100 max-h-56 overflow-y-auto">
                    {report.studentStats.length === 0 ? (
                      <div className="py-8 text-center text-sm text-zinc-400">No students enrolled.</div>
                    ) : report.studentStats.map(s => (
                      <div key={s.studentId} className="grid grid-cols-[1fr_60px_60px_60px] px-3 py-2 text-sm items-center">
                        <span className="text-zinc-700 truncate">{s.name}</span>
                        <span className="text-right text-zinc-600 tabular-nums">{s.presentCount}</span>
                        <span className="text-right text-zinc-600 tabular-nums">{s.absentCount}</span>
                        <span className="text-right font-medium tabular-nums" style={{ color: pctColor(s.attendancePct) }}>
                          {s.attendancePct !== null ? `${s.attendancePct}%` : '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="px-6 pb-4">
                <p className="text-[10px] font-medium tracking-widest uppercase text-zinc-400 mb-2">Day by day</p>
                <div className="border border-zinc-200 rounded-lg overflow-hidden">
                  <div className="grid grid-cols-[1fr_70px_60px_60px_60px_70px] px-3 py-2 bg-zinc-50 border-b border-zinc-200 text-[10px] uppercase tracking-wide text-zinc-400">
                    <span>Date</span>
                    <span>Source</span>
                    <span className="text-right">Present</span>
                    <span className="text-right">Partial</span>
                    <span className="text-right">Absent</span>
                    <span className="text-right">View</span>
                  </div>
                  <div className="divide-y divide-zinc-100 max-h-56 overflow-y-auto">
                    {report.dailyBreakdown.length === 0 ? (
                      <div className="py-8 text-center text-sm text-zinc-400">No sessions held yet.</div>
                    ) : report.dailyBreakdown.map((d) => (
                      <div key={d.sessionId} className="grid grid-cols-[1fr_70px_60px_60px_60px_70px] px-3 py-2 text-sm items-center">
                        <div className="min-w-0">
                          <span className="text-zinc-700 block">{d.date}</span>
                          {d.classTitle && <span className="text-xs text-zinc-400 truncate block">{d.classTitle}</span>}
                        </div>
                        <span className="text-xs text-zinc-500">{d.source === 'GOOGLE_MEET' ? 'Meet' : 'Offline'}</span>
                        <span className="text-right text-zinc-600 tabular-nums">{d.presentCount}</span>
                        <span className="text-right text-zinc-600 tabular-nums">{d.partialCount}</span>
                        <span className="text-right text-zinc-600 tabular-nums">{d.absentCount}</span>
                        <span className="text-right">
                          <button
                            onClick={() => setOpenSessionId(d.sessionId)}
                            className="text-xs px-2 py-0.5 rounded-md border border-zinc-300 text-zinc-600 hover:bg-zinc-100 transition-colors"
                          >
                            View
                          </button>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>

        <div className="flex gap-2 px-6 py-4 border-t border-zinc-200 bg-zinc-50 shrink-0">
          <button
            onClick={() => download('csv')}
            disabled={!report || downloading !== null}
            className="flex-1 py-2.5 text-sm font-medium text-zinc-700 border border-zinc-300 rounded-md hover:bg-zinc-100 transition-colors disabled:opacity-40"
          >
            {downloading === 'csv' ? 'Preparing…' : 'Download CSV'}
          </button>
          <button
            onClick={() => download('pdf')}
            disabled={!report || downloading !== null}
            className="flex-1 py-2.5 text-sm font-medium text-white rounded-md disabled:opacity-40 transition-colors"
            style={{ backgroundColor: ACCENT }}
          >
            {downloading === 'pdf' ? 'Preparing…' : 'Download PDF'}
          </button>
        </div>
      </motion.div>

      {openSessionId && (
        // Stops the click that closes the (inner) session modal from also
        // bubbling up to this BatchReportModal's own backdrop onClick.
        <div onClick={(e) => e.stopPropagation()}>
          <SessionAttendanceModal sessionId={openSessionId} onClose={() => setOpenSessionId(null)} />
        </div>
      )}
    </motion.div>
  )
}

// ─── Batch → student list (level 2) ────────────────────────────────────────

function BatchStudentList({ batch, onBack, onOpenStudentReport, onOpenBatchReport }: {
  batch: Batch
  onBack: () => void
  onOpenStudentReport: (studentId: string) => void
  onOpenBatchReport: () => void
}) {
  const { students, loading, error } = useBatchStudents(batch.id, new Date().toISOString().slice(0, 10))

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button onClick={onBack} className="text-sm text-zinc-500 hover:text-zinc-800 flex items-center gap-1">
          ← All batches
        </button>
        <button
          onClick={onOpenBatchReport}
          className="text-xs px-3 py-1.5 text-white rounded-md transition-colors"
          style={{ backgroundColor: ACCENT }}
        >
          View batch statistics
        </button>
      </div>

      <h2 className="text-lg font-semibold text-zinc-900 mb-1">{batch.name}</h2>
      <p className="text-xs text-zinc-500 mb-4">
        {students.length} student{students.length !== 1 ? 's' : ''} enrolled{batch.mode ? ` · ${batch.mode}` : ''}
      </p>

      <div className="border border-zinc-200 rounded-lg overflow-hidden bg-white">
        {loading ? (
          <div className="py-12 text-center text-sm text-zinc-400">Loading students…</div>
        ) : error ? (
          <div className="py-12 text-center text-sm text-red-600">{error}</div>
        ) : students.length === 0 ? (
          <div className="py-12 text-center text-sm text-zinc-400">No students enrolled in this batch yet.</div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {students.map(s => (
              <div key={s.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-zinc-50 transition-colors">
                <div className="min-w-0">
                  <p className="text-sm text-zinc-900 truncate">{s.name}</p>
                  <p className="text-xs text-zinc-500 font-mono">{s.roll}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs font-medium tabular-nums" style={{ color: pctColor(s.attendancePct) }}>
                    {s.attendancePct !== null ? `${s.attendancePct}%` : '—'}
                  </span>
                  <button
                    onClick={() => onOpenStudentReport(s.id)}
                    className="text-xs px-3 py-1.5 rounded-md border border-zinc-300 text-zinc-600 hover:bg-zinc-100 transition-colors"
                  >
                    Report
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Batch list (level 1) ──────────────────────────────────────────────────


export default function AttendanceReportsTab() {
  const { batches, loading, error } = useBatches('all')
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null)
  const [studentReportId, setStudentReportId] = useState<string | null>(null)
  const [batchReportId, setBatchReportId] = useState<string | null>(null)

  return (
    <div>
      {!selectedBatch ? (
        <>
          <p className="text-sm text-zinc-500 mb-4">Select a batch to view its students and attendance report.</p>
          {loading ? (
            <div className="py-16 text-center text-sm text-zinc-400">Loading batches…</div>
          ) : error ? (
            <div className="py-16 text-center text-sm text-red-600">{error}</div>
          ) : batches.length === 0 ? (
            <div className="py-16 text-center text-sm text-zinc-400">No batches found.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {batches.map(b => (
                <div
                  key={b.id}
                  className="bg-white rounded-xl border border-zinc-200 p-5 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer"
                  onClick={() => setSelectedBatch(b)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <svg className="w-6 h-6 text-zinc-400" viewBox="0 0 20 20" fill="none">
                      <circle cx="7" cy="7" r="3" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M1 17q0-4 6-4t6 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      <circle cx="15" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.3" />
                      <path d="M14 13q5 0 5 4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
                    </svg>
                    {b.mode && (
                      <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-500">
                        {b.mode}
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-semibold text-zinc-900">{b.name}</h3>
                  {b.days && <p className="text-xs text-zinc-500 mt-1">{b.days}</p>}
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-xs text-zinc-400">View students →</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); setBatchReportId(b.id) }}
                      className="text-xs px-2.5 py-1 rounded-md border border-zinc-300 text-zinc-600 hover:bg-zinc-100 transition-colors"
                    >
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <BatchStudentList
          batch={selectedBatch}
          onBack={() => setSelectedBatch(null)}
          onOpenStudentReport={setStudentReportId}
          onOpenBatchReport={() => setBatchReportId(selectedBatch.id)}
        />
      )}

      <AnimatePresence>
        {studentReportId && (
          <StudentReportModal studentId={studentReportId} onClose={() => setStudentReportId(null)} />
        )}
        {batchReportId && (
          <BatchReportModal batchId={batchReportId} onClose={() => setBatchReportId(null)} />
        )}
      </AnimatePresence>
    </div>
  )
}
