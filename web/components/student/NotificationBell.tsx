'use client'

// components/student/NotificationBell.tsx
//
// Notification button for the student login — surfaces upcoming online
// classes (Google Meet) scheduled by the admin. Data is always the real
// list from GET /api/online-classes/me/upcoming; the only thing kept in
// localStorage is which class ids this browser has already seen, purely to
// compute the unread badge count — the classes themselves are never mocked.
//
// The dropdown panel is rendered through a portal straight into
// document.body, positioned with `fixed` coordinates measured from the
// bell button itself. It lives inside StudentSidebar, whose root wrapper
// has `overflow-hidden` (needed for the collapse/expand width animation) —
// an absolutely-positioned panel nested inside that gets silently clipped
// to the sidebar's own bounds. Portaling out of that DOM subtree avoids the
// clipping entirely, regardless of sidebar width or collapsed state.

import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { useMyOnlineClasses } from '@/hooks/useOnlineClasses'
import { formatDateInZone, formatTimeInZone } from '@/lib/helpers'

const SEEN_KEY = 'octet_seen_online_classes'
const PANEL_WIDTH = 320 // px, matches w-80
const VIEWPORT_MARGIN = 12 // px, keep the panel off the screen edge

function readSeenIds(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = window.localStorage.getItem(SEEN_KEY)
    return raw ? new Set(JSON.parse(raw)) : new Set()
  } catch {
    return new Set()
  }
}

function writeSeenIds(ids: Set<string>) {
  try {
    window.localStorage.setItem(SEEN_KEY, JSON.stringify(Array.from(ids)))
  } catch {
    // localStorage unavailable (private browsing etc.) — badge just won't persist across reloads.
  }
}

export default function NotificationBell() {
  const { classes } = useMyOnlineClasses()
  const [open, setOpen] = useState(false)
  const [seenVersion, setSeenVersion] = useState(0)
  const [mounted, setMounted] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [panelPos, setPanelPos] = useState<{ top: number; left: number } | null>(null)

  useEffect(() => setMounted(true), [])

  const upcoming = useMemo(() => {
    const now = Date.now()
    return classes
      .filter((c) => c.status !== 'cancelled' && new Date(c.scheduledEnd).getTime() >= now)
      .sort((a, b) => new Date(a.scheduledStart).getTime() - new Date(b.scheduledStart).getTime())
      .slice(0, 8)
  }, [classes])

  const unseenCount = useMemo(() => {
    const seen = readSeenIds()
    return upcoming.filter((c) => !seen.has(c.id)).length
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [upcoming, seenVersion])

  function computePosition() {
    const rect = buttonRef.current?.getBoundingClientRect()
    if (!rect) return
    const left = Math.min(
      Math.max(rect.right - PANEL_WIDTH, VIEWPORT_MARGIN),
      window.innerWidth - PANEL_WIDTH - VIEWPORT_MARGIN
    )
    setPanelPos({ top: rect.bottom + 8, left })
  }

  function toggleOpen() {
    setOpen((wasOpen) => {
      const nowOpen = !wasOpen
      if (nowOpen) {
        computePosition()
        const seen = readSeenIds()
        upcoming.forEach((c) => seen.add(c.id))
        writeSeenIds(seen)
        setSeenVersion((n) => n + 1)
      }
      return nowOpen
    })
  }

  // Keep the panel aligned to the button if the window is resized/scrolled while open.
  useEffect(() => {
    if (!open) return
    const handle = () => computePosition()
    window.addEventListener('resize', handle)
    window.addEventListener('scroll', handle, true)
    return () => {
      window.removeEventListener('resize', handle)
      window.removeEventListener('scroll', handle, true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  return (
    <>
      <button
        ref={buttonRef}
        onClick={toggleOpen}
        className="relative w-9 h-9 flex items-center justify-center rounded-md text-[#64748b] hover:bg-[#F4F1F8] hover:text-[#7A6B96] transition-colors"
        aria-label="Notifications"
        title="Notifications"
      >
        <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none">
          <path d="M5 8a5 5 0 0 1 10 0c0 3 1 4.5 1.5 5h-13C4 12.5 5 11 5 8Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M8 16a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
        {unseenCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] leading-4 text-center">
            {unseenCount > 9 ? '9+' : unseenCount}
          </span>
        )}
      </button>

      {mounted && open && panelPos && createPortal(
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            className="fixed w-80 bg-white border border-[#e2e5ec] rounded-lg shadow-[0_8px_30px_rgba(15,23,42,0.12)] z-50 overflow-hidden"
            style={{ top: panelPos.top, left: panelPos.left }}
          >
            <div className="px-4 py-3 border-b border-[#e2e5ec]">
              <p className="text-sm text-primary">Upcoming online classes</p>
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-[#F4F1F8]">
              {upcoming.length === 0 ? (
                <p className="px-4 py-6 text-sm text-muted text-center">No upcoming classes.</p>
              ) : (
                upcoming.map((c) => (
                  <div key={c.id} className="px-4 py-3">
                    <p className="text-sm text-primary truncate">{c.title}</p>
                    <p className="text-xs text-muted mt-0.5">
                      {formatDateInZone(c.scheduledStart, c.timezone)} · {formatTimeInZone(c.scheduledStart, c.timezone)}
                    </p>
                    {c.meetUrl && (
                      <a
                        href={c.meetUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block mt-1.5 text-xs text-brand hover:underline"
                      >
                        Join Google Meet
                      </a>
                    )}
                  </div>
                ))
              )}
            </div>
            <Link
              href="/student/classes"
              onClick={() => setOpen(false)}
              className="block text-center text-xs text-muted hover:text-brand px-4 py-2.5 border-t border-[#e2e5ec] transition-colors"
            >
              View all online classes
            </Link>
          </div>
        </>,
        document.body
      )}
    </>
  )
}
