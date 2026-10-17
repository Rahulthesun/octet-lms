'use client'

// components/shared/AttendanceChart.tsx
//
// Reusable attendance statistics graph — used by the admin's per-student and
// per-batch attendance reports, and by the student's own attendance page.
// Lets the viewer pick Bar / Pie / Line for the same underlying statistics.
//
// Colors: Present / Partial / Absent always use the same fixed, validated
// status palette (good / warning / critical) everywhere in the app, so a
// color never has to be re-learned between screens — and the exact same
// palette is used server-side when this chart is redrawn into the
// downloadable PDF, so what you choose to view is what gets printed.

import { useId } from 'react'
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts'
import { IconBarChart, IconPieChart, IconLineChart } from '@/components/ui/SvgIcons'

export type AttendanceChartType = 'bar' | 'pie' | 'line'

// Fixed status palette — never themed, matches the server-side PDF chart.
export const ATTENDANCE_STATUS_COLORS = {
  present: '#0ca30c',
  partial: '#fab219',
  absent: '#d03b3b',
} as const

// A student who never logged into the online class at all gets a distinct
// solid-black bar — different from "joined briefly but under the present/
// partial threshold" (which stays red/orange). Drawn UPWARD at a notable
// height (same scale as a present bar) so it reads as "no attempt", not as
// a small/zero value that could be mistaken for a rendering gap.
export const NEVER_JOINED_COLOR = '#000000'
const NEVER_JOINED_BAR_HEIGHT = 100

export interface ChartDatum {
  label: string
  value: number
  color?: string
  /** Overrides the tooltip's value line, e.g. "3/5 — 60%" instead of the plain value+suffix. */
  tooltipLabel?: string
}

interface AxisLabels {
  x: string
  y: string
}

interface AttendanceChartProps {
  type: AttendanceChartType
  onTypeChange: (type: AttendanceChartType) => void
  barData: ChartDatum[]
  pieData: ChartDatum[]
  lineData: ChartDatum[]
  /** Horizontal bars (label on the y-axis) — used for long/many labels like per-student rankings. */
  horizontalBars?: boolean
  defaultColor?: string
  lineColor?: string
  valueSuffix?: string
  height?: number
  emptyMessage?: string
  /**
   * What each axis represents, shown as a title on the axis itself — e.g.
   * { x: 'Attendance status', y: 'Number of sessions' }. Required content
   * differs per chart type (a bar's X axis is categorical, a line's X axis
   * is time), so bar and line take their own pair.
   */
  barAxisLabels?: AxisLabels
  lineAxisLabels?: AxisLabels
  /** One plain-language sentence, shown under the chart-type toggle, saying what the current chart depicts. */
  description?: string
  /**
   * Bar chart only. Draws a bold black reference line at `referenceValue`
   * (default 100) across the top of the chart — e.g. "100% = max achievable"
   * for a 0-100 percentage-scale bar chart. Only wire this where the bar
   * chart is actually on a 0-100 scale (never for e.g. a count-of-sessions
   * bar chart, where 100 isn't a meaningful ceiling).
   */
  showMaxLine?: boolean
  referenceValue?: number
}

function hasData(data: ChartDatum[]) {
  return data.length > 0 && data.some((d) => d.value > 0)
}

/**
 * Running attendance-% trend across a chronological (oldest-first) list of
 * present/absent flags. Shared by every "Line" chart in the app — the admin
 * per-student report, the admin batch report, and the student's own page —
 * and mirrored exactly by the server-side PDF chart renderer
 * (api/utils/attendanceReportFormat.js) so the on-screen line and the
 * downloaded PDF's line always agree.
 */
export function buildAttendanceTrend(recordsOldestFirst: { present: boolean }[]): ChartDatum[] {
  let cumulativePresent = 0
  return recordsOldestFirst.map((r, i) => {
    if (r.present) cumulativePresent += 1
    return { label: `#${i + 1}`, value: Math.round((cumulativePresent / (i + 1)) * 100) }
  })
}

/**
 * PRIMARY view for an attendance report: one bar per session DATE (not an
 * aggregate "number of sessions" count), oldest to most recent, colored by
 * that day's status. A student who never logged into the online class at
 * all (durationMinutes is 0/null AND the session was a Google Meet class)
 * is distinguished from "joined but under threshold" with a solid black bar
 * at present-height, rather than being lumped in with ordinary red "absent".
 */
