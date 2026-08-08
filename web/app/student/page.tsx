'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

// The dashboard's real content lives at /student/notes — this route is kept
// only so /student itself resolves to something, and immediately redirects.
// It renders nothing but a spinner, so there's nothing here to back with
// real data (and nothing fake to show while the redirect fires).
export default function Dashboard() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/student/notes')
  }, [router])

  return (
    <div className="h-full flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
    </div>
  )
}
