-- ─────────────────────────────────────────────────────────────────────────────
-- Adds an optional "standard" (class/grade) tag to subjects, so new subjects
-- can be created under 11th or 12th while every existing subject (Physical,
-- Organic, Inorganic, etc.) is left completely untouched — `standard` stays
-- null for all of them, exactly as it is today.
--
-- Run once in the Supabase SQL editor. Purely additive: adds one nullable
-- column, drops/changes nothing.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.subjects
  add column if not exists standard text
    check (standard in ('11', '12'));
