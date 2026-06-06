-- Add required daily work hours per employee
-- Run in Supabase SQL Editor

alter table public.employees
  add column if not exists required_work_hours numeric(4,2) not null default 8;

update public.employees
set required_work_hours = 8
where required_work_hours is null or required_work_hours <= 0;

notify pgrst, 'reload schema';
