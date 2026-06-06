-- Replace leave deduction % with max allowed leave days per payroll period
-- Run in Supabase SQL Editor

alter table public.pharmacies add column if not exists payroll_max_leave_days integer not null default 2;

update public.pharmacies
set payroll_max_leave_days = 2
where payroll_max_leave_days is null;

notify pgrst, 'reload schema';
