-- ─────────────────────────────────────────────────────────────────────────────
-- Test settings schema — the configurable pass-percentage threshold used by
-- the admin test analytics modals (TestAnalyticsModal, OverallAnalyticsModal).
-- Mirrors attendance_settings (see api/sql/online_attendance.sql +
-- api/services/attendanceSettings.service.js): a single singleton settings
-- row, fetched with a fixed id, upserted on save.
--
-- Run once in the Supabase SQL editor. NOT executed automatically — this
-- file only describes the migration.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.test_settings (
  id uuid primary key default '00000000-0000-0000-0000-000000000001'::uuid,
  pass_percentage numeric not null default 35,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

-- Seed the singleton row if it doesn't already exist.
insert into public.test_settings (id, pass_percentage)
values ('00000000-0000-0000-0000-000000000001', 35)
on conflict (id) do nothing;
