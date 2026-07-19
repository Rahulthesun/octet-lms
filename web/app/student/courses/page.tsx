'use client'

import { useMemo, useRef, useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  useVideoHook,
  type VideoChapter,
  type VideoTopic,
} from '@/hooks/useVideoHook'
import {
  useIsMobileDevice,
  usePdfViewerLockdown,
  type LockdownStatus,
} from '@/hooks/usePdfViewerLockDown'
import { MobileBlockedScreen } from '@/components/MobileBlockedScreen'
import { useWatermarkToken } from '@/hooks/useWatermarkToken'
import { getSession } from '@/lib/auth'
import ChemistryOctetLogo from '@/components/ui/ChemistryOctetLogo'

// Per-subject accent — dusty-plum family (on-theme, lightly differentiated)
const SUBJECT_STYLE: Record<string, { text: string; border: string }> = {
  physical: { text: 'text-[#7A6B96]', border: 'border-l-[#7A6B96]' },
  organic: { text: 'text-[#8F7BA0]', border: 'border-l-[#8F7BA0]' },
  inorganic: { text: 'text-[#635580]', border: 'border-l-[#635580]' },
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  const mm = h > 0 ? String(m).padStart(2, '0') : String(m)
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

// ─── Animated Logo Watermark Overlay ─────────────────────────────────────────
// Same GPU-composited drift pattern as the PDF viewer's watermark: pinned to
// the visible stage (not the video's intrinsic size), position driven purely
// via translate3d so it never triggers layout/reflow.
function AnimatedLogoWatermark({
  viewportRef,
  studentToken,
}: {
  viewportRef: React.RefObject<HTMLDivElement | null>
  studentToken: string | null
}) {
  const [size, setSize] = useState({ w: 0, h: 0 })
  const [coords, setCoords] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const el = viewportRef.current
    if (!el) return
    const update = () => setSize({ w: el.clientWidth, h: el.clientHeight })
    update()
    const obs = new ResizeObserver(update)
    obs.observe(el)
    return () => obs.disconnect()
  }, [viewportRef])

  const LOGO_SIZE = Math.max(90, Math.min(size.w, size.h) * 0.32)

  const pickNewSpot = useCallback(() => {
    if (size.w === 0 || size.h === 0) return
    const margin = LOGO_SIZE * 0.3
    const maxX = Math.max(0, size.w - LOGO_SIZE + margin * 2)
    const maxY = Math.max(0, size.h - LOGO_SIZE + margin * 2)
    const x = -margin + Math.random() * maxX
    const y = -margin + Math.random() * maxY
    setCoords({ x, y })
  }, [size, LOGO_SIZE])

  useEffect(() => {
    pickNewSpot()
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') pickNewSpot()
    }, 4000)
    return () => clearInterval(interval)
  }, [pickNewSpot])

  if (size.w === 0 || size.h === 0) return null

  return (
    <div
      className="pointer-events-none z-10"
      style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: LOGO_SIZE,
          opacity: 0.55,
          transform: `translate3d(${coords.x}px, ${coords.y}px, 0)`,
          transition: 'transform 1.2s ease',
          willChange: 'transform',
          contain: 'layout style paint',
          backfaceVisibility: 'hidden',
        }}
      >
        <ChemistryOctetLogo size={LOGO_SIZE} />

        {/* ------ STUDENT TOKEN WATERMARK---------
        {studentToken && (
          <div
            style={{
              marginTop: 6,
              textAlign: 'center',
              fontFamily: '"DM Sans", "Inter", sans-serif',
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: '0.06em',
              color: '#ffffff',
              textShadow: '0 1px 3px rgba(0,0,0,0.6)',
            }}
          >
            Chemistry@OCTET · {studentToken}
          </div>
        )}
        */}
        
      </div>
    </div>
  )
}

