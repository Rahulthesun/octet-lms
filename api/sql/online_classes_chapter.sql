-- ─────────────────────────────────────────────────────────────────────────
-- Links an online class to a specific chapter (e.g. "Atomic Structure")
-- instead of only a whole subject. Additive: subject_id stays on the table
-- and is still auto-filled (from the chapter's own subject) so existing
-- subject-based display/filtering keeps working; chapter_id is the new,
-- more specific reference the "Chapter" dropdown in the schedule/edit forms
-- now writes. Mirrors sql/test_chapter_link.sql's pattern for tests.
--
-- Run once in the Supabase SQL editor, staging first.
-- ─────────────────────────────────────────────────────────────────────────

alter table public.online_classes
  add column if not exists chapter_id uuid references public.chapters(id) on delete set null;

create index if not exists idx_online_classes_chapter on public.online_classes(chapter_id);
