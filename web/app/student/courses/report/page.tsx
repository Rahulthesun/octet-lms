'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useMyWatchedVideos, useMyVideoReport } from '@/hooks/useVideoAnalytics'
import { DropOffChart, EngagementHeatmap, formatDuration } from '@/components/shared/VideoAnalyticsCharts'

const card = 'bg-white rounded-lg border border-[#e2e5ec] shadow-[0_2px_12px_rgba(15,23,42,0.06)]'

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className={`${card} p-4`}>
      <p className="text-primary text-xl font-data leading-none mb-1">{value}</p>
      <p className="text-muted text-[13px]">{label}</p>
    </div>
  )
}

export default function VideoReportPage() {
  const router = useRouter()
  const { videos, loading: videosLoading, error: videosError } = useMyWatchedVideos()
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null)

  useEffect(() => {
    if (!selectedVideoId && videos.length > 0) setSelectedVideoId(videos[0].videoId)
  }, [videos, selectedVideoId])

  const { report, loading: reportLoading, error: reportError } = useMyVideoReport(selectedVideoId)
  const selected = videos.find((v) => v.videoId === selectedVideoId)

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-6">
        <button
          onClick={() => router.push('/student/courses')}
          className="inline-flex items-center gap-2 text-muted text-base hover:text-brand transition-colors mb-4 w-fit"
        >
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
            <path d="M 13,8 L 3,8 M 7,4 L 3,8 L 7,12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to Video Lessons
        </button>
        <h1 className="text-3xl md:text-4xl text-primary mb-1">Video Report</h1>
        <p className="text-muted text-base">Your own watch-time, session, and engagement statistics</p>
      </motion.div>

      {videosLoading && <p className="text-muted text-[15px]">Loading your watched lessons…</p>}
      {videosError && <p className="text-rose-600 text-[15px]">{videosError}</p>}

      {!videosLoading && videos.length === 0 && (
        <div className={`${card} p-10 text-center`}>
          <p className="text-primary text-[15px] mb-1">No watch data yet</p>
          <p className="text-muted text-[14px]">Start watching a lesson and your statistics will appear here.</p>
        </div>
      )}

      {videos.length > 0 && (
        <>
          <div className="mb-6">
            <label className="text-muted text-[13px] block mb-1.5">Lesson</label>
            <select
              value={selectedVideoId ?? ''}
              onChange={(e) => setSelectedVideoId(e.target.value)}
              className="w-full sm:w-96 px-4 py-2.5 rounded-md border border-[#e2e5ec] bg-white text-primary text-[15px] focus:outline-none focus:ring-2 focus:ring-brand/20"
            >
              {videos.map((v) => (
                <option key={v.videoId} value={v.videoId}>
                  {v.subjectTitle ? `${v.subjectTitle} · ` : ''}{v.chapterTitle ? `${v.chapterTitle} · ` : ''}{v.title}
                </option>
              ))}
            </select>
          </div>

          {reportLoading && <p className="text-muted text-[15px]">Loading report…</p>}
          {reportError && <p className="text-rose-600 text-[15px]">{reportError}</p>}

          {report && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                <StatTile label="Sessions" value={String(report.sessionCount)} />
                <StatTile label="Avg Session Duration" value={formatDuration(report.avgSessionDurationSecs)} />
                <StatTile label="Watch Time (this video)" value={formatDuration(report.totalWatchedSecs)} />
                <StatTile label="Watch Time (whole chapter)" value={formatDuration(report.chapterWatchTimeSecs)} />
              </div>

              <div className={`${card} p-5 mb-6`}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-primary text-base">Completion</p>
                  <span className="text-primary text-[15px] font-data">
                    {report.completionPct !== null ? `${report.completionPct}%` : '—'}
                  </span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-1">
                  <div
                    className="h-full bg-brand rounded-full"
                    style={{ width: `${Math.min(100, report.completionPct ?? 0)}%` }}
                  />
                </div>
                <p className="text-muted text-[13px]">
                  {report.completed ? 'Marked complete.' : 'Not yet complete.'} Last position: {formatDuration(report.lastPositionSecs)}
                  {selected?.durationSecs ? ` of ${formatDuration(selected.durationSecs)}` : ''}
                </p>
              </div>

              <div className={`${card} p-5 mb-6`}>
                <p className="text-primary text-base mb-1">Drop-off analysis</p>
                <p className="text-muted text-[13px] mb-3">How many of your sessions were still watching at each point in the video.</p>
                <DropOffChart data={report.dropOff} />
              </div>

              <div className={`${card} p-5 mb-6`}>
                <p className="text-primary text-base mb-1">Engagement heatmap</p>
                <p className="text-muted text-[13px] mb-3">Which parts of the video you replayed the most.</p>
                <EngagementHeatmap data={report.heatmap} durationSecs={report.video.durationSecs} />
              </div>

              <div className={`${card} overflow-hidden`}>
                <div className="px-5 py-3 border-b border-[#e2e5ec]">
                  <p className="text-primary text-base">Recent sessions</p>
                </div>
                <div className="grid grid-cols-[1fr_100px_100px] px-5 py-2 bg-[#FAF9FB] text-[12px] uppercase tracking-wide text-muted">
                  <span>Started</span>
                  <span className="text-right">Watched</span>
                  <span className="text-right">Completed</span>
                </div>
                <div className="divide-y divide-[#F4F1F8] max-h-72 overflow-y-auto">
                  {report.sessions.length === 0 ? (
                    <div className="py-8 text-center text-muted text-[14px]">No sessions recorded yet.</div>
                  ) : report.sessions.map((s) => (
                    <div key={s.id} className="grid grid-cols-[1fr_100px_100px] px-5 py-2.5 text-[14px] items-center">
                      <span className="text-primary/85">{new Date(s.startedAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                      <span className="text-right font-data text-primary/80">{formatDuration(s.watchedSecs)}</span>
                      <span className={`text-right text-[13px] ${s.completed ? 'text-emerald-600' : 'text-muted'}`}>{s.completed ? 'Yes' : 'No'}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}
