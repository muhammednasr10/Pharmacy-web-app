-- =============================================================================
-- Multi-tenant SaaS migration — one Supabase project, many pharmacies
-- Run in Supabase SQL Editor AFTER setup-complete.sql
-- Safe to re-run (IF NOT EXISTS / DROP POLICY IF EXISTS)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1) pharmacies (tenants) — schema FIRST (functions below need these columns)
-- -----------------------------------------------------------------------------

create table if not exists pharmacies (
  id text primary key,
  name text,
  name_en text,
  phone text,
  address text,
  currency text default 'ج.م',
  is_active boolean default true,
  invoice_footer text,
  subscription_plan text default 'basic',
  subscription_end_date text,
  logo_base64 text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table pharmacies add column if not exists subscription_status text default 'active';
alter table pharmacies add column if not exists subscription_started_at timestamptz;
alter table pharmacies add column if not exists subscription_ends_at timestamptz;

update pharmacies set name = coalesce(nullif(trim(name), ''), id) where name is null or trim(name) = '';
update pharmacies set subscription_status = 'active' where subscription_status is null;
update pharmacies set subscription_plan = coalesce(subscription_plan, 'basic');

-- NOT NULL only after backfill (avoid failure on empty names)
do $$
begin
  alter table pharmacies alter column name set not null;
exception when others then
  raise notice 'pharmacies.name NOT NULL skipped: %', sqlerrm;
end $$;

alter table pharmacies alter column subscription_plan set default 'basic';

insert into pharmacies (id, name, name_en, phone, address, currency, is_active, subscription_status, subscription_plan)
values ('main', 'الصيدلية الرئيسية', 'Main Pharmacy', '', '', 'ج.م', true, 'active', 'basic')
on conflict (id) do update set
  name = excluded.name,
  subscription_status = coalesce(pharmacies.subscription_status, 'active');

-- -----------------------------------------------------------------------------
-- 2) users
-- -----------------------------------------------------------------------------

create table if not exists users (
  uid text primary key,
  name text not null,
  email text not null,
  role text not null,
  pharmacy_id text not null references pharmacies(id),
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table users drop constraint if exists users_role_check;

update users set role = 'admin' where role = 'pharmacy_admin';
update users set role = 'accountant' where role = 'manager';

alter table users add constraint users_role_check check (
  role in ('super_admin', 'admin', 'cashier', 'inventory', 'accountant')
);

create unique index if not exists users_email_unique on users (lower(email));

update users set pharmacy_id = 'main', role = 'admin'
where lower(email) = 'admin@pharmacy.com';

-- -----------------------------------------------------------------------------
-- 3) pharmacy_id on tenant tables + backfill
-- -----------------------------------------------------------------------------

alter table medicines         add column if not exists pharmacy_id text;
alter table invoices          add column if not exists pharmacy_id text;
alter table invoice_items     add column if not exists pharmacy_id text;
alter table returns           add column if not exists pharmacy_id text;
alter table purchases         add column if not exists pharmacy_id text;
alter table customer_payments add column if not exists pharmacy_id text;
alter table stock_movements   add column if not exists pharmacy_id text;
alter table activity_logs     add column if not exists pharmacy_id text;

update medicines         set pharmacy_id = 'main' where pharmacy_id is null;
update invoices          set pharmacy_id = 'main' where pharmacy_id is null;
update returns           set pharmacy_id = 'main' where pharmacy_id is null;
update purchases         set pharmacy_id = 'main' where pharmacy_id is null;
update customer_payments set pharmacy_id = 'main' where pharmacy_id is null;
update stock_movements   set pharmacy_id = 'main' where pharmacy_id is null;
update activity_logs     set pharmacy_id = 'main' where pharmacy_id is null;

update invoice_items ii
set pharmacy_id = i.pharmacy_id
from invoices i
where ii.invoice_id = i.id and ii.pharmacy_id is null;

update invoice_items set pharmacy_id = 'main' where pharmacy_id is null;

