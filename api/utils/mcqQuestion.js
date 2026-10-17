/**
 * utils/mcqQuestion.js
 * ─────────────────────────────────────────────────────────────────────────────
 * One place that knows the shape of an MCQ question, used by the test
 * authoring service, the question bank and the student/admin serializers.
 *
 * A question and each of its four options is either TEXT or an IMAGE:
 *   { type: 'text', text }  or  { type: 'image', imageKey }
 * (imageKey is an R2 object key under test-images/; images are only ever
 * delivered to browsers through short-lived signed URLs.)
 *
 * Grading never looks at any of this: it compares the chosen option letter
 * with correct_option.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const crypto = require("crypto");

const IMAGE_PREFIX = "test-images/";

// API field prefix -> DB columns. The question's text column is question_text
// and each option's text column is option_x (the original columns, so
// existing text-only rows keep working untouched).
const FIELDS = [
  { api: "question", label: "The question", type: "question_type", text: "question_text", image: "question_image_key", imageHash: "question_image_content_hash", imagePerceptualHash: "question_image_perceptual_hash", apiText: "questionText", apiImageHash: "questionImageContentHash", apiImagePerceptualHash: "questionImagePerceptualHash" },
  { api: "optionA", label: "Option A", type: "option_a_type", text: "option_a", image: "option_a_image_key", imageHash: "option_a_image_content_hash", imagePerceptualHash: "option_a_image_perceptual_hash", apiText: "optionA", apiImageHash: "optionAImageContentHash", apiImagePerceptualHash: "optionAImagePerceptualHash" },
  { api: "optionB", label: "Option B", type: "option_b_type", text: "option_b", image: "option_b_image_key", imageHash: "option_b_image_content_hash", imagePerceptualHash: "option_b_image_perceptual_hash", apiText: "optionB", apiImageHash: "optionBImageContentHash", apiImagePerceptualHash: "optionBImagePerceptualHash" },
  { api: "optionC", label: "Option C", type: "option_c_type", text: "option_c", image: "option_c_image_key", imageHash: "option_c_image_content_hash", imagePerceptualHash: "option_c_image_perceptual_hash", apiText: "optionC", apiImageHash: "optionCImageContentHash", apiImagePerceptualHash: "optionCImagePerceptualHash" },
  { api: "optionD", label: "Option D", type: "option_d_type", text: "option_d", image: "option_d_image_key", imageHash: "option_d_image_content_hash", imagePerceptualHash: "option_d_image_perceptual_hash", apiText: "optionD", apiImageHash: "optionDImageContentHash", apiImagePerceptualHash: "optionDImagePerceptualHash" },
];

function badRequest(message) {
  return Object.assign(new Error(message), { status: 400 });
}

// A SHA-256 hex digest is exactly 64 lowercase/uppercase hex chars. Anything
// else (missing, malformed, a client that skipped hashing) is treated as "no
// hash provided" rather than rejected — the save must never fail over this.
const SHA256_HEX_RE = /^[0-9a-f]{64}$/i;

function normalizeImageContentHash(value) {
  const s = typeof value === "string" ? value.trim().toLowerCase() : "";
  return SHA256_HEX_RE.test(s) ? s : null;
}

// A dHash perceptual hash is exactly 16 lowercase/uppercase hex chars (64
// bits). See utils/perceptualHash.js for the algorithm and why this is a
// SEPARATE, additional signal from the exact content hash above. Same
// "never block a save" treatment as normalizeImageContentHash(): anything
// missing/malformed is just "no perceptual hash provided", not an error.
const PHASH_HEX_RE = /^[0-9a-f]{16}$/i;

function normalizeImagePerceptualHash(value) {
  const s = typeof value === "string" ? value.trim().toLowerCase() : "";
  return PHASH_HEX_RE.test(s) ? s : null;
}

/**
 * Validates one API question payload and returns the normalized DB columns.
 * Rejects a question (or any option) that has neither image nor text.
 */
