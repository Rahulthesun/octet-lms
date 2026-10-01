'use client'

// Forgot password — step 1 of 2. Asks for the registered email and, through
// the API, sends a one-time reset link to it if an account exists. The
// response is deliberately the same either way, so this page never reveals
// whether a given email has an account.

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import ChemistryOctetLogo from '@/components/ui/ChemistryOctetLogo'
import AuthQuotePanel from '@/components/shared/AuthQuotePanel'

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL ?? ''

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!email.trim()) {
      setError('Enter your email address.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`${SERVER_URL}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body?.error || 'Something went wrong. Please try again.')
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

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
            <div className="bg-white rounded-2xl border border-accent3/60 shadow-[0_8px_40px_rgba(94,64,117,0.08)] p-8">
              <h1 className="text-2xl text-primary mb-1">Forgot your password?</h1>
              <p className="text-muted text-[15px] mb-6">
                Enter the email address on your account and we&apos;ll send you a link to reset your password.
              </p>

              {sent ? (
                <div className="px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[14px]">
                  Reset link has been sent to your registered email. Check your inbox — the link is valid for 30 minutes.
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[14px]">
                      {error}
                    </div>
                  )}

                  <div>
                    <label className="block text-primary text-[15px] mb-1.5">Email address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@email.com"
                      autoFocus
                      className="w-full px-4 py-3 rounded-xl border border-border bg-[#fdfcf8] text-primary text-base placeholder:text-border focus:outline-none focus:border-primary/60 focus:ring-2 focus:ring-primary/10 transition-all duration-200"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-primary text-white rounded-xl text-base hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {loading ? 'Sending...' : 'Send reset link'}
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      <AuthQuotePanel />
    </div>
  )
}
