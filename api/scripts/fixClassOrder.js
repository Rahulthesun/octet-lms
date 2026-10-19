/**
 * scripts/fixClassOrder.js
 * ─────────────────────────────────────────────────────────────────────────
 * One-time repair: the Q&A/Practice clone script created every Class
 * (subtopic) with the default order_index=0, so they all tied and came
 * back in arbitrary order instead of Class-1, Class-2, Class-3... This
 * parses the leading number out of each subtopic's name ("Class-5 ..." ->
 * 5, "3. ..." -> 3) and sets order_index to that number, so the existing
 * GET /api/subtopics/chapter/:chapterId (already ordered by order_index)
 * returns them in the right sequence without any other code change.
 *
 * Subtopics whose name has no leading number are left with order_index
 * unchanged (they'll sort after the numbered ones, which is reasonable).
 *
 * Idempotent — safe to re-run.
 *
 * Usage: node scripts/fixClassOrder.js
 * ─────────────────────────────────────────────────────────────────────────
 */

require("dotenv").config();
const supabase = require("../config/supabase");

function extractNumber(name) {
  const m = name.match(/^\s*(?:Class[\s-]*)?(\d+)\b/i);
  return m ? parseInt(m[1], 10) : null;
}

async function main() {
  const { data: subtopics, error } = await supabase.from("subtopics").select("id, name, order_index");
  if (error) throw error;

  let updated = 0;
  for (const s of subtopics) {
    const n = extractNumber(s.name);
    if (n === null || s.order_index === n) continue;
    const { error: updErr } = await supabase.from("subtopics").update({ order_index: n }).eq("id", s.id);
    if (updErr) {
      console.error(`Failed to reorder "${s.name}": ${updErr.message}`);
      continue;
    }
    console.log(`"${s.name}" -> order_index ${n}`);
    updated++;
  }

  console.log(`\nDone. Reordered ${updated} class(es).`);
}

main().catch((e) => {
  console.error("Failed:", e.message);
  process.exitCode = 1;
});
