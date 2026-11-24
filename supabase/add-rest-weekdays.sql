-- Pharmacy weekly rest days (0=Sun … 6=Sat). Default: Friday.
-- Run in Supabase SQL Editor

alter table public.pharmacies
  add column if not exists rest_weekdays jsonb not null default '[5]'::jsonb;

update public.pharmacies
set rest_weekdays = '[5]'::jsonb
where rest_weekdays is null;

notify pgrst, 'reload schema';
