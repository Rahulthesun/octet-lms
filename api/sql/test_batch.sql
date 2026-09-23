-- Internal TEST batch, for testing the whole flow (registration, approval,
-- attendance, classes, tests) without touching the real Morning / Evening /
-- Night batches. It is an ordinary row in public.batches, so every screen
-- that reads batches from the database picks it up automatically.
-- Safe to run more than once.
insert into public.batches (id, name, days, start_time, end_time, delivery_type)
values ('TEST', 'Test Batch', null, '09:00', '10:00', 'ONLINE')
on conflict (id) do nothing;
