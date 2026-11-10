/**
 * services/imageText.service.js
 * ─────────────────────────────────────────────────────────────────────────────
 * "Question already posted" check based on the WORDS inside question
 * screenshots (OCR — utils/imageText.js).
 *
 * The exact-hash and perceptual-hash checks only catch the same picture.
 * Two different screenshots of the same printed question (different crop,
 * zoom or compression) slip past both, but they read the same text. Here:
 *
 *   - The text of each question image is read once and remembered in
 *     public.question_image_text (sql/question_image_text.sql), keyed by its
 *     R2 image key.
 *   - On SAVE, a question whose screenshot text matches a question already
 *     in the question bank (image OR typed text), or another question in the
 *     same test, AND whose four options are the same, is rejected:
 *     "Question already posted — duplicate questions are not allowed".
 *   - Right after UPLOAD (options not filled in yet) a text match only gives
 *     a heads-up warning; the image is kept.
 *
 * Why the options must match too: question screenshots usually hold only the
 * stem, and the same stem is routinely reused for different questions — e.g.
 * Test-13 has several different questions that all read "Which of the
 * following statements is not true about glucose?" with different option
 * images. Text alone would wrongly block those.
 *
 * Never blocks for its own failures: if OCR or the lookup table is
 * unavailable, the check is skipped (logged) and saving goes ahead.
 * Questions imported from the bank (bankQuestionId) are never flagged
 * against the row they were imported from — reusing bank questions is the
 * bank's purpose.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { GetObjectCommand } = require("@aws-sdk/client-s3");
const supabase = require("../config/supabase");
const r2 = require("../config/r2");
const { FIELDS } = require("../utils/mcqQuestion");
const { isNearDuplicateImage } = require("../utils/perceptualHash");
const { extractText, normalizeText, isSameText } = require("../utils/imageText");

const TABLE = "question_image_text";
const BUCKET = process.env.R2_BUCKET_NAME;
const OPTION_FIELDS = FIELDS.filter((f) => f.api !== "question");

function conflict(message) {
  return Object.assign(new Error(message), { status: 409 });
}

function formatReadableDate(iso) {
  const d = new Date(iso);
  if (!iso || Number.isNaN(d.getTime())) return "an unknown date";
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

let warnedMissingTable = false;
function isMissingTable(error) {
  const msg = String(error?.message || "");
  return error?.code === "42P01" || error?.code === "PGRST205" || (msg.includes(TABLE) && /does not exist|schema cache/i.test(msg));
}
function warnMissingTable() {
  if (warnedMissingTable) return;
  warnedMissingTable = true;
  console.warn(`[image-text] table ${TABLE} not found — run sql/question_image_text.sql. Same-text checks against older questions are skipped until then.`);
}

async function downloadImage(key) {
  const obj = await r2.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
  return Buffer.from(await obj.Body.transformToByteArray());
}

/** Remembered texts for these keys: Map(key → normalised text). Never OCRs. */
async function cachedTexts(keys) {
  const wanted = [...new Set((keys || []).filter(Boolean))];
  const out = new Map();
  for (let i = 0; i < wanted.length; i += 200) {
    const { data, error } = await supabase.from(TABLE).select("image_key, norm_text").in("image_key", wanted.slice(i, i + 200));
    if (error) {
      if (isMissingTable(error)) { warnMissingTable(); return out; }
      throw error;
    }
    for (const r of data || []) out.set(r.image_key, r.norm_text || "");
  }
  return out;
}

/**
 * Normalised text for each key, reading (OCR) and remembering any image not
 * read before. Keys that fail to download/read are simply absent.
 */
async function textsForKeys(keys) {
  const out = await cachedTexts(keys);
  for (const key of [...new Set((keys || []).filter(Boolean))]) {
    if (out.has(key)) continue;
    try {
      const raw = await extractText(await downloadImage(key));
      const norm = normalizeText(raw);
      out.set(key, norm);
      const { error } = await supabase.from(TABLE).upsert({ image_key: key, ocr_text: raw.trim(), norm_text: norm }, { onConflict: "image_key" });
      if (error) {
        if (isMissingTable(error)) warnMissingTable();
        else console.error(`[image-text] could not remember text for ${key}:`, error.message);
      }
    } catch (err) {
      console.error(`[image-text] could not read text in ${key}:`, err.message);
    }
  }
  return out;
}

const CANDIDATE_COLUMNS = [
  "id", "source_test_id", "source_test_title", "created_at", "question_type", "question_text", "question_image_key",
  ...OPTION_FIELDS.flatMap((f) => [f.type, f.text, f.imageHash, f.imagePerceptualHash]),
];

