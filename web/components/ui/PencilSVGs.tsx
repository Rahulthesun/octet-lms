'use client'

import React from 'react'

interface SVGProps {
  width?: number
  height?: number
  color?: string
  strokeWidth?: number
  className?: string
}

/*
  Calligraphy filter: paths stay on their exact geometry (no displacement),
  but the Gaussian blur has different X/Y sigmas so:
    - horizontal strokes spread more → appear thicker
    - vertical strokes spread less  → appear slightly thinner
  The feColorMatrix sharpens the blurred alpha back to a crisp edge,
  so lines look clean, not blurry. Net result: subtle pen-nib weight
  variation — thick on horizontal, tapers toward vertical — exactly like
  a brush-pen or calligraphy nib.
*/
function CalFilter({ id, color }: { id: string; color: string }) {
  return (
    <filter id={id} x="-30%" y="-30%" width="160%" height="160%" colorInterpolationFilters="sRGB">
      {/* More blur in Y → horizontal strokes fatten, vertical stay lean */}
      <feGaussianBlur in="SourceAlpha" stdDeviation="0.28 0.58" result="blur" />
      {/* Threshold: bring blurred edge back to crisp */}
      <feColorMatrix
        in="blur" type="matrix"
        values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 11 -0.8"
        result="shape"
      />
      {/* Fill the resulting shape with the stroke colour */}
      <feFlood floodColor={color} result="col" />
      <feComposite in="col" in2="shape" operator="in" />
    </filter>
  )
}

export function AtomSVG({ width = 120, height = 120, color = '#5e4075', strokeWidth = 1.9, className = '' }: SVGProps) {
  const fid = `cal-atom-${color.replace('#', '')}`
  return (
    <svg width={width} height={height} viewBox="0 0 120 120" fill="none" className={className}>
      <defs><CalFilter id={fid} color={color} /></defs>
      <g filter={`url(#${fid})`} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" fill="none">
        <ellipse cx="60" cy="60" rx="48" ry="18" />
        <ellipse cx="60" cy="60" rx="48" ry="18" transform="rotate(60 60 60)" />
        <ellipse cx="60" cy="60" rx="48" ry="18" transform="rotate(120 60 60)" />
      </g>
      <circle cx="60" cy="60" r="6.5" fill={color} opacity="0.75" />
      <circle cx="108" cy="60" r="4" fill={color} opacity="0.8" />
      <circle cx="36" cy="29" r="4" fill={color} opacity="0.8" />
      <circle cx="36" cy="91" r="4" fill={color} opacity="0.8" />
    </svg>
  )
}

export function FlaskSVG({ width = 110, height = 130, color = '#5e4075', strokeWidth = 1.9, className = '' }: SVGProps) {
  const fid = `cal-flask-${color.replace('#', '')}`
  return (
    <svg width={width} height={height} viewBox="0 0 110 130" fill="none" className={className}>
      <defs><CalFilter id={fid} color={color} /></defs>
      <g filter={`url(#${fid})`} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M 42,8 L 42,52 L 12,105 Q 8,118 20,122 L 90,122 Q 102,118 98,105 L 68,52 L 68,8 Z" />
        <line x1="36" y1="8" x2="74" y2="8" />
        <path d="M 15,95 Q 25,88 40,92 Q 55,96 70,90 Q 85,84 95,90" />
        <path d="M 38,22 L 72,22" strokeDasharray="5 4" opacity="0.6" />
      </g>
      <circle cx="35" cy="108" r="5.5" fill={color} opacity="0.28" />
      <circle cx="60" cy="100" r="4.5" fill={color} opacity="0.22" />
      <circle cx="75" cy="112" r="4" fill={color} opacity="0.26" />
    </svg>
  )
}

export function TestTubeSVG({ width = 70, height = 130, color = '#5e4075', strokeWidth = 1.9, className = '' }: SVGProps) {
  const fid = `cal-tube-${color.replace('#', '')}`
  return (
    <svg width={width} height={height} viewBox="0 0 70 130" fill="none" className={className}>
      <defs><CalFilter id={fid} color={color} /></defs>
      <g filter={`url(#${fid})`} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M 22,5 L 22,90 Q 22,118 35,118 Q 48,118 48,90 L 48,5" />
        <line x1="16" y1="5" x2="54" y2="5" />
        <path d="M 22,80 Q 28,75 35,78 Q 42,81 48,76" />
        <path d="M 22,60 L 48,60" strokeDasharray="4 4" opacity="0.45" />
      </g>
      <circle cx="30" cy="98" r="4.5" fill={color} opacity="0.28" />
      <circle cx="40" cy="108" r="3.5" fill={color} opacity="0.22" />
    </svg>
  )
}

