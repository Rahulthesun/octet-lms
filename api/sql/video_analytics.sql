-- ─────────────────────────────────────────────────────────────────────────
-- Video session analytics: session-wise watch stats, drop-off analysis,
-- and a YouTube-style "most replayed" engagement heatmap. Purely additive —
-- two new tables. The existing video_watch_sessions table (resume position
-- + cumulative watched_secs + completed flag) is untouched and keeps
-- working exactly as it does today.
--
-- Run once in the Supabase SQL editor.
-- ─────────────────────────────────────────────────────────────────────────

-- One row per discrete "sitting" of watching a video — created when
-- playback starts, closed when it stops (pause, tab hidden a while,
-- navigating away, or the tab closing). Session-wise reports (session
-- count, avg session duration) are computed from this table; the older
-- video_watch_sessions table only ever tracked a single cumulative summary
-- per (video, student), never individual sittings.
create table if not exists public.video_watch_events (
  id uuid primary key default gen_random_uuid(),
  video_id uuid not null references public.videos(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  watched_secs numeric not null default 0,
  start_position_secs numeric not null default 0,
  last_position_secs numeric not null default 0,
  max_position_secs numeric not null default 0,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_watch_events_video on public.video_watch_events(video_id);
create index if not exists idx_watch_events_user on public.video_watch_events(user_id);
create index if not exists idx_watch_events_video_user on public.video_watch_events(video_id, user_id);
create index if not exists idx_watch_events_open on public.video_watch_events(video_id, user_id, ended_at);

-- Percentage-bucketed play-through counts — 20 fixed buckets (5% of the
-- video's duration each) regardless of the video's actual length, so
-- drop-off curves and heatmaps are directly comparable across videos.
-- hit_count increments every time that segment is played through in a
-- session, including replays — the same idea as YouTube's "most replayed"
-- graph, where rewatched sections read hotter than sections watched once.
create table if not exists public.video_watch_bucket_hits (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.video_watch_events(id) on delete cascade,
  video_id uuid not null references public.videos(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  bucket_index integer not null check (bucket_index >= 0 and bucket_index < 20),
  hit_count integer not null default 1,
  updated_at timestamptz not null default now(),
  unique (event_id, bucket_index)
);

create index if not exists idx_bucket_hits_video on public.video_watch_bucket_hits(video_id, bucket_index);
create index if not exists idx_bucket_hits_user on public.video_watch_bucket_hits(user_id);
