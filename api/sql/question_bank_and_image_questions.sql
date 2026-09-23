-- ─────────────────────────────────────────────────────────────────────────
-- MCQ image questions/options + the question bank.
--
-- Additive and idempotent. Existing text-only questions keep working
-- untouched: every new type column defaults to 'text' and the existing
-- question_text / option_a..d columns are reused.
--
-- Run once in the Supabase SQL editor (after tests.sql), staging first.
-- ─────────────────────────────────────────────────────────────────────────

-- ═════════════════════════════════════════════════════════════════════════
-- 1. QUESTION BANK
-- ═════════════════════════════════════════════════════════════════════════
-- Every MCQ question ever created is kept here, grouped under the title of
-- the test it came from. Rows are independent copies:
--   * deleting a test never deletes its bank rows (source_test_id is a plain
--     uuid, deliberately NOT a foreign key),
--   * content_hash is unique, so the same question is never stored twice.
create table if not exists public.question_bank (
  id uuid primary key default gen_random_uuid(),
  content_hash text not null unique,
  source_test_id uuid,                       -- the test it first came from (may no longer exist)
  source_test_title text not null,           -- title of that test, kept for grouping
  source_question_id uuid,                   -- original test_questions.id (tracking only)
  question_type text not null default 'text' check (question_type in ('text', 'image')),
  question_text text,
  question_image_key text,
  option_a_type text not null default 'text' check (option_a_type in ('text', 'image')),
  option_a text,
  option_a_image_key text,
  option_b_type text not null default 'text' check (option_b_type in ('text', 'image')),
  option_b text,
  option_b_image_key text,
  option_c_type text not null default 'text' check (option_c_type in ('text', 'image')),
  option_c text,
  option_c_image_key text,
  option_d_type text not null default 'text' check (option_d_type in ('text', 'image')),
  option_d text,
  option_d_image_key text,
  correct_option text not null check (correct_option in ('a', 'b', 'c', 'd')),
  marks numeric not null default 1,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_question_bank_source_test on public.question_bank(source_test_id);
create index if not exists idx_question_bank_title on public.question_bank(lower(source_test_title));

alter table public.question_bank enable row level security; -- server (service role) only

-- ═════════════════════════════════════════════════════════════════════════
-- 2. IMAGE SUPPORT ON test_questions
-- ═════════════════════════════════════════════════════════════════════════
alter table public.test_questions add column if not exists question_type text not null default 'text';
alter table public.test_questions add column if not exists question_image_key text;
alter table public.test_questions add column if not exists option_a_type text not null default 'text';
alter table public.test_questions add column if not exists option_a_image_key text;
alter table public.test_questions add column if not exists option_b_type text not null default 'text';
alter table public.test_questions add column if not exists option_b_image_key text;
alter table public.test_questions add column if not exists option_c_type text not null default 'text';
alter table public.test_questions add column if not exists option_c_image_key text;
alter table public.test_questions add column if not exists option_d_type text not null default 'text';
alter table public.test_questions add column if not exists option_d_image_key text;

-- Image fields have no text, so the text columns become nullable.
alter table public.test_questions alter column question_text drop not null;
alter table public.test_questions alter column option_a drop not null;
alter table public.test_questions alter column option_b drop not null;
alter table public.test_questions alter column option_c drop not null;
alter table public.test_questions alter column option_d drop not null;

-- Reference to the bank row an imported copy came from (tracking only).
-- The copy is independent: editing or deleting it never touches the bank.
alter table public.test_questions add column if not exists bank_question_id uuid references public.question_bank(id) on delete set null;

alter table public.test_questions drop constraint if exists test_questions_types_check;
alter table public.test_questions add constraint test_questions_types_check check (
  question_type in ('text', 'image') and option_a_type in ('text', 'image') and option_b_type in ('text', 'image')
  and option_c_type in ('text', 'image') and option_d_type in ('text', 'image')
);

-- ═════════════════════════════════════════════════════════════════════════
-- 3. BACK-FILL: questions from tests that already exist
-- ═════════════════════════════════════════════════════════════════════════
-- The md5 expression matches utils/mcqQuestion.js contentHash() exactly, so
-- the API never adds a second copy of a back-filled question.
insert into public.question_bank (
  content_hash, source_test_id, source_test_title, source_question_id,
  question_type, question_text, question_image_key,
  option_a_type, option_a, option_a_image_key,
  option_b_type, option_b, option_b_image_key,
  option_c_type, option_c, option_c_image_key,
  option_d_type, option_d, option_d_image_key,
  correct_option, marks, created_by, created_at
)
select
  md5(concat_ws(E'\x1f',
    tq.question_type, coalesce(tq.question_text, ''), coalesce(tq.question_image_key, ''),
    tq.option_a_type, coalesce(tq.option_a, ''), coalesce(tq.option_a_image_key, ''),
    tq.option_b_type, coalesce(tq.option_b, ''), coalesce(tq.option_b_image_key, ''),
    tq.option_c_type, coalesce(tq.option_c, ''), coalesce(tq.option_c_image_key, ''),
    tq.option_d_type, coalesce(tq.option_d, ''), coalesce(tq.option_d_image_key, ''),
    tq.correct_option
  )),
  t.id, t.title, tq.id,
  tq.question_type, tq.question_text, tq.question_image_key,
  tq.option_a_type, tq.option_a, tq.option_a_image_key,
  tq.option_b_type, tq.option_b, tq.option_b_image_key,
  tq.option_c_type, tq.option_c, tq.option_c_image_key,
  tq.option_d_type, tq.option_d, tq.option_d_image_key,
  tq.correct_option, tq.marks, t.created_by, tq.created_at
from public.test_questions tq
join public.tests t on t.id = tq.test_id
order by t.created_at, tq.order_index
on conflict (content_hash) do nothing;
