'use client'

import { useEffect } from 'react'

/**
 * AnimatedFavicon
 * ---------------------------------------------------------------------------
 * A favicon can't be a live React/canvas component — the browser only loads a
 * static image. This gets around that with the "canvas → favicon" trick: it
 * draws a simplified Chemistry@OCTET atom (nucleus + orbiting electrons) to a
 * tiny offscreen canvas ~12 times a second and repoints <link rel="icon"> at
 * each frame, so the tab icon genuinely animates while the page is open.
 *
 * Falls back gracefully: the static /favicon.svg shows before this mounts and
 * in any tab that isn't the active page; motion is skipped for users who ask
 * for reduced motion; and drawing pauses whenever the tab is hidden.
 */
const TAU = Math.PI * 2
const FRAME_MS = 80 // ~12.5 fps

export default function AnimatedFavicon() {
  useEffect(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 64
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Take over the icon: stash existing icon links, then install our own.
    const head = document.head
    const previous = Array.from(
      head.querySelectorAll('link[rel~="icon"], link[rel="shortcut icon"]')
    ) as HTMLLinkElement[]
    previous.forEach((l) => l.remove())

    const link = document.createElement('link')
    link.rel = 'icon'
    link.type = 'image/png'
    head.appendChild(link)

    const tilts = [0, Math.PI / 3, -Math.PI / 3]
    const speeds = [1.7, 1.3, 1.05]
    const nucleons: [number, number, string, number][] = [
      [0, 0, '#cc2040', 2.4],
      [3.4, 0, '#2040cc', 2.1],
      [3.4, 2.1, '#cc2040', 2.1],
      [3.6, 4.2, '#2040cc', 1.9],
    ]

    function draw(now: number) {
      const g = ctx as CanvasRenderingContext2D
      g.clearRect(0, 0, 64, 64)

      // disc + outer ring
      g.beginPath(); g.arc(32, 32, 31, 0, TAU); g.fillStyle = '#f8f9ed'; g.fill()
      g.beginPath(); g.arc(32, 32, 28, 0, TAU); g.strokeStyle = '#7a6898'; g.lineWidth = 3.2; g.stroke()

      // three tilted orbits with a pair of electrons each
      const t = now / 1000
      tilts.forEach((tilt, k) => {
        g.save()
        g.translate(32, 32)
        g.rotate(tilt)
        g.beginPath(); g.ellipse(0, 0, 20, 8, 0, 0, TAU)
        g.strokeStyle = 'rgba(122,92,160,0.55)'; g.lineWidth = 1; g.stroke()
        const a = t * speeds[k]
        ;[a, a + Math.PI].forEach((ang) => {
          const x = 20 * Math.cos(ang)
          const y = 8 * Math.sin(ang)
          const grad = g.createRadialGradient(x - 0.7, y - 0.7, 0, x, y, 2.7)
          grad.addColorStop(0, '#c0a0f0')
          grad.addColorStop(1, '#5e3d86')
          g.beginPath(); g.arc(x, y, 2.7, 0, TAU); g.fillStyle = grad; g.fill()
        })
        g.restore()
      })

      // nucleus — a small cluster of protons/neutrons drifting
      const tn = now / 850
      nucleons.forEach(([r, ph, col, rad]) => {
        const x = 32 + r * Math.cos(tn + ph)
        const y = 32 + r * Math.sin(tn + ph)
        g.beginPath(); g.arc(x, y, rad, 0, TAU); g.fillStyle = col; g.fill()
      })

      link.href = canvas.toDataURL('image/png')
    }

    // Reduced motion → one static frame, no loop.
    const reduce =
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    draw(0)
    if (reduce) {
      return () => {
        link.remove()
        previous.forEach((l) => head.appendChild(l))
      }
    }

    let raf = 0
    let last = 0
    const loop = (now: number) => {
      if (!document.hidden && now - last >= FRAME_MS) {
        last = now
        draw(now)
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(raf)
      link.remove()
      previous.forEach((l) => head.appendChild(l))
    }
  }, [])

  return null
}
