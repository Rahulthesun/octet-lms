'use client'

import { motion } from 'framer-motion'
import { useMyNotifications } from '@/hooks/useNotifications'
import NotificationInbox from '@/components/shared/NotificationInbox'

const ACCENT = '#7A6B96'

export default function StudentNotificationsPage() {
  const { notifications, loading, error, markRead, markAllRead } = useMyNotifications()

  return (
    <div className="p-6 lg:p-8 max-w-3xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="mb-6">
        <h1 className="text-3xl md:text-4xl text-primary mb-1">Notifications</h1>
        <p className="text-muted text-base">Announcements, test updates, and reminders</p>
      </motion.div>

      <NotificationInbox notifications={notifications} loading={loading} error={error} onMarkRead={markRead} onMarkAllRead={markAllRead} accent={ACCENT} />
    </div>
  )
}
