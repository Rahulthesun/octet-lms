-- ─────────────────────────────────────────────────────────────────────────
-- Creates the `subtopics` table. This table was referenced by
-- api/services/subtopic.service.js (and, by extension, by the new
-- qa_bank_questions.sql / qa_bank_resources.sql migrations) but its own
-- CREATE TABLE migration was never written/run — a pre-existing gap, not
-- something introduced by the Q&A/Practice Questions feature.
--
-- Schema matches subtopic.service.js's documented shape exactly:
--  subtopics {
--    id          : uuid (auto-generated)
--    chapter_id  : uuid (FK -> chapters, on delete cascade)
--    name        : text (required)
--    description : text
--    order_index : integer (default 0)
--    is_visible  : boolean (default true)
--    created_at  : timestamptz
--    updated_at  : timestamptz
--  }
--
-- RUN ORDER: this must run FIRST, before qa_bank_questions.sql and
-- qa_bank_resources.sql (both reference subtopics(id) via foreign key).
-- Full order: subtopics.sql -> content_category.sql -> qa_bank_questions.sql
-- -> qa_bank_resources.sql.
--
-- Run once in the Supabase SQL editor. Idempotent / additive only.
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.subtopics (
  id          uuid primary key default gen_random_uuid(),
  chapter_id  uuid not null references public.chapters(id) on delete cascade,
  name        text not null,
  description text,
  order_index integer not null default 0,
  is_visible  boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_subtopics_chapter on public.subtopics(chapter_id);

alter table public.subtopics enable row level security; -- server (service role) only
