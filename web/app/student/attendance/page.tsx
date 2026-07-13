'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import jsQR from 'jsqr'
import { supabase } from '@/lib/supabase/client'
import { attendance } from '@/lib/mockData'
import { CalendarCheck2, CalendarX2, Wifi, MapPin } from 'lucide-react'
import {formatDate}  from '../../../lib/helpers'


// ─── Auth fetch helper ─────────────────────────────────────────────────────
const API_BASE = process.env.NEXT_PUBLIC_SERVER_URL ?? ''
async function authedFetch(path: string, init?: RequestInit) {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    throw new Error(body?.error || body?.message || `Scan failed: ${res.status}`)
  }
  return res.status === 204 ? null : res.json()
}
const submitScan = (token: string) =>
  authedFetch('/api/attendance/scan', { method: 'POST', body: JSON.stringify({ qrToken: token }) })

// ─── Scan states ────────────────────────────────────────────────────────────
type ScanState = 'idle' | 'requesting' | 'scanning' | 'success' | 'error'

// ─── QR Scanner ─────────────────────────────────────────────────────────────

function QRScanner({ onClose }: { onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | null>(null)
  const [state, setState] = useState<ScanState>('requesting')
  const [errorMsg, setErrorMsg] = useState('')

  const stopCamera = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
  }, [])

  const tick = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(tick)
      return
    }
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert',
    })

    if (code?.data) {
      handleDecoded(code.data)
      return
    }
    rafRef.current = requestAnimationFrame(tick)
  }, [])

  async function handleDecoded(token: string) {
    stopCamera()
    try {
      await submitScan(token)
      setState('success')
      setTimeout(onClose, 1400)
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Could not mark attendance')
      setState('error')
    }
  }

  useEffect(() => {
    let cancelled = false
    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        })
        if (cancelled) { stream.getTracks().forEach(t => t.stop()); return }
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
        setState('scanning')
        rafRef.current = requestAnimationFrame(tick)
      } catch (err) {
        console.error("Camera error:", err);
        console.log("isSecureContext:", window.isSecureContext);
        console.log("mediaDevices:", navigator.mediaDevices);

        setErrorMsg(
          err instanceof Error ? err.message : "Failed to access camera"
        );
        setState("error");
      }
    }
    start()
    return () => { cancelled = true; stopCamera() }
  }, [tick, stopCamera])

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black z-50 flex flex-col"
    >
      <div className="relative flex-1 overflow-hidden">
        <video ref={videoRef} muted playsInline className="absolute inset-0 w-full h-full object-cover" />
        <canvas ref={canvasRef} className="hidden" />

        {state === 'scanning' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative w-64 h-64">
              <div className="absolute inset-0 border-2 border-white/30 rounded-2xl" />
              {(['top-0 left-0', 'top-0 right-0', 'bottom-0 left-0', 'bottom-0 right-0'] as const).map(pos => (
                <div key={pos} className={`absolute ${pos} w-8 h-8 border-brand`}
                  style={{
                    borderTopWidth: pos.includes('top') ? 4 : 0,
                    borderBottomWidth: pos.includes('bottom') ? 4 : 0,
                    borderLeftWidth: pos.includes('left') ? 4 : 0,
                    borderRightWidth: pos.includes('right') ? 4 : 0,
                    borderRadius: 6,
                  }} />
              ))}
              <motion.div
                className="absolute left-0 right-0 h-0.5 bg-brand shadow-[0_0_8px_rgba(122,107,150,0.8)]"
                animate={{ top: ['4%', '94%', '4%'] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
              />
            </div>
          </div>
        )}

        {(state === 'requesting') && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60">
            <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            <p className="text-white text-sm">Opening camera…</p>
          </div>
        )}

        <AnimatePresence>
          {state === 'success' && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-emerald-600/95 flex flex-col items-center justify-center gap-3"
            >
              <motion.svg initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 200 }}
                className="w-16 h-16 text-white" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
                <path d="M7 12l3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </motion.svg>
              <p className="text-white text-lg font-medium">Attendance marked</p>
            </motion.div>
          )}
          {state === 'error' && (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-rose-600/95 flex flex-col items-center justify-center gap-3 px-8 text-center"
            >
              <svg className="w-14 h-14 text-white" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
                <path d="M8 8l8 8M16 8l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
              <p className="text-white text-base">{errorMsg}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="bg-black px-6 py-5 flex items-center justify-center gap-3 shrink-0">
        <button
          onClick={onClose}
          className="px-6 py-3 rounded-full bg-white/10 text-white text-sm font-medium hover:bg-white/20 transition-colors"
        >
          {state === 'error' ? 'Close' : 'Cancel'}
        </button>
      </div>
    </motion.div>
  )
}


