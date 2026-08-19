-- ─────────────────────────────────────────────────────────────────────────────
-- Google Meet / Calendar integration schema.
-- Run once in the Supabase SQL editor (Project → SQL Editor → New query).
-- Consistent with the rest of this project: no migration tool is configured,
-- schema changes are applied by hand the same way the attendance tables were.
-- ─────────────────────────────────────────────────────────────────────────────

-- One connected Google account per admin. Today only admins schedule classes,
-- so there's exactly one "organizer" row in practice, but the table is keyed
-- per-admin from day one so multiple faculty connecting their own accounts
-- later needs zero schema changes.
create table if not exists public.google_admin_tokens (
    id uuid primary key default gen_random_uuid(),
    admin_user_id uuid not null unique references auth.users(id) on delete cascade,
    google_email text,
    access_token text,      -- encrypted (AES-256-GCM) by the backend before insert
    refresh_token text,     -- encrypted (AES-256-GCM) by the backend before insert
    token_expiry timestamptz,
    scope text,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- The scheduled online classes themselves.
create table if not exists public.online_classes (
    id uuid primary key default gen_random_uuid(),
    batch_id text not null references public.batches(id),       -- "Student Group" — reuses the existing batches table
    subject_id uuid references public.subjects(id),              -- "Course/Subject" — reuses the existing subjects table
    title text not null,                                         -- "Topic"
    description text,
    scheduled_start timestamptz not null,
    scheduled_end timestamptz not null,
    timezone text not null default 'Asia/Kolkata',
    google_event_id text,
    google_meet_url text,
    status text not null default 'pending'
        check (status in ('pending', 'scheduled', 'rescheduled', 'cancelled')),
    created_by uuid references auth.users(id),                   -- the admin who scheduled it
    idempotency_key text unique,                                 -- prevents duplicate Meets on a double-submit
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

create index if not exists idx_online_classes_batch  on public.online_classes(batch_id);
create index if not exists idx_online_classes_status on public.online_classes(status);
create index if not exists idx_online_classes_start  on public.online_classes(scheduled_start);

-- Optional individual students added to a class beyond their batch roster
-- ("optional individual student selection" in the scheduling form).
create table if not exists public.online_class_attendees (
    id uuid primary key default gen_random_uuid(),
    online_class_id uuid not null references public.online_classes(id) on delete cascade,
    student_id uuid not null references public.students(id) on delete cascade,
    unique (online_class_id, student_id)
);

-- Auto-update `updated_at`, matching the pattern already used elsewhere
-- (see api/db_docs.md §2.6) — reuses the same trigger function if it
-- already exists from that earlier setup; safe to run again either way.
create or replace function public.update_updated_at()
returns trigger language plpgsql as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists update_online_classes_updated_at on public.online_classes;
create trigger update_online_classes_updated_at
    before update on public.online_classes
    for each row execute function public.update_updated_at();

drop trigger if exists update_google_admin_tokens_updated_at on public.google_admin_tokens;
create trigger update_google_admin_tokens_updated_at
    before update on public.google_admin_tokens
    for each row execute function public.update_updated_at();
