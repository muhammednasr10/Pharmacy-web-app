-- Apply new payroll defaults to existing pharmacies
-- Run if you still see pay day = 1 or sick deduction = 0%

update public.pharmacies
set
  payroll_pay_day = 30,
  payroll_sick_deduction_percent = 25,
  payroll_absent_deduction_percent = coalesce(payroll_absent_deduction_percent, 100)
where payroll_pay_day = 1
  and coalesce(payroll_sick_deduction_percent, 0) = 0;

update public.pharmacies
set payroll_pay_day = 30
where payroll_pay_day is null or payroll_pay_day < 1 or payroll_pay_day > 31;

update public.pharmacies
set payroll_sick_deduction_percent = 25
where payroll_sick_deduction_percent is null;

alter table public.pharmacies alter column payroll_pay_day set default 30;
alter table public.pharmacies alter column payroll_sick_deduction_percent set default 25;

notify pgrst, 'reload schema';
