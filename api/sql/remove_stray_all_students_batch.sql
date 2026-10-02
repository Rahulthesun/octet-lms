-- ─────────────────────────────────────────────────────────────────────────
-- Removes the stray "All Students Batch" row from public.batches, and the
-- batch_enrollments rows pointing at it.
--
-- "All Students" is a built-in, virtual option (audience = 'ALL' — see
-- audience.service.js) resolved live to every active student. This row
-- pre-dates that feature: it was a real batch every student was manually
-- enrolled into by hand as a stand-in for "everyone", so it now shows up as
-- a confusing duplicate next to the real "All Students" option in every
-- batch picker.
--
-- Investigated before writing this: every student enrolled in this batch is
-- ALSO enrolled in a real batch (Morning/Evening/Night/Test) — this row adds
-- no information nothing else already has. Step 2 re-verifies that same
-- condition at delete time, so if that ever stops being true (a student was
-- added to this batch only, nowhere else) the deletion is refused rather
-- than silently un-enrolling them from everything.
--
-- Run in the Supabase SQL editor. Safe to run more than once.
-- ─────────────────────────────────────────────────────────────────────────

-- 1. See what's there before deleting anything.
select id, name from public.batches where name ilike '%all student%';

select count(*) as enrolled_students
from public.batch_enrollments
where batch_id in (select id from public.batches where name ilike '%all student%');

-- 2. Any student whose ONLY enrollment is this batch — must be zero rows
--    for the delete below to be safe. If this returns rows, move those
--    students into a real batch first, then re-run.
select s.id, s.name, s.email
from public.students s
where s.id in (
  select student_id from public.batch_enrollments
  where batch_id in (select id from public.batches where name ilike '%all student%')
)
and s.id not in (
  select student_id from public.batch_enrollments
  where batch_id not in (select id from public.batches where name ilike '%all student%')
);

-- 3. Remove the enrollments, then the batch itself — only if step 2 above
--    returned zero rows.
delete from public.batch_enrollments
where batch_id in (select id from public.batches where name ilike '%all student%')
  and not exists (
    select 1 from public.students s
    where s.id = batch_enrollments.student_id
    and s.id not in (
      select student_id from public.batch_enrollments b2
      where b2.batch_id not in (select id from public.batches where name ilike '%all student%')
    )
  );

delete from public.batches
where name ilike '%all student%'
  and not exists (select 1 from public.batch_enrollments e where e.batch_id = batches.id)
  and not exists (select 1 from public.students s where s.preferred_batch = batches.id);

-- 4. Confirm — should return zero rows.
select id, name from public.batches where name ilike '%all student%';
