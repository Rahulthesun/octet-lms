'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { student } from '@/lib/mockData'
import { AtomSVG } from '@/components/ui/PencilSVGs'

const card = 'bg-white rounded-lg border border-[#e2e5ec] shadow-[0_2px_12px_rgba(15,23,42,0.06)]'

export default function ProfilePage() {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ ...student })
  const [saved, setSaved] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const handleSave = async () => {
    await new Promise((r) => setTimeout(r, 600))
    setSaved(true)
    setEditing(false)
    setTimeout(() => setSaved(false), 2500)
  }

  const menuItems = [
    {
      label: 'Edit Profile',
      onClick: () => { setEditing(true); setMenuOpen(false) },
      icon: (
        <svg className="w-[18px] h-[18px]" viewBox="0 0 16 16" fill="none">
          <path d="M 11,2 Q 13,2 14,4 Q 15,6 13,7 L 5,15 L 2,15 L 2,12 L 10,4 Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      label: 'Change Password',
      onClick: () => setMenuOpen(false),
      icon: (
        <svg className="w-[18px] h-[18px]" viewBox="0 0 20 20" fill="none">
          <rect x="3" y="3" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
          <path d="M 7,10 L 9,12 L 13,8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      label: 'Notification Settings',
      onClick: () => setMenuOpen(false),
      icon: (
        <svg className="w-[18px] h-[18px]" viewBox="0 0 20 20" fill="none">
          <path d="M 10,2 C 10,2 14,4 17,8 Q 18,10 17,12 L 10,18 L 3,12 Q 2,10 3,8 C 6,4 10,2 10,2 Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
        </svg>
      ),
    },
  ]

  return (
    <div className="p-6 lg:p-6 max-w-7xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-6">
        <h1 className="text-3xl md:text-4xl text-primary mb-1">Profile</h1>
        <p className="text-muted text-base">Manage your account information</p>
      </motion.div>

      {saved && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-base"
        >
          <svg className="w-5 h-5 shrink-0" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
            <path d="M 6.5,10 L 9,12.5 L 13.5,8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Profile updated successfully
        </motion.div>
      )}

      {/* Banner */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className={`${card} mb-5`}
      >
        {/* Cover */}
        <div className="relative h-28 rounded-t-lg overflow-hidden bg-linear-to-r from-brand to-brand-dark">
          <div className="absolute inset-0 flex items-center justify-end pr-8 opacity-20 pointer-events-none">
            <AtomSVG width={120} height={120} color="#ffffff" />
          </div>
        </div>

        {/* Identity */}
        <div className="px-6 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-6">
            <div className="relative shrink-0">
              <div className="w-24 h-24 rounded-2xl bg-linear-to-br from-brand to-brand-dark ring-4 ring-white shadow-md flex items-center justify-center text-4xl text-white">
                {form.name.charAt(0)}
              </div>
              {editing && (
                <button className="absolute -bottom-1.5 -right-1.5 w-8 h-8 bg-brand rounded-md ring-2 ring-white flex items-center justify-center text-white">
                  <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
                    <path d="M 11,2 Q 13,2 14,4 Q 15,6 13,7 L 5,15 L 2,15 L 2,12 L 10,4 Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                  </svg>
                </button>
              )}
            </div>

            <div className="flex-1 min-w-0 sm:pb-1">
              <h2 className="text-primary text-2xl leading-tight">{form.name}</h2>
              <p className="text-muted text-base mt-1">
                Grade <span className="font-data">{form.grade}</span> · <span className="font-data">{form.rollNumber}</span>
                <span className="text-border"> · </span>
                Joined {new Date(form.joinedDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'long' })}
              </p>
            </div>

            {/* Settings gear + dropdown */}
            <div className="relative shrink-0 self-end">
              <button
                onClick={() => setMenuOpen((o) => !o)}
                aria-label="Settings"
                className={`w-10 h-10 rounded-md flex items-center justify-center transition-colors ${
                  menuOpen ? 'bg-accent1/60 text-brand' : 'text-muted hover:text-brand hover:bg-accent1/50'
                }`}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3.2" />
                  <path d="M19.4 13.5a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1.08 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </button>

              <AnimatePresence>
                {menuOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.97 }}
                      transition={{ duration: 0.15, ease: 'easeOut' }}
                      className="absolute right-0 top-full mt-2 w-56 bg-white border border-[#e2e5ec] rounded-lg shadow-[0_8px_30px_rgba(15,23,42,0.12)] py-1.5 z-20"
                    >
                      {menuItems.map((item) => (
                        <button
                          key={item.label}
                          onClick={item.onClick}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-[15px] text-primary hover:bg-accent1/40 transition-colors"
                        >
                          <span className="text-slate-400">{item.icon}</span>
                          {item.label}
                        </button>
                      ))}
                      <div className="my-1 h-px bg-[#F4F1F8]" />
                      <button
                        onClick={() => router.push('/')}
                        className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-[15px] text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <svg className="w-[18px] h-[18px]" viewBox="0 0 20 20" fill="none">
                          <path d="M 8,3 L 4,3 Q 2,3 2,5 L 2,15 Q 2,17 4,17 L 8,17 M 13,7 L 18,10 L 13,13 M 18,10 L 8,10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Sign Out
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Personal information */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className={`${card} p-6`}
      >
        <h3 className="text-primary text-lg mb-5">Personal Information</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { label: 'Full Name', key: 'name', type: 'text' },
            { label: 'Email Address', key: 'email', type: 'email' },
            { label: 'Mobile Number', key: 'mobile', type: 'tel' },
            { label: 'Grade', key: 'grade', type: 'text' },
          ].map(({ label, key, type }) => (
            <div key={key}>
              <label className="block text-muted text-[14px] mb-1.5">{label}</label>
              {editing ? (
                <input
                  type={type}
                  value={form[key as keyof typeof form] ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-md border border-border bg-slate-50 text-primary text-base focus:outline-none focus:border-brand/60 focus:ring-2 focus:ring-brand/10 transition-all"
                />
              ) : (
                <p className="text-primary text-base px-4 py-2.5 bg-slate-50 rounded-md border border-[#e2e5ec]">
                  {form[key as keyof typeof form]}
                </p>
              )}
            </div>
          ))}
        </div>

        {editing && (
          <div className="flex gap-3 mt-5">
            <button
              onClick={handleSave}
              className="px-6 py-2.5 bg-brand text-white text-base rounded-md hover:bg-brand-dark transition-all duration-200"
            >
              Save Changes
            </button>
            <button
              onClick={() => { setForm({ ...student }); setEditing(false) }}
              className="px-6 py-2.5 bg-accent1/50 text-primary text-base rounded-md hover:bg-accent1/70 transition-all duration-200"
            >
              Cancel
            </button>
          </div>
        )}
      </motion.div>
    </div>
  )
}
