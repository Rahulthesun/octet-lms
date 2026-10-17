'use client'

// components/shared/ExamSecurity.tsx
//
// Deterrents against copying, downloading and screenshotting an exam page
// (during the live test AND while a student later reviews their questions
// and answers). A web page cannot make screen capture technically
// impossible — no browser API blocks the OS screenshot/screen-recording
// path — so this combines everything a page CAN actually do:
//   - blocks the in-browser copy/paste/save/print paths (right-click, text
//     selection, copy/cut, image drag, Ctrl+S / Ctrl+P / Ctrl+U, devtools
//     shortcuts, the PrintScreen key so far as a keydown handler can see it)
//   - blurs the content the instant the tab loses focus or is hidden, so a
//     second monitor / screen-recorder switching away mid-capture gets a
//     blurred frame, and restores it the instant focus returns
//   - a translucent, tiled watermark identifying the student, so a leaked
//     screenshot can always be traced back to whoever took it
// Used by the exam runner page for the live test, and the tiled Watermark
// below is also reused in the admin question-bank views so an admin's own
// screenshot of a question paper can be traced.

import { useEffect, useState } from 'react'
import { useWatermarkToken } from '@/hooks/useWatermarkToken'

/** Attaches the anti-copy/anti-download listeners while `active` is true. Returns whether the page should currently render blurred (tab not focused/visible). */
export function useExamGuard(active: boolean) {
  const [blurred, setBlurred] = useState(false)

  useEffect(() => {
    if (!active) {
      setBlurred(false)
      return
    }

    const prevent = (e: Event) => e.preventDefault()

    // A capture keypress (PrintScreen, the Mac screenshot combos, Windows'
    // Snipping Tool shortcut) blurs the content immediately, not just on
    // blur/visibilitychange — those capture tools don't always take focus
    // away from the page, so waiting for a focus change would miss them.
    // There's no "screenshot was taken" event the browser can see, so this
    // stays blurred for a few seconds rather than snapping back instantly
    // (an instant unblur could land the un-blurred frame in a slower
    // capture, e.g. a delayed Snipping Tool selection or a screen recording).
    let flashTimer: ReturnType<typeof setTimeout> | null = null
    const flashBlur = () => {
      setBlurred(true)
      if (flashTimer) clearTimeout(flashTimer)
      flashTimer = setTimeout(() => setBlurred(false), 2500)
    }

    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      const modifier = e.ctrlKey || e.metaKey
      const isCapture =
        e.key === 'PrintScreen' ||
        (e.metaKey && e.shiftKey && ['3', '4', '5', '6'].includes(k)) || // macOS screenshot/screen-recording
        (e.metaKey && e.shiftKey && k === 's') || // Windows Snipping Tool (Win+Shift+S)
        (e.metaKey && k === 'g') // macOS Game Bar-style capture on some setups
      const blocked =
        isCapture ||
        (modifier && ['s', 'p', 'c', 'u'].includes(k)) || // save / print / copy / view-source
        (modifier && e.shiftKey && ['i', 'j', 'c'].includes(k)) || // devtools
        e.key === 'F12'
      if (blocked) {
        e.preventDefault()
        e.stopPropagation()
      }
      if (isCapture) flashBlur()
    }

    const onVisibility = () => setBlurred(document.hidden)
    const onBlur = () => setBlurred(true)
    const onFocus = () => setBlurred(false)

    document.addEventListener('contextmenu', prevent)
    document.addEventListener('copy', prevent)
    document.addEventListener('cut', prevent)
    document.addEventListener('selectstart', prevent)
    document.addEventListener('dragstart', prevent)
    document.addEventListener('keydown', onKeyDown, true)
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('blur', onBlur)
    window.addEventListener('focus', onFocus)

    return () => {
      if (flashTimer) clearTimeout(flashTimer)
      document.removeEventListener('contextmenu', prevent)
      document.removeEventListener('copy', prevent)
      document.removeEventListener('cut', prevent)
      document.removeEventListener('selectstart', prevent)
      document.removeEventListener('dragstart', prevent)
      document.removeEventListener('keydown', onKeyDown, true)
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('blur', onBlur)
      window.removeEventListener('focus', onFocus)
    }
  }, [active])

  return { blurred }
}

/**
 * Translucent tiled watermark over its parent (which must be `position:
 * relative` or similar). Generic/reusable: used during the live exam, and
 * also over admin question-bank/question-paper views.
 */
export function Watermark({ lines }: { lines: string[] }) {
  // Per-viewer trace token, the same one baked into the content-PDF
  // watermark (useWatermarkToken() / PDFViewer.tsx drawWatermark()) — so a
  // leaked screenshot of a question screen can be traced back to whoever
  // viewed it, exactly like a leaked PDF page can.
  const viewerToken = useWatermarkToken()
  const allLines = viewerToken ? [...lines, viewerToken] : lines
  const cells = Array.from({ length: 24 })
  return (
    <div aria-hidden className="pointer-events-none select-none absolute inset-0 overflow-hidden z-20">
      <div className="absolute -inset-[25%] grid grid-cols-4 grid-rows-6 place-items-center rotate-[-28deg] opacity-[0.38]">
        {cells.map((_, i) => (
          <div key={i} className="text-center leading-tight text-black whitespace-nowrap font-bold">
            {allLines.map((line, j) => (
              <div key={j} className="text-[13px]">{line}</div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
