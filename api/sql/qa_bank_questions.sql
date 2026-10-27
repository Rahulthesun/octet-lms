-- ─────────────────────────────────────────────────────────────────────────
-- Ties question_bank rows to a Class (subtopic) for the new Q&A / Practice
-- Questions feature.
--
-- A question_bank row with a non-null subtopic_id belongs to that Class
-- (added via manual question-wise entry or copied in from the Question
-- Bank). Existing rows (test-sourced, or manually added elsewhere in the
-- plain Question Bank page) keep subtopic_id = null and are completely
-- unaffected — this column is purely additive.
--
-- RUN ORDER: 2nd of the three new migrations
-- (content_category.sql → qa_bank_questions.sql → qa_bank_resources.sql).
--
-- Run once in the Supabase SQL editor. Idempotent / additive only.
-- ─────────────────────────────────────────────────────────────────────────

alter table public.question_bank
  add column if not exists subtopic_id uuid references public.subtopics(id) on delete cascade;

create index if not exists idx_question_bank_subtopic on public.question_bank(subtopic_id);
