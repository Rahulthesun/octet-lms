'use client'

interface PencilBorderProps {
  children: React.ReactNode
  color?: string
  className?: string
  strokeWidth?: number
}

export default function PencilBorder({
  children,
  color = '#e9deb5',
  className = '',
  strokeWidth = 2,
}: PencilBorderProps) {
  return (
    <div className={`relative ${className}`}>
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none z-10"
        viewBox="0 0 300 340"
        preserveAspectRatio="none"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <filter id={`rough-${color.replace('#', '')}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="3" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.8" />
        </filter>
        <g filter={`url(#rough-${color.replace('#', '')})`} stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round">
          {/* Top edge */}
          <path d="M 6,7 Q 20,5 40,6 Q 60,7 80,5 Q 100,4 120,6 Q 140,7 160,5 Q 180,4 200,6 Q 220,7 240,5 Q 260,4 280,6 L 294,6" />
          {/* Right edge */}
          <path d="M 294,6 Q 296,20 295,40 Q 294,60 296,80 Q 297,100 295,120 Q 294,140 296,170 Q 297,200 295,230 Q 294,260 296,290 Q 297,315 294,334" />
          {/* Bottom edge */}
          <path d="M 294,334 Q 275,336 255,334 Q 235,333 215,335 Q 195,336 175,334 Q 155,333 135,335 Q 115,336 95,334 Q 75,333 55,335 Q 35,336 15,334 L 6,334" />
          {/* Left edge */}
          <path d="M 6,334 Q 4,315 5,295 Q 6,270 4,245 Q 3,220 5,195 Q 6,170 4,145 Q 3,120 5,95 Q 6,70 4,45 Q 3,25 6,7" />
        </g>
        {/* Second stroke for depth */}
        <g stroke={color} strokeWidth={strokeWidth * 0.6} strokeLinecap="round" opacity="0.4">
          <path d="M 10,12 Q 40,10 80,11 Q 140,10 200,11 Q 250,10 290,12" />
          <path d="M 290,12 Q 292,80 291,170 Q 290,260 292,330" />
          <path d="M 292,330 Q 240,332 180,331 Q 120,330 60,331 Q 30,332 8,330" />
          <path d="M 8,330 Q 10,260 9,170 Q 8,80 10,12" />
        </g>
      </svg>
      {children}
    </div>
  )
}
