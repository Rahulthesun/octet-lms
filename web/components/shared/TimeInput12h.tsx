'use client'

// A 12-hour AM/PM time picker that behaves like a native <input type="time">
// from the outside: value and onChange both use 24h "HH:mm" strings, so it's
// a drop-in replacement wherever the app already stores/sends 24h time —
// only the editing UI itself is 12-hour.

interface TimeInput12hProps {
  id?: string
  value: string // "HH:mm", 24h
  onChange: (value: string) => void
  className?: string
  disabled?: boolean
}

function to12h(value: string): { hour12: string; minute: string; period: 'AM' | 'PM' } {
  const [hStr, mStr] = (value || '').split(':')
  let h = parseInt(hStr, 10)
  const m = parseInt(mStr, 10)
  if (Number.isNaN(h)) h = 9
  const period: 'AM' | 'PM' = h >= 12 ? 'PM' : 'AM'
  let hour12 = h % 12
  if (hour12 === 0) hour12 = 12
  return {
    hour12: String(hour12).padStart(2, '0'),
    minute: String(Number.isNaN(m) ? 0 : m).padStart(2, '0'),
    period,
  }
}

function to24h(hour12: string, minute: string, period: 'AM' | 'PM'): string {
  let h = parseInt(hour12, 10) % 12
  if (period === 'PM') h += 12
  return `${String(h).padStart(2, '0')}:${minute.padStart(2, '0')}`
}

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'))
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'))

export default function TimeInput12h({ id, value, onChange, className, disabled }: TimeInput12hProps) {
  const { hour12, minute, period } = to12h(value)
  const selectCls = className ?? 'px-2.5 py-2 rounded-lg border border-zinc-300 bg-white text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-primary/20'

  return (
    <div id={id} className="flex items-center gap-1.5">
      <select
        aria-label="Hour"
        disabled={disabled}
        value={hour12}
        onChange={(e) => onChange(to24h(e.target.value, minute, period))}
        className={selectCls}
      >
        {HOURS.map((h) => <option key={h} value={h}>{h}</option>)}
      </select>
      <span className="text-zinc-400">:</span>
      <select
        aria-label="Minute"
        disabled={disabled}
        value={minute}
        onChange={(e) => onChange(to24h(hour12, e.target.value, period))}
        className={selectCls}
      >
        {MINUTES.map((m) => <option key={m} value={m}>{m}</option>)}
      </select>
      <select
        aria-label="AM or PM"
        disabled={disabled}
        value={period}
        onChange={(e) => onChange(to24h(hour12, minute, e.target.value as 'AM' | 'PM'))}
        className={selectCls}
      >
        <option value="AM">AM</option>
        <option value="PM">PM</option>
      </select>
    </div>
  )
}
