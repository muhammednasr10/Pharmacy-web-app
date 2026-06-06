-- Add employee_code column to employees table
-- Run in Supabase SQL Editor

alter table public.employees add column if not exists employee_code text;

create unique index if not exists employees_pharmacy_code_unique
  on public.employees (pharmacy_id, lower(employee_code))
  where employee_code is not null and employee_code <> '';

-- Backfill existing rows without code (per pharmacy)
do $$
declare
  p record;
  r record;
  n int;
begin
  for p in select distinct pharmacy_id from public.employees loop
    n := 0;
    for r in
      select id
      from public.employees
      where pharmacy_id = p.pharmacy_id
        and (employee_code is null or trim(employee_code) = '')
      order by created_at, id
    loop
      n := n + 1;
      update public.employees
      set employee_code = 'EMP-' || lpad(n::text, 3, '0')
      where id = r.id;
    end loop;
  end loop;
end $$;

notify pgrst, 'reload schema';
