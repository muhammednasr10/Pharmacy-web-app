-- Extended payroll columns for full salary calculator
-- Run in Supabase SQL Editor

alter table public.payroll_records add column if not exists sick_days integer not null default 0;
alter table public.payroll_records add column if not exists leave_days integer not null default 0;
alter table public.payroll_records add column if not exists work_minutes integer not null default 0;
alter table public.payroll_records add column if not exists special_allowances numeric(12,2) not null default 0;
alter table public.payroll_records add column if not exists incentives numeric(12,2) not null default 0;
alter table public.payroll_records add column if not exists commission numeric(12,2) not null default 0;
alter table public.payroll_records add column if not exists taxes numeric(12,2) not null default 0;
alter table public.payroll_records add column if not exists insurance numeric(12,2) not null default 0;

notify pgrst, 'reload schema';
