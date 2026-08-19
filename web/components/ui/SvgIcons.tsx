interface IconProps {
  className?: string
}

export function IconClipboard({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none">
      <rect x="5" y="3" width="10" height="14" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M 8,3 Q 8,1.5 10,1.5 Q 12,1.5 12,3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M 7,8 L 13,8 M 7,11 L 13,11 M 7,14 L 10,14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

export function IconCheckCircle({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
      <path d="M 6.5,10 L 9,12.5 L 13.5,7.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function IconCalendar({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none">
      <rect x="2" y="4" width="16" height="13" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M 2,8 L 18,8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M 7,2 L 7,6 M 13,2 L 13,6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="7" cy="12" r="1" fill="currentColor" />
      <circle cx="10" cy="12" r="1" fill="currentColor" />
      <circle cx="13" cy="12" r="1" fill="currentColor" />
    </svg>
  )
}

export function IconStar({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none">
      <path d="M 10,2 L 11.8,7.2 L 17.2,7.2 L 12.7,10.4 L 14.5,15.6 L 10,12.4 L 5.5,15.6 L 7.3,10.4 L 2.8,7.2 L 8.2,7.2 Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

export function IconDocument({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none">
      <path d="M 5,3 L 13,3 L 17,7 L 17,17 Q 17,18 16,18 L 4,18 Q 3,18 3,17 L 3,4 Q 3,3 5,3 Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M 13,3 L 13,7 L 17,7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M 7,11 L 13,11 M 7,14 L 11,14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

export function IconBarChart({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none">
      <path d="M 2,17 L 18,17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <rect x="3" y="11" width="4" height="6" rx="0.5" stroke="currentColor" strokeWidth="1.3" />
      <rect x="8" y="7" width="4" height="10" rx="0.5" stroke="currentColor" strokeWidth="1.3" />
      <rect x="13" y="4" width="4" height="13" rx="0.5" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  )
}

export function IconPieChart({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none">
      <path d="M 10,2 A 8,8 0 1 1 3.5,15.2 L 10,10 Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M 10,2 L 10,10 L 3.5,15.2" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  )
}

export function IconLineChart({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none">
      <path d="M 2,17 L 18,17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M 3,13 L 7.5,8 L 11,11.5 L 17,4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="7.5" cy="8" r="1.1" fill="currentColor" />
      <circle cx="11" cy="11.5" r="1.1" fill="currentColor" />
    </svg>
  )
}

export function IconPlay({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
      <path d="M 8,7 L 14,10 L 8,13 Z" fill="currentColor" />
    </svg>
  )
}

export function IconBook({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none">
      <path d="M 3,4 Q 3,3 4,3 L 10,3 L 10,17 L 4,17 Q 3,17 3,16 Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M 17,4 Q 17,3 16,3 L 10,3 L 10,17 L 16,17 Q 17,17 17,16 Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M 10,3 L 10,17" stroke="currentColor" strokeWidth="1" />
    </svg>
  )
}

export function IconRuler({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none">
      <rect x="2" y="7" width="16" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5" transform="rotate(-10 10 10)" />
      <path d="M 5,8.5 L 5,11.5 M 8,8 L 8,11 M 11,7.5 L 11,10.5 M 14,7 L 14,10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

export function IconGlobe({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
      <path d="M 10,2 Q 7,5 7,10 Q 7,15 10,18" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M 10,2 Q 13,5 13,10 Q 13,15 10,18" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M 2.5,8 L 17.5,8 M 2.5,12 L 17.5,12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

export function IconBuilding({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none">
      <path d="M 3,17 L 3,5 Q 3,4 4,4 L 16,4 Q 17,4 17,5 L 17,17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M 1,17 L 19,17" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <rect x="8" y="11" width="4" height="6" rx="0.5" stroke="currentColor" strokeWidth="1.3" />
      <rect x="5" y="7" width="3" height="3" rx="0.5" stroke="currentColor" strokeWidth="1.2" />
      <rect x="12" y="7" width="3" height="3" rx="0.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M 10,1 L 10,4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function IconCheck({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none">
      <path d="M 4,10 L 8,14 L 16,6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function IconPencil({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none">
      <path d="M 14,3 L 17,6 L 7,16 L 3,17 L 4,13 Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M 12,5 L 15,8" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  )
}

export function IconDownload({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none">
      <path d="M 10,3 L 10,13 M 6,9 L 10,13 L 14,9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M 3,16 L 17,16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function IconClose({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none">
      <path d="M 5,5 L 15,15 M 15,5 L 5,15" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function IconXCircle({ className = 'w-5 h-5' }: IconProps) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none">
      <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
      <path d="M 7,7 L 13,13 M 13,7 L 7,13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}
