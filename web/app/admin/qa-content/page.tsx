'use client'

// Standalone fallback route for the Q&A / Practice Questions sections — the
// primary access point is now inline inside app/admin/content/page.tsx
// (per the user's explicit request), but this route is kept as a direct
// link that still works on its own.

import Link from 'next/link'
import { QaCategorySection } from '@/components/admin/qa/QaCategorySection'

export default function QaContentAdminPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">Q&A / Practice Questions</h1>
          <p className="text-sm sm:text-base text-gray-500 mt-1">
            Also available inline on the main{' '}
            <Link href="/admin/content" className="text-violet-700 hover:underline">
              Content Manager
            </Link>{' '}
            page, below the PDF/video notes panel.
          </p>
        </div>
      </div>
      <QaCategorySection category="qa" title="Q&A" />
      <QaCategorySection category="practice" title="Practice Questions" />
    </div>
  )
}
