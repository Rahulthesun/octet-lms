-- ─────────────────────────────────────────────────────────────────────────
-- Attached PDF/Word resources per Class (subtopic) for the Q&A / Practice
-- Questions feature. Mirrors the column conventions of the existing
-- `pdfs` table (api/services/pdf.service.js) for consistency: a resource
-- is metadata here + the actual file bytes in Cloudflare R2 (r2_key only,
-- signed URLs generated on read — never stored).
--
-- RUN ORDER: 3rd of the three new migrations
-- (content_category.sql → qa_bank_questions.sql → qa_bank_resources.sql).
--
-- Run once in the Supabase SQL editor. Idempotent / additive only.
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.qa_bank_resources (
  id uuid primary key default gen_random_uuid(),
  subtopic_id uuid not null references public.subtopics(id) on delete cascade,
  title text not null,
  filename text,
  r2_key text not null,
  mime_type text,
  size_bytes bigint,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_qa_bank_resources_subtopic on public.qa_bank_resources(subtopic_id);

alter table public.qa_bank_resources enable row level security; -- server (service role) only