// ─── Blocked overlay — same visual language as the PDF viewer's ─────────────
function BlockedOverlay({ reason }: { reason: 'devtools' | 'screenshot' }) {
  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-5 max-w-sm text-center px-8">
        <div className="w-10 h-10 rounded-full bg-red-50 border border-red-100 flex items-center justify-center">
          <svg className="w-5 h-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="space-y-1.5">
          <p className="text-sm font-semibold text-gray-900 tracking-tight">Session suspended</p>
          <p className="text-xs text-gray-400 leading-relaxed">
            {reason === 'screenshot'
              ? 'Screenshot attempt detected. This session has been flagged.'
              : 'Developer tools were kept open. This session has been flagged.'}
            {' '}Contact your instructor to restore access.
          </p>
        </div>
        <div className="flex items-center gap-2 text-[10px] text-red-400 font-medium tracking-widest uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
          Incident recorded
        </div>
      </div>
    </div>
  )
}

// ─── Video Player — full-bleed, same design system as PdfViewer ─────────────

interface VideoPlayerProps {
  topic: VideoTopic | null
  getStreamUrl: (videoId: string) => Promise<string | null>
  getWatchSession: (videoId: string) => Promise<{ position_secs: number } | null>
  sendHeartbeat: (videoId: string, positionSecs: number) => Promise<void>
  className?: string
}