export function MicroscopeSVG({ width = 120, height = 130, color = '#5e4075', strokeWidth = 1.9, className = '' }: SVGProps) {
  const fid = `cal-micro-${color.replace('#', '')}`
  return (
    <svg width={width} height={height} viewBox="0 0 120 130" fill="none" className={className}>
      <defs><CalFilter id={fid} color={color} /></defs>
      <g filter={`url(#${fid})`} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" fill="none">
        <rect x="50" y="8" width="22" height="10" rx="2.5" />
        <line x1="61" y1="18" x2="61" y2="32" />
        <rect x="46" y="32" width="30" height="14" rx="2.5" />
        <line x1="61" y1="46" x2="61" y2="62" />
        <rect x="44" y="62" width="34" height="10" rx="2.5" />
        <path d="M 50,72 L 40,95 L 35,100 Q 30,105 38,108 L 85,108 Q 93,108 90,100 L 82,72 Z" />
        <line x1="25" y1="108" x2="100" y2="108" />
        <path d="M 44,85 Q 50,80 55,85" />
        <circle cx="61" cy="30" r="4.5" />
      </g>
    </svg>
  )
}

export function CompoundSVG({ width = 130, height = 100, color = '#5e4075', strokeWidth = 1.9, className = '' }: SVGProps) {
  const fid = `cal-compound-${color.replace('#', '')}`
  return (
    <svg width={width} height={height} viewBox="0 0 130 100" fill="none" className={className}>
      <defs><CalFilter id={fid} color={color} /></defs>
      <g filter={`url(#${fid})`} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" fill="none">
        <circle cx="65" cy="50" r="11" />
        <circle cx="25" cy="30" r="10" />
        <circle cx="105" cy="30" r="10" />
        <circle cx="20" cy="70" r="10" />
        <circle cx="110" cy="70" r="10" />
        <line x1="35" y1="34" x2="55" y2="44" />
        <line x1="95" y1="34" x2="75" y2="44" />
        <line x1="30" y1="65" x2="55" y2="57" />
        <line x1="100" y1="65" x2="75" y2="57" />
      </g>
      {/* Text labels rendered outside the filter so they stay crisp */}
      <text x="58" y="55" fontSize="11" fill={color} fontFamily="monospace">C</text>
      <text x="18" y="35" fontSize="10" fill={color} fontFamily="monospace">H</text>
      <text x="98" y="35" fontSize="10" fill={color} fontFamily="monospace">O</text>
      <text x="13" y="75" fontSize="10" fill={color} fontFamily="monospace">N</text>
      <text x="103" y="75" fontSize="10" fill={color} fontFamily="monospace">H</text>
    </svg>
  )
}

export function BeakerSVG({ width = 100, height = 120, color = '#5e4075', strokeWidth = 1.9, className = '' }: SVGProps) {
  const fid = `cal-beaker-${color.replace('#', '')}`
  return (
    <svg width={width} height={height} viewBox="0 0 100 120" fill="none" className={className}>
      <defs><CalFilter id={fid} color={color} /></defs>
      <g filter={`url(#${fid})`} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M 20,10 L 20,105 Q 20,115 50,115 Q 80,115 80,105 L 80,10 Z" />
        <line x1="14" y1="10" x2="86" y2="10" />
        <path d="M 20,80 Q 35,73 50,78 Q 65,83 80,76" />
        <line x1="20" y1="55" x2="30" y2="55" />
        <line x1="20" y1="35" x2="30" y2="35" />
        <line x1="20" y1="75" x2="30" y2="75" />
      </g>
      <circle cx="35" cy="95" r="5" fill={color} opacity="0.28" />
      <circle cx="55" cy="92" r="3.5" fill={color} opacity="0.22" />
      <circle cx="68" cy="100" r="4" fill={color} opacity="0.26" />
    </svg>
  )
}

const iconMap: Record<string, (props: SVGProps) => React.ReactElement> = {
  atom: AtomSVG,
  compound: CompoundSVG,
  flask: FlaskSVG,
  testtube: TestTubeSVG,
  microscope: MicroscopeSVG,
  beaker: BeakerSVG,
}

export function ChemIcon({ icon, ...props }: SVGProps & { icon: string }) {
  const Component = iconMap[icon] || AtomSVG
  return <Component {...props} />
}