alter table medicines         alter column pharmacy_id set default 'main';
alter table invoices          alter column pharmacy_id set default 'main';
alter table invoice_items     alter column pharmacy_id set default 'main';
alter table returns           alter column pharmacy_id set default 'main';
alter table purchases         alter column pharmacy_id set default 'main';
alter table customer_payments alter column pharmacy_id set default 'main';
alter table stock_movements   alter column pharmacy_id set default 'main';
alter table activity_logs     alter column pharmacy_id set default 'main';

create index if not exists idx_medicines_pharmacy         on medicines (pharmacy_id);
create index if not exists idx_invoices_pharmacy          on invoices (pharmacy_id);
create index if not exists idx_invoice_items_pharmacy     on invoice_items (pharmacy_id);
create index if not exists idx_returns_pharmacy           on returns (pharmacy_id);
create index if not exists idx_purchases_pharmacy         on purchases (pharmacy_id);
create index if not exists idx_customer_payments_pharmacy on customer_payments (pharmacy_id);
create index if not exists idx_stock_movements_pharmacy   on stock_movements (pharmacy_id);
create index if not exists idx_activity_logs_pharmacy     on activity_logs (pharmacy_id);
create index if not exists idx_users_pharmacy             on users (pharmacy_id);

-- -----------------------------------------------------------------------------
-- 4) Helper functions (after subscription_status exists)
-- -----------------------------------------------------------------------------

create or replace function public.current_user_pharmacy_id()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select pharmacy_id from public.users where uid = auth.uid()::text limit 1;
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where uid = auth.uid()::text
      and role = 'super_admin'
      and is_active = true
  );
$$;

create or replace function public.is_pharmacy_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where uid = auth.uid()::text
      and role in ('admin', 'super_admin')
      and is_active = true
  );
$$;

create or replace function public.is_active_user()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.users u
    join public.pharmacies p on p.id = u.pharmacy_id
    where u.uid = auth.uid()::text
      and u.is_active = true
      and p.is_active = true
      and coalesce(p.subscription_status, 'active') = 'active'
  ) or public.is_super_admin();
$$;

create or replace function public.can_access_pharmacy_row(row_pharmacy_id text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.is_super_admin()
    or row_pharmacy_id = public.current_user_pharmacy_id();
$$;

grant execute on function public.current_user_pharmacy_id() to anon, authenticated;
grant execute on function public.is_super_admin() to anon, authenticated;
grant execute on function public.is_pharmacy_admin() to anon, authenticated;
grant execute on function public.is_active_user() to anon, authenticated;
grant execute on function public.can_access_pharmacy_row(text) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 5) RLS — tenant isolation
-- -----------------------------------------------------------------------------

alter table pharmacies enable row level security;
alter table users enable row level security;

drop policy if exists "app_allow_all" on pharmacies;
drop policy if exists "pharmacies_select" on pharmacies;
drop policy if exists "pharmacies_insert" on pharmacies;
drop policy if exists "pharmacies_update" on pharmacies;
drop policy if exists "pharmacies_delete" on pharmacies;

create policy "pharmacies_select" on pharmacies for select to authenticated
  using (public.is_super_admin() or id = public.current_user_pharmacy_id());

create policy "pharmacies_insert" on pharmacies for insert to authenticated
  with check (public.is_super_admin());

create policy "pharmacies_update" on pharmacies for update to authenticated
  using (public.is_super_admin() or (public.is_pharmacy_admin() and id = public.current_user_pharmacy_id()))
  with check (public.is_super_admin() or (public.is_pharmacy_admin() and id = public.current_user_pharmacy_id()));

create policy "pharmacies_delete" on pharmacies for delete to authenticated
  using (public.is_super_admin());

drop policy if exists "app_allow_all" on users;
drop policy if exists "users_select" on users;
drop policy if exists "users_insert" on users;
drop policy if exists "users_update" on users;
drop policy if exists "users_delete" on users;
drop policy if exists "users_self_register" on users;

