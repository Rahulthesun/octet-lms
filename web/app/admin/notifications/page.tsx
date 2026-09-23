'use client'

import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useMyNotifications } from '@/hooks/useNotifications'
import NotificationInbox from '@/components/shared/NotificationInbox'
import ComposeBroadcastModal from '@/components/admin/notifications/ComposeBroadcastModal'
import DeliveryTrackingView from '@/components/admin/notifications/DeliveryTrackingView'

const ACCENT = '#5B21B6'

export default function AdminNotificationsPage() {
  const { notifications, loading, error, markRead, markAllRead, refetch } = useMyNotifications()
  const [tab, setTab] = useState<'inbox' | 'tracking'>('inbox')
  const [showCompose, setShowCompose] = useState(false)

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">Notifications</h1>
          <p className="text-[15px] text-zinc-500 mt-1">Your inbox, and tools to message students.</p>
        </div>
        <button onClick={() => setShowCompose(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-white text-[15px] transition-colors w-fit"
          style={{ backgroundColor: ACCENT }}>
          Send Message
        </button>
      </div>

      <div className="flex gap-1 border-b border-zinc-200 mb-6">
        <button onClick={() => setTab('inbox')}
          className={`px-4 py-2.5 text-[15px] border-b-2 transition-colors -mb-px ${
            tab === 'inbox' ? 'border-zinc-900 text-zinc-900' : 'border-transparent text-zinc-500 hover:text-zinc-700'
          }`}>
          Inbox
        </button>
        <button onClick={() => setTab('tracking')}
          className={`px-4 py-2.5 text-[15px] border-b-2 transition-colors -mb-px ${
            tab === 'tracking' ? 'border-zinc-900 text-zinc-900' : 'border-transparent text-zinc-500 hover:text-zinc-700'
          }`}>
          Delivery Tracking
        </button>
      </div>

      {tab === 'inbox' ? (
        <NotificationInbox notifications={notifications} loading={loading} error={error} onMarkRead={markRead} onMarkAllRead={markAllRead} accent={ACCENT} />
      ) : (
        <DeliveryTrackingView />
      )}

      <AnimatePresence>
        {showCompose && (
          <ComposeBroadcastModal onClose={() => setShowCompose(false)} onSent={refetch} />
        )}
      </AnimatePresence>
    </div>
  )
}
