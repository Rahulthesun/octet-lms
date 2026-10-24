'use client'

// Reusable text/image field editor for one MCQ field (question or an
// option), mirroring the pattern in app/admin/question-bank/page.tsx's
// FieldEditor (paste-screenshot, drag/drop, file picker) so manual
// question-wise entry in the new Q&A / Practice Questions feature feels
// identical to the existing Question Bank page.

import { useRef, useState } from 'react'
import { imageFromClipboard, imageFromFiles, uploadQuestionImage } from '@/lib/questionImages'
import type { ContentType } from '@/hooks/useTests'

export interface FieldValue {
  type: ContentType
  text: string
  imageKey: string | null
  imageUrl: string | null
  imageContentHash: string | null
  imagePerceptualHash: string | null
}

export function emptyField(): FieldValue {
  return { type: 'text', text: '', imageKey: null, imageUrl: null, imageContentHash: null, imagePerceptualHash: null }
}

export default function QuestionFieldEditor({
  label,
  value,
  onChange,
}: {
  label: string
  value: FieldValue
  onChange: (next: FieldValue) => void
}) {
  const [hover, setHover] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File | null) {
    if (!file) return
    setUploading(true)
    setError(null)
    try {
      const uploaded = await uploadQuestionImage(file)
      onChange({
        type: 'image',
        text: '',
        imageKey: uploaded.key,
        imageUrl: uploaded.previewUrl,
        imageContentHash: uploaded.contentHash,
        imagePerceptualHash: uploaded.perceptualHash,
      })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Image upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div
      className="space-y-1.5"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onPaste={(e) => {
        const file = imageFromClipboard(e)
        if (file) {
          e.preventDefault()
          handleFile(file)
        }
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault()
        handleFile(imageFromFiles(e.dataTransfer.files))
      }}
    >
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-zinc-700">{label}</label>
        <div className="flex gap-1.5 text-xs">
          <button
            type="button"
            onClick={() => onChange({ ...emptyField(), type: 'text' })}
            className={`px-2 py-0.5 rounded-md border ${value.type === 'text' ? 'border-violet-400 bg-violet-50 text-violet-700' : 'border-zinc-200 text-zinc-500'}`}
          >
            Text
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={`px-2 py-0.5 rounded-md border ${value.type === 'image' ? 'border-violet-400 bg-violet-50 text-violet-700' : 'border-zinc-200 text-zinc-500'}`}
          >
            Image
          </button>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
      />

      {value.type === 'image' ? (
        <div className="border border-dashed border-zinc-300 rounded-lg p-3 text-center">
          {uploading ? (
            <p className="text-sm text-zinc-500">Uploading...</p>
          ) : value.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={value.imageUrl} alt={label} className="max-h-40 mx-auto object-contain" />
          ) : (
            <p className="text-sm text-zinc-400">
              {hover ? 'Paste (Ctrl+V), drop, or ' : ''}
              <button type="button" onClick={() => fileInputRef.current?.click()} className="text-violet-700 underline">
                choose a file
              </button>
            </p>
          )}
        </div>
      ) : (
        <textarea
          value={value.text}
          onChange={(e) => onChange({ ...value, text: e.target.value })}
          placeholder={`${label}... (or paste a screenshot to switch to image)`}
          rows={2}
          className="w-full text-[15px] rounded-lg px-3 py-2 border border-zinc-300 focus:outline-none focus:ring-2 focus:ring-violet-200 focus:border-violet-400"
        />
      )}
      {error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  )
}
