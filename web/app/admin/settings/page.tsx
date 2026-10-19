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

  const ACCENT = '#5B21B6'
  const tableMissing = !!error && /test_settings/i.test(error)

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-zinc-900">Settings</h1>
        <p className="text-[15px] text-zinc-500 mt-1">Platform-wide defaults used across the admin dashboard.</p>
      </div>

      {tableMissing && (
        <div className="mb-6 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
          This setting can&apos;t be saved yet — its database table hasn&apos;t been created. Run <code className="px-1 py-0.5 rounded bg-amber-100 font-mono text-xs">api/sql/test_settings.sql</code> once in the Supabase SQL editor, then reload this page.
        </div>
      )}

      <div className="bg-white border border-zinc-200 rounded-2xl divide-y divide-zinc-100">
        <div className="p-6 flex flex-col sm:flex-row sm:items-start gap-5">
          <div className="flex-1 min-w-0">
            <h2 className="text-[15px] font-semibold text-zinc-900">Test pass percentage</h2>
            <p className="text-sm text-zinc-500 mt-1.5 leading-relaxed">
              The default pass mark used in test analytics reports (Test Results → Report, and the All Tests
              report). Admins can still override it per-session in those reports without changing this saved
              default — useful if your board&apos;s official pass percentage ever changes.
            </p>
          </div>

          <div className="shrink-0 w-full sm:w-auto">
            {loading ? (
              <p className="text-sm text-zinc-400">Loading…</p>
            ) : (
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={passPercentage}
                    onChange={(e) => setPassPercentage(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                    className="w-24 text-[15px] rounded-lg pl-3 pr-7 py-2.5 border border-zinc-300 bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-zinc-400 pointer-events-none">%</span>
                </div>
                <button
                  onClick={handleSave}
                  disabled={saving || tableMissing}
                  className="px-5 py-2.5 rounded-lg text-white text-[15px] disabled:opacity-50 hover:opacity-90 transition-opacity"
                  style={{ backgroundColor: ACCENT }}
                >
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            )}
            {saved && <p className="text-xs text-emerald-600 mt-2 text-right">Saved</p>}
            {error && !tableMissing && <p className="text-xs text-rose-600 mt-2 text-right">{error}</p>}
          </div>
        </div>
      </div>
    </div>
  )
}
