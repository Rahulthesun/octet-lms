-- sql/question_image_text.sql
-- ─────────────────────────────────────────────────────────────────────────────
-- Remembers the words read (OCR) from each question screenshot, keyed by its
-- R2 image key, so "the same question was already posted" can be checked
-- without re-reading every old image on each save
-- (see api/services/imageText.service.js).
--
-- Additive only: creates one new table. Nothing existing is changed or deleted.
-- Run once in the Supabase SQL editor, then (optionally) fill it for images
-- that already exist:  node scripts/backfillImageText.js
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.question_image_text (
  image_key   text primary key,
  ocr_text    text not null default '',
  norm_text   text not null default '',
  created_at  timestamptz not null default now()
);

alter table public.question_image_text enable row level security;
-- No policies: only the API (service role) reads or writes this table.
