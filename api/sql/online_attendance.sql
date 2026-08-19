-- ─────────────────────────────────────────────────────────────────────────────
-- Google Meet online-class ATTENDANCE schema.
-- Run once in the Supabase SQL editor, after online_classes.sql.
--
-- This is deliberately additive only. It does not create a parallel
-- attendance system — it extends the EXISTING attendance_sessions /
-- attendance_records tables (the same ones the QR-based offline flow
-- already uses) so Google Meet becomes just another attendance source.
-- Every existing query that reads `attendance_sessions`/`attendance_records`
-- keeps working unchanged: all new columns are nullable or default to the
-- offline-safe value, and `present` (boolean) — the column every existing
-- percentage/summary calculation already reads — continues to be set the
-- same way it always was, just now by the Meet sync engine too, not only by
-- scanQrToken()/manualMark().
-- ─────────────────────────────────────────────────────────────────────────────

-- ── attendance_sessions: which source produced this session, and (for
--    Google Meet ones) the sync bookkeeping ────────────────────────────────
alter table public.attendance_sessions
  add column if not exists source text not null default 'OFFLINE'
    check (source in ('OFFLINE', 'GOOGLE_MEET')),
  add column if not exists online_class_id uuid
    references public.online_classes(id) on delete set null,
  add column if not exists sync_status text
    check (sync_status in ('NOT_STARTED', 'LIVE', 'AWAITING_ATTENDANCE_SYNC', 'SYNCED', 'SYNC_FAILED', 'MANUALLY_REVIEWED')),
  add column if not exists last_synced_at timestamptz,
  add column if not exists google_conference_record_name text,
  add column if not exists sync_error text,
  add column if not exists sync_attempts integer not null default 0,
  add column if not exists unmatched_participants jsonb not null default '[]'::jsonb;

create index if not exists idx_attendance_sessions_online_class
  on public.attendance_sessions(online_class_id);

-- At most one attendance_sessions row per online class.
create unique index if not exists idx_attendance_sessions_online_class_unique
  on public.attendance_sessions(online_class_id)
  where online_class_id is not null;

create index if not exists idx_attendance_sessions_sync_status
  on public.attendance_sessions(sync_status)
  where source = 'GOOGLE_MEET';

-- ── attendance_records: the tri-state Present/Partial/Absent result,
--    measured duration, and full override audit trail ─────────────────────
alter table public.attendance_records
  add column if not exists status text
    check (status in ('present', 'partial', 'absent')),
  add column if not exists duration_minutes numeric,
  add column if not exists automatic_pct numeric,
  add column if not exists automatic_status text
    check (automatic_status in ('present', 'partial', 'absent')),
  add column if not exists final_pct numeric,
  add column if not exists final_status text
    check (final_status in ('present', 'partial', 'absent')),
  add column if not exists was_overridden boolean not null default false,
  add column if not exists override_by uuid references auth.users(id),
  add column if not exists override_reason text,
  add column if not exists override_at timestamptz,
  add column if not exists synced_at timestamptz;

-- ── attendance_settings: configurable thresholds, one row (singleton) ──────
create table if not exists public.attendance_settings (
    id uuid primary key default '00000000-0000-0000-0000-000000000001'::uuid,
    present_threshold numeric not null default 75,
    partial_threshold numeric not null default 40,
    auto_calculate boolean not null default true,
    auto_sync boolean not null default true,
    allow_override boolean not null default true,
    sync_delay_minutes integer not null default 5,
    count_time_after_class_end boolean not null default false,
    updated_by uuid references auth.users(id),
    updated_at timestamptz not null default now()
);

insert into public.attendance_settings (id)
values ('00000000-0000-0000-0000-000000000001'::uuid)
on conflict (id) do nothing;

-- ── students: optional linked Google identity, used to reliably match
--    Meet participants to LMS students (never by display name alone) ──────
alter table public.students
  add column if not exists google_user_id text,
  add column if not exists google_identity_email text,
  add column if not exists google_identity_linked_at timestamptz;

create unique index if not exists idx_students_google_user_id
  on public.students(google_user_id)
  where google_user_id is not null;
