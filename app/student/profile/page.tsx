'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { student } from '@/lib/mockData'

export default function ProfilePage() {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({ ...student })
  const [saved, setSaved] = useState(false)

  const handleSave = async () => {
    await new Promise((r) => setTimeout(r, 600))
    setSaved(true)
    setEditing(false)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-6">
        <h1 className="text-2xl text-[#5e4075] mb-1">Profile</h1>
        <p className="text-[#8b6fa0] text-[15px]">Manage your account information</p>
      </motion.div>

      {saved && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="mb-4 flex items-center gap-2 px-4 py-3.5 bg-[#daeae4]/60 border border-[#daeae4] rounded-xl text-[#3d7a5e] text-base"
        >
          <svg className="w-5 h-5 shrink-0" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
            <path d="M 6.5,10 L 9,12.5 L 13.5,8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Profile updated successfully
        </motion.div>
      )}

      {/* Avatar & basic info */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="bg-white rounded-2xl border border-[#e2d5f0] shadow-[0_2px_12px_rgba(94,64,117,0.06)] p-6 mb-5"
      >
        <div className="flex items-start gap-5">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#e9deb5] to-[#daeae4] flex items-center justify-center text-3xl text-[#5e4075]">
              {form.name.charAt(0)}
            </div>
            {editing && (
              <button className="absolute -bottom-1.5 -right-1.5 w-8 h-8 bg-[#5e4075] rounded-lg flex items-center justify-center text-white">
                <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
                  <path d="M 11,2 Q 13,2 14,4 Q 15,6 13,7 L 5,15 L 2,15 L 2,12 L 10,4 Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                </svg>
              </button>
            )}
          </div>
          <div className="flex-1">
            <h2 className="text-[#5e4075] text-xl mb-0.5">{form.name}</h2>
            <p className="text-[#8b6fa0] text-base">Grade {form.grade} · {form.rollNumber}</p>
            <p className="text-[#8b6fa0] text-[15px] mt-0.5">Joined {new Date(form.joinedDate).toLocaleDateString('en-IN', { year: 'numeric', month: 'long' })}</p>
          </div>
          <button
            onClick={() => setEditing(!editing)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-[15px] transition-all duration-150 ${
              editing
                ? 'bg-[#e9deb5]/40 text-[#5e4075]'
                : 'bg-[#5e4075] text-[#f8f9ed] shadow-[0_2px_8px_rgba(94,64,117,0.2)]'
            }`}
          >
            {!editing && (
              <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
                <path d="M 11,2 Q 13,2 14,4 Q 15,6 13,7 L 5,15 L 2,15 L 2,12 L 10,4 Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
              </svg>
            )}
            {editing ? 'Cancel' : 'Edit Profile'}
          </button>
        </div>
      </motion.div>

      {/* Form */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="bg-white rounded-2xl border border-[#e2d5f0] shadow-[0_2px_12px_rgba(94,64,117,0.06)] p-6 mb-5"
      >
        <h3 className="text-[#5e4075] text-base mb-5">Personal Information</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { label: 'Full Name', key: 'name', type: 'text' },
            { label: 'Email Address', key: 'email', type: 'email' },
            { label: 'Mobile Number', key: 'mobile', type: 'tel' },
            { label: 'Grade', key: 'grade', type: 'text' },
          ].map(({ label, key, type }) => (
            <div key={key}>
              <label className="block text-[#8b6fa0] text-[14px] mb-1.5">{label}</label>
              {editing ? (
                <input
                  type={type}
                  value={form[key as keyof typeof form] ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border border-[#c8b8d8] bg-[#fdfcf8] text-[#5e4075] text-base focus:outline-none focus:border-[#5e4075]/60 focus:ring-2 focus:ring-[#5e4075]/10 transition-all"
                />
              ) : (
                <p className="text-[#5e4075] text-base px-4 py-2.5 bg-[#fdfcf8] rounded-xl border border-[#e2d5f0]">
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
              className="px-6 py-2.5 bg-[#5e4075] text-[#f8f9ed] text-base rounded-xl hover:bg-[#3d2652] transition-all duration-200 shadow-[0_2px_8px_rgba(94,64,117,0.2)]"
            >
              Save Changes
            </button>
            <button
              onClick={() => { setForm({ ...student }); setEditing(false) }}
              className="px-6 py-2.5 bg-[#e9deb5]/40 text-[#5e4075] text-base rounded-xl hover:bg-[#e9deb5]/70 transition-all duration-200"
            >
              Reset
            </button>
          </div>
        )}
      </motion.div>

      {/* Account actions */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="bg-white rounded-2xl border border-[#e2d5f0] shadow-[0_2px_12px_rgba(94,64,117,0.06)] p-6"
      >
        <h3 className="text-[#5e4075] text-base mb-4">Account</h3>
        <div className="space-y-2">
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[#e9deb5]/30 transition-colors text-left text-[#5e4075] text-base">
            <svg className="w-5 h-5 text-[#8b6fa0]" viewBox="0 0 20 20" fill="none">
              <rect x="3" y="3" width="14" height="14" rx="2" stroke="currentColor" strokeWidth="1.5" />
              <path d="M 7,10 L 9,12 L 13,8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Change Password
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-[#e9deb5]/30 transition-colors text-left text-[#5e4075] text-base">
            <svg className="w-5 h-5 text-[#8b6fa0]" viewBox="0 0 20 20" fill="none">
              <path d="M 10,2 C 10,2 14,4 17,8 Q 18,10 17,12 L 10,18 L 3,12 Q 2,10 3,8 C 6,4 10,2 10,2 Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
            </svg>
            Notification Settings
          </button>
          <button
            onClick={() => router.push('/')}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-50 transition-colors text-left text-red-500 text-base"
          >
            <svg className="w-5 h-5" viewBox="0 0 20 20" fill="none">
              <path d="M 8,3 L 4,3 Q 2,3 2,5 L 2,15 Q 2,17 4,17 L 8,17 M 13,7 L 18,10 L 13,13 M 18,10 L 8,10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Sign Out
          </button>
        </div>
      </motion.div>
    </div>
  )
}
