'use client'

// Public "Parent's Feedback" form (linked from the landing-page footer).
// No login — posts to POST /api/feedback/parents (rate limited per network).
// Reviews appear for the admin under Admin > Parent's Feedback.

import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import StarRating from '@/components/shared/StarRating'
import ChemistryOctetLogo from '@/components/ui/ChemistryOctetLogo'
import { AtomSVG, FlaskSVG } from '@/components/ui/PencilSVGs'

const API_BASE = process.env.NEXT_PUBLIC_SERVER_URL ?? 'http://localhost:8000'
const MAX_STUDENTS = 5

const inputClass =
  'w-full px-4 py-2.5 rounded-xl border border-[#c8b8d8] bg-[#fdfcf8] text-[#5e4075] text-base placeholder:text-[#c8b8d8] focus:outline-none focus:border-[#5e4075]/60 focus:ring-2 focus:ring-[#5e4075]/10 transition-all duration-200'

export default function ParentFeedbackForm() {
  const [parentName, setParentName] = useState('')
  const [phone, setPhone] = useState('')
  const [studentCount, setStudentCount] = useState(1)
  const [studentNames, setStudentNames] = useState<string[]>([''])
  const [rating, setRating] = useState<number | null>(null)
  const [comment, setComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  function changeCount(next: number) {
    const n = Math.min(MAX_STUDENTS, Math.max(1, next))
    setStudentCount(n)
    setStudentNames((prev) => Array.from({ length: n }, (_, i) => prev[i] ?? ''))
  }

  function validate(): string | null {
    if (!parentName.trim()) return 'Please enter your name.'
    if (phone.trim() && !/^[+\d][\d\s-]{6,18}$/.test(phone.trim())) return 'Please enter a valid phone number.'
    if (studentNames.some((n) => !n.trim())) return studentCount > 1 ? "Please enter each student's name." : "Please enter your child's name."
    if (!rating) return 'Please give a star rating.'
    if (!comment.trim()) return 'Please share your comments.'
    return null
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const v = validate()
    if (v) { setError(v); return }
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`${API_BASE}/api/feedback/parents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          parentName: parentName.trim(),
          phone: phone.trim() || undefined,
          studentCount,
          studentNames: studentNames.map((n) => n.trim()),
          rating,
          comment: comment.trim(),
        }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body.error || 'Could not send your review. Please try again.')
      }
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send your review. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  function reset() {
    setParentName(''); setPhone(''); setStudentCount(1); setStudentNames([''])
    setRating(null); setComment(''); setError(null); setDone(false)
  }

  return (
    <div className="max-w-5xl mx-auto bg-white rounded-3xl border border-accent3/60 shadow-[0_8px_40px_rgba(94,64,117,0.08)] overflow-hidden flex flex-col lg:flex-row">
      {/* Left — message panel */}
      <div className="relative lg:w-[42%] px-8 py-10 sm:px-10 sm:py-12 flex flex-col justify-center overflow-hidden" style={{ backgroundColor: '#d4c5e2' }}>
        <div className="absolute -top-4 -right-6 opacity-15 pointer-events-none">
          <AtomSVG width={180} height={180} color="#5e4075" />
        </div>
        <div className="absolute -bottom-6 -left-4 opacity-15 pointer-events-none">
          <FlaskSVG width={120} height={140} color="#5e4075" />
        </div>
        <div className="relative z-10">
          <div className="w-16 h-16 mb-6">
            <ChemistryOctetLogo size={64} />
          </div>
          <p className="text-muted text-[13px] tracking-[0.22em] uppercase mb-3">For Parents</p>
          <h1 className="text-primary text-3xl sm:text-4xl font-bold tracking-tight leading-tight mb-4">
            Your voice shapes how we teach.
          </h1>
          <p className="text-primary/75 text-[16px] leading-relaxed">
            Tell us how your child is doing at Chemistry@OCTET — what you&apos;re happy with, what you expect from us, and
            where we can do better. Every review is read personally by the teacher.
          </p>
          <ul className="mt-7 space-y-3 text-[15px] text-primary/80">
            {['Takes less than two minutes', 'No login needed', 'Read only by the Chemistry@OCTET team'].map((t) => (
              <li key={t} className="flex items-center gap-2.5">
                <span className="w-5 h-5 rounded-full bg-white/70 flex items-center justify-center shrink-0">
                  <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none"><path d="M2.5 6.2l2.3 2.3 4.7-5" stroke="#5e4075" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </span>
                {t}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Right — form */}
      <div className="lg:w-[58%] px-6 py-8 sm:px-10 sm:py-10">
        <AnimatePresence mode="wait">
          {done ? (
            <motion.div
              key="done"
              initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="h-full min-h-[420px] flex flex-col items-center justify-center text-center"
            >
              <div className="w-16 h-16 rounded-full bg-accent2 flex items-center justify-center mb-5">
                <svg className="w-8 h-8" viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke="#5e4075" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
              </div>
              <h2 className="text-2xl text-primary font-semibold">Thank you, {parentName.split(' ')[0] || 'parent'}!</h2>
              <p className="text-muted text-base mt-2 max-w-sm">
                Your review has reached the Chemistry@OCTET team. We truly value your trust and your feedback.
              </p>
              <div className="flex gap-3 mt-8">
                <button onClick={reset} className="px-5 py-2.5 rounded-xl border border-[#c8b8d8] text-primary text-[15px] hover:bg-[#f5f0fa] transition-colors">
                  Send another
                </button>
                <Link href="/" className="px-5 py-2.5 rounded-xl bg-primary text-white text-[15px] hover:bg-primary-dark transition-colors">
                  Back to Home
                </Link>
              </div>
            </motion.div>
          ) : (
            <motion.form key="form" onSubmit={submit} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-5" noValidate>
              <div>
                <h2 className="text-xl text-primary">Parent&apos;s Feedback</h2>
                <p className="text-muted text-[15px] mt-0.5">Share your expectations, comments and rating</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-primary text-[15px] mb-1">Parent&apos;s Name <span className="text-rose-500">*</span></label>
                  <input value={parentName} onChange={(e) => setParentName(e.target.value)} maxLength={120} placeholder="Mrs. Lakshmi Iyer" className={inputClass} />
                </div>
                <div>
                  <label className="block text-primary text-[15px] mb-1">Phone <span className="text-muted text-[13px]">(optional)</span></label>
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" maxLength={20} placeholder="+91 98765 43210" className={inputClass} />
                </div>
              </div>

              <div>
                <label className="block text-primary text-[15px] mb-1.5">Number of students studying at OCTET <span className="text-rose-500">*</span></label>
                <div className="inline-flex items-center rounded-xl border border-[#c8b8d8] bg-[#fdfcf8] overflow-hidden">
                  <button type="button" onClick={() => changeCount(studentCount - 1)} disabled={studentCount <= 1}
                    className="w-11 h-11 flex items-center justify-center text-primary text-xl hover:bg-[#f5f0fa] disabled:opacity-30 transition-colors" aria-label="Fewer students">−</button>
                  <span className="w-12 text-center text-primary text-lg font-mono tabular-nums" aria-live="polite">{studentCount}</span>
                  <button type="button" onClick={() => changeCount(studentCount + 1)} disabled={studentCount >= MAX_STUDENTS}
                    className="w-11 h-11 flex items-center justify-center text-primary text-xl hover:bg-[#f5f0fa] disabled:opacity-30 transition-colors" aria-label="More students">+</button>
                </div>
              </div>

              <div>
                <label className="block text-primary text-[15px] mb-1">
                  {studentCount > 1 ? "Students' Names" : "Student's Name"} <span className="text-rose-500">*</span>
                </label>
                <div className="space-y-2.5">
                  <AnimatePresence initial={false}>
                    {studentNames.map((name, i) => (
                      <motion.div key={i} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="relative">
                        {studentCount > 1 && (
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-accent3/60 text-primary text-xs flex items-center justify-center font-mono">{i + 1}</span>
                        )}
                        <input
                          value={name}
                          onChange={(e) => setStudentNames((prev) => prev.map((n, j) => (j === i ? e.target.value : n)))}
                          maxLength={120}
                          placeholder={studentCount > 1 ? `Student ${i + 1} name` : 'Arjun Iyer'}
                          className={`${inputClass} ${studentCount > 1 ? 'pl-12' : ''}`}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>

              <div>
                <label className="block text-primary text-[15px] mb-1.5">Your rating <span className="text-rose-500">*</span></label>
                <div className="px-4 py-3 rounded-xl border border-[#c8b8d8] bg-[#fdfcf8]">
                  <StarRating value={rating} onChange={setRating} size={30} showLabel />
                </div>
              </div>

              <div>
                <label className="block text-primary text-[15px] mb-1">Comments &amp; expectations <span className="text-rose-500">*</span></label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  rows={5}
                  maxLength={3000}
                  placeholder="How is your child finding the classes? What do you expect from us this year?"
                  className={`${inputClass} resize-none`}
                />
                <p className="text-right text-[12px] text-muted mt-1 font-mono">{comment.length}/3000</p>
              </div>

              {error && <div className="text-sm px-4 py-2.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-100">{error}</div>}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-xl bg-primary text-white text-base font-medium hover:bg-primary-dark transition-colors disabled:opacity-60"
              >
                {submitting ? 'Sending…' : 'Send Review'}
              </button>
            </motion.form>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
