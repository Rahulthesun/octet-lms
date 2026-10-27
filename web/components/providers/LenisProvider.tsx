'use client'

import { useEffect } from 'react'
import Lenis from 'lenis'

export default function LenisProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.4,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      // Modals/portals render outside <main>, so Lenis was swallowing the wheel
      // before their own overflow-y-auto containers could scroll. Let any nested
      // scrollable element handle its own wheel events.
      allowNestedScroll: true,
      prevent: (node) => !!node.closest('[role="dialog"], .fixed.inset-0'),
    })

    function raf(time: number) {
      lenis.raf(time)
      requestAnimationFrame(raf)
    }

    const rafId = requestAnimationFrame(raf)

    return () => {
      cancelAnimationFrame(rafId)
      lenis.destroy()
    }
  }, [])

  return <>{children}</>
}
