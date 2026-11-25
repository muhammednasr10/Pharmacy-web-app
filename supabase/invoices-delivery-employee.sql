-- Delivery employee assignment on invoices (POS delivery sales)

alter table public.invoices
  add column if not exists delivery_employee_id text;

alter table public.invoices
  add column if not exists delivery_employee_name text default '';
