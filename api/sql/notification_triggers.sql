-- ─────────────────────────────────────────────────────────────────────────
-- Reminder idempotency columns for the two scheduled notification triggers
-- (test start reminders, task-due reminders) — purely additive, both
-- nullable so every existing row is unaffected.
--
-- Run once in the Supabase SQL editor (after tests.sql and
-- personal_tasks.sql already exist).
-- ─────────────────────────────────────────────────────────────────────────

alter table public.tests
  add column if not exists reminder_sent_at timestamptz;

alter table public.personal_tasks
  add column if not exists reminder_sent_at timestamptz;
