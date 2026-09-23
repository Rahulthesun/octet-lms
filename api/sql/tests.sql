-- ─────────────────────────────────────────────────────────────────────────
-- Full online test/exam system: MCQ (auto-graded, shuffled per student,
-- timed, full-screen) and Descriptive (typed or uploaded answer, manually
-- graded). Purely additive — five new tables, nothing existing touched.
--
-- Run once in the Supabase SQL editor.
-- ─────────────────────────────────────────────────────────────────────────

-- One row per test, either type. MCQ marks come from summing
-- test_questions.marks; descriptive marks are set directly on max_marks
-- since there's no per-question breakdown for an uploaded/typed paper.
create table if not exists public.tests (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  type text not null check (type in ('mcq', 'descriptive')),
  subject_id uuid references public.subjects(id) on delete set null,
  batch_id text references public.batches(id) on delete set null,
  status text not null default 'scheduled' check (status in ('scheduled', 'completed', 'cancelled')),
  scheduled_start timestamptz not null,
  scheduled_end timestamptz not null,
  max_marks numeric not null default 0,
  instructions text,
  -- Descriptive-only:
  question_text text,
  question_file_key text,
  question_file_name text,
  answer_key_file_key text,
  answer_key_file_name text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (scheduled_end > scheduled_start)
);

create index if not exists idx_tests_batch on public.tests(batch_id);
create index if not exists idx_tests_status on public.tests(status);

-- MCQ questions belonging to a test.
create table if not exists public.test_questions (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references public.tests(id) on delete cascade,
  order_index integer not null default 0,
  question_text text not null,
  option_a text not null,
  option_b text not null,
  option_c text not null,
  option_d text not null,
  correct_option text not null check (correct_option in ('a', 'b', 'c', 'd')),
  marks numeric not null default 1,
  created_at timestamptz not null default now()
);

create index if not exists idx_test_questions_test on public.test_questions(test_id, order_index);

-- One row per student attempting a test. question_order holds the
-- shuffled sequence of test_questions.id generated the moment that
-- student starts (MCQ only) — same shuffle re-served on every reload of
-- that attempt, but different from every other student's.
create table if not exists public.test_attempts (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references public.tests(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  status text not null default 'not_started' check (status in ('not_started', 'in_progress', 'submitted', 'evaluated')),
  question_order jsonb,
  started_at timestamptz,
  submitted_at timestamptz,
  auto_submitted boolean not null default false,
  -- Descriptive answer:
  answer_text text,
  answer_file_key text,
  answer_file_name text,
  -- Grading — filled in immediately by auto-grading for MCQ, or by an
  -- admin for descriptive:
  marks_awarded numeric,
  max_marks numeric,
  evaluated_by uuid references auth.users(id),
  evaluated_at timestamptz,
  evaluator_feedback text,
  created_at timestamptz not null default now(),
  unique (test_id, student_id)
);

create index if not exists idx_test_attempts_test on public.test_attempts(test_id);
create index if not exists idx_test_attempts_student on public.test_attempts(student_id);

-- Per-question MCQ answers — lets an admin see exactly what a student
-- picked for every question, not just the total score.
create table if not exists public.test_answers (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.test_attempts(id) on delete cascade,
  question_id uuid not null references public.test_questions(id) on delete cascade,
  selected_option text check (selected_option in ('a', 'b', 'c', 'd')),
  is_correct boolean,
  marks_awarded numeric not null default 0,
  answered_at timestamptz not null default now(),
  unique (attempt_id, question_id)
);

create index if not exists idx_test_answers_attempt on public.test_answers(attempt_id);

-- Idempotency log for the result-report email (student + father + mother),
-- sent immediately once an attempt becomes 'evaluated'.
create table if not exists public.test_result_report_log (
  id uuid primary key default gen_random_uuid(),
  attempt_id uuid not null references public.test_attempts(id) on delete cascade,
  sent_at timestamptz not null default now(),
  recipients jsonb not null default '[]'::jsonb,
  status text not null default 'sent' check (status in ('sent', 'failed', 'partial', 'skipped_no_recipients')),
  error text,
  unique (attempt_id)
);
