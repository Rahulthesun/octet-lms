-- ─────────────────────────────────────────────────────────────────────────
-- Adds a 'draft' status to tests, so the "Schedule Test" admin form can
-- silently autosave an in-progress test (title/batch/schedule/questions
-- entered so far) without the strict validation a real scheduled test
-- requires. Run once in the Supabase SQL editor, after sql/tests.sql.
--
-- Deliberately the SMALLEST schema change that unblocks this:
--   - tests.status check constraint: add 'draft' as an allowed value.
--   - tests.scheduled_start / scheduled_end: drop NOT NULL, so a draft can
--     be created before the admin has picked a date/time. The existing
--     `check (scheduled_end > scheduled_start)` constraint is left as-is —
--     in Postgres a CHECK is satisfied whenever the expression evaluates to
--     NULL (not just TRUE), so two NULL columns, or one NULL and one set,
--     never trip it. Once both are set (on final "Schedule test"), the
--     comparison is enforced exactly as before.
--
-- test_questions is intentionally NOT touched: its NOT NULL columns stay
-- exactly as strict as they are today. Rather than relax them, the autosave
-- path (tests.service.js) only ever persists a question to test_questions
-- once ALL of its required fields are filled in — a half-typed question
-- simply doesn't autosave yet, it just isn't lost from the FORM either
-- (the draft test row still remembers it was started). This was chosen over
-- relaxing test_questions' NOT NULL constraints because it requires zero
-- schema risk to a table that test-taking/grading code elsewhere assumes is
-- always fully populated.
-- ─────────────────────────────────────────────────────────────────────────

alter table public.tests drop constraint if exists tests_status_check;
alter table public.tests add constraint tests_status_check
  check (status in ('draft', 'scheduled', 'completed', 'cancelled'));

alter table public.tests alter column scheduled_start drop not null;
alter table public.tests alter column scheduled_end drop not null;
