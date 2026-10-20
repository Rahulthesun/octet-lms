'use client'

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSearchParams } from 'next/navigation'
import { authedFetch } from '@/hooks/useTests'

// ─── Mock activity log ────────────────────────────────────────────────────────

const activityLog = [
  { action: 'Viewed Attendance page', page: '/admin/attendance', time: '2 min ago' },
  { action: 'Saved attendance for today', page: '/admin/attendance', time: '5 min ago' },
  { action: 'Opened Test Results', page: '/admin/tests', time: '1 hr ago' },
  { action: 'Viewed student profile CO-004', page: '/admin/students/S04', time: '2 hr ago' },
  { action: 'Approved application from Riya', page: '/admin/students', time: '3 hr ago' },
  { action: 'Scheduled new test "Unit 3"', page: '/admin/tests', time: '4 hr ago' },
  { action: 'Uploaded answer key for Test T001', page: '/admin/tests', time: '5 hr ago' },
  { action: 'Viewed Content Manager', page: '/admin', time: '6 hr ago' },
  { action: 'Uploaded video — Atomic Structure Part 2', page: '/admin', time: '7 hr ago' },
  { action: 'Blocked student CO-007', page: '/admin/students/S07', time: '1 day ago' },
  { action: 'Rejected application from Lakshmi', page: '/admin/students', time: '1 day ago' },
  { action: 'Edited student profile CO-002', page: '/admin/students/S02', time: '2 days ago' },
  { action: 'Marked attendance for 20 May', page: '/admin/attendance', time: '3 days ago' },
  { action: 'Uploaded MCQ paper — Unit 1', page: '/admin', time: '4 days ago' },
  { action: 'Viewed Test Results — T002', page: '/admin/tests', time: '5 days ago' },
]

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconClock({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.3" />
      <path d="M 8,5 L 8,8 L 10.5,10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconCheck({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none">
      <path d="M 3,8 L 6.5,11.5 L 13,5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconEye({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none">
      <path d="M 1,8 Q 4,3 8,3 Q 12,3 15,8 Q 12,13 8,13 Q 4,13 1,8 Z" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1.3" />
    </svg>
  )
}

