-- ─────────────────────────────────────────────────────────────────────────
-- Alumni + graduation revoke, exam document collection, and the
-- "All Students" audience for attendance / online classes / tests.
--
-- Purely additive and idempotent: safe to run more than once. Nothing is
-- dropped or hard-deleted, and every existing row keeps working unchanged
-- (existing classes/tests/sessions default to audience = 'BATCH').
--
-- HOW TO RUN (staging first, then production):
--   1. Supabase SQL editor -> paste this whole file -> Run.
--   2. Run the "STAGING VERIFICATION" steps at the bottom against a dummy
--      student BEFORE touching real data.
-- ─────────────────────────────────────────────────────────────────────────

-- ═════════════════════════════════════════════════════════════════════════
-- 1. STUDENTS: graduation date + archived flag
-- ═════════════════════════════════════════════════════════════════════════
-- graduation_date : the day access ends (inclusive). Set by admin.
-- is_alumni       : flipped by the archive job once the record has been
--                   copied into public.alumni. Access itself is enforced
--                   from graduation_date directly, never from this flag, so
--                   a job that has not run yet cannot leave a hole.
alter table public.students add column if not exists graduation_date date;
alter table public.students add column if not exists is_alumni boolean not null default false;

create index if not exists idx_students_graduation_date on public.students(graduation_date) where graduation_date is not null;
create index if not exists idx_students_is_alumni on public.students(is_alumni);

