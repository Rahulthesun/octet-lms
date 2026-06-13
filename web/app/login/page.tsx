'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { AtomSVG, FlaskSVG } from '@/components/ui/PencilSVGs'
import { signIn } from '../../lib/auth'
import { supabase } from '@/lib/supabase/client'
import ChemistryOctetLogo from '@/components/ui/ChemistryOctetLogo'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!email || !password) {
      setError('Please enter both email and password.')
      return
    }

    setLoading(true)

    try {
      const { user } = await signIn(email, password)

      const role = user?.app_metadata?.role ?? 'student'

      // Pure admins -> /admin, everyone else (student / both) -> /student
      if (role === 'admin') {
        router.push('/admin')
      } else {
        router.push('/student')
      }
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-screen flex overflow-hidden bg-bg">
      {/* Left panel — auth form */}
      <div className="w-full lg:w-1/2 flex flex-col h-full">
        {/* Top bar */}
        <div className="flex items-center justify-between px-8 py-3.5 border-b border-accent1 shrink-0">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-11 h-11 shrink-0">
              <ChemistryOctetLogo size={44} />
            </div>
            <span className="text-primary text-base">Chemistry<span className="text-muted">@</span>OCTET</span>
          </Link>
          <Link href="/" className="inline-flex items-center gap-2 text-muted text-base hover:text-primary transition-colors">
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
            <div className="bg-white rounded-2xl border border-accent3/60 shadow-[0_8px_40px_rgba(94,64,117,0.08)] p-8">
              <h1 className="text-2xl text-primary mb-1">Welcome back</h1>
              <p className="text-muted text-[15px] mb-6">Sign in to access your student portal</p>

              {error && (
                <div className="mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[14px]">
                  {error}
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-primary text-[15px] mb-1.5">Email address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@email.com"
                    className="w-full px-4 py-3 rounded-xl border border-border bg-[#fdfcf8] text-primary text-base placeholder:text-border focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/10 transition-all duration-200"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-primary text-[15px]">Password</label>
                    <a href="#" className="text-muted text-[14px] hover:text-primary transition-colors">
                      Forgot password?
                    </a>
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 rounded-xl border border-border bg-[#fdfcf8] text-primary text-base placeholder:text-border focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/10 transition-all duration-200"
                  />
                </div>

                <motion.button
                  type="submit"
                  disabled={loading}
                  whileTap={{ scale: 0.98 }}
                  className="w-full py-3 bg-primary text-white text-base rounded-xl hover:bg-[#3d2652] transition-all duration-200 shadow-[0_4px_16px_rgba(94,64,117,0.3)] disabled:opacity-70 flex items-center justify-center gap-2 mt-1"
                >
                  {loading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Signing in...
                    </>
                  ) : 'Sign In'}
                </motion.button>
              </form>

              <div className="flex items-center gap-4 my-5">
                <div className="flex-1 h-px bg-accent1" />
                <span className="text-border text-[14px]">or</span>
                <div className="flex-1 h-px bg-accent1" />
              </div>

              <p className="text-muted text-[15px] text-center">
                Don&apos;t have an account?{' '}
                <Link href="/register" className="text-primary hover:underline">
                  Register here
                </Link>
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right panel — single pastel */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7, delay: 0.1 }}
        className="hidden lg:flex w-1/2 relative flex-col items-center justify-center p-16 overflow-hidden"
        style={{ backgroundColor: '#daeae4' }}
      >
        <div className="absolute top-8 right-8 opacity-20">
          <AtomSVG width={200} height={200} color="#5e4075" />
        </div>
        <div className="absolute bottom-8 left-8 opacity-15">
          <FlaskSVG width={150} height={170} color="#5e4075" />
        </div>

        <div className="relative z-10 max-w-md text-center">
          <div className="w-12 h-12 mx-auto mb-8 flex items-center justify-center">
            <svg className="w-12 h-12 opacity-25" viewBox="0 0 48 48" fill="none">
              <path d="M 8,32 Q 6,20 16,14 Q 20,12 22,14 L 20,20 Q 16,22 16,28 L 22,28 L 22,40 L 8,40 Z" fill="#5e4075" />
              <path d="M 28,32 Q 26,20 36,14 Q 40,12 42,14 L 40,20 Q 36,22 36,28 L 42,28 L 42,40 L 28,40 Z" fill="#5e4075" />
            </svg>
          </div>
          <blockquote className="text-primary text-xl md:text-2xl leading-relaxed mb-6">
            The art of chemistry is to understand the hidden order beneath apparent chaos.
          </blockquote>
          <p className="text-muted text-base tracking-wider">— Antoine Lavoisier</p>
          <div className="mt-12 flex flex-col items-center gap-3">
            <div className="w-px h-10 bg-primary/20" />
            <p className="text-muted text-[14px] tracking-[0.22em] uppercase">Spread True Science</p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}