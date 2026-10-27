-- ─────────────────────────────────────────────────────────────────────────
-- Content categories on `subjects`.
--
-- Today every row in `subjects` is a "notes" subject (PDFs/videos under
-- chapters/subtopics). This adds a `category` column so the new Q&A and
-- Practice Questions features can store their own Subject → Unit → Class
-- trees in the SAME tables (subjects/chapters/subtopics) without touching
-- the existing notes feature.
--
-- Safe/non-breaking: every existing row (including the stray "Q & A" notes
-- subject already in the table — an ordinary notes subject, unrelated to
-- this feature) gets category = 'notes' via the default. The existing
-- admin Content Manager (web/app/admin/content/page.tsx) must explicitly
-- filter on category=notes going forward (see subject.service.js
-- getAllSubjects()) so the new 'qa'/'practice' subjects never leak into it.
--
-- RUN ORDER: 1st of the three new migrations in this feature
-- (content_category.sql → qa_bank_questions.sql → qa_bank_resources.sql).
--
-- Run once in the Supabase SQL editor. Idempotent / additive only.
-- ─────────────────────────────────────────────────────────────────────────

alter table public.subjects
  add column if not exists category text not null default 'notes';

alter table public.subjects
  drop constraint if exists subjects_category_check;

alter table public.subjects
  add constraint subjects_category_check check (category in ('notes', 'qa', 'practice'));

create index if not exists idx_subjects_category on public.subjects(category);
