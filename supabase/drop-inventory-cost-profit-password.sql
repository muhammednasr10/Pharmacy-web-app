-- Remove unused inventory cost/profit password RPCs and column (feature replaced by role-based access).

drop function if exists public.verify_pharmacy_inventory_cost_password(text, text);
drop function if exists public.set_pharmacy_inventory_cost_password(text, text);
drop function if exists public.pharmacy_has_inventory_cost_password(text);

alter table public.pharmacies
  drop column if exists inventory_cost_profit_password_hash;

notify pgrst, 'reload schema';
