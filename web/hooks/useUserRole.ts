// hooks/useUserRole.ts
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'

export function useUserRole() {
  const [role, setRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    const evaluate = (session: any) => {
      if (!active) return
      setRole(session?.user?.app_metadata?.role ?? 'student')
      setLoading(false)
    }

    supabase.auth.getSession().then(({ data }) => evaluate(data.session))

    const { data: listener } = supabase.auth.onAuthStateChange((_e, session) => evaluate(session))

    return () => {
      active = false
      listener.subscription.unsubscribe()
    }
  }, [])

  return { role, loading }
}