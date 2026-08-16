-- ─────────────────────────────────────────────────────────────────────────────
-- Replaces the earlier text-based `standard` tag on subjects with a proper
-- numeric `grade` column, and stops the same subject name being added twice
-- within the same grade (the same name CAN still exist in both 11th and
-- 12th separately — e.g. "Physical Chemistry" under both).
--
-- Run once in the Supabase SQL editor, after content_standard.sql (if that
-- was ever run — this migration works fine even if it wasn't).
--
-- Backfill order:
--   1. Any subject already tagged via the old `standard` column ('11'/'12')
--      keeps that grade.
--   2. Every remaining subject — the original Physical/Organic/Inorganic
--      Chemistry, Exam Eve Study Material, etc. — defaults into grade 12.
--      11th starts fresh, per spec.
-- `grade` then becomes required and `standard` is dropped.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.subjects
  add column if not exists grade integer
    check (grade in (11, 12));

-- Backfill from `standard`, only if that column actually exists (it might
-- not, if content_standard.sql was never applied).
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'subjects' and column_name = 'standard'
  ) then
    update public.subjects
    set grade = case standard
      when '11' then 11
      when '12' then 12
      else grade
    end
    where standard is not null and grade is null;
  end if;
end $$;

-- Everything else (pre-existing, previously ungraded subjects) defaults to
-- grade 12 — 11th stays fresh/empty until the admin adds subjects to it.
update public.subjects
set grade = 12
where grade is null;

-- Now that every row has a grade, make it required going forward.
alter table public.subjects
  alter column grade set not null;

-- Drop the old text-based column now that `grade` fully replaces it.
alter table public.subjects
  drop column if exists standard;

-- No duplicate subject NAME within the same grade (case-insensitive).
create unique index if not exists idx_subjects_grade_name_unique
  on public.subjects(grade, lower(name));
