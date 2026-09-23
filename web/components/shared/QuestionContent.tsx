'use client'

// components/shared/QuestionContent.tsx
//
// Renders one MCQ field (the question, or one option) that is either text or
// an image. Used by the student exam screen, the student results/review
// screen and the admin attempt review, so images look the same everywhere and
// scale to the screen width on mobile.

import type { ContentType, QuestionContentFields, QuestionField } from '@/hooks/useTests'

type FieldSource = QuestionContentFields

/** Pulls the content of one field out of a question object. */
export function fieldContent(q: FieldSource, field: QuestionField): { type: ContentType; text: string | null; imageUrl: string | null } {
  const textKey = (field === 'question' ? 'questionText' : field) as keyof QuestionContentFields
  const typeKey = `${field}Type` as keyof QuestionContentFields
  const urlKey = `${field}ImageUrl` as keyof QuestionContentFields
  return {
    type: q[typeKey] === 'image' ? 'image' : 'text',
    text: (q[textKey] as string | null) ?? null,
    imageUrl: (q[urlKey] as string | null | undefined) ?? null,
  }
}

export default function QuestionContent({
  q,
  field,
  alt,
  className = '',
  imageClassName = '',
}: {
  q: FieldSource
  field: QuestionField
  alt: string
  className?: string
  imageClassName?: string
}) {
  const c = fieldContent(q, field)
  if (c.type === 'image') {
    return c.imageUrl ? (
      // Signed R2 URL: a plain img is intentional (next/image cannot optimise expiring URLs).
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={c.imageUrl}
        alt={alt}
        loading="lazy"
        draggable={false}
        className={`block max-w-full h-auto max-h-[70vh] object-contain ${imageClassName}`}
      />
    ) : (
      <span className={`text-sm italic ${className}`}>Image unavailable</span>
    )
  }
  return <span className={`whitespace-pre-wrap break-words ${className}`}>{c.text}</span>
}