/** Every bank question with its stem text (OCR text for image stems, typed text otherwise). */
async function bankCandidates({ excludeTestId, excludeBankId } = {}) {
  const { data, error } = await supabase.from("question_bank").select(CANDIDATE_COLUMNS.join(", ")).range(0, 49999);
  if (error) throw error;
  const rows = (data || []).filter((r) => r.id !== excludeBankId && !(excludeTestId && r.source_test_id === excludeTestId));
  const texts = await cachedTexts(rows.filter((r) => r.question_type === "image").map((r) => r.question_image_key));
  return rows
    .map((r) => ({ ...r, stemNorm: r.question_type === "image" ? texts.get(r.question_image_key) || "" : normalizeText(r.question_text) }))
    .filter((r) => r.stemNorm);
}

function optionsMatch(a, b) {
  return OPTION_FIELDS.every((f) => {
    const typeA = a[f.type] === "image" ? "image" : "text";
    const typeB = b[f.type] === "image" ? "image" : "text";
    if (typeA !== typeB) return false;
    if (typeA === "text") return normalizeText(a[f.text]) === normalizeText(b[f.text]);
    if (a[f.imageHash] && a[f.imageHash] === b[f.imageHash]) return true;
    return !!(a[f.imagePerceptualHash] && b[f.imagePerceptualHash] && isNearDuplicateImage(a[f.imagePerceptualHash], b[f.imagePerceptualHash]));
  });
}

/** Same question = same stem text AND the same four options. */
function sameQuestion(stemNorm, incomingCols, other) {
  return isSameText(stemNorm, other.stemNorm) && optionsMatch(incomingCols, other);
}

function postedMessage(prefix, row) {
  return `${prefix} is already posted — the same question text is in "${row.source_test_title || "the question bank"}" ` +
    `(added ${formatReadableDate(row.created_at)}). Duplicate questions are not allowed.`;
}

/**
 * Right after a question screenshot is uploaded: read (and remember) its
 * text, and warn if a question with the same text is already posted. The
 * options aren't filled in yet, so this never rejects — the save-time check
 * decides, once the options are known.
 */
async function checkUploadedQuestionImage({ key, excludeTestId, excludeBankId }) {
  if (!key) return { warning: null };
  try {
    const stemNorm = (await textsForKeys([key])).get(key) || "";
    if (!stemNorm) return { warning: null };
    const candidates = await bankCandidates({ excludeTestId, excludeBankId });
    const hit = candidates.find((c) => c.question_image_key !== key && isSameText(stemNorm, c.stemNorm));
    if (!hit) return { warning: null };
    return {
      warning:
        `A question with this same text is already posted in "${hit.source_test_title || "the question bank"}" ` +
        `(added ${formatReadableDate(hit.created_at)}). If its options are also the same, it will be rejected as a duplicate when you save.`,
      sourceTestTitle: hit.source_test_title,
      addedAt: hit.created_at,
    };
  } catch (err) {
    console.error("[image-text] upload check skipped:", err.message);
    return { warning: null };
  }
}

/**
 * Save-time enforcement. `items` are toDbColumns()-shaped rows, each with an
 * optional `bankQuestionId` (imported from the bank). Throws 409 when an
 * image question's text matches another question in this same save, or a
 * question already in the bank. `label(i)` names an item in the message.
 */
async function assertNoSameTextQuestions(items, { excludeTestId, excludeBankId, label = (i) => `Question ${i + 1}` } = {}) {
  const imageItems = items
    .map((cols, i) => ({ cols, i }))
    .filter(({ cols }) => cols.question_type === "image" && cols.question_image_key);
  if (imageItems.length === 0) return;

  let texts;
  let candidates;
  try {
    texts = await textsForKeys(imageItems.map(({ cols }) => cols.question_image_key));
    candidates = await bankCandidates({ excludeTestId, excludeBankId });
  } catch (err) {
    console.error("[image-text] save check skipped:", err.message);
    return;
  }
  const stem = (cols) => texts.get(cols.question_image_key) || "";

  // (a) Within this same save.
  for (let x = 0; x < imageItems.length; x++) {
    for (let y = x + 1; y < imageItems.length; y++) {
      const A = imageItems[x];
      const B = imageItems[y];
      if (A.cols.question_image_key === B.cols.question_image_key) continue; // same stored image — the byte/perceptual checks own that case
      if (sameQuestion(stem(A.cols), A.cols, { ...B.cols, stemNorm: stem(B.cols) })) {
        throw conflict(`${label(B.i)} has the same question text as ${label(A.i)} — duplicate questions are not allowed.`);
      }
    }
  }

  // (b) Against the question bank.
  for (const { cols, i } of imageItems) {
    const s = stem(cols);
    if (!s) continue;
    const hit = candidates.find(
      (c) => c.id !== cols.bankQuestionId && c.question_image_key !== cols.question_image_key && sameQuestion(s, cols, c)
    );
    if (hit) throw conflict(postedMessage(label(i), hit));
  }
}

module.exports = { checkUploadedQuestionImage, assertNoSameTextQuestions, textsForKeys, _internal: { sameQuestion, optionsMatch } };
