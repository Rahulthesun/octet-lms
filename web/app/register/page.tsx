'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { AtomSVG, CompoundSVG } from '@/components/ui/PencilSVGs'

export default function RegisterPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    name: '', email: '', mobile: '', grade: '', password: '', confirmPassword: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    await new Promise((r) => setTimeout(r, 900))
    router.push('/student')
  }

  const inputClass = "w-full px-4 py-2.5 rounded-xl border border-[#c8b8d8] bg-[#fdfcf8] text-[#5e4075] text-base placeholder:text-[#c8b8d8] focus:outline-none focus:border-[#5e4075]/60 focus:ring-2 focus:ring-[#5e4075]/10 transition-all duration-200"

  return (
    <div className="h-screen flex overflow-hidden bg-[#f8f9ed]">
      {/* Left panel — single pastel */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7, delay: 0.1 }}
        className="hidden lg:flex w-1/2 relative flex-col items-center justify-center p-16 overflow-hidden"
        style={{ backgroundColor: '#d4c5e2' }}
      >
        <div className="absolute top-8 left-8 opacity-15">
          <CompoundSVG width={220} height={160} color="#5e4075" />
        </div>
        <div className="absolute bottom-8 right-8 opacity-15">
          <AtomSVG width={180} height={180} color="#5e4075" />
        </div>

        <div className="relative z-10 max-w-md text-center">
          <div className="w-12 h-12 mx-auto mb-8 flex items-center justify-center">
            <svg className="w-12 h-12 opacity-25" viewBox="0 0 48 48" fill="none">
              <path d="M 8,32 Q 6,20 16,14 Q 20,12 22,14 L 20,20 Q 16,22 16,28 L 22,28 L 22,40 L 8,40 Z" fill="#5e4075" />
              <path d="M 28,32 Q 26,20 36,14 Q 40,12 42,14 L 40,20 Q 36,22 36,28 L 42,28 L 42,40 L 28,40 Z" fill="#5e4075" />
            </svg>
          </div>
          <blockquote className="text-[#5e4075] text-xl md:text-2xl leading-relaxed mb-6">
            Chemistry isn&apos;t just a subject — it&apos;s the language the universe whispers its secrets in.
          </blockquote>
          <p className="text-[#8b6fa0] text-base tracking-wider">— Chemistry@OCTET</p>
          <div className="mt-8 grid grid-cols-3 gap-5 pt-8 border-t border-[#5e4075]/10">
            {[
              { num: '500+', label: 'Video Lectures' },
              { num: '2000+', label: 'Students' },
              { num: '92%', label: 'Score 85+' },
            ].map(({ num, label }) => (
              <div key={label} className="text-center">
                <p className="text-[#5e4075] text-xl font-mono">{num}</p>
                <p className="text-[#8b6fa0] text-[14px] mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Right panel — register form */}
      <div className="w-full lg:w-1/2 flex flex-col h-full">
        {/* Top bar */}
        <div className="flex items-center justify-between px-8 py-3.5 border-b border-[#e9deb5] shrink-0">
          <Link href="/" className="flex items-center gap-2.5">
            <svg viewBox="0 0 36 36" fill="none" className="w-8 h-8">
              <circle cx="18" cy="18" r="16" stroke="#5e4075" strokeWidth="1.8" />
              <ellipse cx="18" cy="18" rx="14" ry="6" stroke="#5e4075" strokeWidth="1.5" transform="rotate(60 18 18)" />
              <ellipse cx="18" cy="18" rx="14" ry="6" stroke="#5e4075" strokeWidth="1.5" transform="rotate(-60 18 18)" />
              <circle cx="18" cy="18" r="3" fill="#5e4075" />
            </svg>
            <span className="text-[#5e4075] text-base">Chemistry<span className="text-[#8b6fa0]">@</span>OCTET</span>
          </Link>
          <Link href="/" className="inline-flex items-center gap-2 text-[#8b6fa0] text-base hover:text-[#5e4075] transition-colors">
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
              <path d="M 13,8 L 3,8 M 7,4 L 3,8 L 7,12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back to Home
          </Link>
        </div>

        {/* Form area */}
        <div className="flex-1 flex items-center justify-center px-6 overflow-hidden">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-md"
          >
            <div className="bg-white rounded-2xl border border-[#d4c5e2]/60 shadow-[0_8px_40px_rgba(94,64,117,0.08)] p-7">
              <h1 className="text-xl text-[#5e4075] mb-1">Create your account</h1>
              <p className="text-[#8b6fa0] text-[15px] mb-4">Start your chemistry journey today</p>

              <form onSubmit={handleRegister} className="space-y-3">
                <div>
                  <label className="block text-[#5e4075] text-[15px] mb-1">Full Name</label>
                  <input name="name" type="text" value={form.name} onChange={handleChange} placeholder="Arjun Sharma" className={inputClass} />
                </div>
                <div>
                  <label className="block text-[#5e4075] text-[15px] mb-1">Email Address</label>
                  <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="you@email.com" className={inputClass} />
                </div>
                <div>
                  <label className="block text-[#5e4075] text-[15px] mb-1">Mobile Number</label>
                  <input name="mobile" type="tel" value={form.mobile} onChange={handleChange} placeholder="+91 98765 43210" className={inputClass} />
                </div>
                <div>
                  <label className="block text-[#5e4075] text-[15px] mb-1">Grade</label>
                  <select name="grade" value={form.grade} onChange={handleChange} className={inputClass + ' appearance-none'}>
                    <option value="" disabled>Select your grade</option>
                    <option value="11">11th Grade</option>
                    <option value="12">12th Grade</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[#5e4075] text-[15px] mb-1">Password</label>
                    <input name="password" type="password" value={form.password} onChange={handleChange} placeholder="••••••••" className={inputClass} />
                  </div>
                  <div>
                    <label className="block text-[#5e4075] text-[15px] mb-1">Confirm</label>
                    <input name="confirmPassword" type="password" value={form.confirmPassword} onChange={handleChange} placeholder="••••••••" className={inputClass} />
                  </div>
                </div>

                <motion.button
                  type="submit"
                  disabled={loading}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-3 bg-[#5e4075] text-white text-base rounded-xl hover:bg-[#3d2652] transition-all duration-200 shadow-[0_4px_16px_rgba(94,64,117,0.3)] disabled:opacity-70 flex items-center justify-center gap-2 mt-1"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Creating account...
                    </>
                  ) : 'Create Account'}
                </motion.button>
              </form>

              <p className="text-[#8b6fa0] text-[15px] text-center mt-4">
                Already have an account?{' '}
                <Link href="/login" className="text-[#5e4075] hover:underline">Sign in</Link>
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
