-- Default taxes and insurance percentages on pharmacy payroll settings
-- Run in Supabase SQL Editor
-- Values are percentages (0–100), not fixed amounts

alter table public.pharmacies add column if not exists payroll_default_taxes numeric(12,2) not null default 0;
alter table public.pharmacies add column if not exists payroll_default_insurance numeric(12,2) not null default 0;

update public.pharmacies
set payroll_default_taxes = 0
where payroll_default_taxes is null;

update public.pharmacies
set payroll_default_insurance = 0
where payroll_default_insurance is null;

notify pgrst, 'reload schema';
