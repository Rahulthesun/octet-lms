/**
 * scripts/backfillImageContentHashes.js
 * ─────────────────────────────────────────────────────────────────────────────
 * One-time backfill for the true-duplicate-detection fix (see
 * sql/image_content_hash.sql and utils/mcqQuestion.js's contentHash()).
 *
 * For every question_bank row (and, optionally, every test_questions row)
 * that has an image field but no *_image_content_hash yet, this:
 *   1. downloads the image from R2,
 *   2. computes its SHA-256 server-side,
 *   3. writes it into the new column.
 *
 * Then it re-groups question_bank rows by what their content_hash WOULD be
 * once every image field uses its real content hash, and reports which
 * existing bank rows are now true duplicates of one another — it never
 * deletes anything by default.
 *
 * Prerequisite: sql/image_content_hash.sql must already have been run
 * manually in the Supabase SQL editor (adds the *_image_content_hash
 * columns). This script does not and cannot run DDL.
 *
 * Usage (from the api/ directory):
 *
 *   node scripts/backfillImageContentHashes.js                 Backfill question_bank only (report duplicates found; no deletes)
 *   node scripts/backfillImageContentHashes.js --with-test-questions  Also backfill test_questions image hashes
 *   node scripts/backfillImageContentHashes.js --delete         Backfill + actually delete duplicate question_bank rows (keeps the oldest per group)
 *
 * --delete is destructive and is NOT run unless you pass it explicitly.
 * Review the printed duplicate groups first; a sensible flow is to run
 * without --delete, read the report, then re-run with --delete once you're
 * confident.
 * ─────────────────────────────────────────────────────────────────────────────
 */

require("dotenv").config();
const crypto = require("crypto");
const { GetObjectCommand } = require("@aws-sdk/client-s3");
const supabase = require("../config/supabase");
const r2 = require("../config/r2");
const { FIELDS, contentHash } = require("../utils/mcqQuestion");

const BUCKET = process.env.R2_BUCKET_NAME;
const PAGE_SIZE = 500;

function argFlag(name) {
  return process.argv.slice(2).includes(name);
}

/** Downloads an R2 object and returns its sha256 hex digest, or null on failure. */
async function hashR2Object(key) {
  if (!key) return null;
  try {
    const obj = await r2.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
    const hash = crypto.createHash("sha256");
    for await (const chunk of obj.Body) hash.update(chunk);
    return hash.digest("hex");
  } catch (err) {
    console.warn(`  ! could not hash ${key}: ${err.message}`);
    return null;
  }
}

/** Backfills *_image_content_hash for every row in `table` missing one, image field by image field. */
async function backfillTable(table) {
  let totalChecked = 0;
  let totalUpdated = 0;
  let from = 0;

  for (;;) {
    const { data: rows, error } = await supabase
      .from(table)
      .select("id, " + FIELDS.map((f) => `${f.image}, ${f.imageHash}, ${f.type}`).join(", "))
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
        const existingHash = row[f.imageHash];
        if (isImage && key && !existingHash) {
          const hash = await hashR2Object(key);
          if (hash) patch[f.imageHash] = hash;
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

/**
 * After backfilling, recomputes content_hash for every question_bank row
 * from its (now mostly-real) image content hashes and groups rows that now
 * collide. Reports the groups; with --delete, deletes every row in a group
 * except the oldest (by created_at), keeping exactly one survivor per group.
 */
async function reportAndMaybeDelete(shouldDelete) {
  const { data: rows, error } = await supabase
    .from("question_bank")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;

  const groups = new Map();
  for (const row of rows || []) {
    const recomputed = contentHash(row);
    const list = groups.get(recomputed) || [];
    list.push(row);
    groups.set(recomputed, list);
  }

  const dupGroups = [...groups.entries()].filter(([, list]) => list.length > 1);

  if (dupGroups.length === 0) {
    console.log("\nNo true duplicates found after backfilling image content hashes.");
    return;
  }

  console.log(`\n${dupGroups.length} group(s) of true duplicates found (${dupGroups.reduce((n, [, l]) => n + l.length, 0)} rows total):\n`);
  let deletedCount = 0;
  for (const [hash, list] of dupGroups) {
    const [keep, ...rest] = list; // oldest first (already sorted by created_at asc)
    console.log(`  content_hash=${hash}`);
    console.log(`    KEEP   ${keep.id}  (created ${keep.created_at}, source "${keep.source_test_title}")`);
    for (const r of rest) {
      console.log(`    ${shouldDelete ? "DELETE" : "dup   "} ${r.id}  (created ${r.created_at}, source "${r.source_test_title}")`);
    }
    if (shouldDelete) {
      const ids = rest.map((r) => r.id);
      const { error: delErr } = await supabase.from("question_bank").delete().in("id", ids);
      if (delErr) console.warn(`    ! failed to delete: ${delErr.message}`);
      else deletedCount += ids.length;
    }
  }

  if (shouldDelete) {
    console.log(`\nDeleted ${deletedCount} duplicate row(s), kept ${dupGroups.length} survivor(s).`);
  } else {
    console.log("\nReport-only run (no --delete passed) — nothing was deleted. Re-run with --delete to remove the duplicates listed above, keeping the oldest row in each group.");
  }
}

(async () => {
  try {
    const withTestQuestions = argFlag("--with-test-questions");
    const shouldDelete = argFlag("--delete");

    console.log("Backfilling question_bank image content hashes...");
    const bankResult = await backfillTable("question_bank");
    console.log(`question_bank: checked ${bankResult.totalChecked} row(s), updated ${bankResult.totalUpdated}.`);

    if (withTestQuestions) {
      console.log("\nBackfilling test_questions image content hashes...");
      const tqResult = await backfillTable("test_questions");
      console.log(`test_questions: checked ${tqResult.totalChecked} row(s), updated ${tqResult.totalUpdated}.`);
    }

    await reportAndMaybeDelete(shouldDelete);
  } catch (err) {
    console.error("Error:", err.message);
    process.exitCode = 1;
  }
})();