-- ═════════════════════════════════════════════════════════════════════════
-- 2. ALUMNI table (separate from active students)
-- ═════════════════════════════════════════════════════════════════════════
-- The students row is intentionally KEPT (flagged is_alumni) because
-- attendance_records, test_attempts, notifications and documents all hang
-- off students.id. Deleting or re-keying it would either cascade-delete
-- that history or orphan it. public.alumni holds the archived profile
-- snapshot, batch, batch year and the batch enrollments that were removed
-- (so a restore can put them back exactly).
create table if not exists public.alumni (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null unique references public.students(id) on delete restrict,
  auth_user_id uuid,
  admission_number text,
  name text not null,
  email text,
  mobile_number text,
  class_grade text,
  school_college text,
  preferred_batch text,
  learning_mode text,
  batch_year text not null,                 -- e.g. '2026-27'
  graduation_date date not null,
  profile jsonb not null default '{}'::jsonb,           -- full students row at archive time
  batch_enrollments jsonb not null default '[]'::jsonb, -- rows removed from batch_enrollments
  status text not null default 'ALUMNI' check (status in ('ALUMNI', 'RESTORED')),
  archived_at timestamptz not null default now(),
  restored_at timestamptz,
  restored_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_alumni_status on public.alumni(status);
create index if not exists idx_alumni_batch_year on public.alumni(batch_year);
create index if not exists idx_alumni_preferred_batch on public.alumni(preferred_batch);
create index if not exists idx_alumni_name on public.alumni(lower(name));

alter table public.alumni enable row level security; -- server (service role) only

-- Kills every session/refresh token for a user so a revoked student is
-- logged out immediately. Called by the API with the service role.
create or replace function public.revoke_user_sessions(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  -- compare as text so this works whether auth.refresh_tokens.user_id is varchar or uuid
  delete from auth.refresh_tokens where user_id::text = p_user_id::text;
  delete from auth.sessions where user_id = p_user_id;
end;
$$;

revoke all on function public.revoke_user_sessions(uuid) from public, anon, authenticated;
grant execute on function public.revoke_user_sessions(uuid) to service_role;

-- ═════════════════════════════════════════════════════════════════════════
-- 3. "ALL STUDENTS" audience (NOT a real batch)
-- ═════════════════════════════════════════════════════════════════════════
-- audience = 'ALL' means "every active student, resolved at time of use".
-- batch_id is NULL for those rows. Existing rows default to 'BATCH'.
alter table public.online_classes add column if not exists audience text not null default 'BATCH';
alter table public.online_classes alter column batch_id drop not null;
alter table public.online_classes drop constraint if exists online_classes_audience_check;
alter table public.online_classes add constraint online_classes_audience_check
  check ((audience = 'BATCH' and batch_id is not null) or (audience = 'ALL' and batch_id is null));

alter table public.tests add column if not exists audience text not null default 'BATCH';
alter table public.tests drop constraint if exists tests_audience_check;
alter table public.tests add constraint tests_audience_check
  check ((audience = 'BATCH' and batch_id is not null) or (audience = 'ALL' and batch_id is null));

alter table public.attendance_sessions add column if not exists audience text not null default 'BATCH';
alter table public.attendance_sessions alter column batch_id drop not null;
alter table public.attendance_sessions drop constraint if exists attendance_sessions_audience_check;
alter table public.attendance_sessions add constraint attendance_sessions_audience_check
  check ((audience = 'BATCH' and batch_id is not null) or (audience = 'ALL' and batch_id is null));

-- One "All Students" attendance session per calendar date.
create unique index if not exists uq_attendance_sessions_all_per_date
  on public.attendance_sessions(date) where audience = 'ALL';

create index if not exists idx_online_classes_audience on public.online_classes(audience);
create index if not exists idx_tests_audience on public.tests(audience);
create index if not exists idx_attendance_sessions_audience on public.attendance_sessions(audience);

-- ═════════════════════════════════════════════════════════════════════════
-- 4. EXAM DOCUMENTS (hall ticket + 12th marksheet)
-- ═════════════════════════════════════════════════════════════════════════
create table if not exists public.exam_events (
  id uuid primary key default gen_random_uuid(),
  name text not null,                                  -- e.g. 'CBSE Chemistry'
  exam_date date not null,
  audience text not null default 'BATCH' check (audience in ('BATCH', 'ALL')),
  batch_ids text[] not null default '{}',
  hall_ticket_opened_at timestamptz,                   -- null until admin opens the window
  results_opened_at timestamptz,                       -- null until admin opens the window
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((audience = 'ALL') or (cardinality(batch_ids) > 0))
);

create index if not exists idx_exam_events_date on public.exam_events(exam_date desc);

create table if not exists public.exam_submissions (
  id uuid primary key default gen_random_uuid(),
  exam_event_id uuid not null references public.exam_events(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete restrict,
  kind text not null check (kind in ('HALL_TICKET', 'MARKSHEET')),
  entry_mode text not null default 'UPLOAD' check (entry_mode in ('UPLOAD', 'MANUAL')),
  file_key text,
  file_name text,
  content_type text,
  size_bytes bigint,
  marks_obtained numeric,
  max_marks numeric,
  grade text,
  remarks text,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (exam_event_id, student_id, kind),
  check (
    (entry_mode = 'UPLOAD' and file_key is not null)
    or (entry_mode = 'MANUAL' and kind = 'MARKSHEET' and marks_obtained is not null and max_marks is not null)
  )
);

create index if not exists idx_exam_submissions_event on public.exam_submissions(exam_event_id, kind);
create index if not exists idx_exam_submissions_student on public.exam_submissions(student_id);

alter table public.exam_events enable row level security;      -- server (service role) only
alter table public.exam_submissions enable row level security; -- server (service role) only

-- ═════════════════════════════════════════════════════════════════════════
-- 5. NOTIFICATION TYPES for the exam prompts (reuses the existing engine)
-- ═════════════════════════════════════════════════════════════════════════
alter table public.notifications drop constraint if exists notifications_type_check;
alter table public.notifications add constraint notifications_type_check check (type in (
  'announcement', 'assignment_due', 'video_uploaded', 'test_result', 'test_scheduled', 'test_reminder',
  'exam_hall_ticket', 'exam_marksheet'
));

-- ═════════════════════════════════════════════════════════════════════════
-- STAGING VERIFICATION (run against a DUMMY student, never real data)
-- ═════════════════════════════════════════════════════════════════════════
-- 1. Create a dummy student through the normal admission flow (or reuse a
--    test account) and note its students.id as :sid.
-- 2. Set its graduation date to today:
--      update public.students set graduation_date = current_date where id = :sid;
-- 3. Log in as that student -> expect exactly:
--      "Your access has been revoked because you graduated."
-- 4. Wait for the archive job (or hit POST /api/alumni/run-archive as admin):
--      select * from public.alumni where student_id = :sid;      -- 1 row, status ALUMNI
--      select is_alumni from public.students where id = :sid;    -- true
--      select count(*) from public.batch_enrollments where student_id = :sid; -- 0
-- 5. Restore from Admin > Alumni (or POST /api/alumni/:id/restore):
--      select graduation_date, is_alumni from public.students where id = :sid; -- null, false
--      select status from public.alumni where student_id = :sid; -- RESTORED
--      select count(*) from public.batch_enrollments where student_id = :sid;  -- original count
-- 6. Confirm nothing was deleted:
--      select count(*) from public.attendance_records where student_id = :sid; -- unchanged
