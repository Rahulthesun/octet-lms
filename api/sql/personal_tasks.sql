-- ─────────────────────────────────────────────────────────────────────────
-- Personal Tasks — a private to-do/reminder list on both the admin and
-- student dashboards. Scoped to the logged-in user (auth.users.id), never
-- to a role — an admin's tasks and a student's tasks are both just rows
-- here, visible only to the person who created them.
--
-- Run once in the Supabase SQL editor.
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.personal_tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  completed boolean not null default false,
  due_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_personal_tasks_user
  on public.personal_tasks(user_id, completed, created_at);
