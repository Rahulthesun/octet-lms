-- ─────────────────────────────────────────────────────────────────────────
-- Fixes: "A subject named X already exists in grade Y" firing even when no
-- such row exists in that grade.
--
-- Root cause: the ORIGINAL subjects table had `name` declared globally
-- UNIQUE (see the old schema comment: "name : text (required, unique)"),
-- from before subjects were split by grade. That constraint is still
-- active and blocks the same subject name from ever existing in more than
-- one grade — exactly what subject_grade.sql's (grade, lower(name)) index
-- was supposed to allow instead.
--
-- Run once, after subject_grade.sql. Safe to run even if the old
-- constraint has a different name than expected, or doesn't exist at all.
-- ─────────────────────────────────────────────────────────────────────────

-- Common case: Postgres/Supabase's default auto-generated name for a
-- column declared `name text unique`.
alter table public.subjects drop constraint if exists subjects_name_key;

-- General case: any other single-column UNIQUE CONSTRAINT on just `name`,
-- whatever it happens to actually be named.
do $$
declare
  r record;
begin
  for r in (
    select tc.constraint_name
    from information_schema.table_constraints tc
    join information_schema.key_column_usage kcu
      on tc.constraint_name = kcu.constraint_name
     and tc.table_schema = kcu.table_schema
    where tc.table_schema = 'public'
      and tc.table_name = 'subjects'
      and tc.constraint_type = 'UNIQUE'
    group by tc.constraint_name
    having count(*) = 1 and bool_and(kcu.column_name = 'name')
  )
  loop
    execute format('alter table public.subjects drop constraint %I', r.constraint_name);
  end loop;
end $$;

-- General case: a bare UNIQUE INDEX on just `name` that isn't backing a
-- named constraint (rare, covered for completeness). Never touches
-- idx_subjects_grade_name_unique, which is on (grade, lower(name)) and is
-- the one index we actually want.
do $$
declare
  r record;
begin
  for r in (
    select ic.relname as index_name
    from pg_index ix
    join pg_class ic on ic.oid = ix.indexrelid
    join pg_class tc on tc.oid = ix.indrelid
    join pg_namespace ns on ns.oid = tc.relnamespace
    where ns.nspname = 'public'
      and tc.relname = 'subjects'
      and ix.indisunique
      and ix.indnatts = 1
      and (select attname from pg_attribute where attrelid = tc.oid and attnum = ix.indkey[0]) = 'name'
      and ic.relname <> 'idx_subjects_grade_name_unique'
  )
  loop
    execute format('drop index if exists public.%I', r.index_name);
  end loop;
end $$;

-- Make sure the one uniqueness rule we actually want is in place: no
-- duplicate name within the SAME grade, same name allowed across grades.
create unique index if not exists idx_subjects_grade_name_unique
  on public.subjects(grade, lower(name));
