'use client'

// Shared confirmation dialog — same shell as the app's other modals (dimmed
// backdrop, white card, zinc header/footer) so every "are you sure?" step
// looks identical across admin and student pages.

import { useEffect, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

export interface ConfirmDialogProps {
  open: boolean
  title: string
  description?: ReactNode
  /** Body content, e.g. a summary of what is about to be saved. */
  children?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'primary' | 'danger'
  busy?: boolean
  error?: string | null
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmDialog({
  open,
  title,
  description,
  children,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  tone = 'primary',
  busy = false,
  error,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !busy) onCancel() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, busy, onCancel])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => { if (!busy) onCancel() }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-dialog-title"
            initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 24, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="bg-white w-full sm:max-w-md shadow-2xl rounded-t-xl sm:rounded-xl border border-zinc-200 overflow-hidden max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-zinc-200 shrink-0">
              <h3 id="confirm-dialog-title" className="text-base font-semibold text-zinc-900">{title}</h3>
              {description && <div className="text-sm text-zinc-500 mt-1">{description}</div>}
            </div>

            {(children || error) && (
              <div className="px-6 py-4 overflow-y-auto space-y-3">
                {children}
                {error && (
                  <p className="text-sm px-3 py-2.5 rounded-md bg-rose-50 text-rose-700 border border-rose-100" role="alert">{error}</p>
                )}
              </div>
            )}

            <div className="px-6 py-4 border-t border-zinc-200 bg-zinc-50 shrink-0 flex gap-2">
              <button
                type="button"
                onClick={onCancel}
                disabled={busy}
                className="flex-1 py-2.5 text-sm font-medium text-zinc-700 border border-zinc-300 rounded-lg hover:bg-zinc-100 transition-colors disabled:opacity-40"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={onConfirm}
                disabled={busy}
                className={`flex-1 py-2.5 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-40 ${
                  tone === 'danger' ? 'bg-rose-600 hover:bg-rose-700' : 'bg-action hover:bg-action-dark'
                }`}
              >
                {busy ? 'Working…' : confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

/** A label/value row for summaries shown inside a ConfirmDialog. */
export function SummaryRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 text-sm">
      <span className="text-zinc-500 shrink-0">{label}</span>
      <span className="text-zinc-900 font-medium text-right">{value}</span>
    </div>
  )
}
