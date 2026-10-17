-- ─────────────────────────────────────────────────────────────────────────
-- Image content hash columns — true duplicate detection for image-based
-- MCQ questions/options.
--
-- Root cause: question_bank.content_hash previously folded in the random R2
-- storage key for an image field (question_image_key etc). Every re-upload
-- of the byte-for-byte identical screenshot gets a brand-new random key from
-- the upload service, so the same image never hashed the same way twice —
-- undetected "duplicate" bank rows piled up (one test had 17 bank entries
-- that were really ~6-8 underlying images, repeatedly re-uploaded).
--
-- Fix: add a nullable column per image field to store a SHA-256 hex digest
-- of the image's actual bytes (computed client-side at upload time via Web
-- Crypto, or backfilled server-side by scripts/backfillImageContentHashes.js
-- for existing rows). api/utils/mcqQuestion.js's contentHash() now uses this
-- hash instead of the image key when present, falling back to the key when
-- absent (never blocks a save).
--
-- Additive and idempotent (IF NOT EXISTS throughout). Existing rows get NULL
-- here until the backfill script runs — contentHash() falls back to the old
-- image-key behavior for them in the meantime, so nothing breaks.
--
-- Run ONCE in the Supabase SQL editor (staging first), BEFORE deploying the
-- updated API/web code and BEFORE running scripts/backfillImageContentHashes.js.
-- ─────────────────────────────────────────────────────────────────────────

alter table public.test_questions add column if not exists question_image_content_hash text;
alter table public.test_questions add column if not exists option_a_image_content_hash text;
alter table public.test_questions add column if not exists option_b_image_content_hash text;
alter table public.test_questions add column if not exists option_c_image_content_hash text;
alter table public.test_questions add column if not exists option_d_image_content_hash text;

alter table public.question_bank add column if not exists question_image_content_hash text;
alter table public.question_bank add column if not exists option_a_image_content_hash text;
alter table public.question_bank add column if not exists option_b_image_content_hash text;
alter table public.question_bank add column if not exists option_c_image_content_hash text;
alter table public.question_bank add column if not exists option_d_image_content_hash text;

-- Lets the backfill script and future dedup queries find rows quickly that
-- have an image but no hash yet.
create index if not exists idx_question_bank_missing_image_hash
  on public.question_bank (id)
  where question_image_content_hash is null
     or option_a_image_content_hash is null
     or option_b_image_content_hash is null
     or option_c_image_content_hash is null
     or option_d_image_content_hash is null;
