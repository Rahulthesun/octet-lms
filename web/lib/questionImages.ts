// lib/questionImages.ts
//
// Client-side handling of MCQ question / option images: pick the image out of
// a paste / drop / file input, shrink it, and upload it straight to
// Cloudflare R2 with a presigned URL (the bytes never pass through the API).

import { authedFetch } from '@/lib/apiClient'

export const MAX_IMAGE_WIDTH = 1600
const WEBP_QUALITY = 0.85
const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/bmp']

/** First image found in a paste event's clipboard, or null. */
export function imageFromClipboard(e: ClipboardEvent | React.ClipboardEvent): File | null {
  const items = e.clipboardData?.items
  if (!items) return null
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    if (item.kind === 'file' && item.type.startsWith('image/')) {
      const file = item.getAsFile()
      if (file) return file
    }
  }
  return null
}

/** First image in a drop event or file list, or null. */
export function imageFromFiles(files: FileList | null | undefined): File | null {
  if (!files) return null
  for (let i = 0; i < files.length; i++) {
    if (files[i].type.startsWith('image/')) return files[i]
  }
  return null
}

function loadBitmap(file: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('That file could not be read as an image.'))
    }
    img.src = url
  })
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality?: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality))
}

/**
 * Resizes to at most MAX_IMAGE_WIDTH wide and re-encodes as WebP (falling back
 * to optimised PNG where the browser cannot encode WebP), so question pages
 * stay fast. Structural formulas are drawn on a white background so
 * transparent screenshots stay readable.
 */
export async function compressImage(file: Blob): Promise<Blob> {
  if (!ACCEPTED.includes(file.type)) throw new Error('Only PNG, JPEG or WebP images can be used.')
  const img = await loadBitmap(file)
  const scale = img.width > MAX_IMAGE_WIDTH ? MAX_IMAGE_WIDTH / img.width : 1
  const width = Math.max(1, Math.round(img.width * scale))
  const height = Math.max(1, Math.round(img.height * scale))

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Your browser could not process the image.')
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)
  ctx.drawImage(img, 0, 0, width, height)

  const webp = await toBlob(canvas, 'image/webp', WEBP_QUALITY)
  if (webp && webp.type === 'image/webp') return webp
  const png = await toBlob(canvas, 'image/png')
  if (!png) throw new Error('Your browser could not process the image.')
  return png
}

export interface UploadedImage {
  key: string
  previewUrl: string // local object URL for immediate preview
}

/** Compresses, requests a presigned URL, and PUTs the image straight to R2. */
export async function uploadQuestionImage(file: Blob): Promise<UploadedImage> {
  const blob = await compressImage(file)
  const presign = await authedFetch('/api/tests/question-images/upload-url', {
    method: 'POST',
    body: JSON.stringify({ contentType: blob.type, sizeBytes: blob.size }),
  })

  let res: Response
  try {
    res = await fetch(presign.uploadUrl, { method: 'PUT', headers: presign.headers, body: blob })
  } catch {
    throw new Error('Upload failed: could not reach storage. Check your connection and try again.')
  }
  if (!res.ok) throw new Error(`Upload failed (storage returned ${res.status}). Please try again.`)

  return { key: presign.key as string, previewUrl: URL.createObjectURL(blob) }
}