// ─── Month arrow timeline ───────────────────────────────────────────────────

const WEEKDAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function DayDot({
  day,
  status,
  isToday,
}: {
  day: number
  status: 'present' | 'absent' | null
  isToday: boolean
}) {
  const dotColor =
    status === 'present' ? 'bg-emerald-500' :
    status === 'absent'  ? 'bg-rose-500' :
    'bg-gray-400'

  // Marked days get a solid, clearly-visible dot with depth.
  // No-class days are visibly smaller AND lower contrast, but still legible.
  const dotSize = status ? 'w-4 h-4 shadow-sm' : 'w-2.5 h-2.5'

  return (
    <div
      className={`flex flex-col items-center justify-center gap-2 py-3 rounded-lg transition-colors ${
        isToday ? 'bg-primary/5' : 'hover:bg-gray-50'
      }`}
      title={`Day ${day}`}
    >
      <div className="relative flex items-center justify-center w-4 h-4">
        {isToday && (
          <span className="absolute inset-0 rounded-full ring-2 ring-primary ring-offset-2" />
        )}
        <div className={`rounded-full ${dotSize} ${dotColor}`} />
      </div>
      <span
        className={`text-[12px] tabular-nums ${
          isToday ? 'font-bold text-primary' : 'font-medium text-gray-500'
        }`}
      >
        {day}
      </span>
      
    </div>
  )
}

function MonthTimeline() {
  const now = new Date()
  const [monthOffset, setMonthOffset] = useState(0)

  const viewDate = new Date(now.getFullYear(), now.getMonth() + monthOffset, 1)
  const monthLabel = viewDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate()
  const isCurrentMonth = monthOffset === 0

  // Roll up attendance.history into per-day status. Swap for a real
  // `/api/attendance/students/me/month?month=...` fetch once that endpoint exists —
  // shape stays the same: Record<dayNumber, 'present' | 'absent'>.
  const dayStatus = useMemo(() => {
    const map: Record<number, 'present' | 'absent'> = {}
    attendance.history.forEach(r => {
      const d = new Date(r.date)
      if (d.getFullYear() === viewDate.getFullYear() && d.getMonth() === viewDate.getMonth()) {
        const day = d.getDate()
        if (map[day] !== 'present') map[day] = r.status as 'present' | 'absent'
      }
    })
    return map
  }, [viewDate])

  const presentCount = Object.values(dayStatus).filter(s => s === 'present').length
  const totalMarked = Object.keys(dayStatus).length
  const pct = totalMarked > 0 ? Math.round((presentCount / totalMarked) * 100) : null

  // Leading blanks so day 1 lands on its correct weekday column (Sun-start)
  const leadingBlanks = viewDate.getDay()
  const cells: (number | null)[] = [
    ...Array(leadingBlanks).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  return (
    <div className="bg-white rounded-lg border border-[#e2e5ec] shadow-[0_2px_12px_rgba(15,23,42,0.06)] overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#e2e5ec]">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMonthOffset(o => o - 1)}
            className="w-7 h-7 flex items-center justify-center rounded-md text-muted hover:bg-accent1/20 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <h2 className="text-primary text-base min-w-[140px] text-center">{monthLabel}</h2>
          <button
            onClick={() => setMonthOffset(o => Math.min(0, o + 1))}
            disabled={isCurrentMonth}
            className="w-7 h-7 flex items-center justify-center rounded-md text-muted hover:bg-accent1/20 transition-colors disabled:opacity-30"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
        {pct !== null && (
          <span className="text-sm font-data text-primary">{pct}%</span>
        )}
      </div>

      <div className="px-5 py-6">
        {/* Weekday header row */}
        <div className="grid grid-cols-7">
          {WEEKDAY_LABELS.map((label, i) => (
            <div key={i} className="text-center text-[11px] font-medium text-muted/70">
              {label}
            </div>
          ))}
        </div>

        {/* Calendar grid — full width, wraps naturally by week */}
        <div className="grid grid-cols-7">
          {cells.map((day, i) =>
            day === null ? (
              <div key={`blank-${i}`} />
            ) : (
              <DayDot
                key={day}
                day={day}
                status={dayStatus[day] ?? null}
                isToday={isCurrentMonth && day === now.getDate()}
              />
            )
          )}
        </div>
      </div>

      <div className="flex items-center gap-5 px-5 py-3 border-t border-[#e2e5ec] text-[13px] text-muted">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          Present
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
          Absent
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-gray-300" />
          No class
        </div>
      </div>
    </div>
  )
}
// ─── Detailed history list (toggleable) ─────────────────────────────────────


