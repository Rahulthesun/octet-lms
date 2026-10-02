'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { AtomSVG, FlaskSVG } from '@/components/ui/PencilSVGs'
import { signIn } from '../../lib/auth'
import { supabase } from '@/lib/supabase/client'
import { authedFetch, REVOKED_MESSAGE } from '@/lib/apiClient'
import ChemistryOctetLogo from '@/components/ui/ChemistryOctetLogo'
import AuthQuotePanel from '@/components/shared/AuthQuotePanel'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  // A student whose access was revoked while they were signed in is sent here
  // by the API client with ?revoked=1.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('revoked') === '1') {
      setError(REVOKED_MESSAGE)
    }
  }, [])

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

    const role = user?.app_metadata?.role // 'admin' | 'both' | 'developer' | undefined (students)
    const isStaff = role === 'admin' || role === 'both' || role === 'developer'

    if (!isStaff) {
      // The server decides whether this student may come in: it rejects a
      // graduated student (403 ACCESS_REVOKED) and reports blocked accounts.
      // A revoked student is signed straight back out.
      try {
        const access = await authedFetch('/api/students/access-check')
        if (access.blocked) {
          await supabase.auth.signOut()
          setError('Your account has been blocked. Please contact the administrator.')
          return
        }
      } catch (accessErr: any) {
        await supabase.auth.signOut()
        if (accessErr?.code === 'ACCESS_REVOKED') {
          setError(REVOKED_MESSAGE)
        } else {
          setError(accessErr?.message || 'Unable to verify student account.')
        }
        return
      }
    }

    if (role === 'admin' || role === 'both') {
      router.push('/admin')
    } else if (role === 'developer') {
      router.push('/analytics')
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
                    <Link
                      href="/forgot-password"
                      className="text-muted text-[14px] hover:text-primary transition-colors"
                    >
                      Forgot password?
                    </Link>
                  </div>

                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full px-4 py-3 pr-12 rounded-xl border border-border bg-[#fdfcf8] text-primary text-base placeholder:text-border focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/10 transition-all duration-200"
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-primary transition-colors"
                    >
                      {showPassword ? (
                        // Eye Off
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M3 3l18 18M10.58 10.58A2 2 0 0114 12m6.36 2.36A9.77 9.77 0 0121 12s-3-6-9-6a8.94 8.94 0 00-4.24 1.02M6.1 6.1A9.76 9.76 0 003 12s3 6 9 6a8.94 8.94 0 004.24-1.02"
                          />
                        </svg>
                      ) : (
                        // Eye
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className="h-5 w-5"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M2.458 12C3.732 7.943 7.523 5 12 5s8.268 2.943 9.542 7c-1.274 4.057-5.065 7-9.542 7S3.732 16.057 2.458 12z"
                          />
                        </svg>
                      )}
                    </button>
                  </div>
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

      <AuthQuotePanel />
    </div>
  )
}