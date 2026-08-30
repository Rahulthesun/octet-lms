'use client'

// components/shared/NotificationInbox.tsx
//
// Shared notification list — used by both the admin and student "/notifications"
// pages. Plain neutral Tailwind grays plus one accent color, so it reads
// correctly in both portals without depending on either one's own CSS
// custom-property tokens.

import type { NotificationItem, NotificationType } from '@/hooks/useNotifications'

const TYPE_LABEL: Record<NotificationType, string> = {
  announcement: 'Announcement',
  assignment_due: 'Task Due',
  video_uploaded: 'New Video',
  test_result: 'Test Result',
  test_scheduled: 'Test Scheduled',
  test_reminder: 'Test Reminder',
}

const TYPE_DOT: Record<NotificationType, string> = {
  announcement: '#5B21B6',
  assignment_due: '#D97706',
  video_uploaded: '#0284C7',
  test_result: '#16A34A',
  test_scheduled: '#5B21B6',
  test_reminder: '#DC2626',
}

function timeAgo(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diffMs / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function NotificationInbox({
  notifications, loading, error, onMarkRead, onMarkAllRead, accent = '#5B21B6',
}: {
  notifications: NotificationItem[]
  loading: boolean
  error: string | null
  onMarkRead: (id: string) => void
  onMarkAllRead: () => void
  accent?: string
}) {
  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <div>
      {unreadCount > 0 && (
        <div className="flex justify-end mb-3">
          <button onClick={onMarkAllRead} className="text-sm font-medium hover:underline underline-offset-2" style={{ color: accent }}>
            Mark all as read
          </button>
        </div>
      )}

      {loading && <p className="text-sm text-gray-400 py-8 text-center">Loading notifications…</p>}
      {error && <p className="text-sm text-red-600 py-8 text-center">{error}</p>}

      {!loading && !error && notifications.length === 0 && (
        <div className="py-16 text-center text-gray-400 text-[15px]">You have no notifications yet.</div>
      )}

      <div className="space-y-2">
        {notifications.map((n) => (
          <button
            key={n.id}
            onClick={() => !n.read && onMarkRead(n.id)}
            className={`w-full text-left rounded-lg border px-4 py-3.5 transition-colors ${
              n.read ? 'bg-white border-gray-200' : 'bg-[#FAF8FC] border-gray-200'
            } hover:bg-gray-50`}
          >
            <div className="flex items-start gap-3">
              <span className="w-2 h-2 rounded-full shrink-0 mt-1.5" style={{ backgroundColor: n.read ? '#D1D5DB' : TYPE_DOT[n.type] }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span className="text-[11px] uppercase tracking-wide font-medium" style={{ color: TYPE_DOT[n.type] }}>
                    {TYPE_LABEL[n.type]}
                  </span>
                  <span className="text-[11px] text-gray-400">{timeAgo(n.createdAt)}</span>
                  {!n.read && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-900 text-white">New</span>}
                </div>
                <p className={`text-[15px] ${n.read ? 'text-gray-700' : 'text-gray-900 font-medium'}`}>{n.title}</p>
                <p className="text-sm text-gray-500 mt-0.5">{n.body}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
