-- ─────────────────────────────────────────────────────────────────────────────
-- Feedback & engagement schema.
-- Run once in the Supabase SQL editor (Project → SQL Editor → New query).
-- Safe to re-run: every statement is idempotent.
--
--  1. public.feedback            — student feedback (Bug / Suggestion / General
--                                  with a 1–5 rating). The table already exists
--                                  for PDF bug/suggestion reports; this adds the
--                                  "general" type, a rating and an admin status.
--  2. public.parent_feedback     — reviews sent by parents from the public
--                                  "Parent's Feedback" page (landing footer).
--  3. public.online_class_likes  — one heart per user per online class.
--  4. public.online_class_comments — Instagram-style comments under a class,
--                                  written by students and admins.
-- ─────────────────────────────────────────────────────────────────────────────

-- ── 1. Student feedback ─────────────────────────────────────────────────────

create table if not exists public.feedback (
    id uuid primary key default gen_random_uuid(),
    user_id uuid references auth.users(id) on delete set null,
    type text not null,
    area text,
    details text not null,
    created_at timestamptz default now()
);

alter table public.feedback add column if not exists rating smallint;
alter table public.feedback add column if not exists status text not null default 'new';
alter table public.feedback add column if not exists reviewed_at timestamptz;

-- Drop any existing CHECK constraint on type / area / rating / status (the
-- original one only allowed 'bug' and 'suggestion'), then re-add the new ones.
do $$
declare c record;
begin
  for c in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'feedback'
      and con.contype = 'c'
  loop
    execute format('alter table public.feedback drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.feedback
    add constraint feedback_type_check check (type in ('bug', 'suggestion', 'general'));
alter table public.feedback
    add constraint feedback_rating_check check (rating is null or rating between 1 and 5);
alter table public.feedback
    add constraint feedback_status_check check (status in ('new', 'reviewed'));

create index if not exists idx_feedback_created on public.feedback(created_at desc);
create index if not exists idx_feedback_type    on public.feedback(type);

-- ── 2. Parent feedback ──────────────────────────────────────────────────────

create table if not exists public.parent_feedback (
    id uuid primary key default gen_random_uuid(),
    parent_name text not null,
    phone text,
    student_count smallint not null default 1 check (student_count between 1 and 10),
    student_names text[] not null default '{}',
    rating smallint check (rating is null or rating between 1 and 5),
    comment text not null,
    status text not null default 'new' check (status in ('new', 'reviewed')),
    reviewed_at timestamptz,
    created_at timestamptz default now()
);

create index if not exists idx_parent_feedback_created on public.parent_feedback(created_at desc);

-- ── 3. Online class likes ───────────────────────────────────────────────────

create table if not exists public.online_class_likes (
    id uuid primary key default gen_random_uuid(),
    online_class_id uuid not null references public.online_classes(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    created_at timestamptz default now(),
    unique (online_class_id, user_id)
);

create index if not exists idx_online_class_likes_class on public.online_class_likes(online_class_id);

-- ── 4. Online class comments ────────────────────────────────────────────────

create table if not exists public.online_class_comments (
    id uuid primary key default gen_random_uuid(),
    online_class_id uuid not null references public.online_classes(id) on delete cascade,
    user_id uuid not null references auth.users(id) on delete cascade,
    author_name text not null,
    author_role text not null default 'student' check (author_role in ('student', 'admin')),
    body text not null check (char_length(body) between 1 and 1000),
    created_at timestamptz default now()
);

create index if not exists idx_online_class_comments_class
    on public.online_class_comments(online_class_id, created_at);
