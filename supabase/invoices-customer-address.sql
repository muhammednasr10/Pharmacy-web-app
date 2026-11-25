-- Add customer address on invoices + held invoices (POS customer panel)

alter table public.invoices
  add column if not exists customer_address text default '';

alter table public.held_invoices
  add column if not exists customer_address text default '';
