'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { authedFetch } from '@/lib/apiClient'
import { useEffect } from 'react'

const card = 'bg-white rounded-lg border border-[#e2e5ec] shadow-[0_2px_12px_rgba(15,23,42,0.06)]'

export default function ProfilePage() {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
  name: '',
  email: '',
  mobile: '',
  grade: '',
  avatar: null,
  joinedDate: '',
  rollNumber: '',
})
  const [saved, setSaved] = useState(false)


   useEffect(() => {
    async function loadProfile() {
      try {
        const profile = await authedFetch('/api/students/profile');

        setForm((prev) => ({
          ...prev,
          name: profile.name || '',
          email: profile.email || '',
          avatar: profile.avatar || null,
        }));
      } catch (err) {
        console.error("Failed to load profile:", err);
      }
    }

    loadProfile();
  }, []);

  
  const handleSave = async () => {
    await new Promise((r) => setTimeout(r, 600))
    setSaved(true)
    setEditing(false)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-6">
        <h1 className="text-3xl md:text-4xl text-primary mb-1">Profile</h1>
        <p className="text-muted text-base">Manage your account information</p>
      </motion.div>

      {saved && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="mb-5 flex items-center gap-2 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-base"
        >
          <svg className="w-5 h-5 shrink-0" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
            <path d="M 6.5,10 L 9,12.5 L 13.5,8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Profile updated successfully
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left — identity + account */}
        <div className="lg:col-span-1 space-y-5">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className={`${card} p-6 text-center`}
          >
            <div className="relative inline-block">
              <div className="w-24 h-24 rounded-xl bg-linear-to-br from-brand to-brand-dark flex items-center justify-center text-4xl text-white mx-auto">
                {form.name.charAt(0)}
              </div>
              {editing && (
                <button className="absolute -bottom-1.5 -right-1.5 w-8 h-8 bg-brand rounded-md flex items-center justify-center text-white">
                  <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
                    <path d="M 11,2 Q 13,2 14,4 Q 15,6 13,7 L 5,15 L 2,15 L 2,12 L 10,4 Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                  </svg>
                </button>
              )}
            </div>
            <h2 className="text-primary text-xl mt-4 mb-0.5">{form.name}</h2>
            <p className="text-muted text-base">Grade {form.grade} · <span className="font-data">{form.rollNumber}</span></p>
            <p className="text-muted text-sm mt-1">Joined {new Date(form.joinedDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'long' })}</p>
            <button
              onClick={() => setEditing(!editing)}
              className={`mt-5 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-[15px] transition-all duration-150 ${
                editing ? 'bg-accent1/50 text-primary hover:bg-accent1/70' : 'bg-brand text-white hover:bg-brand-dark'
              }`}
            >
              {!editing && (
                <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
                  <path d="M 11,2 Q 13,2 14,4 Q 15,6 13,7 L 5,15 L 2,15 L 2,12 L 10,4 Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                </svg>
              )}
              {editing ? 'Cancel' : 'Edit Profile'}
            </button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className={`${card} p-5`}
          >
            <h3 className="text-primary text-base mb-3">Account</h3>
            <div className="space-y-1">
              <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-accent1/40 transition-colors text-left text-primary text-base">
                <svg className="w-5 h-5 text-slate-400" viewBox="0 0 20 20" fill="none">
                  <rect x="3" y="3" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
                  <path d="M 7,10 L 9,12 L 13,8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Change Password
              </button>
              <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-accent1/40 transition-colors text-left text-primary text-base">
                <svg className="w-5 h-5 text-slate-400" viewBox="0 0 20 20" fill="none">
                  <path d="M 10,2 C 10,2 14,4 17,8 Q 18,10 17,12 L 10,18 L 3,12 Q 2,10 3,8 C 6,4 10,2 10,2 Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
                </svg>
                Notification Settings
              </button>
              <button
                onClick={() => router.push('/')}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-red-50 transition-colors text-left text-red-500 text-base"
              >
                <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none">
                  <path d="M 8,3 L 4,3 Q 2,3 2,5 L 2,15 Q 2,17 4,17 L 8,17 M 13,7 L 18,10 L 13,13 M 18,10 L 8,10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Sign Out
              </button>
            </div>
          </motion.div>
        </div>

        {/* Right — personal info form */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className={`lg:col-span-2 ${card} p-6 h-fit`}
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
                onClick={() => { setEditing(false) }}
                className="px-6 py-2.5 bg-accent1/50 text-primary text-base rounded-md hover:bg-accent1/70 transition-all duration-200"
              >
                Reset
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
