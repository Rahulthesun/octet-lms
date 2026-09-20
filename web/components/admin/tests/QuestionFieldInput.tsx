'use client'

// One question (or one option) in the MCQ creator. It is image-first: press
// Ctrl+V / Cmd+V with a screenshot on the clipboard, drag and drop, or click
// to choose a file. A small toggle switches this single field to plain text
// (the safety net) and back. Each field is independent, so an option can be an
// image while another is text.

import { useEffect, useRef, useState } from 'react'
import type { ContentType } from '@/hooks/useTests'
import { imageFromClipboard, imageFromFiles, uploadQuestionImage } from '@/lib/questionImages'

export interface FieldValue {
  type: ContentType
  text: string
  imageKey: string | null
  imageUrl: string | null
}

function TextIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M 3,4 L 3,3 L 13,3 L 13,4 M 8,3 L 8,13 M 6,13 L 10,13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function ImageIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <rect x="2" y="3" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="5.8" cy="6.5" r="1.1" stroke="currentColor" strokeWidth="1.2" />
      <path d="M 2.5,12 L 6.5,8.5 L 9,10.5 L 11,8.5 L 13.5,11" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  )
}

export default function QuestionFieldInput({
  label,
  value,
  onChange,
  multiline = false,
  compact = false,
}: {
  label: string
  value: FieldValue
  onChange: (next: FieldValue) => void
  multiline?: boolean
  compact?: boolean
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const zoneRef = useRef<HTMLDivElement>(null)
  const hoveredRef = useRef(false)
  const takeImageRef = useRef<(file: File | null) => void>(() => {})

  // Paste works while the pointer is hovering the field OR it has focus, so a
  // screenshot can be pasted without clicking first. Only a clipboard that
  // holds an image is handled; ordinary text pastes are left alone.
  useEffect(() => {
    function onPaste(e: ClipboardEvent) {
      const zone = zoneRef.current
      if (!zone) return
      const focused = zone.contains(document.activeElement)
      if (!hoveredRef.current && !focused) return
      const file = imageFromClipboard(e)
      if (!file) return
      e.preventDefault()
      takeImageRef.current(file)
    }
    document.addEventListener('paste', onPaste)
    return () => document.removeEventListener('paste', onPaste)
  }, [])

  async function takeImage(file: File | null) {
    if (!file) {
      setError('No image found. Copy a screenshot first, or choose an image file.')
      return
    }
    setError(null)
    setBusy(true)
    try {
      const uploaded = await uploadQuestionImage(file)
      onChange({ ...value, type: 'image', imageKey: uploaded.key, imageUrl: uploaded.previewUrl })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Image upload failed')
    } finally {
      setBusy(false)
    }
  }

  takeImageRef.current = takeImage
  const isImage = value.type === 'image'
  const hasImage = isImage && !!value.imageKey

  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{label}</span>
        <button
          type="button"
          onClick={() => {
            setError(null)
            onChange({ ...value, type: isImage ? 'text' : 'image' })
          }}
          title={isImage ? 'Switch to typing text' : 'Switch back to an image'}
          aria-label={isImage ? `Use text for ${label}` : `Use an image for ${label}`}
          className="flex items-center gap-1 text-xs px-2 py-1 rounded-md border border-zinc-300 text-zinc-600 hover:bg-zinc-100 transition-colors"
        >
          {isImage ? <TextIcon className="w-3.5 h-3.5" /> : <ImageIcon className="w-3.5 h-3.5" />}
          {isImage ? 'Text' : 'Image'}
        </button>
      </div>

      {isImage ? (
        <div
          ref={zoneRef}
          onMouseEnter={() => { hoveredRef.current = true }}
          onMouseLeave={() => { hoveredRef.current = false }}
          tabIndex={0}
          role="group"
          aria-label={`${label} image. Focus here and press Control V to paste a screenshot`}
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            takeImage(imageFromFiles(e.dataTransfer.files))
          }}
          className={`rounded-lg border-2 border-dashed bg-white outline-none transition-colors focus:border-violet-400 focus:ring-2 focus:ring-violet-200 ${
            dragOver ? 'border-violet-500 bg-violet-50' : 'border-zinc-300'
          } ${compact ? 'p-2' : 'p-3'}`}
        >
          {hasImage ? (
            <div>
              {value.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={value.imageUrl} alt={`${label} preview`} className={`block max-w-full h-auto object-contain mx-auto ${compact ? 'max-h-40' : 'max-h-72'}`} />
              ) : (
                <p className="text-sm text-zinc-500 py-4 text-center">Image saved</p>
              )}
              <div className="flex flex-wrap items-center justify-center gap-2 mt-2">
                <button type="button" onClick={() => fileRef.current?.click()} disabled={busy}
                  className="text-xs px-2.5 py-1 rounded-md border border-zinc-300 text-zinc-700 hover:bg-zinc-100 disabled:opacity-50">
                  Replace
                </button>
                <button type="button" onClick={() => onChange({ ...value, imageKey: null, imageUrl: null })} disabled={busy}
                  className="text-xs px-2.5 py-1 rounded-md border border-rose-200 text-rose-600 hover:bg-rose-50 disabled:opacity-50">
                  Remove
                </button>
                <span className="text-xs text-zinc-400">or paste a new screenshot</span>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => fileRef.current?.click()} disabled={busy}
              className="w-full text-center py-4 text-sm text-zinc-500 hover:text-violet-700 disabled:opacity-60">
              {busy ? (
                'Uploading...'
              ) : (
                <>
                  <span className="block text-zinc-700">Hover and press Ctrl+V to paste a screenshot</span>
                  <span className="block text-xs mt-1">or drag and drop an image, or click to choose a file</span>
                </>
              )}
            </button>
          )}
          {busy && hasImage && <p className="text-xs text-violet-700 text-center mt-2">Uploading...</p>}
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            tabIndex={-1}
            onChange={(e) => {
              takeImage(imageFromFiles(e.target.files))
              e.target.value = ''
            }}
          />
        </div>
      ) : multiline ? (
        <textarea
          value={value.text}
          onChange={(e) => onChange({ ...value, text: e.target.value })}
          rows={2}
          placeholder={`Type ${label.toLowerCase()}`}
          className="w-full text-[15px] rounded-lg px-3 py-2.5 border border-zinc-300 bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400 resize-none"
        />
      ) : (
        <input
          type="text"
          value={value.text}
          onChange={(e) => onChange({ ...value, text: e.target.value })}
          placeholder={`Type ${label.toLowerCase()}`}
          className="w-full text-[14px] rounded-md px-3 py-2 border border-zinc-300 bg-white text-zinc-900 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400"
        />
      )}

      {error && <p className="text-xs text-rose-600 mt-1" role="alert">{error}</p>}
    </div>
  )
}
