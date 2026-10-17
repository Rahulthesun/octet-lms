'use client'

// app/admin/settings/page.tsx
//
// Minimal admin settings page. Currently holds the single persisted knob:
// the test pass percentage used as the default "Pass mark" in the test
// analytics modals (TestAnalyticsModal, OverallAnalyticsModal). Backed by
// GET/PATCH /api/test-settings (api/services/testSettings.service.js),
// mirroring the attendance_settings pattern.

import { useEffect, useState } from 'react'
import { authedFetch } from '@/hooks/useTests'

export default function AdminSettingsPage() {
  const [passPercentage, setPassPercentage] = useState<number>(35)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    authedFetch('/api/test-settings')
      .then((d) => setPassPercentage(Number(d?.passPercentage ?? 35)))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  async function handleSave() {
    setSaving(true)
    setSaved(false)
    setError(null)
    try {
      const d = await authedFetch('/api/test-settings', {
        method: 'PATCH',
        body: JSON.stringify({ passPercentage }),
      })
      setPassPercentage(Number(d?.passPercentage ?? passPercentage))
      setSaved(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-lg font-semibold text-zinc-900 mb-1">Settings</h1>
      <p className="text-sm text-zinc-500 mb-6">Platform-wide defaults used across the admin dashboard.</p>

      <div className="border border-zinc-200 rounded-xl p-5 bg-white">
        <h2 className="text-sm font-semibold text-zinc-900 mb-1">Test pass percentage</h2>
        <p className="text-xs text-zinc-500 mb-4">
          The default pass mark used in test analytics reports (Test Results &gt; Report, and the All Tests report).
          Admins can still override it per-session in those reports without changing this saved default.
        </p>

        {loading ? (
          <p className="text-sm text-zinc-400">Loading…</p>
        ) : (
          <div className="flex items-center gap-3">
            <input
              type="number"
              min={0}
              max={100}
              value={passPercentage}
              onChange={(e) => setPassPercentage(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
              className="w-24 text-sm rounded-md px-3 py-2 border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-violet-200"
            />
            <span className="text-sm text-zinc-500">%</span>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm rounded-md bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
            {saved && <span className="text-xs text-emerald-600">Saved</span>}
          </div>
        )}

        {error && <p className="text-xs text-rose-600 mt-3">{error}</p>}
      </div>
    </div>
  )
}
