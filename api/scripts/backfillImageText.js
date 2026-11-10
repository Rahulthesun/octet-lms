/**
 * scripts/backfillImageText.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Reads (OCR) the words in every existing question screenshot — question
 * bank rows and test questions — and remembers them in
 * public.question_image_text, so the "question already posted" check
 * (services/imageText.service.js) also covers questions posted BEFORE that
 * check existed.
 *
 * ONLY adds rows to question_image_text. It never changes or deletes any
 * question, test or bank row. Images already read are skipped, so it is
 * safe to re-run. Run sql/question_image_text.sql first.
 *
 *   node scripts/backfillImageText.js
 * ─────────────────────────────────────────────────────────────────────────────
 */

const supabase = require("../config/supabase");
const { textsForKeys } = require("../services/imageText.service");

async function imageKeys(table) {
  const { data, error } = await supabase
    .from(table)
    .select("question_image_key")
    .eq("question_type", "image")
    .not("question_image_key", "is", null)
    .range(0, 49999);
  if (error) throw error;
  return (data || []).map((r) => r.question_image_key);
}

async function main() {
  const { error: tableErr } = await supabase.from("question_image_text").select("image_key").limit(1);
  if (tableErr) throw new Error(`question_image_text is not available (${tableErr.message}). Run sql/question_image_text.sql first.`);

  const keys = [...new Set([...(await imageKeys("question_bank")), ...(await imageKeys("test_questions"))])];
  console.log(`${keys.length} question images found. Reading text (images already read are skipped)…`);

  let n = 0;
  for (let i = 0; i < keys.length; i += 10) {
    const batch = keys.slice(i, i + 10);
    const texts = await textsForKeys(batch);
    n += batch.filter((k) => texts.has(k)).length;
    console.log(`  ${Math.min(i + 10, keys.length)}/${keys.length}`);
  }
  console.log(`Done — text remembered for ${n}/${keys.length} images.`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
