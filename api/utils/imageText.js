/**
 * utils/imageText.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Reads the words inside a question screenshot (OCR, via tesseract.js) so two
 * screenshots of the SAME question can be caught even when the images
 * themselves differ (different crop, zoom, compression, colours) — something
 * neither the exact byte hash nor the perceptual hash can see.
 *
 * Two question images count as the same question when their recognised text,
 * normalised (lower-case, letters and digits only), is the same — allowing
 * for a tiny amount of OCR noise (SAME_TEXT_SIMILARITY). Images with too
 * little readable text (MIN_TEXT_CHARS — e.g. a bare structure drawing) are
 * never compared, so they can't produce false "already posted" errors.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const os = require("os");
const path = require("path");

const MIN_TEXT_CHARS = 30;
const SAME_TEXT_SIMILARITY = 0.95;

let workerPromise = null;

/** One shared OCR worker, created on first use (loads the English model once). */
function getWorker() {
  if (!workerPromise) {
    const { createWorker } = require("tesseract.js");
    workerPromise = createWorker("eng", 1, {
      cachePath: path.join(os.tmpdir(), "octet-tesseract"),
    }).catch((err) => {
      workerPromise = null;
      throw err;
    });
  }
  return workerPromise;
}

// tesseract.js runs one job at a time per worker — queue calls so concurrent
// requests never interleave.
let queue = Promise.resolve();

/** Raw text recognised in an image buffer (PNG / JPEG / WebP). */
function extractText(buffer) {
  const job = queue.then(async () => {
    const worker = await getWorker();
    const { data } = await worker.recognize(buffer);
    return String(data?.text || "");
  });
  queue = job.catch(() => {});
  return job;
}

/** Letters and digits only, lower-case — what the comparison runs on. */
function normalizeText(text) {
  return String(text || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

/** Levenshtein distance, bailing out early once it exceeds `max`. */
function boundedDistance(a, b, max) {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      cur.push(v);
      if (v < rowMin) rowMin = v;
    }
    if (rowMin > max) return max + 1;
    prev = cur;
  }
  return prev[b.length];
}

/** True when two normalised texts are the same question's text. */
function isSameText(normA, normB) {
  if (!normA || !normB) return false;
  if (normA.length < MIN_TEXT_CHARS || normB.length < MIN_TEXT_CHARS) return false;
  if (normA === normB) return true;
  const longest = Math.max(normA.length, normB.length);
  const allowed = Math.floor(longest * (1 - SAME_TEXT_SIMILARITY));
  return boundedDistance(normA, normB, allowed) <= allowed;
}

module.exports = { extractText, normalizeText, isSameText, MIN_TEXT_CHARS, SAME_TEXT_SIMILARITY };
