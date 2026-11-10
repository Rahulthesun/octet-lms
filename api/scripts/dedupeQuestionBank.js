/**
 * scripts/dedupeQuestionBank.js
 * ─────────────────────────────────────────────────────────────────────────────
 * One-time (re-runnable) clean-up of duplicate question_bank rows left behind
 * by the old insert-only sync, which stored a new row every time a draft
 * autosaved an edit of an already-complete question (most often: the correct
 * answer defaulting to (a) and then being changed seconds later).
 *
 * Within each bank group (one source test, or one manual label), rows that
 * ask the SAME stem (questionBank.service.js → sameStem) are clustered. One
 * row per cluster is kept:
 *   - the row whose exact content matches the test's current question, when
 *     the source test still exists; otherwise
 *   - the NEWEST row (the last edit = the final answer key).
 * The others are deleted. test_questions.bank_question_id is ON DELETE SET
 * NULL, so tests that imported a deleted copy are unaffected.
 *
 * Report-only by default. Pass --apply to actually delete.
 *   node scripts/dedupeQuestionBank.js           # dry run
 *   node scripts/dedupeQuestionBank.js --apply
 * ─────────────────────────────────────────────────────────────────────────────
 */

const supabase = require("../config/supabase");
const { sameStem } = require("../services/questionBank.service");
const { contentHash } = require("../utils/mcqQuestion");

const APPLY = process.argv.includes("--apply");

async function main() {
  const { data: rows, error } = await supabase
    .from("question_bank")
    .select("*")
    .order("created_at", { ascending: true })
    .range(0, 49999);
  if (error) throw error;

  const groups = new Map();
  for (const r of rows || []) {
    const key = r.source_test_id || `title:${String(r.source_test_title || "").trim()}|sub:${r.subtopic_id || ""}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(r);
  }

  const testIds = [...new Set((rows || []).map((r) => r.source_test_id).filter(Boolean))];
  const currentHashesByTest = new Map();
  for (const id of testIds) {
    const { data: qs, error: qErr } = await supabase.from("test_questions").select("*").eq("test_id", id);
    if (qErr) throw qErr;
    if (qs && qs.length > 0) currentHashesByTest.set(id, new Set(qs.map((q) => contentHash(q))));
  }

  const toDelete = [];
  for (const [, groupRows] of groups) {
    const clusters = [];
    for (const r of groupRows) {
      const c = clusters.find((cl) => cl.some((x) => sameStem(x, r)));
      if (c) c.push(r);
      else clusters.push([r]);
    }
    for (const cl of clusters) {
      if (cl.length < 2) continue;
      const current = cl[0].source_test_id ? currentHashesByTest.get(cl[0].source_test_id) : null;
      const keep = (current && cl.find((r) => current.has(r.content_hash))) || cl[cl.length - 1];
      for (const r of cl) {
        if (r.id === keep.id) continue;
        toDelete.push(r.id);
        console.log(`  delete ${r.id}  (${r.created_at.slice(0, 19)}, answer ${r.correct_option})  keep ${keep.id} (answer ${keep.correct_option})  — "${r.source_test_title}"`);
      }
    }
  }

  console.log(`\n${rows.length} bank rows, ${groups.size} groups, ${toDelete.length} duplicate rows ${APPLY ? "to delete" : "would be deleted (dry run — pass --apply)"}.`);
  if (!APPLY || toDelete.length === 0) return;

  for (let i = 0; i < toDelete.length; i += 100) {
    const { error: delErr } = await supabase.from("question_bank").delete().in("id", toDelete.slice(i, i + 100));
    if (delErr) throw delErr;
  }
  const { count } = await supabase.from("question_bank").select("id", { count: "exact", head: true });
  console.log(`Deleted. question_bank now has ${count} rows.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