function HistoryList() {
  const [open, setOpen] = useState(false)

  return (
    <div className="bg-white rounded-lg border border-[#e2e5ec] shadow-[0_2px_12px_rgba(15,23,42,0.06)] overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-accent1/10 transition-colors"
      >
        <h2 className="text-primary text-base">Attendance History</h2>
        <svg
          className={`w-5 h-5 text-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          viewBox="0 0 20 20" fill="none"
        >
          <path d="M5 8l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden border-t border-[#e2e5ec]"
          >
            <div className="divide-y divide-[#F4F1F8]">
              {attendance.history.map(record => {
                const isPresent = record.status === 'present'
                const isOnline = record.type === 'online'

                return (
                  <div
                    key={record.id}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50/70 transition-colors"
                  >
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ring-1 ${
                        isPresent
                          ? 'bg-emerald-50 text-emerald-600 ring-emerald-100'
                          : 'bg-rose-50 text-rose-600 ring-rose-100'
                      }`}
                    >
                      {isPresent ? (
                        <CalendarCheck2 className="w-5 h-5" strokeWidth={1.75} />
                      ) : (
                        <CalendarX2 className="w-5 h-5" strokeWidth={1.75} />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-primary text-[15px]">
                        Marked{' '}
                        <span className={isPresent ? 'text-emerald-600' : 'text-rose-600'}>
                          {record.status}
                        </span>{' '}
                        for <span className="text-muted">{record.type}</span> class
                      </p>
                      <p className="text-border text-[13px] text-gray-500 font-data mt-0.5">
                        {formatDate(record.date)} at {record.time}
                      </p>
                    </div>

                  </div>
                )
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Page ───────────────────────────────────────────────────────────────────

export default function AttendancePage() {
  const [scannerOpen, setScannerOpen] = useState(false)

  return (
    <div className="p-5 lg:p-8 max-w-screen mx-auto pb-10 space-y-5">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
        <h1 className="text-3xl text-primary mb-1">Attendance</h1>
        <p className="text-muted text-base">Scan in class, check your history below</p>
      </motion.div>

      {/* Scan CTA — the whole point of the page, so it goes first and big */}
      <motion.button
        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
        onClick={() => setScannerOpen(true)}
        className="w-full bg-brand rounded-xl px-6 py-7 flex items-center gap-4 shadow-[0_4px_20px_rgba(122,107,150,0.35)] active:scale-[0.98] transition-transform"
      >
        <div className="w-12 h-12 rounded-full bg-white/15 flex items-center justify-center shrink-0">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="3" width="7" height="7" rx="1" stroke="white" strokeWidth="1.8" />
            <rect x="14" y="3" width="7" height="7" rx="1" stroke="white" strokeWidth="1.8" />
            <rect x="3" y="14" width="7" height="7" rx="1" stroke="white" strokeWidth="1.8" />
            <path d="M14 14h3v3h-3zM20 14v3M14 20h3M20 20v.01" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </div>
        <div className="text-left">
          <p className="text-white text-lg font-medium">Scan to mark attendance</p>
          <p className="text-white/70 text-sm mt-0.5">Tap to open camera</p>
        </div>
      </motion.button>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.15 }}>
        <MonthTimeline />
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }}>
        <HistoryList />
      </motion.div>

      <AnimatePresence>
        {scannerOpen && <QRScanner onClose={() => setScannerOpen(false)} />}
      </AnimatePresence>
    </div>
  )
}