-- Payroll settings on pharmacies + sick days on payroll records
-- Run in Supabase SQL Editor

alter table public.pharmacies add column if not exists payroll_pay_day integer not null default 30;
alter table public.pharmacies add column if not exists payroll_sick_deduction_percent numeric(5,2) not null default 25;
alter table public.pharmacies add column if not exists payroll_absent_deduction_percent numeric(5,2) not null default 100;
alter table public.pharmacies add column if not exists payroll_leave_deduction_percent numeric(5,2) not null default 0;

alter table public.payroll_records add column if not exists sick_days integer not null default 0;

update public.pharmacies
set payroll_pay_day = 30
where payroll_pay_day is null or payroll_pay_day < 1 or payroll_pay_day > 31;

update public.pharmacies
set payroll_sick_deduction_percent = 25
where payroll_sick_deduction_percent is null;

-- Migrate pharmacies still on the old defaults (day 1 + 0% sick)
update public.pharmacies
set
  payroll_pay_day = 30,
  payroll_sick_deduction_percent = 25
where payroll_pay_day = 1
  and coalesce(payroll_sick_deduction_percent, 0) = 0;

alter table public.pharmacies alter column payroll_pay_day set default 30;
alter table public.pharmacies alter column payroll_sick_deduction_percent set default 25;

notify pgrst, 'reload schema';
