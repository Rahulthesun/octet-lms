'use client'

// components/shared/PersonalTasksWidget.tsx
//
// A private to-do / reminder list — the one genuinely interactive piece of
// both dashboards. Every add/check/delete is a real round trip to
// /api/personal-tasks (see api/services/personalTasks.service.js), scoped
// to the logged-in user's own rows; nothing here is local-only or fake.
// Shared verbatim between the admin and student dashboards — only the
// accent/text colors are passed in, to match whichever portal it's in.

import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { authedFetch } from '@/lib/apiClient'

interface PersonalTask {
  id: string
  content: string
  completed: boolean
  due_at: string | null
  created_at: string
}

interface PersonalTasksWidgetProps {
  accentColor: string
  borderColor?: string
  headingClassName?: string
  mutedClassName?: string
}

function IconPlus({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none">
      <path d="M 8,2.5 L 8,13.5 M 2.5,8 L 13.5,8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}

function IconClock({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4" />
      <path d="M 8,4.8 L 8,8 L 10.4,9.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconCheck({ className = 'w-3 h-3' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 12 12" fill="none">
      <path d="M 2.5,6.2 L 5,8.7 L 9.5,3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconClose({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 12 12" fill="none">
      <path d="M 2.5,2.5 L 9.5,9.5 M 9.5,2.5 L 2.5,9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function formatDue(iso: string): { text: string; overdue: boolean } {
  const due = new Date(iso)
  const now = new Date()
  const overdue = due.getTime() < now.getTime()
  const sameDay = due.toDateString() === now.toDateString()
  const text = sameDay
    ? due.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    : due.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) +
      ', ' + due.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  return { text, overdue }
}

export default function PersonalTasksWidget({
  accentColor,
  borderColor = '#e5e7eb',
  headingClassName = 'text-gray-900',
  mutedClassName = 'text-gray-500',
}: PersonalTasksWidgetProps) {
  const [tasks, setTasks] = useState<PersonalTask[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [content, setContent] = useState('')
  const [showReminder, setShowReminder] = useState(false)
  const [dueAt, setDueAt] = useState('')
  const [adding, setAdding] = useState(false)

  const [busyId, setBusyId] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    authedFetch('/api/personal-tasks')
      .then((res: { tasks: PersonalTask[] }) => {
        if (!cancelled) setTasks(res.tasks ?? [])
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load tasks')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  async function addTask() {
    const trimmed = content.trim()
    if (!trimmed || adding) return
    setAdding(true)
    setError(null)
    try {
      const res = await authedFetch('/api/personal-tasks', {
        method: 'POST',
        body: JSON.stringify({
          content: trimmed,
          dueAt: showReminder && dueAt ? new Date(dueAt).toISOString() : undefined,
        }),
      })
      setTasks((prev) => [res.task as PersonalTask, ...prev])
      setContent('')
      setDueAt('')
      setShowReminder(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add task')
    } finally {
      setAdding(false)
    }
  }

  async function toggleTask(task: PersonalTask) {
    setBusyId(task.id)
    // Optimistic — flip immediately, reconcile with the server's copy.
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, completed: !t.completed } : t)))
    try {
      const res = await authedFetch(`/api/personal-tasks/${task.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ completed: !task.completed }),
      })
      setTasks((prev) => prev.map((t) => (t.id === task.id ? (res.task as PersonalTask) : t)))
    } catch (e) {
      // Revert on failure
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, completed: task.completed } : t)))
      setError(e instanceof Error ? e.message : 'Failed to update task')
    } finally {
      setBusyId(null)
    }
  }

  async function removeTask(id: string) {
    setBusyId(id)
    try {
      await authedFetch(`/api/personal-tasks/${id}`, { method: 'DELETE' })
      setTasks((prev) => prev.filter((t) => t.id !== id))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete task')
    } finally {
      setBusyId(null)
    }
  }

  const openCount = tasks.filter((t) => !t.completed).length

  return (
    <section>
      <div className="flex items-baseline justify-between mb-3">
        <h2 className={`text-lg font-semibold ${headingClassName}`}>Personal Tasks</h2>
        {!loading && (
          <span className={`text-sm ${mutedClassName}`}>
            {openCount} open{tasks.length > openCount ? ` · ${tasks.length - openCount} done` : ''}
          </span>
        )}
      </div>

      {/* Add task */}
      <div className="pb-4 border-b" style={{ borderColor }}>
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addTask() }}
            placeholder="Add a task or reminder…"
            className={`flex-1 bg-transparent outline-none text-[15px] ${headingClassName} placeholder:text-gray-400`}
          />
          <button
            type="button"
            onClick={() => setShowReminder((v) => !v)}
            title="Set a reminder time"
            className="shrink-0 p-1.5 rounded-full transition-colors"
            style={{ color: showReminder ? accentColor : '#9CA3AF' }}
          >
            <IconClock />
          </button>
          <button
            type="button"
            onClick={addTask}
            disabled={!content.trim() || adding}
            className="shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium text-white transition-opacity disabled:opacity-40"
            style={{ backgroundColor: accentColor }}
          >
            <IconPlus className="w-3.5 h-3.5" />
            Add
          </button>
        </div>
        {showReminder && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-2.5">
            <input
              type="datetime-local"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
              className={`text-sm bg-transparent outline-none ${mutedClassName}`}
            />
          </motion.div>
        )}
      </div>

      {error && (
        <p className="text-sm text-rose-600 mt-2">{error}</p>
      )}

      {/* Task list */}
      {loading ? (
        <p className={`text-base py-4 ${mutedClassName}`}>Loading…</p>
      ) : tasks.length === 0 ? (
        <p className={`text-base py-4 ${mutedClassName}`}>Nothing here yet — add your first task above.</p>
      ) : (
        <div>
          <AnimatePresence initial={false}>
            {tasks.map((t) => {
              const due = t.due_at ? formatDue(t.due_at) : null
              return (
                <motion.div
                  key={t.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: busyId === t.id ? 0.5 : 1 }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-3 py-3 border-b"
                  style={{ borderColor }}
                >
                  <button
                    type="button"
                    onClick={() => toggleTask(t)}
                    disabled={busyId === t.id}
                    className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors"
                    style={{
                      borderColor: t.completed ? accentColor : '#D1D5DB',
                      backgroundColor: t.completed ? accentColor : 'transparent',
                      color: 'white',
                    }}
                  >
                    {t.completed && <IconCheck />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-[15px] truncate ${t.completed ? `line-through ${mutedClassName}` : headingClassName}`}>
                      {t.content}
                    </p>
                    {due && !t.completed && (
                      <p className={`text-xs mt-0.5 ${due.overdue ? 'text-rose-600' : mutedClassName}`}>
                        {due.overdue ? 'Overdue · ' : 'Due '}{due.text}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => removeTask(t.id)}
                    disabled={busyId === t.id}
                    className="shrink-0 p-1 text-gray-300 hover:text-rose-500 transition-colors"
                    title="Delete task"
                  >
                    <IconClose />
                  </button>
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}
    </section>
  )
}
