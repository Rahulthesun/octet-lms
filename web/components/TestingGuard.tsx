// components/TestingGuard.tsx
'use client'

import { usePathname } from 'next/navigation'
import { useUserRole } from '@/hooks/useUserRole'
import { canAccessPage } from '@/lib/pageStatus'
import { useGuestMode } from '@/hooks/useGuestMode'

export default function TestingGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { role, loading } = useUserRole()
  const { guestMode } = useGuestMode()

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  // An admin previewing Guest Mode must see EXACTLY what a real student
  // would see — production pages only. Evaluate them as role 'student' for
  // this check. This covers both admin role variants: plain 'admin' AND the
  // internal 'both' preview role — 'both' is exactly the role canAccessPage
  // treats as "sees everything, testing or not", so leaving it as 'both'
  // here would silently defeat guest mode's whole purpose and leak
  // unreleased pages into what's supposed to be a faithful preview of the
  // live student experience.
  const isAdminGuest = guestMode && (role === 'admin' || role === 'both')
  const effectiveRole = isAdminGuest ? 'student' : role

  if (!canAccessPage(effectiveRole, pathname)) {
    return (
      <div className="h-screen flex items-center justify-center px-6">
        <div className="w-full max-w-md bg-white rounded-2xl border border-accent3/60 shadow-[0_8px_40px_rgba(94,64,117,0.08)] p-8 text-center">
          <div className="w-14 h-14 mx-auto mb-5 rounded-full bg-amber-50 border border-amber-100 flex items-center justify-center">
            <svg className="w-6 h-6 text-amber-500" viewBox="0 0 24 24" fill="none">
              <path d="M12 2.5l2.5 5 5.5.8-4 4 .9 5.5L12 15.3l-4.9 2.5.9-5.5-4-4 5.5-.8z"
                stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
            </svg>
          </div>
          <h1 className="text-2xl text-primary mb-2">Coming soon</h1>
          <p className="text-muted text-[15px] leading-relaxed">
            This page is still being tested and isn&apos;t available yet.
            Check back soon!
          </p>
        </div>
      </div>
    )
  }

  return <>{children}</>
}