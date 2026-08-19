// components/AuthGuard.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'
import { isGuestModeActive } from '@/hooks/useGuestMode'

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

  if (checking) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  return <>{children}</>
}