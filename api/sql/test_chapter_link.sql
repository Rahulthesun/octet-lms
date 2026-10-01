-- ─────────────────────────────────────────────────────────────────────────
-- Links a test to a specific chapter (e.g. "Atomic Structure") instead of
-- only a whole subject. Additive: subject_id stays on the table and is
-- still auto-filled (from the chapter's own subject) so existing filtering
-- and display keep working; chapter_id is the new, more specific reference
-- the test creator's "Chapter" dropdown now writes.
--
-- Run once in the Supabase SQL editor, staging first.
-- ─────────────────────────────────────────────────────────────────────────

alter table public.tests
  add column if not exists chapter_id uuid references public.chapters(id) on delete set null;

create index if not exists idx_tests_chapter on public.tests(chapter_id);