export function buildAttendanceDateWiseData(
  recordsNewestFirst: {
    date: string
    status: 'present' | 'absent'
    attendanceStatus?: 'present' | 'partial' | 'absent'
    attendancePct?: number | null
    durationMinutes?: number | null
    source?: 'OFFLINE' | 'GOOGLE_MEET'
  }[],
): ChartDatum[] {
  return [...recordsNewestFirst]
    .reverse() // oldest -> newest, left to right
    .map((r) => {
      const status = r.attendanceStatus ?? r.status
      const neverJoined =
        r.source === 'GOOGLE_MEET' && status === 'absent' && (r.durationMinutes ?? 0) <= 0

      // Short "DD Mon" label (matches the test report's date-label convention)
      // instead of the full YYYY-MM-DD — kept here (not bare day-of-month)
      // since this chart can span an unbounded date range across months.
      const shortLabel = new Date(r.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })

      if (neverJoined) {
        return {
          label: shortLabel,
          value: NEVER_JOINED_BAR_HEIGHT,
          color: NEVER_JOINED_COLOR,
          tooltipLabel: 'Never logged in',
        }
      }

      const value = r.attendancePct ?? (status === 'present' ? 100 : status === 'partial' ? 50 : 0)
      return {
        label: shortLabel,
        value,
        color: ATTENDANCE_STATUS_COLORS[status],
        tooltipLabel: `${status[0].toUpperCase()}${status.slice(1)} — ${value}%`,
      }
    })
}

/** Buckets a list of records into the fixed Present/Partial/Absent categories. */
export function buildAttendanceCategoryData(
  records: { attendanceStatus?: 'present' | 'partial' | 'absent'; status: 'present' | 'absent' }[],
): ChartDatum[] {
  let present = 0, partial = 0, absent = 0
  records.forEach((r) => {
    const s = r.attendanceStatus ?? r.status
    if (s === 'present') present += 1
    else if (s === 'partial') partial += 1
    else absent += 1
  })
  return [
    { label: 'Present', value: present, color: ATTENDANCE_STATUS_COLORS.present },
    { label: 'Partial', value: partial, color: ATTENDANCE_STATUS_COLORS.partial },
    { label: 'Absent', value: absent, color: ATTENDANCE_STATUS_COLORS.absent },
  ]
}

