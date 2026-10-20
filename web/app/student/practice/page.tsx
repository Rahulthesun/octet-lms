'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function StudentPracticeRedirect() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/student/notes')
  }, [router])

  return (
    <div className="min-h-[50vh] flex items-center justify-center text-sm text-gray-500">
      Redirecting to PDF Notes...
    </div>
  )
}
