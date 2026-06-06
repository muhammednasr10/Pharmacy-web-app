-- Overtime settings: daily standard hours + overtime pay percentage
-- Run in Supabase SQL Editor

alter table public.pharmacies add column if not exists payroll_standard_work_hours numeric(5,2) not null default 8;
alter table public.pharmacies add column if not exists payroll_overtime_percent numeric(6,2) not null default 150;

update public.pharmacies
set payroll_standard_work_hours = 8
where payroll_standard_work_hours is null;

update public.pharmacies
set payroll_overtime_percent = 150
where payroll_overtime_percent is null;

notify pgrst, 'reload schema';
