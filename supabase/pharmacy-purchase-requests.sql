-- POS / inventory purchase requests (طلبات الشراء)
-- Cashiers flag medicines customers ask for when stock is zero or low.

create table if not exists public.pharmacy_purchase_requests (
  id bigint primary key,
  pharmacy_id text not null,
  medicine_id bigint,
  barcode text,
  name_ar text not null default '',
  name_en text not null default '',
  current_qty numeric(14, 3) not null default 0,
  requested_qty numeric(14, 3) not null default 1,
  request_count integer not null default 1,
  buy_price numeric(14, 2) not null default 0,
  sell_price numeric(14, 2) not null default 0,
  expiry text,
  note text,
  status text not null default 'open',
  created_by text,
  created_by_name text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint pharmacy_purchase_requests_status_check
    check (status in ('open', 'ordered', 'done', 'cancelled'))
);

create index if not exists pharmacy_purchase_requests_pharmacy_status_idx
  on public.pharmacy_purchase_requests (pharmacy_id, status, updated_at desc);

create index if not exists pharmacy_purchase_requests_pharmacy_medicine_idx
  on public.pharmacy_purchase_requests (pharmacy_id, medicine_id);

alter table public.pharmacy_purchase_requests enable row level security;

drop policy if exists "pharmacy_purchase_requests_select" on public.pharmacy_purchase_requests;
create policy "pharmacy_purchase_requests_select" on public.pharmacy_purchase_requests
  for select to authenticated
  using (public.is_active_user() and public.can_read_pharmacy_row(pharmacy_id));

drop policy if exists "pharmacy_purchase_requests_insert" on public.pharmacy_purchase_requests;
create policy "pharmacy_purchase_requests_insert" on public.pharmacy_purchase_requests
  for insert to authenticated
  with check (public.is_active_user() and public.can_access_pharmacy_row(pharmacy_id));

drop policy if exists "pharmacy_purchase_requests_update" on public.pharmacy_purchase_requests;
create policy "pharmacy_purchase_requests_update" on public.pharmacy_purchase_requests
  for update to authenticated
  using (public.is_active_user() and public.can_access_pharmacy_row(pharmacy_id))
  with check (public.is_active_user() and public.can_access_pharmacy_row(pharmacy_id));

drop policy if exists "pharmacy_purchase_requests_delete" on public.pharmacy_purchase_requests;
create policy "pharmacy_purchase_requests_delete" on public.pharmacy_purchase_requests
  for delete to authenticated
  using (public.is_active_user() and public.can_access_pharmacy_row(pharmacy_id));
