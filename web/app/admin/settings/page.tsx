'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminSettingsRedirectPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/admin/profile?tab=settings')
  }, [router])

  return (
    <div className="p-8 text-center text-sm text-zinc-400">
      Redirecting to Settings in Profile…
    </div>
  )
}
