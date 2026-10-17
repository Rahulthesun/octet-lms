/**
 * scripts/backfillPerceptualHashes.js
 * ─────────────────────────────────────────────────────────────────────────────
 * One-time (re-runnable) backfill for the perceptual-duplicate-detection fix
 * (see sql/image_perceptual_hash.sql and utils/perceptualHash.js). ADDITIVE
 * to, and run strictly AFTER, scripts/backfillImageContentHashes.js — this
 * script does not touch *_image_content_hash at all.
 *
 * Problem this solves: the exact SHA-256 content hash only catches
 * byte-for-byte identical re-uploads. Production data shows the far more
 * common duplicate is two SEPARATE screenshots of the same textbook
 * question — visually identical, byte-different — which the exact hash
 * can never match. This script:
 *
 *   1. For every question_bank row (and, with --with-test-questions, every
 *      test_questions row) that has an image field but no
 *      *_image_perceptual_hash yet, downloads the image from R2, computes
 *      its dHash via utils/perceptualHash.js's dHashFromBuffer() (Jimp),
 *      and writes it into the new column.
 *   2. Then, for question_bank only, groups rows into near-duplicate
 *      clusters PER FIELD POSITION (question image vs. option A image vs.
 *      option B image, etc. are never compared against each other — only
 *      same-position fields are compared), using the same
 *      hammingDistance()/isNearDuplicateImage() threshold the live
 *      createManual()/updateQuestion()/assertNoDuplicateImages() checks use
 *      (default 8/64 bits — see utils/perceptualHash.js's header comment
 *      for the full reasoning). Prints every group found: each row's id,
 *      source_test_title and created_at.
 *   3. Report-only by default — nothing is ever deleted unless you pass
 *      BOTH --delete AND --confirm-visual-match. This is a stricter gate
 *      than scripts/backfillImageContentHashes.js's plain --delete, because
 *      that script's matches are mathematically exact (same SHA-256 bytes)
 *      while this script's matches are approximate (hashes within a
 *      distance threshold) — a human should look at the printed groups
 *      before confirming they are actually the same image, hence the extra,
 *      explicitly-named flag. Passing --delete without --confirm-visual-match
 *      refuses to delete anything and explains why.
 *
 * Prerequisite: sql/image_perceptual_hash.sql must already have been run
 * manually in the Supabase SQL editor (adds the *_image_perceptual_hash
 * columns). This script does not and cannot run DDL.
 *
 * Usage (from the api/ directory):
 *
 *   node scripts/backfillPerceptualHashes.js
 *       Backfill question_bank only; report near-duplicate groups; delete nothing.
 *
 *   node scripts/backfillPerceptualHashes.js --with-test-questions
 *       Also backfill test_questions image perceptual hashes (no grouping/report
 *       is done for test_questions — the grouping step is question_bank only,
 *       matching backfillImageContentHashes.js's scope).
 *
 *   node scripts/backfillPerceptualHashes.js --threshold=10
 *       Use a custom Hamming-distance threshold (out of 64 bits) instead of
 *       the default 8, for this run's report/delete step only.
 *
 *   node scripts/backfillPerceptualHashes.js --delete --confirm-visual-match
 *       Backfill + actually delete near-duplicate question_bank rows (keeps
 *       the oldest row in each group). BOTH flags are required together;
 *       --delete alone is refused. Review the printed groups first — these
 *       are visual-similarity matches, not byte-exact ones, so a human
 *       should confirm each group really is the same underlying image
 *       before re-running with both flags.
 * ─────────────────────────────────────────────────────────────────────────────
 */

require("dotenv").config();
const { GetObjectCommand } = require("@aws-sdk/client-s3");
const supabase = require("../config/supabase");
const r2 = require("../config/r2");
const { FIELDS } = require("../utils/mcqQuestion");
const { dHashFromBuffer, isNearDuplicateImage, DEFAULT_THRESHOLD } = require("../utils/perceptualHash");

const BUCKET = process.env.R2_BUCKET_NAME;
const PAGE_SIZE = 500;

function argFlag(name) {
  return process.argv.slice(2).includes(name);
}

function argValue(name) {
  const prefix = `--${name}=`;
  const hit = process.argv.slice(2).find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : null;
}

/** Downloads an R2 object into a Buffer (needed in full, unlike the streaming SHA-256 of the exact-hash script, because Jimp decodes the whole image). Returns null on failure. */
async function downloadR2Object(key) {
  if (!key) return null;
  try {
    const obj = await r2.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
    const chunks = [];
    for await (const chunk of obj.Body) chunks.push(chunk);
    return Buffer.concat(chunks);
  } catch (err) {
    console.warn(`  ! could not download ${key}: ${err.message}`);
    return null;
  }
}

