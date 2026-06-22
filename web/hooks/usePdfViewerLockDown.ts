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
  | 'devtools-warning'
  | 'devtools-blocked'
  | 'screenshot-logged'

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
  // Stable refs for callbacks — prevents effect from restarting every render
  const onStatusChangeRef = useRef(opts.onStatusChange)
  const onSecurityEventRef = useRef(opts.onSecurityEvent)
  const devtoolsGracePeriodRef = useRef(opts.devtoolsGracePeriodMs ?? 8000)

  useEffect(() => {
    onStatusChangeRef.current = opts.onStatusChange
    onSecurityEventRef.current = opts.onSecurityEvent
    devtoolsGracePeriodRef.current = opts.devtoolsGracePeriodMs ?? 8000
  })

  const statusRef = useRef<LockdownStatus>('clean')
  const devtoolsOpenSince = useRef<number | null>(null)
  const blockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const setStatus = (s: LockdownStatus) => {
    if (statusRef.current === s) return
    statusRef.current = s
    onStatusChangeRef.current?.(s)
  }

  useEffect(() => {
    // ─────────────────────────────────────────────────────────────────────
    // KEY FIX: Do NOT capture containerRef.current as `el` at the top.
    // On first render the component may return null (isMobile hydration
    // guard), so containerRef.current is null and the old code bailed out
    // entirely — killing all listeners including devtools detection.
    //
    // Instead: reference containerRef.current dynamically inside each
    // callback so window-level listeners (devtools, keyboard) always run,
    // and element-level effects (blur, context menu) apply when available.
    // ─────────────────────────────────────────────────────────────────────

    // ── Element-level listeners (right-click, select, copy) ───────────────
    // These need the el — attach lazily and retry after a tick in case
    // the ref populates after the initial null render.
    const preventDefault = (e: Event) => e.preventDefault()

    const attachElListeners = () => {
      const el = containerRef.current
      if (!el) return
      el.addEventListener('contextmenu', preventDefault)
      el.addEventListener('selectstart', preventDefault)
      el.addEventListener('copy', preventDefault)
    }

    attachElListeners()
    // Retry after one tick — covers the case where the ref was null on mount
    const attachRetry = setTimeout(attachElListeners, 50)

    // ── Keyboard block + PrintScreen ──────────────────────────────────────
    const blockKeys = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      const blocked =
        e.key === 'F12' ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && ['i', 'j', 'c'].includes(k)) ||
        ((e.ctrlKey || e.metaKey) && ['u', 's', 'p'].includes(k))

      if (blocked) {
        e.preventDefault()
        e.stopPropagation()
        return
      }

      const isMacScreenshot = e.metaKey && e.shiftKey && ['3', '4', '5', '6'].includes(e.key)

      const isWindowsPrintScreen = e.key === 'PrintScreen'

      if (isMacScreenshot || isWindowsPrintScreen) {
        e.preventDefault() // no-op for OS shortcuts but signals intent
        onSecurityEventRef.current?.('printscreen')
        setStatus('screenshot-logged')
        navigator.clipboard?.writeText('').catch(() => {})
      }
    }
    window.addEventListener('keydown', blockKeys, true)

    // ── Blur on tab/window switch ─────────────────────────────────────────
    // References containerRef.current dynamically — works even if null at mount
    const blurContent = () => {
      const el = containerRef.current
      if (!el) return
      el.style.filter = 'blur(20px)'
      el.style.userSelect = 'none'
      el.style.pointerEvents = 'none'
    }
    const unblurContent = () => {
      if (statusRef.current === 'devtools-blocked') return
      const el = containerRef.current
      if (!el) return
      el.style.filter = ''
      el.style.userSelect = ''
      el.style.pointerEvents = ''
    }
    const handleVisibility = () =>
      document.hidden ? blurContent() : unblurContent()

    window.addEventListener('blur', blurContent)
    window.addEventListener('focus', unblurContent)
    document.addEventListener('visibilitychange', handleVisibility)

    // ── DevTools detection ────────────────────────────────────────────────
    // Pure window dimension check — does NOT need containerRef at all.
    // This is why we must not bail out early if el is null.
    const THRESHOLD = 100

    const checkDevtools = () => {
      const isOpen =
        window.outerWidth - window.innerWidth > THRESHOLD ||
        window.outerHeight - window.innerHeight > THRESHOLD

      if (isOpen) {
        if (devtoolsOpenSince.current === null) {
          devtoolsOpenSince.current = Date.now()
          setStatus('devtools-warning')
          onSecurityEventRef.current?.('devtools_open')
          blurContent() // dynamic ref lookup inside

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
            unblurContent()
          }
        }
      }
    }

    window.addEventListener('resize', checkDevtools)
    checkDevtools() // immediate check — catches devtools already open on mount
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
      window.removeEventListener('blur', blurContent)
      window.removeEventListener('focus', unblurContent)
      window.removeEventListener('resize', checkDevtools)
      document.removeEventListener('visibilitychange', handleVisibility)
      clearInterval(devtoolsTimer)
      if (blockTimerRef.current) clearTimeout(blockTimerRef.current)
      Object.assign(console, savedConsole)
    }
  }, []) // ← empty deps — window listeners don't need containerRef to mount
}