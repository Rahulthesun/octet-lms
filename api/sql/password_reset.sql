-- ─────────────────────────────────────────────────────────────────────────
-- Forgot-password tokens. One row per reset request; a token is single-use
-- and time-limited. Works for any account (student or staff) since both
-- live in auth.users — this table never duplicates student data.
--
-- Only the HASH of the token is stored (sha256), never the raw token — the
-- raw token only ever exists in the emailed link and the user's browser,
-- the same way a password itself is never stored in plain text.
--
-- Run once in the Supabase SQL editor. Safe to run more than once.
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.password_reset_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  token_hash text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  used_at timestamptz
);

create index if not exists idx_password_reset_user on public.password_reset_tokens(user_id);
create index if not exists idx_password_reset_token_hash on public.password_reset_tokens(token_hash);
-- Lets the request endpoint cheaply check "did this email just request one" without a user_id lookup first.
create index if not exists idx_password_reset_email_created on public.password_reset_tokens(email, created_at desc);

alter table public.password_reset_tokens enable row level security; -- server (service role) only

-- Housekeeping: nothing ever reads an expired/used token again, so there is
-- no harm in letting old rows accumulate, but this is here if you ever want
-- to prune them on a schedule:
--   delete from public.password_reset_tokens where expires_at < now() - interval '7 days';
