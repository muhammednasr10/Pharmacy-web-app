-- Per-pharmacy optional page add-ons (staff / customers / investment).
-- null = inherit tier pages; true/false = explicit include/exclude for addon pages.

alter table public.pharmacies
  add column if not exists staff_addon boolean;

alter table public.pharmacies
  add column if not exists customers_addon boolean;

alter table public.pharmacies
  add column if not exists investment_addon boolean;

comment on column public.pharmacies.staff_addon is
  'Optional staff + My Profile pages. null = follow subscription tier pages.';

comment on column public.pharmacies.customers_addon is
  'Optional customers page. null = follow subscription tier pages.';

comment on column public.pharmacies.investment_addon is
  'Optional investment page. null = follow subscription tier pages.';