create policy "users_select" on users for select to authenticated
  using (
    uid = auth.uid()::text
    or public.is_super_admin()
    or (pharmacy_id = public.current_user_pharmacy_id() and public.is_pharmacy_admin())
  );

create policy "users_insert" on users for insert to authenticated
  with check (
    public.is_super_admin()
    or (public.is_pharmacy_admin() and pharmacy_id = public.current_user_pharmacy_id())
    or (uid = auth.uid()::text and role = 'cashier' and is_active = true)
  );

create policy "users_update" on users for update to authenticated
  using (
    public.is_super_admin()
    or (public.is_pharmacy_admin() and pharmacy_id = public.current_user_pharmacy_id())
  )
  with check (
    public.is_super_admin()
    or (public.is_pharmacy_admin() and pharmacy_id = public.current_user_pharmacy_id())
  );

create policy "users_delete" on users for delete to authenticated
  using (
    (public.is_super_admin() or (public.is_pharmacy_admin() and pharmacy_id = public.current_user_pharmacy_id()))
    and uid <> auth.uid()::text
  );

do $$
declare
  t text;
  tenant_tables text[] := array[
    'medicines','invoices','invoice_items','returns','purchases',
    'customer_payments','stock_movements','activity_logs'
  ];
begin
  foreach t in array tenant_tables loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "app_allow_all" on %I', t);
    execute format('drop policy if exists "authenticated_active" on %I', t);
    execute format('drop policy if exists "tenant_select" on %I', t);
    execute format('drop policy if exists "tenant_insert" on %I', t);
    execute format('drop policy if exists "tenant_update" on %I', t);
    execute format('drop policy if exists "tenant_delete" on %I', t);

    execute format(
      'create policy "tenant_select" on %I for select to authenticated
         using (public.is_active_user() and public.can_access_pharmacy_row(pharmacy_id))',
      t
    );
    execute format(
      'create policy "tenant_insert" on %I for insert to authenticated
         with check (public.is_active_user() and public.can_access_pharmacy_row(pharmacy_id))',
      t
    );
    execute format(
      'create policy "tenant_update" on %I for update to authenticated
         using (public.is_active_user() and public.can_access_pharmacy_row(pharmacy_id))
         with check (public.is_active_user() and public.can_access_pharmacy_row(pharmacy_id))',
      t
    );
    execute format(
      'create policy "tenant_delete" on %I for delete to authenticated
         using (
           public.is_active_user()
           and public.can_access_pharmacy_row(pharmacy_id)
           and (public.is_super_admin() or public.is_pharmacy_admin())
         )',
      t
    );
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- 6) Auth trigger
-- -----------------------------------------------------------------------------

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_role text;
  v_pharmacy_id text;
begin
  v_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'name'), ''),
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    split_part(new.email, '@', 1)
  );
  v_role := coalesce(nullif(trim(new.raw_user_meta_data->>'role'), ''), 'cashier');
  v_pharmacy_id := coalesce(nullif(trim(new.raw_user_meta_data->>'pharmacy_id'), ''), 'main');

  if v_role = 'pharmacy_admin' then v_role := 'admin'; end if;
  if v_role = 'manager' then v_role := 'accountant'; end if;
  if v_role not in ('super_admin', 'admin', 'cashier', 'inventory', 'accountant') then
    v_role := 'cashier';
  end if;

  insert into public.users (uid, name, email, role, pharmacy_id, is_active)
  values (new.id::text, v_name, new.email, v_role, v_pharmacy_id, true)
  on conflict (uid) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- -----------------------------------------------------------------------------
-- 7) Verification
-- -----------------------------------------------------------------------------

select 'pharmacies' as tbl, id, subscription_status, is_active from pharmacies order by id;
select uid, email, role, pharmacy_id, is_active from users order by email;

-- Super admin (run manually after creating Auth user):
-- insert into users (uid, name, email, role, pharmacy_id, is_active)
-- values ('<AUTH-UID>', 'Platform Admin', 'you@email.com', 'super_admin', 'main', true)
-- on conflict (uid) do update set role = 'super_admin', is_active = true;
