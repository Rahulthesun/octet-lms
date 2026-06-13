'use client'

import { useState } from 'react'
import StudentSidebar from '@/components/student/StudentSidebar'
import { AtomSVG, FlaskSVG, TestTubeSVG, MicroscopeSVG, CompoundSVG, BeakerSVG } from '@/components/ui/PencilSVGs'
import AuthGuard from '../../components/student/AuthGuard'
import TestingGuard from '@/components/TestingGuard'

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)

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

        <StudentSidebar collapsed={collapsed} onToggle={() => setCollapsed(!collapsed)} />

        {/* Expand button — straddles sidebar right edge when collapsed */}
        {collapsed && (
          <button
            onClick={() => setCollapsed(false)}
            className="absolute z-20 w-6 h-6 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center bg-white border border-[#e2e5ec] rounded-md shadow-md text-[#64748b] hover:text-[#7A6B96] hover:border-[#7A6B96] transition-colors"
            style={{ left: 64, top: 28 }}
            title="Expand sidebar"
          >
            <svg className="w-4 h-4" viewBox="0 0 12 12" fill="none">
              <path d="M 4,2 L 8,6 L 4,10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        )}

        <main className="relative z-1 flex-1 h-full overflow-y-auto bg-transparent" data-lenis-prevent>
          {children}
        </main>
      </div>
      </TestingGuard>
    </AuthGuard>
  )
}