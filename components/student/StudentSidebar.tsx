'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'

const navItems = [
  {
    href: '/student',
    label: 'Dashboard',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none">
        <rect x="2" y="2" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <rect x="11" y="2" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <rect x="2" y="11" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
        <rect x="11" y="11" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    href: '/student/courses',
    label: 'Courses',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none">
        <path d="M 3,5 L 17,5 M 3,8 L 13,8 M 3,11 L 17,11 M 3,14 L 13,14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="16" cy="14" r="3" stroke="currentColor" strokeWidth="1.3" />
        <path d="M 18.5,16.5 L 20,18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: '/student/notes',
    label: 'Notes',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none">
        <path d="M 5,3 L 15,3 Q 17,3 17,5 L 17,17 Q 17,19 15,19 L 5,19 Q 3,19 3,17 L 3,5 Q 3,3 5,3 Z" stroke="currentColor" strokeWidth="1.5" />
        <path d="M 7,8 L 13,8 M 7,11 L 13,11 M 7,14 L 11,14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    href: '/student/attendance',
    label: 'Attendance',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
        <path d="M 10,5 L 10,10 L 14,12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: '/student/tests',
    label: 'Tests',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none">
        <rect x="3" y="3" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M 7,3 L 7,5 M 13,3 L 13,5 M 3,9 L 17,9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        <path d="M 7,13 L 9,15 L 13,11" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    href: '/student/profile',
    label: 'Profile',
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="7" r="4" stroke="currentColor" strokeWidth="1.5" />
        <path d="M 3,18 Q 3,13 10,13 Q 17,13 17,18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
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
    <motion.aside
      animate={{ width: collapsed ? 72 : 220 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="h-screen sticky top-0 flex flex-col bg-white border-r border-[#e2d5f0] shrink-0 overflow-hidden"
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-[#e2d5f0]">
        <div className="w-9 h-9 shrink-0 flex items-center justify-center">
          <svg viewBox="0 0 36 36" fill="none" className="w-full h-full">
            <circle cx="18" cy="18" r="16" stroke="#5e4075" strokeWidth="1.8" />
            <ellipse cx="18" cy="18" rx="14" ry="6" stroke="#5e4075" strokeWidth="1.5" transform="rotate(60 18 18)" />
            <ellipse cx="18" cy="18" rx="14" ry="6" stroke="#5e4075" strokeWidth="1.5" transform="rotate(-60 18 18)" />
            <circle cx="18" cy="18" r="3" fill="#5e4075" />
          </svg>
        </div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden whitespace-nowrap"
            >
              <span className="text-[#5e4075] text-base">Chemistry</span>
              <span className="text-[#8b6fa0] text-base">@OCTET</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Toggle button */}
      <button
        onClick={onToggle}
        className="absolute top-5 -right-3 w-6 h-6 bg-white border border-[#e2d5f0] rounded-full flex items-center justify-center text-[#5e4075] hover:bg-[#f0e8f8] transition-colors duration-200 z-10"
      >
        <svg className={`w-3 h-3 transition-transform duration-300 ${collapsed ? '' : 'rotate-180'}`} viewBox="0 0 12 12" fill="none">
          <path d="M 8,2 L 4,6 L 8,10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Nav items */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const active = isActive(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                active
                  ? 'bg-[#5e4075]/8 text-[#5e4075]'
                  : 'text-[#8b6fa0] hover:bg-[#e9deb5]/40 hover:text-[#5e4075]'
              }`}
            >
              {active && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute inset-0 bg-[#5e4075]/8 rounded-xl"
                />
              )}
              <span className="relative z-10 shrink-0">{item.icon}</span>
              <AnimatePresence>
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: 'auto' }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.2 }}
                    className="relative z-10 text-base whitespace-nowrap overflow-hidden"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>

              {/* Tooltip when collapsed */}
              {collapsed && (
                <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-[#5e4075] text-[#f8f9ed] text-[14px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
                  {item.label}
                </div>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Bottom — logout */}
      <div className="p-2 border-t border-[#e2d5f0]">
        <button
          onClick={() => router.push('/')}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[#8b6fa0] hover:bg-[#e9deb5]/40 hover:text-[#5e4075] transition-all duration-200 group"
        >
          <svg className="w-5 h-5 shrink-0" viewBox="0 0 20 20" fill="none">
            <path d="M 8,3 L 4,3 Q 2,3 2,5 L 2,15 Q 2,17 4,17 L 8,17 M 13,7 L 18,10 L 13,13 M 18,10 L 8,10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.2 }}
                className="text-base whitespace-nowrap overflow-hidden"
              >
                Sign Out
              </motion.span>
            )}
          </AnimatePresence>
          {collapsed && (
            <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-[#5e4075] text-[#f8f9ed] text-[14px] rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50">
              Sign Out
            </div>
          )}
        </button>
      </div>
    </motion.aside>
  )
}
