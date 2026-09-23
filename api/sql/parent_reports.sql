-- ─────────────────────────────────────────────────────────────────────────
-- Parent/student attendance report emails — monthly PDF reports and
-- same-day absence alerts. Purely additive: one new table, one new column
-- on the existing attendance_sessions table.
--
-- Run once in the Supabase SQL editor.
-- ─────────────────────────────────────────────────────────────────────────

-- One row per student per month a report was attempted — the scheduler
-- checks this before generating/sending anything, so re-running the
-- monthly job (or restarting the API mid-month) can never double-send.
create table if not exists public.parent_report_log (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  report_year integer not null,
  report_month integer not null check (report_month between 1 and 12),
  sent_at timestamptz not null default now(),
  recipients jsonb not null default '[]'::jsonb,
  status text not null default 'sent' check (status in ('sent', 'failed', 'partial', 'skipped_no_recipients')),
  error text,
  unique (student_id, report_year, report_month)
);

create index if not exists idx_parent_report_log_student
  on public.parent_report_log(student_id, report_year, report_month);

-- Marks an attendance_sessions row as already processed for same-day
-- absence alerts, so the daily job never emails twice for one session.
alter table public.attendance_sessions
  add column if not exists absence_notified_at timestamptz;
