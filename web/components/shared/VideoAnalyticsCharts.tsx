'use client'

// components/shared/VideoAnalyticsCharts.tsx
//
// Two purpose-built visualizations shared by the student's own video Report
// page and the admin's video/batch reports:
//  - DropOffChart:  a retention curve — how many sessions were still
//    watching at each 5% point of the video (drop-off analysis).
//  - EngagementHeatmap: a YouTube-style "most replayed" strip — darker
//    segments were played through (or replayed) more than lighter ones.
//
// Both consume the same 20-bucket shape the backend always returns
// (api/services/videoAnalytics.service.js), so a video's actual duration
// never has to be known on the frontend to render either one.

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'

const ACCENT = '#5B21B6'

export interface BucketPoint {
  bucketIndex: number
  pctPosition: number
  hitCount?: number
  sessionsReached?: number
}

export function formatDuration(secs: number): string {
  if (!secs || secs <= 0) return '0:00'
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = Math.floor(secs % 60)
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m)
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

function DropOffTooltip({ active, payload }: any) {
  if (!active || !payload || !payload.length) return null
  const p = payload[0].payload
  return (
    <div className="bg-white border border-zinc-200 rounded-md shadow-md px-3 py-2 text-xs">
      <p className="text-zinc-700 font-medium">{p.pctPosition}% into the video</p>
      <p className="text-zinc-500 mt-0.5 tabular-nums">{p.sessionsReached} session{p.sessionsReached === 1 ? '' : 's'} reached this point</p>
    </div>
  )
}

export function DropOffChart({ data, height = 220, emptyMessage = 'Not enough watch data yet to plot a drop-off curve.' }: {
  data: BucketPoint[]
  height?: number
  emptyMessage?: string
}) {
  const total = data.reduce((max, d) => Math.max(max, d.sessionsReached || 0), 0)
  if (total === 0) {
    return (
      <div className="flex items-center justify-center text-sm text-zinc-400 border border-dashed border-zinc-200 rounded-lg" style={{ height }}>
        {emptyMessage}
      </div>
    )
  }

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 16, left: -12, bottom: 22 }}>
          <defs>
            <linearGradient id="dropOffGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={ACCENT} stopOpacity={0.22} />
              <stop offset="100%" stopColor={ACCENT} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
          <XAxis
            dataKey="pctPosition"
            tickFormatter={(v) => `${v}%`}
            tick={{ fontSize: 10, fill: '#71717a' }}
            axisLine={{ stroke: '#e5e7eb' }}
            tickLine={false}
            label={{ value: 'Position in video', position: 'insideBottom', offset: -6, fontSize: 11, fill: '#71717a' }}
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#71717a' }}
            axisLine={false}
            tickLine={false}
            width={32}
            allowDecimals={false}
          />
          <Tooltip content={<DropOffTooltip />} cursor={{ stroke: '#d4d4d8', strokeDasharray: '3 3' }} />
          <Area type="monotone" dataKey="sessionsReached" stroke={ACCENT} strokeWidth={2} fill="url(#dropOffGradient)" dot={false} activeDot={{ r: 4 }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}

export function EngagementHeatmap({ data, durationSecs, emptyMessage = 'Not enough watch data yet to build a heatmap.' }: {
  data: BucketPoint[]
  durationSecs?: number | null
  emptyMessage?: string
}) {
  const maxHits = data.reduce((max, d) => Math.max(max, d.hitCount || 0), 0)

  if (maxHits === 0) {
    return (
      <div className="flex items-center justify-center text-sm text-zinc-400 border border-dashed border-zinc-200 rounded-lg py-10">
        {emptyMessage}
      </div>
    )
  }

  return (
    <div>
      <div className="flex h-10 rounded-md overflow-hidden border border-zinc-200">
        {data.map((d) => {
          const intensity = maxHits > 0 ? (d.hitCount || 0) / maxHits : 0
          return (
            <div
              key={d.bucketIndex}
              className="flex-1 h-full transition-opacity"
              title={`${d.pctPosition}%${durationSecs ? ` (~${formatDuration((d.pctPosition / 100) * durationSecs)})` : ''} — played through ${d.hitCount || 0} time${(d.hitCount || 0) === 1 ? '' : 's'}`}
              style={{ backgroundColor: ACCENT, opacity: 0.12 + intensity * 0.88 }}
            />
          )
        })}
      </div>
      <div className="flex items-center justify-between mt-1.5 text-[10px] text-zinc-400">
        <span>Start</span>
        <span>End</span>
      </div>
      <div className="flex items-center gap-2 mt-2 text-[11px] text-zinc-500">
        <span>Least replayed</span>
        <div className="flex-1 h-2 rounded-full" style={{ background: `linear-gradient(to right, ${ACCENT}1F, ${ACCENT})` }} />
        <span>Most replayed</span>
      </div>
    </div>
  )
}
