-- Default work day times + breaks on pharmacies; per-employee overrides
-- Run in Supabase SQL Editor

alter table public.pharmacies add column if not exists payroll_work_day_start text not null default '08:00';
alter table public.pharmacies add column if not exists payroll_work_day_end text not null default '17:00';
alter table public.pharmacies add column if not exists payroll_work_breaks jsonb not null default '[]'::jsonb;

alter table public.employees add column if not exists use_custom_work_schedule boolean not null default false;
alter table public.employees add column if not exists work_day_start text;
alter table public.employees add column if not exists work_day_end text;
alter table public.employees add column if not exists work_breaks jsonb;

update public.pharmacies
set payroll_work_day_start = '08:00'
where payroll_work_day_start is null or payroll_work_day_start = '';

update public.pharmacies
set payroll_work_day_end = '17:00'
where payroll_work_day_end is null or payroll_work_day_end = '';

update public.pharmacies
set payroll_work_breaks = '[]'::jsonb
where payroll_work_breaks is null;

notify pgrst, 'reload schema';
