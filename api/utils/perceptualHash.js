/**
 * utils/perceptualHash.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Perceptual (dHash) image hashing — catches "same textbook question,
 * different screenshot" duplicates that the exact SHA-256 content hash
 * (see utils/mcqQuestion.js's contentHash()/normalizeImageContentHash()) can
 * never catch, because that hash only matches byte-for-byte identical files.
 * Two independently-taken screenshots of the same question are visually
 * identical but byte-different (different crop by a pixel, different JPEG
 * recompression, different screenshot tool) — dHash is robust to exactly
 * that kind of difference.
 *
 * ─── The algorithm (must stay IDENTICAL to web/lib/questionImages.ts's
 *     client-side implementation — same steps, same order) ───
 *   1. Resize the image to 9x8 (width x height) — forced, ignoring aspect ratio.
 *   2. Grayscale every pixel: gray = 0.299*R + 0.587*G + 0.114*B (ITU-R BT.601
 *      luma). Chosen (over Jimp's built-in .greyscale(), which uses ITU-R
 *      BT.709 coefficients) specifically so this server-side implementation
 *      and the browser canvas implementation apply the exact same formula —
 *      the one part of the algorithm that is trivial to keep bit-identical
 *      between the two environments, so it should be.
 *   3. For each of the 8 rows, compare each of the first 8 pixels in that row
 *      to the pixel immediately to its right: left >= right -> bit 1, else 0.
 *      64 bits total, row-major order (row 0 cols 0..7, row 1 cols 0..7, ...).
 *   4. Encode the 64 bits as a 16-character lowercase hex string (4 bits per
 *      hex digit, most-significant bit first within each nibble).
 *
 * ─── Resize method ───
 * The resize step uses bilinear interpolation on both sides (Jimp's
 * ResizeStrategy.BILINEAR here; the browser canvas's native drawImage()
 * smoothing — which defaults to a bilinear/bicubic-family resample — on the
 * client). The two implementations are NOT guaranteed to produce bit-for-bit
 * identical 9x8 thumbnails: Jimp's bilinear sampler and a given browser's
 * canvas sampler are different code, and may round edge pixels slightly
 * differently. This is fine and expected for dHash specifically, because
 * dHash only encodes the SIGN of the difference between two adjacent
 * pixels, not their absolute values — a resize implementation would have to
 * disagree on the sign of a gradient (a near-zero-difference edge) to flip a
 * bit, which only happens for a small number of borderline pixel pairs even
 * when the resamplers disagree numerically. This is the well-documented
 * reason dHash (and pHash/aHash generally) is considered robust across
 * different resize implementations, codecs and minor crops.
 *
 * ─── Threshold ───
 * THRESHOLD_SAME_IMAGE = 8 (out of 64 bits, ~12.5%). This is the standard,
 * widely-used community threshold for "same image, different encode/
 * resize/minor-crop" vs. "a genuinely different image" (popularised by the
 * classic Hacker Factor / pHash.org dHash write-ups and used by most
 * off-the-shelf perceptual-hash dedup tools as their default). It was
 * chosen, rather than empirically tuned, because this environment cannot
 * run a real browser canvas to compare against this exact Jimp pipeline on
 * real screenshots — but the structural argument above (sign-of-difference
 * encoding) means the canvas/Jimp resize mismatch should only ever flip a
 * handful of borderline bits for a truly-the-same image, nowhere near 8.
 * Meanwhile two different MCQ questions' images (different diagrams,
 * different formulas, different photos) typically differ in 20-40+ bits.
 * threshold=8 sits comfortably in the gap between those two populations.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const DEFAULT_THRESHOLD = 8;

// A dHash is exactly 64 bits = 16 lowercase hex characters.
const HEX16_RE = /^[0-9a-f]{16}$/i;

// Popcount (number of set bits) of a 4-bit nibble, 0-15 -> 0-4. Used to sum
// the Hamming distance one hex digit (nibble) at a time instead of looping
// bit-by-bit.
const POPCOUNT_NIBBLE = [0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4];

function normalizePerceptualHash(value) {
  const s = typeof value === "string" ? value.trim().toLowerCase() : "";
  return HEX16_RE.test(s) ? s : null;
}

/**
 * Hamming distance (number of differing bits) between two 16-char hex dHash
 * strings. Returns Infinity if either input is missing/malformed — this
 * makes Infinity an automatic, safe "never a duplicate" result everywhere
 * this is compared against a finite threshold, rather than every caller
 * having to separately null-check before comparing.
 */
function hammingDistance(hexHashA, hexHashB) {
  const a = normalizePerceptualHash(hexHashA);
  const b = normalizePerceptualHash(hexHashB);
  if (!a || !b) return Infinity;
  let distance = 0;
  for (let i = 0; i < 16; i++) {
    const xor = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    distance += POPCOUNT_NIBBLE[xor];
  }
  return distance;
}

/** True when two dHashes are within `threshold` bits of each other (default 8/64 — see header comment). */
function isNearDuplicateImage(hexHashA, hexHashB, threshold = DEFAULT_THRESHOLD) {
  return hammingDistance(hexHashA, hexHashB) <= threshold;
}

/**
 * Computes the dHash of an image buffer (downloaded from R2) using Jimp.
 * Mirrors the client canvas algorithm in web/lib/questionImages.ts step for
 * step (see header comment) — resize to 9x8, manual BT.601 grayscale, 64
 * left-vs-right comparisons, hex-encoded. Returns null (never throws) on any
 * decode/processing failure, matching the defensive sha256Hex()/
 * normalizeImageContentHash() pattern used for the exact-hash system — a
 * hashing failure must never block a save or crash the backfill script.
 */
async function dHashFromBuffer(buffer) {
  try {
    // Required lazily so a missing/broken jimp install only breaks the
    // perceptual-hash feature, never anything that merely requires this file
    // for hammingDistance()/isNearDuplicateImage() (used on every save/validate path).
    const { Jimp, ResizeStrategy } = require("jimp");
    const img = await Jimp.read(buffer);
    img.resize({ w: 9, h: 8, mode: ResizeStrategy.BILINEAR });

    const { data, width } = img.bitmap; // RGBA bytes, width should be exactly 9
    const gray = new Float64Array(9 * 8);
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 9; x++) {
        const idx = (y * width + x) * 4;
        const r = data[idx];
        const g = data[idx + 1];
        const b = data[idx + 2];
        gray[y * 9 + x] = 0.299 * r + 0.587 * g + 0.114 * b;
      }
    }

    let bits = "";
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        bits += gray[y * 9 + x] >= gray[y * 9 + x + 1] ? "1" : "0";
      }
    }

    let hex = "";
    for (let i = 0; i < 64; i += 4) {
      hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
    }
    return hex;
  } catch {
    return null;
  }
}

module.exports = {
  DEFAULT_THRESHOLD,
  normalizePerceptualHash,
  hammingDistance,
  isNearDuplicateImage,
  dHashFromBuffer,
};
