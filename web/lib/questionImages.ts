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
  /**
   * SHA-256 hex digest of the uploaded (post-compression) image bytes,
   * computed in-browser via the Web Crypto API. Used server-side for true
   * duplicate detection (the R2 key is random per upload, so byte-identical
   * re-uploads of the same screenshot would otherwise look like different
   * images). Null if hashing failed/unsupported — callers must treat this
   * as optional and never block the save on it.
   */
  contentHash: string | null
  /**
   * dHash perceptual hash (16 hex chars = 64 bits) of the uploaded image,
   * computed in-browser via an offscreen canvas. An ADDITIONAL, separate
   * signal from contentHash above: contentHash only matches byte-identical
   * re-uploads, while this catches two different screenshots of the same
   * underlying textbook question (different crop/compression/tool) by
   * comparing visual content with a tolerance server-side (see
   * api/utils/perceptualHash.js). Null if canvas processing failed —
   * callers must treat this as optional and never block the save on it.
   */
  perceptualHash: string | null
}

/** Hex-encoded SHA-256 of a blob's bytes, or null if hashing is unavailable. */
async function sha256Hex(blob: Blob): Promise<string | null> {
  try {
    const buf = await blob.arrayBuffer()
    const digest = await crypto.subtle.digest('SHA-256', buf)
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('')
  } catch {
    return null
  }
}

/**
 * dHash perceptual hash of a blob's image content, or null on any failure
 * (unsupported browser, corrupt image, etc. — never throws).
 *
 * Algorithm (must stay IDENTICAL to api/utils/perceptualHash.js's
 * dHashFromBuffer() — same steps, same order; see that file's header
 * comment for the full "why" and the chosen Hamming-distance threshold):
 *   1. Resize to 9x8 (forced, ignoring aspect ratio) via an offscreen
 *      canvas's drawImage(img, 0, 0, 9, 8) — the canvas's native resampling
 *      (bilinear/bicubic-family, browser-dependent) is used here, same as
 *      the server uses Jimp's bilinear resize; the two are not guaranteed
 *      bit-identical, which is fine for dHash specifically (see the server
 *      file's comment) and is why the duplicate-detection threshold is
 *      forgiving rather than requiring an exact bit match.
 *   2. Grayscale every pixel: gray = 0.299*R + 0.587*G + 0.114*B (ITU-R
 *      BT.601 luma) — chosen so this matches the server's manual grayscale
 *      step exactly, rather than relying on any library default.
 *   3. For each of the 8 rows, compare each of the first 8 pixels to the
 *      pixel to its right: left >= right -> bit 1, else 0. 64 bits total,
 *      row-major.
 *   4. Encode as a 16-character lowercase hex string.
 */
async function dHash(blob: Blob): Promise<string | null> {
  try {
    const img = await loadBitmap(blob)
    const canvas = document.createElement('canvas')
    canvas.width = 9
    canvas.height = 8
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(img, 0, 0, 9, 8)
    const { data } = ctx.getImageData(0, 0, 9, 8) // RGBA, 9*8*4 bytes

    const gray = new Float64Array(9 * 8)
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 9; x++) {
        const idx = (y * 9 + x) * 4
        gray[y * 9 + x] = 0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]
      }
    }

    let bits = ''
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        bits += gray[y * 9 + x] >= gray[y * 9 + x + 1] ? '1' : '0'
      }
    }

    let hex = ''
    for (let i = 0; i < 64; i += 4) {
      hex += parseInt(bits.slice(i, i + 4), 2).toString(16)
    }
    return hex
  } catch {
    return null
  }
}

/** Compresses, requests a presigned URL, and PUTs the image straight to R2. */
export async function uploadQuestionImage(file: Blob): Promise<UploadedImage> {
  const blob = await compressImage(file)
  const [presign, contentHash, perceptualHash] = await Promise.all([
    authedFetch('/api/tests/question-images/upload-url', {
      method: 'POST',
      body: JSON.stringify({ contentType: blob.type, sizeBytes: blob.size }),
    }),
    sha256Hex(blob),
    dHash(blob),
  ])

  let res: Response
  try {
    res = await fetch(presign.uploadUrl, { method: 'PUT', headers: presign.headers, body: blob })
  } catch {
    throw new Error('Upload failed: could not reach storage. Check your connection and try again.')
  }
  if (!res.ok) throw new Error(`Upload failed (storage returned ${res.status}). Please try again.`)

  return { key: presign.key as string, previewUrl: URL.createObjectURL(blob), contentHash, perceptualHash }
}
