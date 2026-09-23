-- ─────────────────────────────────────────────────────────────────────────
-- Centralized notification engine: one row per recipient per notification
-- (in-app inbox), plus a delivery-tracking log for the email side of it
-- (admin-only dashboard: queued/sent/delivered/read/failed). Purely
-- additive — two new tables, nothing existing touched.
--
-- Run once in the Supabase SQL editor.
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in (
    'announcement', 'assignment_due', 'video_uploaded', 'test_result', 'test_scheduled', 'test_reminder'
  )),
  title text not null,
  body text not null,
  link text,
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user on public.notifications(user_id, created_at desc);
create index if not exists idx_notifications_unread on public.notifications(user_id) where read_at is null;

-- Delivery tracking for the email side of a notification. "sent" is
-- confirmed the moment Brevo's SMTP relay accepts the message; "read" is
-- confirmed by a tracking pixel embedded in the email (best-effort — some
-- mail clients block remote images); "delivered" is populated only if a
-- Brevo webhook is later configured to call back into this app (see
-- notifications.routes.js) — until then it mirrors "sent". This is an
-- honest reflection of what plain SMTP can and cannot confirm on its own.
create table if not exists public.notification_email_log (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid references public.notifications(id) on delete cascade,
  recipient_email text not null,
  subject text not null,
  status text not null default 'queued' check (status in ('queued', 'sent', 'delivered', 'read', 'failed')),
  error text,
  provider_message_id text,
  sent_at timestamptz,
  delivered_at timestamptz,
  read_at timestamptz,
  failed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_email_log_notification on public.notification_email_log(notification_id);
create index if not exists idx_email_log_status on public.notification_email_log(status);
create index if not exists idx_email_log_created on public.notification_email_log(created_at desc);
