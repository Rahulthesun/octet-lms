// components/admin/AdminGuard.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import Link from 'next/link'
import { AtomSVG, FlaskSVG } from '@/components/ui/PencilSVGs'

type GuardStatus = 'checking' | 'allowed' | 'denied'

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [status, setStatus] = useState<GuardStatus>('checking')
  const [email, setEmail] = useState<string | null>(null)
  const [role, setRole] = useState<string>('student')

  useEffect(() => {
    let active = true

    const evaluate = (session: any) => {
      if (!session) {
        router.replace('/login')
        return
      }

      // inside AdminGuard's evaluate()
        const userRole = session.user?.app_metadata?.role ?? 'student'
        setEmail(session.user?.email ?? null)
        setRole(userRole)
        setStatus(userRole === 'admin' || userRole === 'both' ? 'allowed' : 'denied')
    }

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      evaluate(data.session)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return
      evaluate(session)
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [router])

  if (status === 'checking') {
    return (
      <div className="h-screen flex items-center justify-center bg-[#f6f5f8]">
        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  if (status === 'denied') {
    return (
      <div className="h-screen relative flex items-center justify-center bg-[#f6f5f8] overflow-hidden px-6">
        {/* Decorative background, consistent with student layout */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0" aria-hidden>
          <div className="absolute top-[6%] right-[6%] opacity-[0.05]" style={{ transform: 'rotate(-15deg)' }}>
            <AtomSVG width={220} height={220} color="#7A6B96" />
          </div>
          <div className="absolute bottom-[8%] left-[6%] opacity-[0.05]" style={{ transform: 'rotate(10deg)' }}>
            <FlaskSVG width={170} height={200} color="#64748b" />
          </div>
        </div>

        <div className="relative z-10 w-full max-w-md bg-white rounded-2xl border border-accent3/60 shadow-[0_8px_40px_rgba(94,64,117,0.08)] p-8 text-center">
          {/* Lock icon */}
          <div className="w-14 h-14 mx-auto mb-5 rounded-full bg-red-50 border border-red-100 flex items-center justify-center">
            <svg className="w-6 h-6 text-red-500" viewBox="0 0 24 24" fill="none">
              <rect x="5" y="11" width="14" height="9" rx="2" stroke="currentColor" strokeWidth="1.8" />
              <path d="M8 11V7a4 4 0 0 1 8 0v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              <circle cx="12" cy="15.5" r="1.2" fill="currentColor" />
            </svg>
          </div>

          {/* Badge */}
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent1/40 text-primary text-[12px] tracking-wide uppercase mb-3">
            <svg className="w-3 h-3" viewBox="0 0 16 16" fill="none">
              <path d="M8 1l2.5 2.5L14 2l-1 3.5L16 8l-3 2.5 1 3.5-3.5-1L8 15l-2.5-2.5L2 14l1-3.5L0 8l3-2.5L2 2l3.5 1.5L8 1z"
                fill="currentColor" opacity="0.5" />
            </svg>
            Admin Only Page
          </div>

          <h1 className="text-2xl text-primary mb-2">Access denied</h1>
          <p className="text-muted text-[15px] mb-5 leading-relaxed">
            This section is restricted to administrators. Your account doesn&apos;t
            currently have admin privileges, so you can&apos;t view this page.
          </p>

          {/* Account info */}
          <div className="bg-[#fdfcf8] border border-border rounded-xl px-4 py-3 mb-6 text-left">
            <div className="flex items-center justify-between text-[14px] mb-1.5">
              <span className="text-muted">Signed in as</span>
              <span className="text-primary">{email ?? '—'}</span>
            </div>
            <div className="flex items-center justify-between text-[14px]">
              <span className="text-muted">Current role</span>
              <span className="capitalize px-2 py-0.5 rounded-md bg-accent1/40 text-primary text-[12px]">
                {role}
              </span>
            </div>
          </div>

          <p className="text-muted text-[13px] mb-6">
            If you believe this is a mistake, contact an administrator to request
            access for this account.
          </p>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/student"
              className="flex-1 py-3 bg-primary text-white text-[15px] rounded-xl hover:bg-[#3d2652] transition-all duration-200 shadow-[0_4px_16px_rgba(94,64,117,0.3)] flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
                <path d="M 13,8 L 3,8 M 7,4 L 3,8 L 7,12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Back to dashboard
            </Link>
            <button
              onClick={async () => {
                await supabase.auth.signOut()
                router.replace('/login')
              }}
              className="flex-1 py-3 bg-white border border-border text-primary text-[15px] rounded-xl hover:border-primary/40 transition-all duration-200"
            >
              Sign out
            </button>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}