'use client'

import { useState } from 'react'
import { useEmailLog, useEmailLogSummary } from '@/hooks/useNotifications'

const STATUS_STYLE: Record<string, string> = {
  queued: 'bg-zinc-100 text-zinc-600',
  sent: 'bg-sky-50 text-sky-700',
  delivered: 'bg-emerald-50 text-emerald-700',
  read: 'bg-violet-50 text-violet-700',
  failed: 'bg-rose-50 text-rose-700',
}

const STATUS_FILTERS = ['all', 'queued', 'sent', 'delivered', 'read', 'failed'] as const

export default function DeliveryTrackingView() {
  const [filter, setFilter] = useState<typeof STATUS_FILTERS[number]>('all')
  const { summary } = useEmailLogSummary()
  const { log, loading, error } = useEmailLog(filter === 'all' ? undefined : filter)

  return (
    <div>

      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-5">
          {(['total', 'sent', 'delivered', 'read', 'failed'] as const).map((key) => (
            <div key={key} className="bg-white border border-zinc-200 rounded-lg px-4 py-3 text-center">
              <p className="text-lg font-semibold text-zinc-900 tabular-nums">{summary[key]}</p>
              <p className="text-[10px] uppercase tracking-wide text-zinc-400 mt-0.5">{key}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-4">
        {STATUS_FILTERS.map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3.5 py-1.5 text-sm rounded-full border capitalize transition-colors ${
              filter === f ? 'bg-zinc-900 text-white border-transparent' : 'border-zinc-300 text-zinc-600 hover:border-zinc-400'
            }`}>
            {f}
          </button>
        ))}
      </div>

      {loading && <div className="py-12 text-center text-sm text-zinc-400">Loading…</div>}
      {error && <div className="py-12 text-center text-sm text-red-600">{error}</div>}

      {!loading && !error && (
        <div className="border border-zinc-200 rounded-lg overflow-hidden bg-white">
          <div className="grid grid-cols-[1fr_1fr_90px_120px] px-3 py-2 bg-zinc-50 border-b border-zinc-200 text-[10px] uppercase tracking-wide text-zinc-400">
            <span>Recipient</span>
            <span>Subject</span>
            <span className="text-right">Status</span>
            <span className="text-right">Sent</span>
          </div>
          <div className="divide-y divide-zinc-100 max-h-[28rem] overflow-y-auto">
            {log.length === 0 ? (
              <div className="py-10 text-center text-sm text-zinc-400">No emails yet.</div>
            ) : log.map((row) => (
              <div key={row.id} className="grid grid-cols-[1fr_1fr_90px_120px] px-3 py-2.5 text-sm items-center">
                <span className="text-zinc-700 truncate">{row.recipientEmail}</span>
                <span className="text-zinc-600 truncate">{row.subject}</span>
                <span className="text-right">
                  <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${STATUS_STYLE[row.status] || 'bg-zinc-100 text-zinc-600'}`}>
                    {row.status}
                  </span>
                </span>
                <span className="text-right text-xs text-zinc-400">
                  {row.sentAt ? new Date(row.sentAt).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
