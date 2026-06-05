-- Run in Supabase SQL Editor
-- Held invoices (POS) + instant return columns

-- -----------------------------------------------------------------------------
-- 1) held_invoices
-- -----------------------------------------------------------------------------

create table if not exists held_invoices (
  id text primary key default gen_random_uuid()::text,
  pharmacy_id text not null references pharmacies(id),
  hold_number text not null,
  customer_name text,
  customer_phone text,
  cart_items jsonb not null default '[]'::jsonb,
  subtotal numeric(12,2) default 0,
  discount numeric(12,2) default 0,
  tax numeric(12,2) default 0,
  total numeric(12,2) default 0,
  payment_method text default 'cash',
  status text default 'held',
  created_by text,
  created_by_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_held_invoices_pharmacy on held_invoices (pharmacy_id);
create index if not exists idx_held_invoices_status on held_invoices (pharmacy_id, status);
create unique index if not exists idx_held_invoices_hold_number on held_invoices (pharmacy_id, hold_number);

alter table held_invoices enable row level security;

drop policy if exists "held_invoices_select" on held_invoices;
drop policy if exists "held_invoices_insert" on held_invoices;
drop policy if exists "held_invoices_update" on held_invoices;
drop policy if exists "held_invoices_delete" on held_invoices;

create policy "held_invoices_select" on held_invoices for select to authenticated
  using (
    public.is_active_user()
    and (
      public.is_super_admin()
      or pharmacy_id = public.current_user_pharmacy_id()
    )
  );

create policy "held_invoices_insert" on held_invoices for insert to authenticated
  with check (
    public.is_active_user()
    and (
      public.is_super_admin()
      or pharmacy_id = public.current_user_pharmacy_id()
    )
  );

create policy "held_invoices_update" on held_invoices for update to authenticated
  using (
    public.is_active_user()
    and (
      public.is_super_admin()
      or pharmacy_id = public.current_user_pharmacy_id()
    )
  )
  with check (
    public.is_active_user()
    and (
      public.is_super_admin()
      or pharmacy_id = public.current_user_pharmacy_id()
    )
  );

create policy "held_invoices_delete" on held_invoices for delete to authenticated
  using (
    public.is_active_user()
    and (
      public.is_super_admin()
      or pharmacy_id = public.current_user_pharmacy_id()
    )
  );

-- -----------------------------------------------------------------------------
-- 2) returns — instant return metadata
-- -----------------------------------------------------------------------------

alter table returns add column if not exists reason text;
alter table returns add column if not exists refund_method text;
alter table returns add column if not exists is_instant boolean default false;

-- -----------------------------------------------------------------------------
-- 3) Realtime (اختياري — لتفعيل التحديث التلقائي)
-- -----------------------------------------------------------------------------

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table held_invoices;
  end if;
exception
  when duplicate_object then null;
  when others then null;
end $$;

-- -----------------------------------------------------------------------------
-- 4) Verify
-- -----------------------------------------------------------------------------

select column_name, data_type
from information_schema.columns
where table_name = 'held_invoices'
order by ordinal_position;
