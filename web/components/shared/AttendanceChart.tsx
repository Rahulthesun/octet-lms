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
import ChemistryOctetLogo from '@/components/ui/ChemistryOctetLogo'

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
  /** Bold heading printed above the chart, e.g. "Tests Performance Graph for the Month of October 2026". */
  title?: string
  /** Shows the Chemistry@OCTET emblem beside the heading — every student-facing graph carries it. */
  showEmblem?: boolean
}

// Categorical palette for pie slices — mirrored by PIE_PALETTE in
// api/utils/attendanceReportFormat.js so the downloaded PDF uses the same colors.
export const PIE_PALETTE = ['#5e4075', '#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#8665a5', '#84cc16', '#f97316']

/**
 * Slices that already carry distinct, meaningful colors (Present / Partial /
 * Absent) keep them. Otherwise — one shared color, or none — every slice gets
 * its own palette color, so a pie's categories can always be told apart.
 */
export function withPieColors(data: ChartDatum[]): ChartDatum[] {
  const colors = data.map((d) => d.color).filter(Boolean)
  const allDistinct = colors.length === data.length && new Set(colors).size === data.length
  if (allDistinct || data.length < 2) return data
  return data.map((d, i) => ({ ...d, color: PIE_PALETTE[i % PIE_PALETTE.length] }))
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
  const isNegative = typeof entry.value === 'number' && entry.value < 0
  return (
    <div className="bg-white border border-zinc-200 rounded-lg shadow-lg px-3.5 py-2.5 text-xs z-50 min-w-[130px]">
      <div className="flex items-center gap-2 mb-1">
        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
        <span className="text-zinc-900 font-semibold">{entry.payload?.label ?? entry.name}</span>
      </div>
      <p className="text-zinc-500 font-medium tabular-nums">
        {entry.payload?.tooltipLabel ?? (isNegative ? 'Absent (No attempt)' : `${entry.value}${valueSuffix ?? ''}`)}
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
  lineColor = '#5e4075',
  valueSuffix = '',
  height = 260,
  emptyMessage = 'Not enough data yet to show a chart.',
  barAxisLabels,
  lineAxisLabels,
  description,
  showMaxLine = false,
  referenceValue = 100,
  title,
  showEmblem = false,
}: AttendanceChartProps) {
  const gradientId = useId()

  // Category axes key bars by their dataKey, so two data points sharing a label
  // (e.g. two tests on day 3) collapsed onto one slot and hovering the second
  // showed the first one's tooltip. Key by position instead and print the label.
  const keyedBarData = barData.map((d, i) => ({ ...d, _idx: i }))
  const keyedLineData = lineData.map((d, i) => ({ ...d, _idx: i }))
  const labelAtBar = (i: number | string) => keyedBarData[Number(i)]?.label ?? ''
  const labelAtLine = (i: number | string) => keyedLineData[Number(i)]?.label ?? ''

  const coloredPieData = withPieColors(pieData)
  const activeData = type === 'bar' ? barData : type === 'pie' ? pieData : lineData
  const showEmpty = type === 'line' ? lineData.length < 2 : !hasData(activeData)

  // Bar chart Y-axis domain: when any datum is negative (absent marker),
  // widen below zero so the black bar sits distinctly BELOW the 0-line X axis,
  // with enough headroom so it NEVER overlaps with the bottom date labels.
  const hasNegativeBarValue = barData.some((d) => d.value < 0)
  const barMinValue = hasNegativeBarValue ? Math.min(...barData.map((d) => d.value)) : 0
  const barYDomain: [number, number] | undefined = hasNegativeBarValue
    ? [Math.min(-28, barMinValue - 10), 100]
    : undefined

  // Recharts needs extra room to fit an axis title without it overlapping
  // the tick labels — only reserve that space on the axis that has one.
  const barBottomMargin = hasNegativeBarValue ? 42 : !horizontalBars && barAxisLabels?.x ? 24 : 10
  const barLeftMargin = horizontalBars ? 8 : barAxisLabels?.y ? 6 : -8
  const lineBottomMargin = lineAxisLabels?.x ? 24 : 8
  const lineLeftMargin = lineAxisLabels?.y ? 6 : -8

  return (
    <div>
      {(title || showEmblem) && (
        <div className="flex items-center gap-3 mb-3">
          {showEmblem && <ChemistryOctetLogo size={48} static className="shrink-0" />}
          {title && <h4 className="text-base font-bold text-zinc-900 leading-snug">{title}</h4>}
        </div>
      )}
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-[10px] font-semibold tracking-widest uppercase text-zinc-400">Statistics</p>
        <ChartTypeToggle type={type} onTypeChange={onTypeChange} />
      </div>
      {description && <p className="text-xs text-zinc-500 mb-2">{description}</p>}

      {showEmpty ? (
        <div
          className="flex items-center justify-center text-sm text-zinc-400 border border-dashed border-zinc-200 rounded-xl"
          style={{ height }}
        >
          {emptyMessage}
        </div>
      ) : (
        <div style={{ width: '100%', height }}>
          <ResponsiveContainer width="100%" height="100%">
            {type === 'bar' ? (
              <BarChart
                data={keyedBarData}
                layout={horizontalBars ? 'vertical' : 'horizontal'}
                margin={{ top: 12, right: 16, left: barLeftMargin, bottom: barBottomMargin }}
                barCategoryGap={horizontalBars ? '28%' : '32%'}
                barGap={4}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={horizontalBars} horizontal={!horizontalBars} />
                {horizontalBars ? (
                  <>
                    <XAxis
                      type="number"
                      tick={{ fontSize: 12, fill: '#71717a' }}
                      axisLine={false}
                      tickLine={false}
                      label={
                        barAxisLabels
                          ? { value: barAxisLabels.x, position: 'insideBottom', offset: -2, fontSize: 11, fill: '#71717a' }
                          : undefined
                      }
                    />
                    <YAxis
                      type="category"
                      dataKey="_idx"
                      tickFormatter={labelAtBar}
                      width={96}
                      tick={{ fontSize: 12, fill: '#71717a' }}
                      axisLine={false}
                      tickLine={false}
                    />
                  </>
                ) : (
                  <>
                    <XAxis
                      dataKey="_idx"
                      tickFormatter={labelAtBar}
                      tick={{ fontSize: 12, fill: '#71717a', dy: hasNegativeBarValue ? 10 : 0 }}
                      axisLine={false}
                      tickLine={false}
                      label={
                        barAxisLabels
                          ? { value: barAxisLabels.x, position: 'insideBottom', offset: hasNegativeBarValue ? -16 : -6, fontSize: 11, fill: '#71717a' }
                          : undefined
                      }
                    />
                    <YAxis
                      domain={barYDomain}
                      ticks={[0, 25, 50, 75, 100]}
                      tickFormatter={(v) => `${v}${valueSuffix || '%'}`}
                      tick={{ fontSize: 11, fill: '#71717a' }}
                      axisLine={{ stroke: '#18181b', strokeWidth: 1.5 }}
                      tickLine={{ stroke: '#18181b' }}
                      width={barAxisLabels?.y ? 48 : 38}
                      label={
                        barAxisLabels
                          ? { value: barAxisLabels.y, angle: -90, position: 'insideLeft', fontSize: 11, fill: '#71717a' }
                          : undefined
                      }
                    />
                  </>
                )}
                <Tooltip content={<CustomTooltip valueSuffix={valueSuffix} />} cursor={{ fill: '#f4f4f5', opacity: 0.6 }} />

                {/* Bold black 0-line: the real floor. Score bars (0-100) stand on top of it,
                    black absent/never-joined bars hang below it. This is the ONLY horizontal
                    "axis" line drawn — XAxis's own axisLine is disabled above so there is no
                    second, differently-positioned line at the bottom of a widened negative domain. */}
                {!horizontalBars && (
                  <ReferenceLine y={0} stroke="#000000" strokeWidth={2.5} />
                )}
                {showMaxLine && !horizontalBars && (
                  <ReferenceLine y={referenceValue} stroke="#6f4f8e" strokeWidth={1.5} strokeDasharray="3 3" />
                )}
                <Bar
                  dataKey="value"
                  maxBarSize={horizontalBars ? 16 : 40}
                  shape={(props: any) => {
                    const { fill, x, y, width, height } = props
                    // In Recharts, for negative values, height is negative (y(0) - y(value) < 0)
                    // and y is the coordinate of the negative value (near the bottom).
                    // In SVG, <rect> draws downward from y to y + height.
                    // To start from y=0 and go downward: rectY must be y + height (which is y(0))!
                    const isNegative = height < 0
                    const rectY = isNegative ? y + height : y
                    const rectHeight = Math.max(3, Math.abs(height))
                    const rectWidth = Math.max(4, width)
                    const r = 4
                    // Only round the corner that's furthest from the 0-line, so the edge
                    // touching the 0-line always stays a crisp, flush square edge — a
                    // positive score bar's bottom sits flat on the line, and a negative
                    // absent bar's top sits flat on the line too.
                    const path = isNegative
                      ? `M ${x},${rectY}
                         L ${x + rectWidth},${rectY}
                         L ${x + rectWidth},${rectY + rectHeight - r}
                         Q ${x + rectWidth},${rectY + rectHeight} ${x + rectWidth - r},${rectY + rectHeight}
                         L ${x + r},${rectY + rectHeight}
                         Q ${x},${rectY + rectHeight} ${x},${rectY + rectHeight - r}
                         Z`
                      : `M ${x},${rectY + rectHeight}
                         L ${x},${rectY + r}
                         Q ${x},${rectY} ${x + r},${rectY}
                         L ${x + rectWidth - r},${rectY}
                         Q ${x + rectWidth},${rectY} ${x + rectWidth},${rectY + r}
                         L ${x + rectWidth},${rectY + rectHeight}
                         Z`
                    return (
                      <path
                        d={path}
                        fill={fill}
                        className="transition-all duration-200 hover:opacity-85"
                      />
                    )
                  }}
                >
                  {barData.map((entry, i) => (
                    <Cell key={i} fill={entry.color || defaultColor} />
                  ))}
                </Bar>
              </BarChart>
            ) : type === 'pie' ? (
              <PieChart margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                <Tooltip content={<CustomTooltip valueSuffix={valueSuffix} />} />
                <Pie
                  data={coloredPieData}
                  dataKey="value"
                  nameKey="label"
                  cx="50%"
                  cy="50%"
                  innerRadius="52%"
                  outerRadius="80%"
                  paddingAngle={2}
                  strokeWidth={2}
                  stroke="#ffffff"
                  label={({ percent }) => (percent && percent > 0.06 ? `${Math.round(percent * 100)}%` : '')}
                  labelLine={false}
                >
                  {coloredPieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color || defaultColor} />
                  ))}
                </Pie>
              </PieChart>
            ) : (
              <AreaChart data={keyedLineData} margin={{ top: 8, right: 16, left: lineLeftMargin, bottom: lineBottomMargin }}>
                <defs>
                  <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={lineColor} stopOpacity={0.18} />
                    <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" vertical={false} />
                <XAxis
                  dataKey="_idx"
                  tickFormatter={labelAtLine}
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
                  axisLine={{ stroke: '#18181b', strokeWidth: 1.5 }}
                  tickLine={{ stroke: '#18181b' }}
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
      {/* Pie legend lives outside the fixed-height chart so many slices wrap
          onto extra lines instead of overlapping whatever sits below. */}
      {!showEmpty && type === 'pie' && (
        <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 mt-3 text-xs text-zinc-600">
          {coloredPieData.map((d, i) => (
            <li key={i} className="inline-flex items-center gap-1.5 max-w-full">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.color || defaultColor }} />
              <span className="truncate">{d.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
