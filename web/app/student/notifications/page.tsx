'use client'

import { motion } from 'framer-motion'
import { useMyNotifications } from '@/hooks/useNotifications'
import NotificationInbox from '@/components/shared/NotificationInbox'

const ACCENT = '#5e4075'

export default function StudentNotificationsPage() {
  const { notifications, loading, error, markRead, markAllRead } = useMyNotifications()

  return (
    <div className="max-w-3xl">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">Notifications</h1>
        <p className="text-sm sm:text-base text-gray-500 mt-1">Announcements, test updates, and reminders</p>
      </motion.div>

      <NotificationInbox notifications={notifications} loading={loading} error={error} onMarkRead={markRead} onMarkAllRead={markAllRead} accent={ACCENT} />
    </div>
  )
}