function toDbColumns(q, n) {
  const cols = {};
  for (const f of FIELDS) {
    const type = q[`${f.api}Type`] === "image" ? "image" : "text";
    if (type === "image") {
      const key = typeof q[`${f.api}ImageKey`] === "string" ? q[`${f.api}ImageKey`].trim() : "";
      if (!key || !key.startsWith(IMAGE_PREFIX) || key.includes("..")) {
        throw badRequest(`Question ${n}: ${f.label} needs an image (or switch it to text)`);
      }
      cols[f.type] = "image";
      cols[f.image] = key;
      cols[f.text] = null;
      cols[f.imageHash] = normalizeImageContentHash(q[f.apiImageHash]);
      cols[f.imagePerceptualHash] = normalizeImagePerceptualHash(q[f.apiImagePerceptualHash]);
    } else {
      const text = typeof q[f.apiText] === "string" ? q[f.apiText].trim() : "";
      if (!text) throw badRequest(`Question ${n}: ${f.label} needs an image or some text`);
      cols[f.type] = "text";
      cols[f.text] = text;
      cols[f.image] = null;
      cols[f.imageHash] = null;
      cols[f.imagePerceptualHash] = null;
    }
  }
  if (!["a", "b", "c", "d"].includes(q.correctOption)) {
    throw badRequest(`Question ${n} needs a correct option (A, B, C, or D)`);
  }
  cols.correct_option = q.correctOption;
  cols.marks = q.marks && Number(q.marks) > 0 ? Number(q.marks) : 1;
  return cols;
}

/**
 * Stable fingerprint of a question's content (not its marks or id) — used to
 * stop the question bank storing the same question twice.
 *
 * For an image field, dedup uses the IMAGE CONTENT HASH (sha256 of the actual
 * bytes, computed client-side at upload time) rather than the image key,
 * since the key is a random R2 object name — two uploads of the byte-for-byte
 * identical screenshot get different keys but the same content hash. Falls
 * back to the image key when no content hash is present (rows saved before
 * this change, or a client that skipped/failed hashing), so this never
 * crashes or regresses a save — it only means that one row won't dedup
 * against a reupload until it is backfilled (see scripts/backfillImageContentHashes.js).
 */
function contentHash(row) {
  const parts = [];
  for (const f of FIELDS) {
    const imageFingerprint = row[f.imageHash] || row[f.image] || "";
    parts.push(row[f.type] || "text", row[f.text] || "", imageFingerprint);
  }
  parts.push(row.correct_option);
  return crypto.createHash("md5").update(parts.join("\x1f"), "utf8").digest("hex");
}

/** Text used where only text can be shown (emails, PDFs). */
function plainQuestionText(row) {
  return row.question_type === "image" ? "Question shown as an image" : row.question_text;
}

/**
 * DB row -> API shape. `sign` turns an R2 key into a signed URL (async).
 * withKeys: include the raw keys (admin editing / bank import only).
 */
async function serializeQuestion(row, sign, { withKeys = false } = {}) {
  const out = {};
  for (const f of FIELDS) {
    const type = row[f.type] === "image" ? "image" : "text";
    out[`${f.api}Type`] = type;
    out[f.apiText] = type === "text" ? row[f.text] : null;
    out[`${f.api}ImageUrl`] = type === "image" ? await sign(row[f.image]) : null;
    if (withKeys) {
      out[`${f.api}ImageKey`] = type === "image" ? row[f.image] : null;
      out[f.apiImageHash] = type === "image" ? row[f.imageHash] || null : null;
      out[f.apiImagePerceptualHash] = type === "image" ? row[f.imagePerceptualHash] || null : null;
    }
  }
  return out;
}

module.exports = { IMAGE_PREFIX, FIELDS, toDbColumns, contentHash, plainQuestionText, serializeQuestion, normalizeImagePerceptualHash };