function VideoPlayer({ topic, getStreamUrl, getWatchSession, sendHeartbeat, className = '' }: VideoPlayerProps) {
  const [playing, setPlaying] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [urlLoading, setUrlLoading] = useState(false)
  const [urlError, setUrlError] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [status, setStatus] = useState<LockdownStatus>('clean')

  const containerRef = useRef<HTMLDivElement>(null)
  const stageRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const resumeAppliedRef = useRef(false)

  const isMobile = useIsMobileDevice()
  const studentToken = useWatermarkToken()

  // ── Countdown for devtools warning — same 10s grace period as PdfViewer ──
  const GRACE_SECONDS = 10
  const [countdown, setCountdown] = useState(GRACE_SECONDS)

  useEffect(() => {
    if (status !== 'devtools-warning') {
      setCountdown(GRACE_SECONDS)
      return
    }
    if (countdown <= 0) return
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [status, countdown])

  // ── Lockdown hook — same as PdfViewer, including security-event logging ──
  usePdfViewerLockdown(containerRef, {
    devtoolsGracePeriodMs: GRACE_SECONDS * 1000,
    onStatusChange: setStatus,
    onSecurityEvent: async (event) => {
      const session = await getSession()
      if (!session?.access_token) return
      fetch(`${process.env.NEXT_PUBLIC_SERVER_URL}/api/security/security-log`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ event, ts: Date.now() }),
      }).catch(() => {})
    },
  })

  const isHardBlocked = status === 'devtools-blocked' || status === 'screenshot-blocked'

  // Pause the instant lockdown escalates past clean — blurring the picture
  // while audio keeps playing defeats the point.
  useEffect(() => {
    if (status !== 'clean' && videoRef.current && !videoRef.current.paused) {
      videoRef.current.pause()
    }
  }, [status])

  // ── Extra keyboard DRM — same combo list as PdfViewer ────────────────────
  useEffect(() => {
    const block = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey
      if (ctrl && ['s', 'p', 'c', 'a', 'u'].includes(e.key.toLowerCase())) {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    document.addEventListener('keydown', block, true)
    return () => document.removeEventListener('keydown', block, true)
  }, [])

  // Reset per-lesson state and fetch a fresh presigned stream URL.
  useEffect(() => {
    setPlaying(false)
    setVideoUrl(null)
    setUrlError(null)
    setCurrentTime(0)
    setDuration(0)
    resumeAppliedRef.current = false
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current)
      heartbeatIntervalRef.current = null
    }
    if (!topic) return

    let cancelled = false
    setUrlLoading(true)
    getStreamUrl(topic.id)
      .then((url) => {
        if (cancelled) return
        if (url) setVideoUrl(url)
        else setUrlError('Failed to load video')
      })
      .finally(() => {
        if (!cancelled) setUrlLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [topic?.id, getStreamUrl])

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', onFsChange)
    return () => document.removeEventListener('fullscreenchange', onFsChange)
  }, [])

  const toggleFullscreen = () => {
    const el = stageRef.current
    if (!el) return
    if (document.fullscreenElement) document.exitFullscreen()
    else el.requestFullscreen?.()
  }

  const reportHeartbeat = () => {
    if (!topic || !videoRef.current) return
    sendHeartbeat(topic.id, videoRef.current.currentTime)
  }

  const handlePlay = async () => {
    const v = videoRef.current
    if (!v || isHardBlocked) return
    if (!resumeAppliedRef.current && topic) {
      resumeAppliedRef.current = true
      const session = await getWatchSession(topic.id)
      if (session && session.position_secs > 0 && session.position_secs < (v.duration || Infinity) - 3) {
        v.currentTime = session.position_secs
      }
    }
    v.play()
  }

  const onVideoPlay = () => {
    setPlaying(true)
    if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current)
    heartbeatIntervalRef.current = setInterval(reportHeartbeat, 30000)
  }

  const onVideoPause = () => {
    setPlaying(false)
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current)
      heartbeatIntervalRef.current = null
    }
    reportHeartbeat()
  }

  const onVideoEnded = () => {
    setPlaying(false)
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current)
      heartbeatIntervalRef.current = null
    }
    reportHeartbeat()
  }

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) reportHeartbeat()
    }
    const onUnload = () => reportHeartbeat()
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('beforeunload', onUnload)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('beforeunload', onUnload)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topic?.id])

  useEffect(() => {
    return () => {
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current)
    }
  }, [])

  const seekTo = (fraction: number) => {
    const v = videoRef.current
    if (!v || !v.duration) return
    v.currentTime = fraction * v.duration
  }

  // ── Gates — must run after all hooks ──────────────────────────────────
  if (isMobile === null) return null
  if (isMobile) return <MobileBlockedScreen />

  if (!topic) {
    return (
      <div
        className={`flex flex-col items-center justify-center gap-4 bg-gray-50 rounded-xl border border-dashed border-gray-200 ${className}`}
        style={{ minHeight: 320 }}
      >
        <ChemistryOctetLogo size={64} className="opacity-40 grayscale" static />
        <div className="text-center mt-2">
          <p className="text-sm font-semibold text-primary/40 tracking-tight">
            Chemistry<span className="font-normal text-gray-300">@</span>OCTET
          </p>
          <p className="text-xs text-gray-400 mt-1">Select a lesson to start watching</p>
        </div>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={`cato-video-viewer flex flex-col rounded-xl overflow-hidden border border-gray-200 bg-white select-none focus:outline-none ${className}`}
      style={{ minHeight: 380 }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* ── Toolbar — identical language to PdfViewer's ── */}
      <div className="flex items-center gap-2 px-3 py-2 bg-white border-b border-gray-100 shrink-0">
        <div className="flex items-center gap-1.5 pr-2.5 border-r border-gray-100 shrink-0">
          <ChemistryOctetLogo size={20} static />
          <span className="text-[11px] font-extrabold text-primary tracking-tight leading-none ml-1">
            C<span className="font-light text-gray-400">@</span>O
          </span>
        </div>
        <div className="flex items-center gap-1.5 flex-1 min-w-0">
          <span className="text-xs text-gray-500 truncate">{topic.title}</span>
        </div>
        <div className="shrink-0 text-[11px] text-gray-400 tabular-nums font-data border-l border-gray-100 pl-2">
          {formatTime(currentTime)} / {duration ? formatTime(duration) : topic.duration}
        </div>
        <div className="shrink-0 ml-1 flex items-center gap-1 bg-primary/5 border border-primary/10 rounded-full px-2 py-0.5">
          <span className="text-[9px] font-semibold text-primary/50 tracking-wider uppercase leading-none">Protected</span>
        </div>
      </div>

      {/* ── DevTools warning banner with countdown ── */}
      {status === 'devtools-warning' && (
        <div className="flex items-center gap-3 px-4 py-3 bg-amber-50 border-b border-amber-200 shrink-0">
          <svg className="w-4 h-4 text-amber-500 shrink-0" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-amber-900">Developer tools detected</p>
            <p className="text-[11px] text-amber-700 mt-0.5">
              Close them to continue. Session locks in{' '}
              <span className={`font-bold tabular-nums ${countdown <= 3 ? 'text-red-600' : 'text-amber-900'}`}>
                {countdown}s
              </span>
            </p>
          </div>
          <div className="shrink-0 w-8 h-8 rounded-full border-2 border-amber-300 flex items-center justify-center">
            <span className={`text-xs font-bold tabular-nums ${countdown <= 3 ? 'text-red-500' : 'text-amber-600'}`}>
              {countdown}
            </span>
          </div>
        </div>
      )}

      {/* ── Stage — full-bleed, fills all available space ── */}
      <div
        ref={stageRef}
        className="relative flex-1 min-h-0 bg-black overflow-hidden"
      >
        {status === 'devtools-blocked' && <BlockedOverlay reason="devtools" />}
        {status === 'screenshot-blocked' && <BlockedOverlay reason="screenshot" />}

        {urlLoading || !videoUrl ? (
          !urlError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
              <div className="relative">
                <ChemistryOctetLogo size={48} static />
                <div className="absolute -inset-2 flex items-center justify-center">
                  <div className="w-16 h-16 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                </div>
              </div>
              <span className="text-xs text-white/50 mt-4">Loading video…</span>
            </div>
          )
        ) : null}

        {urlError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <p className="text-sm text-white/70">Could not load video</p>
            <p className="text-xs text-white/40 max-w-48 text-center">{urlError}</p>
          </div>
        )}

        {videoUrl && !urlError && (
          <>
            <video
              ref={videoRef}
              src={videoUrl}
              className="absolute inset-0 w-full h-full object-contain"
              playsInline
              draggable={false}
              disablePictureInPicture
              controlsList="nodownload noremoteplayback noplaybackrate"
              onContextMenu={(e) => e.preventDefault()}
              onPlay={onVideoPlay}
              onPause={onVideoPause}
              onEnded={onVideoEnded}
              onSeeked={reportHeartbeat}
              onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
              onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
            />

            {!status.startsWith('devtools-blocked') && !status.startsWith('screenshot-blocked') && (
              <AnimatedLogoWatermark viewportRef={stageRef} studentToken={studentToken} />
            )}

            {!playing && !isHardBlocked && (
              <div
                className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer bg-black/20 z-20"
                onClick={handlePlay}
              >
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  className="w-16 h-16 rounded-full bg-white/15 backdrop-blur-sm border border-white/20 flex items-center justify-center mb-4"
                >
                  <svg className="w-7 h-7 ml-1" viewBox="0 0 24 24" fill="white">
                    <path d="M 7,5 L 20,12 L 7,19 Z" />
                  </svg>
                </motion.div>
                <p className="text-white/85 text-base line-clamp-1 max-w-md px-4 text-center">{topic.title}</p>
              </div>
            )}

            {!isHardBlocked && (
              <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/70 to-transparent pt-8 pb-3 px-4">
                <div
                  className="h-1.5 bg-white/25 rounded-full cursor-pointer mb-3"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect()
                    seekTo((e.clientX - rect.left) / rect.width)
                  }}
                >
                  <div
                    className="h-full bg-white rounded-full"
                    style={{ width: duration ? `${(currentTime / duration) * 100}%` : '0%' }}
                  />
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => (playing ? videoRef.current?.pause() : handlePlay())}
                      className="w-8 h-8 rounded-md bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                    >
                      {playing ? (
                        <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="white">
                          <rect x="3" y="2" width="4" height="12" rx="1" />
                          <rect x="9" y="2" width="4" height="12" rx="1" />
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5 ml-0.5" viewBox="0 0 16 16" fill="white">
                          <path d="M 4,2 L 14,8 L 4,14 Z" />
                        </svg>
                      )}
                    </button>
                    <span className="text-white/80 text-[13px] font-data tabular-nums">
                      {formatTime(currentTime)} / {duration ? formatTime(duration) : topic.duration}
                    </span>
                  </div>
                  <button
                    onClick={toggleFullscreen}
                    title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                    className="w-8 h-8 rounded-md bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                  >
                    {isFullscreen ? (
                      <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
                        <path d="M 6,2 L 6,6 L 2,6 M 10,2 L 10,6 L 14,6 M 6,14 L 6,10 L 2,10 M 10,14 L 10,10 L 14,10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
                        <path d="M 2,6 L 2,2 L 6,2 M 14,6 L 14,2 L 10,2 M 2,10 L 2,14 L 6,14 M 14,10 L 14,14 L 10,14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Footer branding — same as PdfViewer's secured-content line ── */}
      <div className="flex items-center justify-center gap-1.5 py-2 border-t border-gray-100 bg-white shrink-0">
        <ChemistryOctetLogo size={16} className="grayscale opacity-40" static />
        <span className="text-[10px] text-gray-500 font-medium tracking-wide opacity-40">
          Chemistry@OCTET — Secured Content
        </span>
      </div>
    </div>
  )
}

// ─── Icons ───────────────────────────────────────────────────────────────────

function VideoIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none">
      <rect x="2" y="5" width="11" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M 13,9 L 18,6 L 18,14 L 13,11 Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}

function Chevron({ open, className = 'w-3.5 h-3.5' }: { open: boolean; className?: string }) {
  return (
    <svg className={`${className} transition-transform duration-200 ${open ? 'rotate-90' : ''}`} viewBox="0 0 16 16" fill="none">
      <path d="M 6,4 L 10,8 L 6,12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────

export default function VideoLessonsPage() {
  const { videoSubjects, loading, error, loadChapterVideos, getStreamUrl, getWatchSession, sendHeartbeat } =
    useVideoHook()

  const [search, setSearch] = useState('')
  const [openSubjects, setOpenSubjects] = useState<Set<string>>(new Set())
  const [openChapters, setOpenChapters] = useState<Set<string>>(new Set())
  const [selectedChapter, setSelectedChapter] = useState<VideoChapter | null>(null)
  const [selectedTopic, setSelectedTopic] = useState<VideoTopic | null>(null)

  const q = search.trim().toLowerCase()
  const searching = q.length > 0

  const filtered = useMemo(() => {
    if (!searching) return videoSubjects
    return videoSubjects
      .map((subj) => {
        const subjMatch = subj.title.toLowerCase().includes(q)
        const chapters = subj.chapters.filter(
          (ch) =>
            subjMatch ||
            ch.title.toLowerCase().includes(q) ||
            ch.topics.some((t) => t.title.toLowerCase().includes(q)),
        )
        return { ...subj, chapters }
      })
      .filter((subj) => subj.chapters.length > 0)
  }, [q, searching, videoSubjects])

  const isSubjectOpen = (id: string) => searching || openSubjects.has(id)
  const isChapterOpen = (id: string) => searching || openChapters.has(id)

  const toggleSubject = (id: string) =>
    setOpenSubjects((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const toggleChapter = (id: string) => {
    setOpenChapters((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
    loadChapterVideos(id)
  }

  const allOpen =
    openSubjects.size === videoSubjects.length &&
    openChapters.size === videoSubjects.reduce((n, s) => n + s.chapters.length, 0)

  const expandAll = () => {
    setOpenSubjects(new Set(videoSubjects.map((s) => s.id)))
    const allChapterIds = videoSubjects.flatMap((s) => s.chapters.map((c) => c.id))
    setOpenChapters(new Set(allChapterIds))
    allChapterIds.forEach((id) => loadChapterVideos(id))
  }
  const collapseAll = () => {
    setOpenSubjects(new Set())
    setOpenChapters(new Set())
  }

  const openTopic = (chapter: VideoChapter, topic: VideoTopic) => {
    setSelectedChapter(chapter)
    setSelectedTopic(topic)
  }

  // ── Player view ────────────────────────────────────────────────────────────
  if (selectedChapter) {
    return (
      <div className="p-5 lg:p-6 h-screen flex flex-col">
        <button
          onClick={() => { setSelectedChapter(null); setSelectedTopic(null) }}
          className="inline-flex items-center gap-2 text-muted text-base hover:text-brand transition-colors mb-4 shrink-0 w-fit"
        >
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
            <path d="M 13,8 L 3,8 M 7,4 L 3,8 L 7,12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to Video Lessons
        </button>

        <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0">
          <VideoPlayer
            topic={selectedTopic}
            getStreamUrl={getStreamUrl}
            getWatchSession={getWatchSession}
            sendHeartbeat={sendHeartbeat}
            className="flex-1 min-h-0"
          />

          <div className="w-full lg:w-80 shrink-0 bg-white rounded-lg border border-[#e2e5ec] shadow-[0_2px_12px_rgba(15,23,42,0.06)] overflow-hidden flex flex-col max-h-72 lg:max-h-none">
            <div className="p-4 border-b border-[#e2e5ec]">
              <p className="text-muted text-[14px] uppercase tracking-wider mb-1">Chapter</p>
              <h3 className="text-primary text-base leading-snug">{selectedChapter.title}</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {selectedChapter.topics.map((topic, i) => {
                const isSelected = selectedTopic?.id === topic.id
                return (
                  <button
                    key={topic.id}
                    onClick={() => setSelectedTopic(topic)}
                    className={`w-full flex items-start gap-3 p-3 rounded-lg text-left transition-all duration-150 mb-1 ${
                      isSelected ? 'bg-brand/8' : 'hover:bg-accent1/30'
                    }`}
                  >
                    <div className="flex flex-col items-center shrink-0 pt-1">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[14px] ${
                        topic.watched
                          ? 'bg-brand text-white'
                          : isSelected
                          ? 'border-2 border-brand text-primary'
                          : 'border border-border text-border'
                      }`}>
                        {topic.watched ? (
                          <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
                            <path d="M 2,6 L 5,9 L 10,3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        ) : i + 1}
                      </div>
                      {i < selectedChapter.topics.length - 1 && (
                        <div className={`w-0.5 h-6 mt-1 ${topic.watched ? 'bg-brand/30' : 'bg-accent1'}`} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[15px] leading-snug ${isSelected ? 'text-primary' : 'text-primary/80'}`}>
                        {topic.title}
                      </p>
                      <p className="text-muted text-[14px] mt-0.5 font-data">{topic.duration}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── Browse view (accordion) ──────────────────────────────────────────────
  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <span className="w-9 h-9 rounded-lg bg-brand/10 flex items-center justify-center text-primary">
            <VideoIcon className="w-5 h-5" />
          </span>
          <h1 className="text-3xl md:text-4xl text-primary">Video Lessons</h1>
        </div>
        <p className="text-muted text-base mt-1">Watch your chemistry lectures, organized by subject and chapter</p>
      </motion.div>

      <div className="flex items-center gap-4 mb-6">
        <div className="flex-1 relative">
          <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" viewBox="0 0 16 16" fill="none">
            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" />
            <path d="M 11,11 L 14.5,14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search subjects, chapters, or lessons..."
            className="w-full pl-11 pr-4 py-3 rounded-lg border border-border bg-white text-primary text-base placeholder:text-border focus:outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/10 transition-all"
          />
        </div>
        <button
          onClick={() => (allOpen ? collapseAll() : expandAll())}
          disabled={searching}
          className="shrink-0 inline-flex items-center gap-2 px-4 py-3 rounded-md border border-border bg-white text-primary text-[15px] hover:bg-accent1/40 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
            {allOpen ? (
              <path d="M 4,9 L 8,5 L 12,9 M 4,13 L 8,9 L 12,13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            ) : (
              <path d="M 4,3 L 8,7 L 12,3 M 4,7 L 8,11 L 12,7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            )}
          </svg>
          {allOpen ? 'Collapse all' : 'Expand all'}
        </button>
      </div>

      {loading && (
        <div className="text-center py-16 text-muted">
          <p className="text-[15px]">Loading subjects...</p>
        </div>
      )}

      {!loading && error && (
        <div className="text-center py-16 text-muted">
          <p className="text-[15px]">Couldn&apos;t load video lessons — {error}</p>
        </div>
      )}

      {!loading && !error && (
        <div className="space-y-4">
          {filtered.map((subject) => {
            const subjectOpen = isSubjectOpen(subject.id)
            const s = SUBJECT_STYLE[subject.id] ?? SUBJECT_STYLE.physical
            return (
              <div
                key={subject.id}
                className={`bg-white rounded-lg border border-[#e2e5ec] border-l-4 ${s.border} shadow-[0_2px_12px_rgba(15,23,42,0.06)] overflow-hidden`}
              >
                <button
                  onClick={() => toggleSubject(subject.id)}
                  className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-[#F4F1F8] transition-colors"
                >
                  <Chevron open={subjectOpen} className="w-4 h-4 text-muted shrink-0" />
                  <span className={`${s.text} shrink-0`}><VideoIcon className="w-5 h-5" /></span>
                  <span className="flex-1 text-primary text-base">{subject.title}</span>
                  <span className="text-muted text-[14px] shrink-0 font-data">{subject.chapters.length} chapters</span>
                </button>

                <AnimatePresence initial={false}>
                  {subjectOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-[#F4F1F8] divide-y divide-[#F4F1F8]">
                        {subject.chapters.map((chapter, ci) => {
                          const chapterOpen = isChapterOpen(chapter.id)
                          return (
                            <div key={chapter.id}>
                              <button
                                onClick={() => toggleChapter(chapter.id)}
                                className="w-full flex items-center gap-3 pl-8 pr-5 py-3 text-left hover:bg-[#F4F1F8] transition-colors"
                              >
                                <Chevron open={chapterOpen} className="w-3.5 h-3.5 text-muted shrink-0" />
                                <span className="text-primary/70 shrink-0"><VideoIcon className="w-4 h-4" /></span>
                                <span className="text-muted text-[14px] w-16 shrink-0">Chap {ci + 1}</span>
                                <span className="flex-1 text-primary/90 text-[15px] leading-snug">{chapter.title}</span>
                                <span className="text-muted text-[14px] shrink-0">{chapter.topics.length} videos</span>
                              </button>

                              <AnimatePresence initial={false}>
                                {chapterOpen && (
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                                    className="overflow-hidden bg-[#FAF9FB]"
                                  >
                                    <div className="py-1">
                                      {chapter.topics.map((topic) => (
                                        <button
                                          key={topic.id}
                                          onClick={() => openTopic(chapter, topic)}
                                          className="w-full flex items-center gap-3 pl-16 pr-5 py-2.5 text-left hover:bg-[#F4F1F8] transition-colors group"
                                        >
                                          <span className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                                            topic.watched ? 'bg-brand text-white' : 'border border-border text-transparent'
                                          }`}>
                                            <svg className="w-3 h-3" viewBox="0 0 12 12" fill="none">
                                              <path d="M 2,6 L 5,9 L 10,3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                          </span>
                                          <span className="flex-1 text-primary/85 text-[15px] leading-snug group-hover:text-brand">{topic.title}</span>
                                          <span className="text-muted text-[14px] font-data shrink-0">{topic.duration}</span>
                                          <svg className="w-4 h-4 text-border group-hover:text-brand transition-colors shrink-0" viewBox="0 0 16 16" fill="none">
                                            <path d="M 6,4 L 10,8 L 6,12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                          </svg>
                                        </button>
                                      ))}
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          )
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )
          })}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="text-center py-16 text-muted">
          <p className="text-[15px]">No lessons match your search.</p>
        </div>
      )}
    </div>
  )
}