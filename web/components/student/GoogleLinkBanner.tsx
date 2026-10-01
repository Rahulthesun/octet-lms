'use client'

// Prompts a student to link the Google account they use for Meet, until they
// have. Online-class attendance is taken from who actually joined the Meet;
// linking is what ties that Google account to this student for good.
// Shown on the dashboard and the Classes page; disappears once linked.

import { useState } from 'react'
import { useGoogleIdentity } from '@/hooks/useOnlineClasses'

export default function GoogleLinkBanner() {
  const { status, loading, link } = useGoogleIdentity()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (loading || !status || status.linked) return null

  async function handleLink() {
    setBusy(true)
    setError(null)
    try {
      await link() // navigates to Google; only a failure returns here
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not start linking. Please try again.')
      setBusy(false)
    }
  }

  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4" role="region" aria-label="Link your Google account">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <p className="text-base text-amber-900">Link your Google account for online-class attendance</p>
          <p className="text-sm text-amber-800">
            Use the same Google account you join Meet with. It takes a few seconds and only shares your account ID and email.
          </p>
        </div>
        <button
          onClick={handleLink}
          disabled={busy}
          className="shrink-0 px-5 py-2 text-base bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50"
        >
          {busy ? 'Opening Google...' : 'Link Google account'}
        </button>
      </div>
      {error && <p className="text-sm text-rose-700 mt-2" role="alert">{error}</p>}
    </div>
  )
}
