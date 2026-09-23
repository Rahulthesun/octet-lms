// components/AuthGuard.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { isGuestModeActive } from '@/hooks/useGuestMode'
import { authedFetch } from '@/lib/apiClient'

// How often a signed-in student's account status is re-checked, so a graduation
// date that arrives mid-session logs them out without waiting for a reload.
const ACCESS_RECHECK_MS = 60 * 1000

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    let active = true

    const evaluate = (session: any) => {
      if (!session) {
        router.replace('/login')
        return
      }

      const role = session.user?.app_metadata?.role ?? 'student'

      // Pure admins never see the student site - send them to /admin.
      // 'both' (or 'student') roles are allowed through. The one exception
      // is an admin who has explicitly switched on Guest Mode from the
      // admin sidebar — they're let through so they can preview the exact
      // student UI/experience.
      if (role === 'admin' && !isGuestModeActive()) {
        router.replace('/admin')
        return
      }

      setChecking(false)

      // Students only: confirm with the server that the account is still
      // allowed in. authedFetch signs the student out and redirects to the
      // login page with the revoke message if their access has ended.
      if (role !== 'admin' && role !== 'both' && role !== 'developer') {
        authedFetch('/api/students/access-check').catch(() => {})
      }
    }

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      evaluate(data.session)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!active) return
      evaluate(session)
    })

    const recheck = window.setInterval(() => {
      supabase.auth.getSession().then(({ data }) => {
        const r = data.session?.user?.app_metadata?.role
        if (data.session && r !== 'admin' && r !== 'both' && r !== 'developer') {
          authedFetch('/api/students/access-check').catch(() => {})
        }
      })
    }, ACCESS_RECHECK_MS)

    return () => {
      active = false
      window.clearInterval(recheck)
      listener.subscription.unsubscribe()
    }
  }, [router])

  if (checking) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  return <>{children}</>
}