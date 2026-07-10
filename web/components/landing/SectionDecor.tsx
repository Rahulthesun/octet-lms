import type { ComponentType } from 'react'
import { AtomSVG, FlaskSVG, TestTubeSVG, CompoundSVG, BeakerSVG, MicroscopeSVG } from '@/components/ui/PencilSVGs'

/**
 * SectionDecor — faint, STATIC chemistry SVGs tucked into a section's corners,
 * exactly like the hero's watermark (very low opacity, behind the content, no
 * animation). Sits in a `z-0` layer; the content wrapper should be `relative
 * z-10` so nothing here ever covers text. Hidden below `lg` to avoid clutter.
 *
 * Pass a different `variant` per section so the arrangement varies down the page.
 */
type SVGComp = ComponentType<{ width?: number; height?: number; color?: string }>
type Item = { Icon: SVGComp; className: string; w: number; h: number }

/* Positive insets ONLY (never negative) so the SVGs sit fully inside the
   section and are never clipped at an edge or bleed into the next section.
   Kept small so they stay in the corner margins clear of the content. */
const VARIANTS: Item[][] = [
  [
    { Icon: AtomSVG, className: 'top-6 left-6', w: 72, h: 72 },
    { Icon: CompoundSVG, className: 'bottom-6 right-6', w: 78, h: 60 },
  ],
  [
    { Icon: FlaskSVG, className: 'top-6 right-6', w: 62, h: 72 },
    { Icon: BeakerSVG, className: 'bottom-7 left-6', w: 64, h: 74 },
  ],
  [
    { Icon: TestTubeSVG, className: 'top-7 left-7', w: 42, h: 76 },
    { Icon: AtomSVG, className: 'bottom-6 right-7', w: 72, h: 72 },
  ],
  [
    { Icon: MicroscopeSVG, className: 'bottom-7 right-7', w: 76, h: 82 },
    { Icon: CompoundSVG, className: 'top-6 left-6', w: 74, h: 58 },
  ],
  [
    { Icon: BeakerSVG, className: 'top-7 left-6', w: 64, h: 74 },
    { Icon: FlaskSVG, className: 'bottom-6 right-6', w: 62, h: 72 },
  ],
  [
    { Icon: AtomSVG, className: 'top-6 right-7', w: 68, h: 68 },
    { Icon: TestTubeSVG, className: 'bottom-7 left-7', w: 42, h: 76 },
  ],
]

export default function SectionDecor({ variant = 0 }: { variant?: number }) {
  const items = VARIANTS[variant % VARIANTS.length]
  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden hidden lg:block" aria-hidden="true">
      {items.map(({ Icon, className, w, h }, i) => (
        <div key={i} className={`absolute opacity-[0.06] ${className}`}>
          <Icon width={w} height={h} color="#5e4075" />
        </div>
      ))}
    </div>
  )
}
