-- Pharmacy wallets / cash accounts (المحافظ المالية)
-- Cash drawer, bank accounts, e-wallets with balances

create table if not exists public.pharmacy_wallets (
  id bigint primary key,
  pharmacy_id text not null,
  name text not null,
  wallet_type text not null default 'cash',
  balance numeric(14, 2) not null default 0,
  notes text,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now()),
  constraint pharmacy_wallets_type_check
    check (wallet_type in ('cash', 'bank', 'ewallet'))
);

create index if not exists pharmacy_wallets_pharmacy_id_idx
  on public.pharmacy_wallets (pharmacy_id);

create index if not exists pharmacy_wallets_pharmacy_active_idx
  on public.pharmacy_wallets (pharmacy_id, is_active);

alter table public.pharmacy_wallets enable row level security;

drop policy if exists "pharmacy_wallets_select" on public.pharmacy_wallets;
create policy "pharmacy_wallets_select" on public.pharmacy_wallets
  for select to authenticated
  using (public.is_active_user() and public.can_read_pharmacy_row(pharmacy_id));

drop policy if exists "pharmacy_wallets_insert" on public.pharmacy_wallets;
create policy "pharmacy_wallets_insert" on public.pharmacy_wallets
  for insert to authenticated
  with check (public.is_active_user() and public.can_access_pharmacy_row(pharmacy_id));

drop policy if exists "pharmacy_wallets_update" on public.pharmacy_wallets;
create policy "pharmacy_wallets_update" on public.pharmacy_wallets
  for update to authenticated
  using (public.is_active_user() and public.can_access_pharmacy_row(pharmacy_id))
  with check (public.is_active_user() and public.can_access_pharmacy_row(pharmacy_id));

drop policy if exists "pharmacy_wallets_delete" on public.pharmacy_wallets;
create policy "pharmacy_wallets_delete" on public.pharmacy_wallets
  for delete to authenticated
  using (
    public.is_active_user()
    and public.can_access_pharmacy_row(pharmacy_id)
    and (public.is_super_admin() or public.is_pharmacy_admin())
  );
