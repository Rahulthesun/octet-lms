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
// Used by the exam runner page for both the live test and the post-test
// review — never anywhere else (e.g. never in the admin question bank).

import { useEffect, useState } from 'react'

/** Attaches the anti-copy/anti-download listeners while `active` is true. Returns whether the page should currently render blurred (tab not focused/visible). */
export function useExamGuard(active: boolean) {
  const [blurred, setBlurred] = useState(false)

  useEffect(() => {
    if (!active) {
      setBlurred(false)
      return
    }

    const prevent = (e: Event) => e.preventDefault()

    const onKeyDown = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      const modifier = e.ctrlKey || e.metaKey
      const blocked =
        (modifier && ['s', 'p', 'c', 'u'].includes(k)) || // save / print / copy / view-source
        (modifier && e.shiftKey && ['i', 'j', 'c'].includes(k)) || // devtools
        e.key === 'F12' ||
        e.key === 'PrintScreen'
      if (blocked) {
        e.preventDefault()
        e.stopPropagation()
      }
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
 * relative` or similar). Only meant for the post-exam question/answer
 * review — never during authoring, and never in the admin question bank.
 */
export function Watermark({ lines }: { lines: string[] }) {
  const cells = Array.from({ length: 24 })
  return (
    <div aria-hidden className="pointer-events-none select-none absolute inset-0 overflow-hidden z-20">
      <div className="absolute -inset-[25%] grid grid-cols-4 grid-rows-6 place-items-center rotate-[-28deg] opacity-[0.08]">
        {cells.map((_, i) => (
          <div key={i} className="text-center leading-tight text-primary whitespace-nowrap">
            {lines.map((line, j) => (
              <div key={j} className="text-[12px]">{line}</div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
