-- ─────────────────────────────────────────────────────────────────────────
-- Descriptive (non-MCQ) Q&A/Practice items: a question + a model answer,
-- no fixed options/correct-option — distinct from question_bank, which is
-- fundamentally MCQ-shaped (correct_option not null, checked 'a'|'b'|'c'|'d').
-- Lets a Class hold either MCQ questions (question_bank.subtopic_id) or
-- descriptive items (this table), or both.
--
-- Run once in the Supabase SQL editor, after qa_bank_questions.sql.
-- Additive — does not touch question_bank or any existing table.
-- ─────────────────────────────────────────────────────────────────────────

create table if not exists public.qa_descriptive_items (
  id uuid primary key default gen_random_uuid(),
  subtopic_id uuid not null references public.subtopics(id) on delete cascade,

  question_type text not null default 'text' check (question_type in ('text','image')),
  question_text text,
  question_image_key text,
  question_image_content_hash text,
  question_image_perceptual_hash text,

  answer_type text not null default 'text' check (answer_type in ('text','image')),
  answer_text text,
  answer_image_key text,
  answer_image_content_hash text,
  answer_image_perceptual_hash text,

  marks numeric not null default 1,

  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_by uuid references auth.users(id),
  updated_at timestamptz
);

create index if not exists idx_qa_descriptive_items_subtopic on public.qa_descriptive_items(subtopic_id);

alter table public.qa_descriptive_items enable row level security; -- server (service role) only
