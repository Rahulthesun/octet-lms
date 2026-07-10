'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import ChemistryOctetLogo from '@/components/ui/ChemistryOctetLogo'

const navItems = [
  {
    href: '/student',
    label: 'Dashboard',
    icon: (
      <svg className="w-5.5 h-5.5 shrink-0" viewBox="0 0 20 20" fill="none">
        <rect x="2" y="2" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" />
        <rect x="11" y="2" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" />
        <rect x="2" y="11" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" />
        <rect x="11" y="11" width="7" height="7" rx="1" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    href: '/student/courses',
    label: 'Video Lessons',
    icon: (
      <svg className="w-5.5 h-5.5 shrink-0" viewBox="0 0 20 20" fill="none">
        <rect x="2" y="5" width="11" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M 13,9 L 18,6 L 18,14 L 13,11 Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: '/student/notes',
    label: 'PDF Notes',
    icon: (
      <svg className="w-5.5 h-5.5 shrink-0" viewBox="0 0 20 20" fill="none">
        <path d="M 5,2 L 12,2 L 16,6 L 16,18 Q 16,18 15,18 L 5,18 Q 4,18 4,17 L 4,3 Q 4,2 5,2 Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M 12,2 L 12,6 L 16,6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M 7,11 L 13,11 M 7,14 L 11,14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: '/student/attendance',
    label: 'Attendance',
    icon: (
      <svg className="w-5.5 h-5.5 shrink-0" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
        <path d="M 10,5 L 10,10 L 14,12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: '/student/tests',
    label: 'Tests',
    icon: (
      <svg className="w-5.5 h-5.5 shrink-0" viewBox="0 0 20 20" fill="none">
        <rect x="3" y="3" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M 7,3 L 7,5 M 13,3 L 13,5 M 3,9 L 17,9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        <path d="M 7,13 L 9,15 L 13,11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
]

const profileIcon = (
  <svg className="w-5.5 h-5.5 shrink-0" viewBox="0 0 20 20" fill="none">
    <circle cx="9" cy="6.5" r="3.5" stroke="currentColor" strokeWidth="1.5" />
    <path d="M 1.5,18 Q 1.5,13 9,13 Q 16.5,13 16.5,18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
)

interface StudentSidebarProps {
  collapsed: boolean
  onToggle: () => void
}

// Fixed 64px slot — matches the collapsed sidebar width so the icon/logo/avatar
// occupies the exact same x-position whether the sidebar is open or closed.
// Result: collapsing only shrinks the box + fades the labels; nothing jumps.
const SLOT = 'w-16 flex items-center justify-center shrink-0'

export default function StudentSidebar({ collapsed, onToggle }: StudentSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const isActive = (href: string) => {
    if (href === '/student') return pathname === '/student'
    return pathname.startsWith(href)
  }

  // Label fades/clips in sync with the width animation. Always rendered (never
  // unmounted) so the transition is smooth in both directions.
  const labelClass = (extra = '') =>
    `whitespace-nowrap transition-opacity duration-200 ${extra} ${
      collapsed ? 'opacity-0' : 'opacity-100'
    }`

  const rowClass = (active: boolean) =>
    `relative flex items-center h-12 border-l-2 transition-colors group ${
      active
        ? 'border-brand bg-[#F4F1F8] text-brand'
        : 'border-transparent text-[#64748b] hover:bg-[#F4F1F8] hover:text-brand'
    }`

  const tooltip = (text: string) => (
    <span
      className={`absolute left-full ml-2 px-2.5 py-1.5 bg-brand text-white text-sm rounded-md opacity-0 transition-opacity pointer-events-none whitespace-nowrap z-50 ${
        collapsed ? 'group-hover:opacity-100' : ''
      }`}
    >
      {text}
    </span>
  )

  return (
    <div
      style={{ width: collapsed ? 64 : 256 }}
      className="h-full flex flex-col bg-white border-r border-[#e2e5ec] shrink-0 transition-[width] duration-300 ease-in-out overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center h-14 shrink-0 overflow-hidden">
        <div className={SLOT}>
          <div className="w-10 h-10 shrink-0">
            <ChemistryOctetLogo size={40} />
          </div>
        </div>
        <p className={labelClass('flex-1 min-w-0 text-base text-brand leading-tight')}>
          Chemistry<span className="text-[#64748b]">@OCTET</span>
        </p>
        <button
          onClick={onToggle}
          className={`shrink-0 w-7 h-7 mr-3 flex items-center justify-center text-[#64748b] hover:bg-[#F4F1F8] rounded-md transition-opacity duration-200 ${
            collapsed ? 'opacity-0 pointer-events-none' : 'opacity-100'
          }`}
          title="Collapse sidebar"
        >
          <svg className="w-4 h-4" viewBox="0 0 12 12" fill="none">
            <path d="M 8,2 L 4,6 L 8,10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* MENU label — collapses its own height so the nav doesn't reflow abruptly */}
      <p
        className={`px-4 text-xs text-[#64748b] uppercase tracking-widest whitespace-nowrap overflow-hidden transition-all duration-200 ${
          collapsed ? 'opacity-0 h-0 pt-0 pb-0' : 'opacity-100 h-10 pt-5 pb-1'
        }`}
      >
        Menu
      </p>

      {/* Nav items */}
      <nav className="flex-1 py-1 space-y-0.5 overflow-y-auto overflow-x-hidden">
        {navItems.map((item) => {
          const active = isActive(item.href)
          return (
            <Link key={item.href} href={item.href} className={rowClass(active)}>
              <span className={SLOT}>{item.icon}</span>
              <span className={labelClass('text-lg')}>{item.label}</span>
              {tooltip(item.label)}
            </Link>
          )
        })}
      </nav>

      {/* My Profile */}
      <Link href="/student/profile" className={rowClass(isActive('/student/profile'))}>
        <span className={SLOT}>{profileIcon}</span>
        <span className={labelClass('text-lg')}>My Profile</span>
        {tooltip('My Profile')}
      </Link>

      {/* Account / Sign out */}
      <div className="flex items-center h-14 shrink-0 overflow-hidden mb-2">
        <div className={SLOT}>
          <button
            onClick={collapsed ? () => router.push('/') : undefined}
            className="relative group w-9 h-9 cursor-pointer rounded-md bg-brand flex items-center justify-center text-white font-inter text-base shrink-0"
            title={collapsed ? 'Sign out' : undefined}
          >
            A
            {tooltip('Sign Out')}
          </button>
        </div>
        <div className={labelClass('flex-1 min-w-0')}>
          <p className="text-base text-brand-dark leading-tight truncate">Arjun Sharma</p>
          <button
            onClick={() => router.push('/')}
            className="text-sm text-[#64748b] hover:text-brand transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}
