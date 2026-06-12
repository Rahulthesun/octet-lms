// components/AuthGuard.tsx
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase/client'

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    let active = true

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return

      if (!data.session) {
        router.replace('/login')
      } else {
        setChecking(false)
      }
    })

    // Also react to logout/expiry while the user is on the page
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        router.replace('/login')
      }
    })

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [router])

  // Don't render protected content until we've confirmed a session exists
  if (checking) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
      </div>
    )
  }

  return <>{children}</>
}