-- Employee personal fields: address, military status, birth date/place
-- Run in Supabase SQL Editor (or via SQL Migrations panel)

alter table public.employees add column if not exists address text;
alter table public.employees add column if not exists military_status text;
alter table public.employees add column if not exists birth_date date;
alter table public.employees add column if not exists birth_place text;

notify pgrst, 'reload schema';
