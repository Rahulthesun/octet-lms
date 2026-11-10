'use client'

// Instagram-style hearts + comments under an online class.
//
//  mode="student" — heart toggles the student's like; can comment / delete own.
//  mode="admin"   — heart is a read-only counter; admin sees who liked, can
//                   comment (shown with a "Teacher" badge) and delete any comment.
//
// Counts arrive with the class list; the comment thread is fetched lazily the
// first time it is opened.

import { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { authedFetch } from '@/lib/apiClient'
import { timeAgo } from '@/lib/helpers'

interface Comment {
  id: string
  authorName: string
  authorRole: 'student' | 'admin'
  body: string
  createdAt: string
  mine: boolean
  canDelete: boolean
}

interface Liker {
  name: string
  batch: string | null
  likedAt: string
}

interface Engagement {
  likeCount: number
  likedByMe: boolean
  comments: Comment[]
  likers?: Liker[]
}

function HeartIcon({ filled, className = 'w-6 h-6' }: { filled: boolean; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 20.5s-7.5-4.6-9.3-9.2C1.5 8.1 3.4 4.5 7 4.5c2 0 3.5 1.1 5 2.9 1.5-1.8 3-2.9 5-2.9 3.6 0 5.5 3.6 4.3 6.8-1.8 4.6-9.3 9.2-9.3 9.2z"
        fill={filled ? '#ef4444' : 'none'}
        stroke={filled ? '#ef4444' : 'currentColor'}
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CommentIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20.5 11.6c0 4.4-3.8 7.9-8.5 7.9-1.3 0-2.6-.3-3.7-.8L3.5 20l1.4-3.9c-.9-1.3-1.4-2.8-1.4-4.5 0-4.4 3.8-7.9 8.5-7.9s8.5 3.5 8.5 7.9z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function Avatar({ name, admin }: { name: string; admin: boolean }) {
  const letters = name.split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '?'
  return (
    <span
      className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-[11px] font-semibold ${
        admin ? 'bg-[#5e4075] text-white' : 'bg-[#F1EEF5] text-[#5e4075]'
      }`}
    >
      {letters}
    </span>
  )
}

export default function ClassEngagement({
  classId,
  mode,
  initialLikeCount = 0,
  initialCommentCount = 0,
  initialLiked = false,
}: {
  classId: string
  mode: 'student' | 'admin'
  initialLikeCount?: number
  initialCommentCount?: number
  initialLiked?: boolean
}) {
  const [liked, setLiked] = useState(initialLiked)
  const [likeCount, setLikeCount] = useState(initialLikeCount)
  const [commentCount, setCommentCount] = useState(initialCommentCount)
  const [open, setOpen] = useState(false)
  const [showLikers, setShowLikers] = useState(false)
  const [data, setData] = useState<Engagement | null>(null)
  const [loading, setLoading] = useState(false)
  const [draft, setDraft] = useState('')
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [burst, setBurst] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const d: Engagement = await authedFetch(`/api/online-classes/${classId}/engagement`)
      setData(d)
      setLikeCount(d.likeCount)
      setLiked(d.likedByMe)
      setCommentCount(d.comments.length)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load comments')
    } finally {
      setLoading(false)
    }
  }

  // The thread / likers list is fetched the first time either is opened.
  function ensureLoaded() {
    if (!data && !loading) load()
  }

  async function toggleLike() {
    if (mode !== 'student') return
    const next = !liked
    setLiked(next)
    setLikeCount((c) => Math.max(0, c + (next ? 1 : -1)))
    if (next) setBurst((b) => b + 1)
    try {
      const r = await authedFetch(`/api/online-classes/${classId}/like`, { method: 'POST' })
      setLiked(r.liked)
      setLikeCount(r.likeCount)
    } catch (e) {
      setLiked(!next)
      setLikeCount((c) => Math.max(0, c + (next ? -1 : 1)))
      setError(e instanceof Error ? e.message : 'Could not update like')
    }
  }

  async function postComment(e: React.FormEvent) {
    e.preventDefault()
    const body = draft.trim()
    if (!body || posting) return
    setPosting(true)
    setError(null)
    try {
      const r = await authedFetch(`/api/online-classes/${classId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ body }),
      })
      setData((d) => (d ? { ...d, comments: [...d.comments, r.comment] } : d))
      setCommentCount((c) => c + 1)
      setDraft('')
      requestAnimationFrame(() => listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not post comment')
    } finally {
      setPosting(false)
    }
  }

  async function removeComment(id: string) {
    if (!window.confirm('Delete this comment?')) return
    try {
      await authedFetch(`/api/online-classes/${classId}/comments/${id}`, { method: 'DELETE' })
      setData((d) => (d ? { ...d, comments: d.comments.filter((c) => c.id !== id) } : d))
      setCommentCount((c) => Math.max(0, c - 1))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete comment')
    }
  }

  function openComments() {
    ensureLoaded()
    setOpen(true)
    setShowLikers(false)
    setTimeout(() => inputRef.current?.focus(), 150)
  }

  const comments = data?.comments ?? []

  return (
    <div className="mt-4 pt-3 border-t border-gray-100">
      {/* Action row */}
      <div className="flex items-center gap-1 -ml-1.5">
        <button
          type="button"
          onClick={toggleLike}
          disabled={mode !== 'student'}
          aria-pressed={liked}
          aria-label={mode === 'student' ? (liked ? 'Unlike class' : 'Like class') : `${likeCount} likes`}
          title={mode === 'student' ? (liked ? 'Unlike' : 'Like this class') : 'Likes from students'}
          className={`relative p-1.5 rounded-full transition-colors ${
            mode === 'student' ? 'hover:bg-rose-50 cursor-pointer' : 'cursor-default'
          } ${liked ? 'text-rose-500' : 'text-gray-700'}`}
        >
          <motion.span
            key={burst}
            initial={burst ? { scale: 0.6 } : false}
            animate={{ scale: [0.6, 1.25, 1] }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="block"
          >
            <HeartIcon filled={mode === 'student' ? liked : likeCount > 0} />
          </motion.span>
          <AnimatePresence>
            {burst > 0 && liked && (
              <motion.span
                key={`ring-${burst}`}
                initial={{ scale: 0.4, opacity: 0.6 }}
                animate={{ scale: 1.8, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="absolute inset-0 rounded-full border-2 border-rose-400 pointer-events-none"
              />
            )}
          </AnimatePresence>
        </button>
        <button
          type="button"
          onClick={() => (open ? setOpen(false) : openComments())}
          aria-label="Comments"
          title="Comments"
          className="p-1.5 rounded-full text-gray-700 hover:bg-gray-100 transition-colors"
        >
          <CommentIcon />
        </button>
        {mode === 'admin' && likeCount > 0 && (
          <button
            type="button"
            onClick={() => { if (!showLikers) ensureLoaded(); setShowLikers((s) => !s); setOpen(false) }}
            className="ml-auto text-xs px-2.5 py-1 rounded-full border border-gray-200 text-gray-600 hover:border-[#5e4075] hover:text-[#5e4075] transition-colors"
          >
            {showLikers ? 'Hide likes' : 'See who liked'}
          </button>
        )}
      </div>

      {/* Counts */}
      <div className="flex items-center gap-2 mt-1 text-sm">
        <span className="font-semibold text-gray-900 tabular-nums">
          {likeCount} {likeCount === 1 ? 'like' : 'likes'}
        </span>
        <span className="text-gray-300">·</span>
        <button type="button" onClick={() => (open ? setOpen(false) : openComments())} className="text-gray-500 hover:text-gray-800 transition-colors">
          {commentCount === 0
            ? (open ? 'Hide comments' : 'Add a comment')
            : open
            ? 'Hide comments'
            : `View ${commentCount === 1 ? '1 comment' : `all ${commentCount} comments`}`}
        </button>
      </div>

      {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}

      {/* Likers (admin) */}
      <AnimatePresence initial={false}>
        {showLikers && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-3 rounded-lg border border-gray-100 bg-gray-50/60 max-h-56 overflow-y-auto divide-y divide-gray-100" data-lenis-prevent>
              {loading && !data ? (
                <p className="px-3 py-3 text-sm text-gray-400">Loading…</p>
              ) : (data?.likers ?? []).length === 0 ? (
                <p className="px-3 py-3 text-sm text-gray-400">No likes yet.</p>
              ) : (
                data!.likers!.map((l, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2">
                    <Avatar name={l.name} admin={false} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-800 truncate">{l.name}</p>
                      {l.batch && <p className="text-xs text-gray-400">{l.batch}</p>}
                    </div>
                    <HeartIcon filled className="w-4 h-4" />
                    <span className="text-xs text-gray-400 w-14 text-right">{timeAgo(l.likedAt)}</span>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Comments thread */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div ref={listRef} className="mt-3 space-y-3 max-h-72 overflow-y-auto pr-1" data-lenis-prevent>
              {loading && !data ? (
                <div className="space-y-3">
                  {[0, 1].map((i) => (
                    <div key={i} className="flex gap-2.5 animate-pulse">
                      <span className="w-8 h-8 rounded-full bg-gray-100" />
                      <div className="flex-1 space-y-1.5 pt-1">
                        <div className="h-3 w-1/3 bg-gray-100 rounded" />
                        <div className="h-3 w-2/3 bg-gray-100 rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : comments.length === 0 ? (
                <p className="text-sm text-gray-400 py-1">No comments yet. Start the conversation.</p>
              ) : (
                <AnimatePresence initial={false}>
                  {comments.map((c) => (
                    <motion.div
                      key={c.id}
                      layout
                      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, height: 0 }}
                      className="group flex items-start gap-2.5"
                    >
                      <Avatar name={c.authorName} admin={c.authorRole === 'admin'} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm leading-snug text-gray-800 break-words">
                          <span className="font-semibold text-gray-900 mr-1.5">{c.authorName}</span>
                          {c.authorRole === 'admin' && (
                            <span className="inline-block align-middle mr-1.5 px-1.5 py-px rounded text-[10px] font-semibold uppercase tracking-wide bg-[#5e4075] text-white">
                              Teacher
                            </span>
                          )}
                          <span className="whitespace-pre-wrap">{c.body}</span>
                        </p>
                        <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                          <span title={new Date(c.createdAt).toLocaleString('en-IN')}>{timeAgo(c.createdAt)}</span>
                          {c.mine && <span>You</span>}
                          {c.canDelete && (
                            <button
                              type="button"
                              onClick={() => removeComment(c.id)}
                              className="text-gray-400 hover:text-rose-600 transition-colors sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>

            <form onSubmit={postComment} className="mt-3 flex items-center gap-2 border-t border-gray-100 pt-3">
              <input
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                maxLength={1000}
                placeholder={mode === 'admin' ? 'Reply as teacher…' : 'Add a comment…'}
                className="flex-1 min-w-0 text-sm bg-transparent px-1 py-1.5 text-gray-800 placeholder:text-gray-400 focus:outline-none"
              />
              <button
                type="submit"
                disabled={!draft.trim() || posting}
                className="text-sm font-semibold text-[#5e4075] hover:text-[#4b3260] disabled:text-[#5e4075]/35 transition-colors"
              >
                {posting ? 'Posting…' : 'Post'}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
