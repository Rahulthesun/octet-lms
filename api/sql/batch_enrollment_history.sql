-- ============================================================================
-- Batch enrollment HISTORY — keeps a student's past batch memberships so a
-- batch change does not rewrite their attendance / test history.
-- Run once in the Supabase SQL editor.
--
-- `batch_enrollments` stays the CURRENT roster (unchanged). When a student
-- moves batch, the old membership is copied here with the date it ended:
--   - their old batch's sessions/tests count for them before `ended_on`,
--   - their current batch's sessions/tests count from that date on.
-- A student with no rows here is treated exactly as before.
-- (services/batchMembership.service.js reads this table.)
-- ============================================================================

create table if not exists public.batch_enrollment_history (
  id          uuid primary key default gen_random_uuid(),
  student_id  uuid not null references public.students(id) on delete cascade on update cascade,
  batch_id    text not null references public.batches(id) on delete cascade,
  started_on  date,               -- null = from the beginning
  ended_on    date not null,      -- exclusive: membership ended at the start of this day
  created_at  timestamptz not null default now()
);

create index if not exists idx_batch_enrollment_history_student
  on public.batch_enrollment_history(student_id);

alter table public.batch_enrollment_history enable row level security;

-- ── Backfill: batch changes made on 2026-11-11 (permanent batches) ─────────
insert into public.batch_enrollment_history (student_id, batch_id, started_on, ended_on)
select v.student_id::uuid, v.batch_id, null, date '2026-11-11'
from (values
  ('db1445bb-ccf0-4af9-bfa8-19d28bec6da0', 'EVENING'), -- Pavithra G       → NIGHT
  ('28239784-c425-48a0-8c08-c001b5071113', 'EVENING'), -- Nithyashri S     → NIGHT
  ('7ca0f24f-3526-451c-9282-96435eb0f00b', 'EVENING'), -- Akshita B        → NIGHT
  ('50780fc3-110a-4637-a324-cc19525e691b', 'MORNING'), -- Keerthana S      → NIGHT
  ('e9025de6-aa16-4296-a294-de90e7a62567', 'NIGHT'),   -- Ajeesh           → MORNING
  ('4dc1757a-db79-4d9b-ac1b-5e32191bc604', 'EVENING'), -- Anith Rahul T    → NIGHT
  ('06b32fe7-e881-4bc8-9805-365857e6ccd8', 'EVENING'), -- Aswin G          → NIGHT
  ('685ca4ca-ac2a-4104-b37c-bbe50e8fc494', 'EVENING'), -- Prathik Vijay S  → NIGHT
  ('b19a14e7-7ca5-4568-9a89-bf74da96072d', 'EVENING'), -- Koushik S S      → NIGHT
  ('9592b9ed-3740-4250-b9ed-9fe3497b8a78', 'EVENING')  -- Tharun T S       → NIGHT
) as v(student_id, batch_id)
where not exists (
  select 1 from public.batch_enrollment_history h
  where h.student_id = v.student_id::uuid and h.batch_id = v.batch_id and h.ended_on = date '2026-11-11'
);