function IconEyeOff({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none">
      <path d="M 2,3 L 14,13 M 6,6.5 Q 5,7 5,8 Q 5,10.5 8,10.5 Q 9,10.5 9.5,10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      <path d="M 4,4.5 Q 6,3 8,3 Q 12,3 15,8 Q 13.5,10.5 11.5,11.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminProfilePage() {
  const searchParams = useSearchParams()
  const initialTab = searchParams.get('tab') === 'settings' ? 'settings' : 'profile'
  const [activeTab, setActiveTab] = useState<'profile' | 'settings' | 'activity'>(initialTab)

  const avatarRef = useRef<HTMLInputElement>(null)
  const [avatarSrc, setAvatarSrc] = useState<string | null>(null)

  // Edit details state
  const [details, setDetails] = useState({ name: 'Admin', email: 'admin@chemistryoctet.in', phone: '+91 98765 43210' })
  const [detailsDraft, setDetailsDraft] = useState({ ...details })
  const [detailsSaved, setDetailsSaved] = useState(false)

  // Password state
  const [pw, setPw] = useState({ current: '', newPw: '', confirm: '' })
  const [showPw, setShowPw] = useState({ current: false, newPw: false, confirm: false })
  const [pwError, setPwError] = useState('')
  const [pwSaved, setPwSaved] = useState(false)

  // Settings state (brought into profile)
  const [passPercentage, setPassPercentage] = useState<number>(35)
  const [settingsLoading, setSettingsLoading] = useState(true)
  const [settingsSaving, setSettingsSaving] = useState(false)
  const [settingsError, setSettingsError] = useState<string | null>(null)
  const [settingsSaved, setSettingsSaved] = useState(false)

  useEffect(() => {
    authedFetch('/api/test-settings')
      .then((d) => setPassPercentage(Number(d?.passPercentage ?? 35)))
      .catch((e: Error) => setSettingsError(e.message))
      .finally(() => setSettingsLoading(false))
  }, [])

  async function handleSaveSettings() {
    setSettingsSaving(true)
    setSettingsSaved(false)
    setSettingsError(null)
    try {
      const d = await authedFetch('/api/test-settings', {
        method: 'PATCH',
        body: JSON.stringify({ passPercentage }),
      })
      setPassPercentage(Number(d?.passPercentage ?? passPercentage))
      setSettingsSaved(true)
      setTimeout(() => setSettingsSaved(false), 3000)
    } catch (e) {
      setSettingsError(e instanceof Error ? e.message : 'Failed to save settings')
    } finally {
      setSettingsSaving(false)
    }
  }

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setAvatarSrc(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const saveDetails = () => {
    setDetails({ ...detailsDraft })
    setDetailsSaved(true)
    setTimeout(() => setDetailsSaved(false), 3000)
  }

  const savePassword = () => {
    if (!pw.current) { setPwError('Enter your current password.'); return }
    if (pw.newPw.length < 8) { setPwError('New password must be at least 8 characters.'); return }
    if (pw.newPw !== pw.confirm) { setPwError('Passwords do not match.'); return }
    setPwError('')
    setPwSaved(true)
    setPw({ current: '', newPw: '', confirm: '' })
    setTimeout(() => setPwSaved(false), 3000)
  }

  const ACCENT = '#5B21B6'
  const tableMissing = !!settingsError && /test_settings/i.test(settingsError)

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Admin Profile &amp; Settings</h1>
        <p className="text-sm sm:text-base text-gray-500 mt-1">Manage your account details, platform defaults, and activity history.</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 gap-2 sm:gap-6 overflow-x-auto">
        <button
          onClick={() => setActiveTab('profile')}
          className={`pb-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'profile'
              ? 'border-[#5B21B6] text-[#5B21B6]'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          Profile Details
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`pb-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'settings'
              ? 'border-[#5B21B6] text-[#5B21B6]'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          Platform Settings
        </button>
        <button
          onClick={() => setActiveTab('activity')}
          className={`pb-3 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
            activeTab === 'activity'
              ? 'border-[#5B21B6] text-[#5B21B6]'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
        >
          Recent Activity
        </button>
      </div>

      {activeTab === 'profile' && (
        <div className="space-y-6">
          {/* Profile hero card */}
          <div className="bg-white rounded-2xl border border-zinc-200 p-6 flex flex-col sm:flex-row items-center gap-6">
            <div className="relative shrink-0">
              <button
                onClick={() => avatarRef.current?.click()}
                className="w-20 h-20 bg-primary rounded-full flex items-center justify-center text-white text-3xl font-inter overflow-hidden hover:opacity-90 transition-opacity"
                title="Change profile picture"
              >
                {avatarSrc ? (
                  <img src={avatarSrc} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  'A'
                )}
              </button>
              <span className="absolute bottom-0 right-0 w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center text-gray-500 text-xs shadow-sm pointer-events-none">
                <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3">
                  <path d="M 2,9 L 9,2 L 11,4 L 4,11 L 2,11 Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
                </svg>
              </span>
              <input ref={avatarRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
            </div>
            <div className="text-center sm:text-left">
              <p className="text-xl font-bold text-gray-900">{details.name}</p>
              <p className="text-sm text-gray-500 font-medium">Administrator</p>
              <p className="text-sm text-gray-400 mt-0.5">{details.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {/* Edit details */}
            <div className="bg-white rounded-2xl border border-zinc-200 p-6">
              <h2 className="text-base font-semibold text-gray-800 mb-5">Account Details</h2>
              <div className="grid grid-cols-1 gap-4">
                {([
                  { label: 'Display Name', key: 'name' as const, type: 'text' },
                  { label: 'Email', key: 'email' as const, type: 'email' },
                  { label: 'Phone', key: 'phone' as const, type: 'tel' },
                ] as { label: string; key: keyof typeof detailsDraft; type: string }[]).map(({ label, key, type }) => (
                  <div key={key}>
                    <label className="text-xs font-medium text-gray-500 block mb-1 uppercase tracking-wide">{label}</label>
                    <input
                      type={type}
                      value={detailsDraft[key]}
                      onChange={(e) => setDetailsDraft({ ...detailsDraft, [key]: e.target.value })}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-800 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
                    />
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4 mt-5">
                <button
                  onClick={saveDetails}
                  className="px-6 py-2.5 bg-primary rounded-xl text-white text-sm font-medium hover:bg-[#3d2652] transition-colors cursor-pointer"
                >
                  Save Changes
                </button>
                <AnimatePresence>
                  {detailsSaved && (
                    <motion.span
                      initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                      className="flex items-center gap-1.5 text-emerald-600 text-sm font-medium"
                    >
                      <IconCheck className="w-4 h-4" />
                      Saved
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Change password */}
            <div className="bg-white rounded-2xl border border-zinc-200 p-6">
              <h2 className="text-base font-semibold text-gray-800 mb-5">Change Password</h2>
              <div className="space-y-4">
                {([
                  { label: 'Current Password', key: 'current' as const },
                  { label: 'New Password', key: 'newPw' as const },
                  { label: 'Confirm Password', key: 'confirm' as const },
                ] as { label: string; key: keyof typeof pw }[]).map(({ label, key }) => (
                  <div key={key}>
                    <label className="text-xs font-medium text-gray-500 block mb-1 uppercase tracking-wide">{label}</label>
                    <div className="relative">
                      <input
                        type={showPw[key] ? 'text' : 'password'}
                        value={pw[key]}
                        onChange={(e) => { setPw({ ...pw, [key]: e.target.value }); setPwError('') }}
                        className="w-full border border-gray-200 rounded-xl px-4 py-2.5 pr-10 text-sm text-gray-800 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200"
                      />
                      <button
                        onClick={() => setShowPw({ ...showPw, [key]: !showPw[key] })}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showPw[key] ? <IconEyeOff className="w-4 h-4" /> : <IconEye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {pwError && <p className="text-xs text-rose-500 mt-2">{pwError}</p>}
              <div className="flex items-center gap-4 mt-5">
                <button
                  onClick={savePassword}
                  disabled={!pw.current || !pw.newPw || !pw.confirm}
                  className="px-6 py-2.5 bg-primary rounded-xl text-white text-sm font-medium hover:bg-[#3d2652] transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  Update Password
                </button>
                <AnimatePresence>
                  {pwSaved && (
                    <motion.span
                      initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                      className="flex items-center gap-1.5 text-emerald-600 text-sm font-medium"
                    >
                      <IconCheck className="w-4 h-4" />
                      Password updated
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="space-y-6">
          {tableMissing && (
            <div className="px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-sm">
              This setting can&apos;t be saved yet — its database table hasn&apos;t been created. Run <code className="px-1 py-0.5 rounded bg-amber-100 font-mono text-xs">api/sql/test_settings.sql</code> once in the Supabase SQL editor, then reload this page.
            </div>
          )}

          <div className="bg-white border border-zinc-200 rounded-2xl divide-y divide-zinc-100 shadow-sm">
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
                {settingsLoading ? (
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
                      onClick={handleSaveSettings}
                      disabled={settingsSaving || tableMissing}
                      className="px-5 py-2.5 rounded-lg text-white text-[15px] disabled:opacity-50 hover:opacity-90 transition-opacity cursor-pointer"
                      style={{ backgroundColor: ACCENT }}
                    >
                      {settingsSaving ? 'Saving…' : 'Save'}
                    </button>
                  </div>
                )}
                {settingsSaved && <p className="text-xs text-emerald-600 mt-2 text-right">Saved</p>}
                {settingsError && !tableMissing && <p className="text-xs text-rose-600 mt-2 text-right">{settingsError}</p>}
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'activity' && (
        /* Activity log */
        <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-base font-semibold text-gray-800">Recent Activity</h2>
            <p className="text-sm text-gray-400 mt-0.5">A log of actions performed in this admin session.</p>
          </div>
          <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
            {activityLog.map((entry, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-3.5 hover:bg-gray-50 transition-colors">
                <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 shrink-0">
                  <IconClock className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 font-medium">{entry.action}</p>
                  <p className="text-xs text-gray-400">{entry.page}</p>
                </div>
                <span className="text-xs text-gray-400 shrink-0 whitespace-nowrap">{entry.time}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
