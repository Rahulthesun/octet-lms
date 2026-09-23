'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useBatches, type Batch } from '@/hooks/useAttendanceData'
import {
  useBatchVideoReport, useStudentWatchedVideosAdmin, useStudentVideoReportAdmin,
} from '@/hooks/useVideoAnalytics'
import { DropOffChart, EngagementHeatmap, formatDuration } from '@/components/shared/VideoAnalyticsCharts'

const ACCENT = '#5B21B6'

function pctColor(pct: number | null) {
  if (pct === null) return '#9CA3AF'
  if (pct < 40) return '#DC2626'
  if (pct < 75) return '#D97706'
  return '#16A34A'
}

// ─── Individual student report modal ───────────────────────────────────────

function StudentVideoReportModal({ studentId, onClose }: { studentId: string; onClose: () => void }) {
  const { videos, studentName, loading: videosLoading, error: videosError } = useStudentWatchedVideosAdmin(studentId)
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedVideoId && videos.length > 0) setSelectedVideoId(videos[0].videoId)
  }, [videos, selectedVideoId])

  const { report, loading: reportLoading, error: reportError } = useStudentVideoReportAdmin(studentId, selectedVideoId)
  const selected = videos.find((v) => v.videoId === selectedVideoId)

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
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-zinc-200 flex items-start justify-between shrink-0">
          <div>
            <h3 className="text-sm font-semibold text-zinc-900">Video Report</h3>
            <p className="text-xs text-zinc-500 mt-0.5">{studentName || '...'}</p>
          </div>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-700 text-xl leading-none">&times;</button>
        </div>

        <div className="overflow-y-auto flex-1 px-6 py-4">
          {videosLoading && <p className="text-sm text-zinc-400 py-8 text-center">Loading watched lessons…</p>}
          {videosError && <p className="text-sm text-red-600 py-8 text-center">{videosError}</p>}
          {!videosLoading && videos.length === 0 && (
            <p className="text-sm text-zinc-400 py-8 text-center">This student has no watch data yet.</p>
          )}

          {videos.length > 0 && (
            <>
              <select
                value={selectedVideoId ?? ''}
                onChange={(e) => setSelectedVideoId(e.target.value)}
                className="w-full px-3 py-2 rounded-md border border-zinc-300 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-violet-200"
              >
                {videos.map((v) => (
                  <option key={v.videoId} value={v.videoId}>
                    {v.subjectTitle ? `${v.subjectTitle} · ` : ''}{v.chapterTitle ? `${v.chapterTitle} · ` : ''}{v.title}
                  </option>
                ))}
              </select>

              {reportLoading && <p className="text-sm text-zinc-400 py-8 text-center">Loading report…</p>}
              {reportError && <p className="text-sm text-red-600 py-8 text-center">{reportError}</p>}

              {report && (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                    <div className="bg-zinc-50 rounded-lg px-3 py-2.5 text-center">
                      <p className="text-lg font-semibold text-zinc-900 tabular-nums">{report.sessionCount}</p>
                      <p className="text-[10px] uppercase tracking-wide text-zinc-400 mt-0.5">Sessions</p>
                    </div>
                    <div className="bg-zinc-50 rounded-lg px-3 py-2.5 text-center">
                      <p className="text-lg font-semibold text-zinc-900 tabular-nums font-mono">{formatDuration(report.avgSessionDurationSecs)}</p>
                      <p className="text-[10px] uppercase tracking-wide text-zinc-400 mt-0.5">Avg Duration</p>
                    </div>
                    <div className="bg-zinc-50 rounded-lg px-3 py-2.5 text-center">
                      <p className="text-lg font-semibold text-zinc-900 tabular-nums font-mono">{formatDuration(report.totalWatchedSecs)}</p>
                      <p className="text-[10px] uppercase tracking-wide text-zinc-400 mt-0.5">Watch Time</p>
                    </div>
                    <div className="bg-zinc-50 rounded-lg px-3 py-2.5 text-center">
                      <p className="text-lg font-semibold tabular-nums" style={{ color: pctColor(report.completionPct) }}>
                        {report.completionPct !== null ? `${report.completionPct}%` : '—'}
                      </p>
                      <p className="text-[10px] uppercase tracking-wide text-zinc-400 mt-0.5">Completion</p>
                    </div>
                  </div>

                  <p className="text-xs text-zinc-500 mb-4">
                    Watch time across the whole chapter: <span className="font-medium text-zinc-700">{formatDuration(report.chapterWatchTimeSecs)}</span>
                  </p>

                  <p className="text-[10px] font-medium tracking-widest uppercase text-zinc-400 mb-2">Drop-off analysis</p>
                  <div className="mb-5"><DropOffChart data={report.dropOff} height={180} /></div>

                  <p className="text-[10px] font-medium tracking-widest uppercase text-zinc-400 mb-2">Engagement heatmap</p>
                  <EngagementHeatmap data={report.heatmap} durationSecs={selected?.durationSecs} />
                </>
              )}
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Batch-wide report (level 2) ───────────────────────────────────────────

function BatchVideoReportView({ batch, onBack, onOpenStudent }: {
  batch: Batch
  onBack: () => void
  onOpenStudent: (studentId: string) => void
}) {
  const { report, loading, error } = useBatchVideoReport(batch.id)

  return (
    <div>
      <button onClick={onBack} className="text-sm text-zinc-500 hover:text-zinc-800 flex items-center gap-1 mb-4">
        ← All batches
      </button>

      <h2 className="text-lg font-semibold text-zinc-900 mb-1">{batch.name}</h2>
      <p className="text-xs text-zinc-500 mb-5">Batch-wide video engagement report</p>

      {loading && <div className="py-16 text-center text-sm text-zinc-400">Loading report…</div>}
      {error && <div className="py-16 text-center text-sm text-red-600">{error}</div>}

      {report && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="bg-white border border-zinc-200 rounded-lg px-4 py-3 text-center">
              <p className="text-lg font-semibold text-zinc-900 tabular-nums">{report.totalStudents}</p>
              <p className="text-[10px] uppercase tracking-wide text-zinc-400 mt-0.5">Students</p>
            </div>
            <div className="bg-white border border-zinc-200 rounded-lg px-4 py-3 text-center">
              <p className="text-lg font-semibold text-zinc-900 tabular-nums font-mono">{formatDuration(report.totalWatchedSecs)}</p>
              <p className="text-[10px] uppercase tracking-wide text-zinc-400 mt-0.5">Total Watch Time</p>
            </div>
            <div className="bg-white border border-zinc-200 rounded-lg px-4 py-3 text-center">
              <p className="text-lg font-semibold text-zinc-900 tabular-nums font-mono">{formatDuration(report.avgWatchedSecsPerStudent)}</p>
              <p className="text-[10px] uppercase tracking-wide text-zinc-400 mt-0.5">Avg / Student</p>
            </div>
            <div className="bg-white border border-zinc-200 rounded-lg px-4 py-3 text-center">
              <p className="text-lg font-semibold tabular-nums" style={{ color: pctColor(report.avgCompletionPct) }}>
                {report.avgCompletionPct !== null ? `${report.avgCompletionPct}%` : '—'}
              </p>
              <p className="text-[10px] uppercase tracking-wide text-zinc-400 mt-0.5">Avg Completion</p>
            </div>
          </div>

          <p className="text-[10px] font-medium tracking-widest uppercase text-zinc-400 mb-2">Most-watched videos in this batch</p>
          <div className="border border-zinc-200 rounded-lg overflow-hidden bg-white mb-6">
            <div className="grid grid-cols-[1fr_90px_90px_80px] px-3 py-2 bg-zinc-50 border-b border-zinc-200 text-[10px] uppercase tracking-wide text-zinc-400">
              <span>Video</span>
              <span className="text-right">Viewers</span>
              <span className="text-right">Watch Time</span>
              <span className="text-right">Compl.</span>
            </div>
            <div className="divide-y divide-zinc-100 max-h-56 overflow-y-auto">
              {report.topVideos.length === 0 ? (
                <div className="py-8 text-center text-sm text-zinc-400">No watch data yet.</div>
              ) : report.topVideos.map((v) => (
                <div key={v.videoId} className="grid grid-cols-[1fr_90px_90px_80px] px-3 py-2.5 text-sm items-center">
                  <div className="min-w-0">
                    <p className="text-zinc-800 truncate">{v.title}</p>
                    {v.chapterTitle && <p className="text-xs text-zinc-400 truncate">{v.chapterTitle}</p>}
                  </div>
                  <span className="text-right text-zinc-600 tabular-nums">{v.uniqueViewers}</span>
                  <span className="text-right text-zinc-600 tabular-nums font-mono">{formatDuration(v.totalWatchedSecs)}</span>
                  <span className="text-right tabular-nums font-medium" style={{ color: pctColor(v.avgCompletionPct) }}>
                    {v.avgCompletionPct !== null ? `${v.avgCompletionPct}%` : '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-[10px] font-medium tracking-widest uppercase text-zinc-400 mb-2">Per-student</p>
          <div className="border border-zinc-200 rounded-lg overflow-hidden bg-white">
            <div className="grid grid-cols-[1fr_90px_80px_70px_70px] px-3 py-2 bg-zinc-50 border-b border-zinc-200 text-[10px] uppercase tracking-wide text-zinc-400">
              <span>Student</span>
              <span className="text-right">Watch Time</span>
              <span className="text-right">Videos</span>
              <span className="text-right">Compl.</span>
              <span className="text-right">Report</span>
            </div>
            <div className="divide-y divide-zinc-100 max-h-72 overflow-y-auto">
              {report.perStudent.length === 0 ? (
                <div className="py-8 text-center text-sm text-zinc-400">No students enrolled.</div>
              ) : report.perStudent.map((s) => (
                <div key={s.studentId} className="grid grid-cols-[1fr_90px_80px_70px_70px] px-3 py-2.5 text-sm items-center">
                  <span className="text-zinc-700 truncate">{s.name}</span>
                  <span className="text-right text-zinc-600 tabular-nums font-mono">{formatDuration(s.totalWatchedSecs)}</span>
                  <span className="text-right text-zinc-600 tabular-nums">{s.videosWatchedCount}</span>
                  <span className="text-right tabular-nums font-medium" style={{ color: pctColor(s.avgCompletionPct) }}>
                    {s.avgCompletionPct !== null ? `${s.avgCompletionPct}%` : '—'}
                  </span>
                  <span className="text-right">
                    <button
                      onClick={() => onOpenStudent(s.studentId)}
                      disabled={s.videosWatchedCount === 0}
                      className="text-xs px-2.5 py-1 rounded-md border border-zinc-300 text-zinc-600 hover:bg-zinc-100 transition-colors disabled:opacity-30"
                    >
                      View
                    </button>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ─── Batch list (level 1) ───────────────────────────────────────────────────

export default function VideoReportsTab() {
  const { batches, loading, error } = useBatches('all')
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null)
  const [studentReportId, setStudentReportId] = useState<string | null>(null)

  return (
    <div>
      {!selectedBatch ? (
        <>
          <p className="text-sm text-zinc-500 mb-4">Select a batch to view its video engagement report.</p>
          {loading ? (
            <div className="py-16 text-center text-sm text-zinc-400">Loading batches…</div>
          ) : error ? (
            <div className="py-16 text-center text-sm text-red-600">{error}</div>
          ) : batches.length === 0 ? (
            <div className="py-16 text-center text-sm text-zinc-400">No batches found.</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {batches.map((b) => (
                <div
                  key={b.id}
                  className="bg-white rounded-xl border border-zinc-200 p-5 hover:shadow-md hover:-translate-y-0.5 transition-all cursor-pointer"
                  onClick={() => setSelectedBatch(b)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <svg className="w-6 h-6 text-zinc-400" viewBox="0 0 20 20" fill="none">
                      <rect x="2" y="5" width="11" height="10" rx="2" stroke="currentColor" strokeWidth="1.4" />
                      <path d="M13 9l5-3v10l-5-3" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
                    </svg>
                    {b.mode && (
                      <span className="text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-500">
                        {b.mode}
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-semibold text-zinc-900">{b.name}</h3>
                  {b.days && <p className="text-xs text-zinc-500 mt-1">{b.days}</p>}
                  <p className="text-xs text-zinc-400 mt-4">View report →</p>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        <BatchVideoReportView
          batch={selectedBatch}
          onBack={() => setSelectedBatch(null)}
          onOpenStudent={setStudentReportId}
        />
      )}

      <AnimatePresence>
        {studentReportId && (
          <StudentVideoReportModal studentId={studentReportId} onClose={() => setStudentReportId(null)} />
        )}
      </AnimatePresence>
    </div>
  )
}