/** Backfills *_image_perceptual_hash for every row in `table` missing one, image field by image field. */
async function backfillTable(table) {
  let totalChecked = 0;
  let totalUpdated = 0;
  let from = 0;

  for (;;) {
    const { data: rows, error } = await supabase
      .from(table)
      .select("id, " + FIELDS.map((f) => `${f.image}, ${f.imagePerceptualHash}, ${f.type}`).join(", "))
      .range(from, from + PAGE_SIZE - 1)
      .order("id", { ascending: true });
    if (error) throw error;
    if (!rows || rows.length === 0) break;

    for (const row of rows) {
      totalChecked += 1;
      const patch = {};
      for (const f of FIELDS) {
        const isImage = row[f.type] === "image";
        const key = row[f.image];
        const existingHash = row[f.imagePerceptualHash];
        if (isImage && key && !existingHash) {
          const buffer = await downloadR2Object(key);
          if (!buffer) continue;
          const hash = await dHashFromBuffer(buffer);
          if (hash) patch[f.imagePerceptualHash] = hash;
        }
      }
      if (Object.keys(patch).length > 0) {
        const { error: updErr } = await supabase.from(table).update(patch).eq("id", row.id);
        if (updErr) {
          console.warn(`  ! failed to update ${table} ${row.id}: ${updErr.message}`);
        } else {
          totalUpdated += 1;
          console.log(`  + ${table} ${row.id}: hashed ${Object.keys(patch).length} image field(s)`);
        }
      }
    }

    if (rows.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return { totalChecked, totalUpdated };
}

/** Union-find over one field's rows, connecting any pair within `threshold` Hamming distance. Returns only groups of size > 1. */
function groupNearDuplicates(rows, threshold) {
  const parent = rows.map((_, i) => i);
  function find(x) {
    while (parent[x] !== x) x = parent[x];
    return x;
  }
  function union(a, b) {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent[ra] = rb;
  }
  for (let i = 0; i < rows.length; i++) {
    for (let j = i + 1; j < rows.length; j++) {
      if (isNearDuplicateImage(rows[i].hash, rows[j].hash, threshold)) union(i, j);
    }
  }
  const byRoot = new Map();
  rows.forEach((row, i) => {
    const root = find(i);
    const list = byRoot.get(root) || [];
    list.push(row);
    byRoot.set(root, list);
  });
  return [...byRoot.values()].filter((list) => list.length > 1);
}

/**
 * After backfilling, groups question_bank rows into near-duplicate clusters
 * PER FIELD POSITION (question image vs. option A/B/C/D image are always
 * compared separately — a question image is never compared to an option
 * image, even if they happen to be visually similar). Reports every group;
 * with shouldDelete (and only ever called when BOTH --delete and
 * --confirm-visual-match were passed), deletes every row in a group except
 * the oldest (by created_at), keeping exactly one survivor per group. A row
 * that lands in more than one field's groups (e.g. its question image AND
 * its option A image both have a near-duplicate elsewhere) is only deleted
 * once.
 */
async function reportAndMaybeDelete(shouldDelete, threshold) {
  const { data: rows, error } = await supabase
    .from("question_bank")
    .select("id, created_at, source_test_title, " + FIELDS.map((f) => `${f.type}, ${f.imagePerceptualHash}`).join(", "))
    .order("created_at", { ascending: true });
  if (error) throw error;

  let totalGroups = 0;
  const idsToDelete = new Set();

  for (const f of FIELDS) {
    const candidates = (rows || [])
      .filter((r) => r[f.type] === "image" && r[f.imagePerceptualHash])
      .map((r) => ({ id: r.id, created_at: r.created_at, source_test_title: r.source_test_title, hash: r[f.imagePerceptualHash] }));
    const groups = groupNearDuplicates(candidates, threshold);
    if (groups.length === 0) continue;

    console.log(`\n${f.label} — ${groups.length} near-duplicate group(s) (threshold ${threshold}/64 bits):`);
    for (const list of groups) {
      totalGroups += 1;
      const sorted = [...list].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      const [keep, ...rest] = sorted;
      console.log(`    KEEP   ${keep.id}  (created ${keep.created_at}, source "${keep.source_test_title}")`);
      for (const r of rest) {
        console.log(`    ${shouldDelete ? "DELETE" : "dup   "} ${r.id}  (created ${r.created_at}, source "${r.source_test_title}")`);
        idsToDelete.add(r.id);
      }
    }
  }

  if (totalGroups === 0) {
    console.log("\nNo near-duplicate images found after backfilling perceptual hashes.");
    return;
  }

  console.log(`\n${totalGroups} near-duplicate group(s) found across all fields (${idsToDelete.size} row(s) would be removed).`);

  if (shouldDelete) {
    const ids = [...idsToDelete];
    if (ids.length > 0) {
      const { error: delErr } = await supabase.from("question_bank").delete().in("id", ids);
      if (delErr) console.warn(`  ! failed to delete: ${delErr.message}`);
      else console.log(`Deleted ${ids.length} near-duplicate row(s).`);
    }
  } else {
    console.log("Report-only run — nothing was deleted. Re-run with --delete --confirm-visual-match to remove the duplicates listed above, keeping the oldest row per group.");
  }
}

(async () => {
  try {
    const withTestQuestions = argFlag("--with-test-questions");
    const wantsDelete = argFlag("--delete");
    const confirmedVisualMatch = argFlag("--confirm-visual-match");
    const threshold = argValue("threshold") ? Number(argValue("threshold")) : DEFAULT_THRESHOLD;

    if (wantsDelete && !confirmedVisualMatch) {
      console.error(
        "Refusing to delete: --delete was passed without --confirm-visual-match.\n" +
          "Perceptual matches are APPROXIMATE (visually similar, not byte-identical) — review the printed\n" +
          "groups from a report-only run first, then re-run with BOTH --delete AND --confirm-visual-match."
      );
      process.exitCode = 1;
      return;
    }
    const shouldDelete = wantsDelete && confirmedVisualMatch;

    console.log("Backfilling question_bank image perceptual hashes...");
    const bankResult = await backfillTable("question_bank");
    console.log(`question_bank: checked ${bankResult.totalChecked} row(s), updated ${bankResult.totalUpdated}.`);

    if (withTestQuestions) {
      console.log("\nBackfilling test_questions image perceptual hashes...");
      const tqResult = await backfillTable("test_questions");
      console.log(`test_questions: checked ${tqResult.totalChecked} row(s), updated ${tqResult.totalUpdated}.`);
    }

    await reportAndMaybeDelete(shouldDelete, threshold);
  } catch (err) {
    console.error("Error:", err.message);
    process.exitCode = 1;
  }
})();