export function ChartTypeToggle({
  type,
  onTypeChange,
}: {
  type: AttendanceChartType
  onTypeChange: (type: AttendanceChartType) => void
}) {
  const options: { value: AttendanceChartType; label: string; Icon: typeof IconBarChart }[] = [
    { value: 'bar', label: 'Bar', Icon: IconBarChart },
    { value: 'pie', label: 'Pie', Icon: IconPieChart },
    { value: 'line', label: 'Line', Icon: IconLineChart },
  ]
  return (
    <div className="inline-flex items-center gap-1 p-0.5 bg-zinc-100 rounded-lg" role="group" aria-label="Chart type">
      {options.map(({ value, label, Icon }) => (
        <button
          key={value}
          type="button"
          onClick={() => onTypeChange(value)}
          aria-pressed={type === value}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
            type === value ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
          }`}
        >
          <Icon className="w-3.5 h-3.5" />
          {label}
        </button>
      ))}
    </div>
  )
}

function CustomTooltip({ active, payload, valueSuffix }: any) {
  if (!active || !payload || !payload.length) return null
  const entry = payload[0]
  const color = entry.payload?.color || entry.color || entry.fill
  return (
    <div className="bg-white border border-zinc-200 rounded-md shadow-md px-3 py-2 text-xs">
      <div className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
        <span className="text-zinc-700 font-medium">{entry.payload?.label ?? entry.name}</span>
      </div>
      <p className="text-zinc-500 mt-0.5 tabular-nums">
        {entry.payload?.tooltipLabel ?? `${entry.value}${valueSuffix ?? ''}`}
      </p>
    </div>
  )
}

export default function AttendanceChart({
  type,
  onTypeChange,
  barData,
  pieData,
  lineData,
  horizontalBars = false,
  defaultColor = '#6b7280',
  lineColor = '#5B21B6',
  valueSuffix = '',
  height = 260,
  emptyMessage = 'Not enough data yet to show a chart.',
  barAxisLabels,
  lineAxisLabels,
  description,
  showMaxLine = false,
  referenceValue = 100,
}: AttendanceChartProps) {
  const gradientId = useId()

  const activeData = type === 'bar' ? barData : type === 'pie' ? pieData : lineData
  const showEmpty = type === 'line' ? lineData.length < 2 : !hasData(activeData)

  // Bar chart Y-axis domain: normally auto, but when any bar datum is
  // negative (e.g. an "absent" marker drawn as a short downward bar) the
  // domain must be widened below zero so Recharts doesn't clip it.
  const hasNegativeBarValue = barData.some((d) => d.value < 0)
  const barMinValue = hasNegativeBarValue ? Math.min(...barData.map((d) => d.value)) : 0
  const barYDomain: [number, number] | undefined = hasNegativeBarValue
    ? [Math.min(barMinValue - 2, -15), 100]
    : undefined

  // Recharts needs extra room to fit an axis title without it overlapping
  // the tick labels — only reserve that space on the axis that has one.
  const barBottomMargin = !horizontalBars && barAxisLabels?.x ? 22 : 4
  const barLeftMargin = horizontalBars ? 8 : barAxisLabels?.y ? 4 : -12
  const lineBottomMargin = lineAxisLabels?.x ? 22 : 4
  const lineLeftMargin = lineAxisLabels?.y ? 4 : -12

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <p className="text-[10px] font-medium tracking-widest uppercase text-zinc-400">Statistics</p>
        <ChartTypeToggle type={type} onTypeChange={onTypeChange} />
      </div>
      {description && <p className="text-xs text-zinc-500 mb-2">{description}</p>}

      {showEmpty ? (
        <div
          className="flex items-center justify-center text-sm text-zinc-400 border border-dashed border-zinc-200 rounded-lg"
          style={{ height }}
        >
          {emptyMessage}
        </div>
      ) : (
        <div style={{ width: '100%', height }}>
          <ResponsiveContainer width="100%" height="100%">
            {type === 'bar' ? (
              <BarChart
                data={barData}
                layout={horizontalBars ? 'vertical' : 'horizontal'}
                margin={{ top: 4, right: 12, left: barLeftMargin, bottom: barBottomMargin }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={horizontalBars} horizontal={!horizontalBars} />
                {horizontalBars ? (
                  <>
                    <XAxis
                      type="number"
                      tick={{ fontSize: 11, fill: '#71717a' }}
                      axisLine={{ stroke: '#e5e7eb' }}
                      tickLine={false}
                      label={
                        barAxisLabels
                          ? { value: barAxisLabels.x, position: 'insideBottom', offset: -2, fontSize: 11, fill: '#71717a' }
                          : undefined
                      }
                    />
                    <YAxis
                      type="category"
                      dataKey="label"
                      width={96}
                      tick={{ fontSize: 11, fill: '#71717a' }}
                      axisLine={{ stroke: '#e5e7eb' }}
                      tickLine={false}
                    />
                  </>
                ) : (
                  <>
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 11, fill: '#71717a' }}
                      axisLine={{ stroke: '#e5e7eb' }}
                      tickLine={false}
                      label={
                        barAxisLabels
                          ? { value: barAxisLabels.x, position: 'insideBottom', offset: -6, fontSize: 11, fill: '#71717a' }
                          : undefined
                      }
                    />
                    <YAxis
                      domain={barYDomain}
                      tick={{ fontSize: 11, fill: '#71717a' }}
                      axisLine={false}
                      tickLine={false}
                      width={barAxisLabels?.y ? 46 : 32}
                      label={
                        barAxisLabels
                          ? { value: barAxisLabels.y, angle: -90, position: 'insideLeft', fontSize: 11, fill: '#71717a' }
                          : undefined
                      }
                    />
                  </>
                )}
                <Tooltip content={<CustomTooltip valueSuffix={valueSuffix} />} cursor={{ fill: '#f4f4f5' }} />
                {showMaxLine && !horizontalBars && (
                  <ReferenceLine y={referenceValue} stroke="#000000" strokeWidth={2.5} />
                )}
                <Bar dataKey="value" radius={horizontalBars ? [0, 4, 4, 0] : [4, 4, 0, 0]} maxBarSize={horizontalBars ? 16 : 44}>
                  {barData.map((entry, i) => (
                    <Cell key={i} fill={entry.color || defaultColor} />
                  ))}
                </Bar>
              </BarChart>
            ) : type === 'pie' ? (
              <PieChart margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                <Tooltip content={<CustomTooltip valueSuffix={valueSuffix} />} />
                <Legend
                  verticalAlign="bottom"
                  height={28}
                  iconType="circle"
                  iconSize={8}
                  formatter={(value) => <span style={{ fontSize: 12, color: '#52525b' }}>{value}</span>}
                />
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="label"
                  cx="50%"
                  cy="46%"
                  innerRadius="52%"
                  outerRadius="80%"
                  paddingAngle={2}
                  strokeWidth={2}
                  stroke="#ffffff"
                  label={({ percent }) => (percent && percent > 0.06 ? `${Math.round(percent * 100)}%` : '')}
                  labelLine={false}
                >
                  {pieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color || defaultColor} />
                  ))}
                </Pie>
              </PieChart>
            ) : (
              <AreaChart data={lineData} margin={{ top: 8, right: 16, left: lineLeftMargin, bottom: lineBottomMargin }}>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={lineColor} stopOpacity={0.18} />
                    <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: '#71717a' }}
                  axisLine={{ stroke: '#e5e7eb' }}
                  tickLine={false}
                  label={
                    lineAxisLabels
                      ? { value: lineAxisLabels.x, position: 'insideBottom', offset: -6, fontSize: 11, fill: '#71717a' }
                      : undefined
                  }
                />
                <YAxis
                  domain={[0, 100]}
                  tick={{ fontSize: 11, fill: '#71717a' }}
                  axisLine={false}
                  tickLine={false}
                  width={lineAxisLabels?.y ? 46 : 32}
                  tickFormatter={(v) => `${v}`}
                  label={
                    lineAxisLabels
                      ? { value: lineAxisLabels.y, angle: -90, position: 'insideLeft', fontSize: 11, fill: '#71717a' }
                      : undefined
                  }
                />
                <Tooltip content={<CustomTooltip valueSuffix={valueSuffix} />} cursor={{ stroke: '#d4d4d8', strokeDasharray: '3 3' }} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={lineColor}
                  strokeWidth={2}
                  dot={{ r: 3, fill: lineColor, strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                  fill={`url(#${gradientId})`}
                />
              </AreaChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
