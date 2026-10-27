-- ─────────────────────────────────────────────────────────────────────────
-- Image perceptual hash columns — NEAR-duplicate detection for image-based
-- MCQ questions/options, ADDITIVE to the exact-hash system in
-- sql/image_content_hash.sql (this does not replace or touch that system).
--
-- Root cause: sql/image_content_hash.sql's SHA-256 content hash only
-- catches byte-for-byte identical re-uploads of the exact same file. In
-- production the far more common case is two admins (or the same admin,
-- twice) each taking their OWN screenshot of the same textbook question —
-- visually identical, but a different crop by a pixel, different
-- compression, different screenshot tool, so the bytes (and therefore the
-- SHA-256) never match, and the true duplicate goes undetected.
--
-- Fix: add a nullable column per image field to store a dHash perceptual
-- hash (16 hex chars = 64 bits) of the image's visual content — computed
-- client-side via an offscreen canvas at upload time (see
-- web/lib/questionImages.ts's uploadQuestionImage()), or backfilled
-- server-side via Jimp for existing rows (see
-- scripts/backfillPerceptualHashes.js). api/utils/perceptualHash.js's
-- hammingDistance()/isNearDuplicateImage() compare two dHashes with a
-- tolerance (default threshold 8/64 bits — see that file's header comment
-- for the full reasoning), unlike the exact hash's strict equality check.
--
-- Run AFTER sql/image_content_hash.sql (this migration assumes those
-- columns — and the exact-hash dedup behaviour built on them — already
-- exist; it does not depend on their values, but it is the next migration
-- in the same series and should be applied in order).
--
-- Additive and idempotent (IF NOT EXISTS throughout). Existing rows get
-- NULL here until scripts/backfillPerceptualHashes.js runs — until then,
-- the new near-duplicate checks in questionBank.service.js/tests.service.js
-- simply find nothing to compare against for those rows (never blocks a
-- save; see those files for the "skip entirely when no hash present"
-- behaviour).
--
-- Run ONCE in the Supabase SQL editor (staging first), BEFORE deploying the
-- updated API/web code and BEFORE running scripts/backfillPerceptualHashes.js.
-- NOT executed by this agent — this environment has no DDL access.
-- ─────────────────────────────────────────────────────────────────────────

alter table public.test_questions add column if not exists question_image_perceptual_hash text;
alter table public.test_questions add column if not exists option_a_image_perceptual_hash text;
alter table public.test_questions add column if not exists option_b_image_perceptual_hash text;
alter table public.test_questions add column if not exists option_c_image_perceptual_hash text;
alter table public.test_questions add column if not exists option_d_image_perceptual_hash text;

alter table public.question_bank add column if not exists question_image_perceptual_hash text;
alter table public.question_bank add column if not exists option_a_image_perceptual_hash text;
alter table public.question_bank add column if not exists option_b_image_perceptual_hash text;
alter table public.question_bank add column if not exists option_c_image_perceptual_hash text;
alter table public.question_bank add column if not exists option_d_image_perceptual_hash text;

-- Lets the backfill script and future near-dup queries find rows quickly
-- that have an image but no perceptual hash yet (mirrors
-- idx_question_bank_missing_image_hash in sql/image_content_hash.sql).
create index if not exists idx_question_bank_missing_perceptual_hash
  on public.question_bank (id)
  where question_image_perceptual_hash is null
     or option_a_image_perceptual_hash is null
     or option_b_image_perceptual_hash is null
     or option_c_image_perceptual_hash is null
     or option_d_image_perceptual_hash is null;
