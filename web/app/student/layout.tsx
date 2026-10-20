'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import StudentSidebar from '@/components/student/StudentSidebar'
import { AtomSVG, FlaskSVG, TestTubeSVG, MicroscopeSVG, CompoundSVG, BeakerSVG } from '@/components/ui/PencilSVGs'
import AuthGuard from '../../components/student/AuthGuard'
import TestingGuard from '@/components/TestingGuard'

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()

  // Auto-close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  const isExamRunner = /^\/student\/tests\/[^/]+\/exam/.test(pathname || '')

  if (isExamRunner) {
    return (
      <AuthGuard>
        <TestingGuard>
          <div className="student-scope">{children}</div>
        </TestingGuard>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <TestingGuard>
        <div className="student-scope relative flex h-screen overflow-hidden bg-[#f6f5f8]">
          {/* Chemistry SVG background layer */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none z-0" aria-hidden>
            <div className="absolute top-[4%] right-[3%] opacity-[0.05]" style={{ transform: 'rotate(-15deg)' }}>
              <AtomSVG width={200} height={200} color="#7A6B96" />
            </div>
            <div className="absolute bottom-[6%] left-[8%] opacity-[0.05]" style={{ transform: 'rotate(10deg)' }}>
              <FlaskSVG width={155} height={185} color="#64748b" />
            </div>
            <div className="absolute top-[32%] left-[4%] opacity-[0.05]" style={{ transform: 'rotate(-12deg)' }}>
              <BeakerSVG width={150} height={175} color="#7A6B96" />
            </div>
            <div className="absolute top-[55%] right-[5%] opacity-[0.05]" style={{ transform: 'rotate(-8deg)' }}>
              <MicroscopeSVG width={170} height={185} color="#64748b" />
            </div>
            <div className="absolute bottom-[18%] right-[22%] opacity-[0.05]" style={{ transform: 'rotate(6deg)' }}>
              <CompoundSVG width={185} height={145} color="#7A6B96" />
            </div>
            <div className="absolute top-[42%] right-[18%] opacity-[0.05]" style={{ transform: 'rotate(12deg)' }}>
              <TestTubeSVG width={95} height={175} color="#64748b" />
            </div>
          </div>

          {/* Desktop Sidebar */}
          <div className="hidden md:flex h-full shrink-0">
            <StudentSidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />
          </div>

          {/* Mobile Drawer Overlay */}
          {mobileOpen && (
            <div
              className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs md:hidden"
              onClick={() => setMobileOpen(false)}
            />
          )}
          <div
            className={`fixed inset-y-0 left-0 z-50 transition-transform duration-300 md:hidden ${
              mobileOpen ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            <StudentSidebar collapsed={false} onToggle={() => setMobileOpen(false)} />
          </div>

          {/* Desktop expand button */}
          {collapsed && (
            <button
              onClick={() => setCollapsed(false)}
              className="hidden md:flex absolute z-20 w-6 h-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center bg-white rounded-md shadow-md text-[#64748b] hover:text-brand hover:border-brand transition-colors cursor-pointer"
              style={{ left: 64, top: 28 }}
              title="Expand sidebar"
            >
              <svg className="w-4 h-4" viewBox="0 0 12 12" fill="none">
                <path d="M 4,2 L 8,6 L 4,10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}

          <div className="relative z-1 flex-1 flex flex-col h-full min-w-0 overflow-hidden">
            {/* Mobile Top Header with Hamburger */}
            <header className="md:hidden flex items-center justify-between px-4 py-2.5 bg-white border-b border-gray-200 shrink-0">
              <button
                onClick={() => setMobileOpen(true)}
                className="p-1.5 -ml-1 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 cursor-pointer"
                aria-label="Open menu"
              >
                <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <span className="font-semibold text-sm text-gray-800">Chemistry@OCTET</span>
              <div className="w-6" />
            </header>

            <main className="flex-1 h-full overflow-y-auto bg-transparent" data-lenis-prevent>
              {children}
            </main>
          </div>
        </div>
      </TestingGuard>
    </AuthGuard>
  )
}
