-- Default POS wallet flag per pharmacy

alter table public.pharmacy_wallets
  add column if not exists is_default_pos boolean not null default false;

create unique index if not exists pharmacy_wallets_one_default_pos_idx
  on public.pharmacy_wallets (pharmacy_id)
  where is_default_pos = true and is_active = true;

comment on column public.pharmacy_wallets.is_default_pos is
  'When true, this wallet is pre-selected as the POS payment method.';
