'use client'

// Reset password — step 2 of 2. Reached from the link emailed by
// /forgot-password. Validates the token up front (so an expired/used link
// says so immediately, not after typing a new password), then submits the
// new password — the API writes it straight into Supabase Auth, so it
// becomes the account's real login credential from that moment on.

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import ChemistryOctetLogo from '@/components/ui/ChemistryOctetLogo'
import AuthQuotePanel from '@/components/shared/AuthQuotePanel'

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL ?? ''
const MIN_LENGTH = 8

function ResetPasswordForm() {
  const router = useRouter()
  const token = useSearchParams().get('token')

  const [checking, setChecking] = useState(true)
  const [validToken, setValidToken] = useState(false)
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  useEffect(() => {
    if (!token) {
      setChecking(false)
      setValidToken(false)
      return
    }
    fetch(`${SERVER_URL}/api/auth/reset-password/validate?token=${encodeURIComponent(token)}`)
      .then((res) => {
        setValidToken(res.ok)
        setChecking(false)
      })
      .catch(() => {
        setValidToken(false)
        setChecking(false)
      })
  }, [token])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password.length < MIN_LENGTH) {
      setError(`Password must be at least ${MIN_LENGTH} characters.`)
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`${SERVER_URL}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body?.error || 'Could not reset your password. Please request a new link.')
      setDone(true)
      setTimeout(() => router.push('/login'), 2500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reset your password. Please request a new link.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-accent3/60 shadow-[0_8px_40px_rgba(94,64,117,0.08)] p-8">
      {checking ? (
        <p className="text-muted text-[15px] text-center py-6">Checking your reset link...</p>
      ) : !validToken ? (
        <>
          <h1 className="text-2xl text-primary mb-2">This link is invalid or expired</h1>
          <p className="text-muted text-[15px] mb-6">
            Reset links are only valid for 30 minutes, and only once. Request a new one below.
          </p>
          <Link
            href="/forgot-password"
            className="inline-flex w-full items-center justify-center py-3 bg-primary text-white rounded-xl text-base hover:opacity-90 transition-opacity"
          >
            Request a new link
          </Link>
        </>
      ) : done ? (
        <div className="px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[14px]">
          Your password has been reset. Taking you to login...
        </div>
      ) : (
        <>
          <h1 className="text-2xl text-primary mb-1">Set a new password</h1>
          <p className="text-muted text-[15px] mb-6">Choose a new password for your account.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[14px]">
                {error}
              </div>
            )}

            <div>
              <label className="block text-primary text-[15px] mb-1.5">New password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoFocus
                  className="w-full px-4 py-3 pr-12 rounded-xl border border-border bg-[#fdfcf8] text-primary text-base placeholder:text-border focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/10 transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-primary transition-colors text-sm"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <p className="text-muted text-[13px] mt-1">At least {MIN_LENGTH} characters.</p>
            </div>

            <div>
              <label className="block text-primary text-[15px] mb-1.5">Confirm new password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl border border-border bg-[#fdfcf8] text-primary text-base placeholder:text-border focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/10 transition-all duration-200"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-primary text-white rounded-xl text-base hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? 'Resetting...' : 'Reset password'}
            </button>
          </form>
        </>
      )}
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <div className="h-screen flex overflow-hidden bg-bg">
      <div className="w-full lg:w-1/2 flex flex-col h-full">
        <div className="flex items-center justify-between px-8 py-3.5 border-b border-accent1 shrink-0">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-11 h-11 shrink-0">
              <ChemistryOctetLogo size={44} />
            </div>
            <span className="text-primary text-base">Chemistry<span className="text-muted">@</span>OCTET</span>
          </Link>
          <Link href="/login" className="inline-flex items-center gap-2 text-muted text-base hover:text-primary transition-colors">
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
              <path d="M 13,8 L 3,8 M 7,4 L 3,8 L 7,12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Back to Login
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center px-6 overflow-hidden">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-md"
          >
            <Suspense fallback={<p className="text-muted text-[15px] text-center py-6">Loading...</p>}>
              <ResetPasswordForm />
            </Suspense>
          </motion.div>
        </div>
      </div>

      <AuthQuotePanel />
    </div>
  )
}
