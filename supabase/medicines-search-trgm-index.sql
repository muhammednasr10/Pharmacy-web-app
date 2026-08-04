-- Faster inventory search on large catalogs (mobile-friendly)
create extension if not exists pg_trgm with schema extensions;

create index if not exists idx_medicines_name_ar_trgm
  on public.medicines using gin (name_ar extensions.gin_trgm_ops);

create index if not exists idx_medicines_name_en_trgm
  on public.medicines using gin (name_en extensions.gin_trgm_ops);

create index if not exists idx_medicines_barcode_trgm
  on public.medicines using gin (barcode extensions.gin_trgm_ops);

create index if not exists idx_medicines_active_ingredient_trgm
  on public.medicines using gin (active_ingredient extensions.gin_trgm_ops);

create index if not exists idx_medicines_pharmacy_id
  on public.medicines (pharmacy_id);

notify pgrst, 'reload schema';
