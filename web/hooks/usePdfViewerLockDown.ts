'use client'

import { useEffect, useRef, useState, type RefObject } from 'react'

// ─── Mobile Detection ────────────────────────────────────────────────────────

const MOBILE_UA_REGEX = /Android|iPhone|iPad|iPod|Mobile|Windows Phone/i

export function useIsMobileDevice(): boolean | null {
  const [isMobile, setIsMobile] = useState<boolean | null>(null)

  useEffect(() => {
    const uaIsMobile = MOBILE_UA_REGEX.test(navigator.userAgent)
    const narrowViewport = window.matchMedia('(max-width: 820px)').matches
    const hasTouch = navigator.maxTouchPoints > 0
    setIsMobile(uaIsMobile || (narrowViewport && hasTouch))
  }, [])

  return isMobile
}

// ─── Types ───────────────────────────────────────────────────────────────────

export type LockdownStatus =
  | 'clean'
  | 'devtools-warning'   // devtools opened — countdown banner, content blurred
  | 'devtools-blocked'   // stayed open too long — permanent block
  | 'screenshot-blocked' // PrintScreen / Cmd+Shift+3/4/5/6 detected — permanent block

interface LockdownOptions {
  devtoolsGracePeriodMs?: number
  onStatusChange?: (status: LockdownStatus) => void
  onSecurityEvent?: (event: 'devtools_open' | 'devtools_blocked' | 'printscreen') => void
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function usePdfViewerLockdown(
  containerRef: RefObject<HTMLDivElement | null>,
  opts: LockdownOptions = {}
) {
  // Stable refs — prevents effect restarting on every render
  const onStatusChangeRef = useRef(opts.onStatusChange)
  const onSecurityEventRef = useRef(opts.onSecurityEvent)
  const devtoolsGracePeriodRef = useRef(opts.devtoolsGracePeriodMs ?? 10000)

  useEffect(() => {
    onStatusChangeRef.current = opts.onStatusChange
    onSecurityEventRef.current = opts.onSecurityEvent
    devtoolsGracePeriodRef.current = opts.devtoolsGracePeriodMs ?? 10000
  })

  const statusRef = useRef<LockdownStatus>('clean')
  const devtoolsOpenSince = useRef<number | null>(null)
  const blockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const setStatus = (s: LockdownStatus) => {
    if (statusRef.current === s) return
    statusRef.current = s
    onStatusChangeRef.current?.(s)
  }

  const isHardBlocked = () =>
    statusRef.current === 'devtools-blocked' ||
    statusRef.current === 'screenshot-blocked'

  useEffect(() => {
    // ── Element-level listeners (right-click, select, copy) ───────────────
    const preventDefault = (e: Event) => e.preventDefault()

    const attachElListeners = () => {
      const el = containerRef.current
      if (!el) return
      el.addEventListener('contextmenu', preventDefault)
      el.addEventListener('selectstart', preventDefault)
      el.addEventListener('copy', preventDefault)
    }

    attachElListeners()
    const attachRetry = setTimeout(attachElListeners, 50)

    // ── Keyboard block + screenshot key detection ─────────────────────────
    const blockKeys = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()

      // Block devtools / save / print / view-source
      const blocked =
        e.key === 'F12' ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && ['i', 'j', 'c'].includes(k)) ||
        ((e.ctrlKey || e.metaKey) && ['u', 's', 'p'].includes(k))

      if (blocked) {
        e.preventDefault()
        e.stopPropagation()
        return
      }

      // Mac: Cmd+Shift+3/4/5/6
      const isMacScreenshot =
        e.metaKey && e.shiftKey && ['3', '4', '5', '6'].includes(e.key)

      // Windows: PrintScreen key
      const isWindowsPrintScreen = e.key === 'PrintScreen'

      if (isMacScreenshot || isWindowsPrintScreen) {
        e.preventDefault()
        onSecurityEventRef.current?.('printscreen')
        setStatus('screenshot-blocked')
        navigator.clipboard?.writeText('').catch(() => {})
      }
    }
    window.addEventListener('keydown', blockKeys, true)

    // ── Blur on tab/window switch — visual only, no block timer ──────────
    // Blur-based screenshot detection removed — false-positives on every
    // Cmd+Tab that takes longer than the grace period. Detection is
    // keydown-only (PrintScreen + Cmd+Shift+3/4/5/6) which is precise.
    const applyBlur = () => {
      const el = containerRef.current
      if (!el) return
      el.style.filter = 'blur(20px)'
      el.style.userSelect = 'none'
      el.style.pointerEvents = 'none'
    }

    const removeBlur = () => {
      if (isHardBlocked()) return
      const el = containerRef.current
      if (!el) return
      el.style.filter = ''
      el.style.userSelect = ''
      el.style.pointerEvents = ''
    }

    const handleVisibility = () =>
      document.hidden ? applyBlur() : removeBlur()

    window.addEventListener('blur', applyBlur)
    window.addEventListener('focus', removeBlur)
    document.addEventListener('visibilitychange', handleVisibility)

    // ── DevTools detection — window size delta ────────────────────────────
    const THRESHOLD = 100

    const checkDevtools = () => {
      // Don't interfere if screenshot already hard-blocked
      if (statusRef.current === 'screenshot-blocked') return

      const isOpen =
        window.outerWidth - window.innerWidth > THRESHOLD ||
        window.outerHeight - window.innerHeight > THRESHOLD

      if (isOpen) {
        if (devtoolsOpenSince.current === null) {
          devtoolsOpenSince.current = Date.now()
          setStatus('devtools-warning')
          onSecurityEventRef.current?.('devtools_open')
          applyBlur()

          blockTimerRef.current = setTimeout(() => {
            if (statusRef.current === 'devtools-warning') {
              setStatus('devtools-blocked')
              onSecurityEventRef.current?.('devtools_blocked')
            }
          }, devtoolsGracePeriodRef.current)
        }
      } else {
        if (devtoolsOpenSince.current !== null) {
          devtoolsOpenSince.current = null

          if (blockTimerRef.current) {
            clearTimeout(blockTimerRef.current)
            blockTimerRef.current = null
          }

          if (statusRef.current === 'devtools-warning') {
            setStatus('clean')
            removeBlur()
          }
          // devtools-blocked stays blocked — session is done
        }
      }
    }

    window.addEventListener('resize', checkDevtools)
    checkDevtools() // immediate — catches devtools already open on mount
    const devtoolsTimer = setInterval(checkDevtools, 1000)

    // ── Console suppression ───────────────────────────────────────────────
    const noop = () => {}
    const savedConsole = {
      log: console.log, warn: console.warn, error: console.error,
      table: console.table, dir: console.dir, debug: console.debug,
    }
    Object.assign(console, { log: noop, warn: noop, table: noop, dir: noop, debug: noop })

    // ── Cleanup ───────────────────────────────────────────────────────────
    return () => {
      clearTimeout(attachRetry)
      const el = containerRef.current
      if (el) {
        el.removeEventListener('contextmenu', preventDefault)
        el.removeEventListener('selectstart', preventDefault)
        el.removeEventListener('copy', preventDefault)
      }
      window.removeEventListener('keydown', blockKeys, true)
      window.removeEventListener('blur', applyBlur)
      window.removeEventListener('focus', removeBlur)
      window.removeEventListener('resize', checkDevtools)
      document.removeEventListener('visibilitychange', handleVisibility)
      clearInterval(devtoolsTimer)
      if (blockTimerRef.current) clearTimeout(blockTimerRef.current)
      Object.assign(console, savedConsole)
    }
  }, [])
}