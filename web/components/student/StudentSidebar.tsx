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

interface StudentSidebarProps {
  collapsed: boolean
  onToggle: () => void
}

export default function StudentSidebar({ collapsed, onToggle }: StudentSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const isActive = (href: string) => {
    if (href === '/student') return pathname === '/student'
    return pathname.startsWith(href)
  }

  return (
    <div
      style={{ width: collapsed ? 64 : 256 }}
      className="h-full flex flex-col bg-white border-r border-[#e2e5ec] shrink-0 transition-[width] duration-300 ease-in-out overflow-hidden"
    >
      {/* Header */}
      {collapsed ? (
        <div className="flex items-center justify-center h-14 shrink-0">
          <div className="w-10 h-10 shrink-0">
            <ChemistryOctetLogo size={40} />
          </div>
        </div>
      ) : (
        <div className="flex items-center h-14 shrink-0 px-4 gap-2">
          <div className="w-11 h-11 shrink-0 flex items-center justify-center">
            <ChemistryOctetLogo size={44} />
          </div>
          <div className="flex-1 min-w-0 overflow-hidden">
            <p className="text-base text-[#7A6B96] whitespace-nowrap leading-tight">
              Chemistry<span className="text-[#64748b]">@OCTET</span>
            </p>
          </div>
          <button
            onClick={onToggle}
            className="shrink-0 w-7 h-7 flex items-center justify-center text-[#64748b] hover:bg-[#F4F1F8] rounded-md transition-colors"
            title="Collapse sidebar"
          >
            <svg className="w-4 h-4" viewBox="0 0 12 12" fill="none">
              <path d="M 8,2 L 4,6 L 8,10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      )}

      {/* MENU label */}
      {!collapsed && (
        <p className="px-4 pt-5 pb-1 text-xs text-[#64748b] uppercase tracking-widest">
          Menu
        </p>
      )}

      {/* Nav items */}
      <nav className="flex-1 py-1 space-y-0.5 overflow-y-auto overflow-x-hidden">
        {navItems.map((item) => {
          const active = isActive(item.href)
          return (
            <div key={item.href} className="relative">
              <Link
                href={item.href}
                className={`relative flex items-center h-12 transition-colors group ${
                  collapsed
                    ? `w-full justify-center border-l-2 ${active ? 'border-[#7A6B96] bg-[#F4F1F8] text-[#7A6B96]' : 'border-transparent text-[#64748b] hover:bg-[#F4F1F8] hover:text-[#7A6B96]'}`
                    : `w-full px-4 gap-3 border-l-2 ${active ? 'border-[#7A6B96] bg-[#F4F1F8] text-[#7A6B96]' : 'border-transparent text-[#64748b] hover:bg-[#F4F1F8] hover:text-[#7A6B96]'}`
                }`}
              >
                {item.icon}

                {!collapsed && (
                  <span className="text-lg whitespace-nowrap">{item.label}</span>
                )}

                {collapsed && (
                  <span className="absolute left-full ml-2 px-2.5 py-1.5 bg-[#7A6B96] text-white text-sm rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                    {item.label}
                  </span>
                )}
              </Link>
            </div>
          )
        })}
      </nav>

      {/* My Profile + Sign out */}
      <div className={`${collapsed ? 'flex flex-col items-center gap-1' : ''}`}>
        {/* My Profile */}
        {collapsed ? (
          <Link
            href="/student/profile"
            className={`relative group w-full h-12 flex items-center justify-center border-l-2 transition-colors ${
              isActive('/student/profile')
                ? 'border-[#7A6B96] bg-[#F4F1F8] text-[#7A6B96]'
                : 'border-transparent text-[#64748b] hover:bg-[#F4F1F8] hover:text-[#7A6B96]'
            }`}
          >
            <svg className="w-5.5 h-5.5 shrink-0" viewBox="0 0 20 20" fill="none">
              <circle cx="9" cy="6.5" r="3.5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M 1.5,18 Q 1.5,13 9,13 Q 16.5,13 16.5,18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span className="absolute left-full ml-2 px-2.5 py-1.5 bg-[#7A6B96] text-white text-sm rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
              My Profile
            </span>
          </Link>
        ) : (
          <Link
            href="/student/profile"
            className={`flex items-center gap-3 px-4 py-2.5 border-l-2 transition-colors group ${
              isActive('/student/profile')
                ? 'border-[#7A6B96] bg-[#F4F1F8] text-[#7A6B96]'
                : 'border-transparent text-[#64748b] hover:bg-[#F4F1F8] hover:text-[#7A6B96]'
            }`}
          >
            <svg className="w-5.5 h-5.5 shrink-0" viewBox="0 0 20 20" fill="none">
              <circle cx="9" cy="6.5" r="3.5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M 1.5,18 Q 1.5,13 9,13 Q 16.5,13 16.5,18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span className="text-lg whitespace-nowrap">My Profile</span>
          </Link>
        )}

        {/* Sign out */}
        {collapsed ? (
          <button
            onClick={() => router.push('/')}
            className="relative group w-12 mb-2 h-10 bg-[#7A6B96] rounded-md flex items-center justify-center text-white font-inter text-base"
            title="Sign out"
          >
            A
            <span className="absolute left-full ml-2 px-2.5 py-1.5 bg-[#7A6B96] text-white text-sm rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
              Sign Out
            </span>
          </button>
        ) : (
          <div className="flex items-center gap-3 px-4 py-2">
            <div className="w-9 h-9 rounded-md bg-[#7A6B96] flex items-center justify-center text-white font-inter text-base shrink-0">
              A
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base text-[#635580] leading-tight truncate">Arjun Sharma</p>
              <button
                onClick={() => router.push('/')}
                className="text-sm text-[#64748b] hover:text-[#7A6B96] transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
