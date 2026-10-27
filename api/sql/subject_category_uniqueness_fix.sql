-- ─────────────────────────────────────────────────────────────────────────
-- Fixes: idx_subjects_grade_name_unique is (grade, lower(name)) only — it
-- does not know about the new `category` column (content_category.sql).
-- This blocks cloning a notes subject's NAME into the qa/practice
-- categories (e.g. "Physical Chemistry" under notes + "Physical Chemistry"
-- under qa, same grade, would collide on the old index even though they
-- are legitimately different rows for different purposes).
--
-- Run once in the Supabase SQL editor, AFTER content_category.sql (this
-- migration assumes the `category` column already exists).
-- ─────────────────────────────────────────────────────────────────────────

drop index if exists public.idx_subjects_grade_name_unique;

create unique index if not exists idx_subjects_grade_category_name_unique
  on public.subjects(grade, category, lower(name));
