-- إصلاح سريع لأعمدة pharmacies + medicines (شغّل هذا لو ظهر خطأ column does not exist)

alter table pharmacies add column if not exists name_en text;
alter table pharmacies add column if not exists phone text;
alter table pharmacies add column if not exists address text;
alter table pharmacies add column if not exists currency text default 'ج.م';
alter table pharmacies add column if not exists is_active boolean default true;
alter table pharmacies add column if not exists invoice_footer text;
alter table pharmacies add column if not exists subscription_plan text default 'monthly';
alter table pharmacies add column if not exists subscription_end_date text;
alter table pharmacies add column if not exists logo_base64 text;

alter table medicines add column if not exists name_ar text;
alter table medicines add column if not exists name_en text;
alter table medicines add column if not exists barcode text;
alter table medicines add column if not exists qty integer default 0;
alter table medicines add column if not exists price numeric default 0;
alter table medicines add column if not exists buy_price numeric;
alter table medicines add column if not exists expiry date;
alter table medicines add column if not exists created_at timestamptz default now();

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'medicines' and column_name = 'quantity'
  ) then
    update medicines set qty = coalesce(qty, quantity::integer, 0);
  end if;
end $$;

-- activity_logs: أعمدة ناقصة (تصلح خطأ "type column not found")
alter table activity_logs add column if not exists type text;
alter table activity_logs add column if not exists title text;
alter table activity_logs add column if not exists description text;
alter table activity_logs add column if not exists reference_type text;
alter table activity_logs add column if not exists reference_id text;
alter table activity_logs add column if not exists pharmacy_id text;
alter table activity_logs add column if not exists user_id text;
alter table activity_logs add column if not exists user_name text;
alter table activity_logs add column if not exists created_at timestamptz default now();

-- stock_movements: أعمدة ناقصة (تصلح خطأ "barcode / movement_type column not found")
alter table stock_movements add column if not exists movement_type text;
alter table stock_movements add column if not exists type text;
update stock_movements
set movement_type = coalesce(movement_type, type, 'adjustment')
where movement_type is null or movement_type = '';
update stock_movements
set type = coalesce(type, movement_type, 'adjustment')
where type is null or type = '';
alter table stock_movements add column if not exists medicine_name text;
alter table stock_movements add column if not exists medicine_id bigint;
alter table stock_movements add column if not exists medicine_name_ar text;
alter table stock_movements add column if not exists medicine_name_en text;
alter table stock_movements add column if not exists barcode text;
alter table stock_movements add column if not exists quantity_change integer;
alter table stock_movements add column if not exists qty_before integer;
alter table stock_movements add column if not exists qty_after integer;
alter table stock_movements add column if not exists invoice_number text;
alter table stock_movements add column if not exists return_number text;
alter table stock_movements add column if not exists purchase_number text;
alter table stock_movements add column if not exists supplier_name text;
alter table stock_movements add column if not exists notes text;
alter table stock_movements add column if not exists pharmacy_id text;
alter table stock_movements add column if not exists user_id text;
alter table stock_movements add column if not exists user_name text;
alter table stock_movements add column if not exists created_at timestamptz default now();

-- invoices: أعمدة ناقصة (تصلح خطأ "cashier_id column not found")
alter table invoices add column if not exists invoice_number text;
alter table invoices add column if not exists date text;
alter table invoices add column if not exists created_at timestamptz default now();
alter table invoices add column if not exists subtotal numeric default 0;
alter table invoices add column if not exists discount numeric default 0;
alter table invoices add column if not exists total numeric default 0;
alter table invoices add column if not exists payment_method text default 'cash';
alter table invoices add column if not exists customer_name text default '';
alter table invoices add column if not exists customer_phone text;
alter table invoices add column if not exists cashier_id text;
alter table invoices add column if not exists cashier_name text;
alter table invoices add column if not exists pharmacy_id text;
alter table invoices add column if not exists total_cost numeric;
alter table invoices add column if not exists total_profit numeric;

-- invoice_items: أعمدة ناقصة (تصلح خطأ "barcode column not found")
alter table invoice_items add column if not exists medicine_name text;
update invoice_items
set medicine_name = coalesce(medicine_name, name_ar, name_en, '')
where medicine_name is null or medicine_name = '';

alter table invoice_items add column if not exists invoice_id bigint;
alter table invoice_items add column if not exists medicine_id bigint;
alter table invoice_items add column if not exists name_ar text;
alter table invoice_items add column if not exists name_en text;
alter table invoice_items add column if not exists barcode text;
alter table invoice_items add column if not exists quantity integer default 0;
alter table invoice_items add column if not exists unit_price numeric default 0;
alter table invoice_items add column if not exists line_total numeric default 0;
alter table invoice_items add column if not exists buy_price numeric;
alter table invoice_items add column if not exists cost_total numeric;
alter table invoice_items add column if not exists profit numeric;
alter table invoice_items add column if not exists pharmacy_id text;

-- returns: أعمدة ناقصة (تصلح خطأ "date column not found")
alter table returns add column if not exists return_number text;
alter table returns add column if not exists invoice_number text;
alter table returns add column if not exists original_invoice_id bigint;
alter table returns add column if not exists pharmacy_id text;
alter table returns add column if not exists user_id text;
alter table returns add column if not exists user_name text;
alter table returns add column if not exists date text;
alter table returns add column if not exists created_at timestamptz default now();
alter table returns add column if not exists items jsonb default '[]'::jsonb;
alter table returns add column if not exists total numeric default 0;
alter table returns add column if not exists reason text;
alter table returns add column if not exists refund_method text;
alter table returns add column if not exists is_instant boolean default false;

-- pharmacies: حدود تنبيهات المخزون والصلاحية
alter table pharmacies add column if not exists low_stock_threshold integer default 20;
alter table pharmacies add column if not exists expiring_soon_days integer default 30;
update pharmacies set low_stock_threshold = 20 where low_stock_threshold is null;
update pharmacies set expiring_soon_days = 30 where expiring_soon_days is null;

-- held_invoices: أعمدة ناقصة
alter table held_invoices add column if not exists status text default 'held';
alter table held_invoices add column if not exists updated_at timestamptz default now();
alter table held_invoices add column if not exists cart_items jsonb default '[]'::jsonb;
update held_invoices set status = 'held' where status is null;

-- subscription_requests: طلبات تجديد الاشتراك
create table if not exists subscription_requests (
  id bigserial primary key,
  request_number text not null,
  pharmacy_id text not null,
  pharmacy_name text,
  plan text not null,
  days integer not null,
  amount numeric not null default 0,
  currency text default 'EGP',
  status text not null default 'pending',
  requested_by text,
  requested_by_name text,
  reviewed_by text,
  reviewed_by_name text,
  review_note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  reviewed_at timestamptz
);

alter table subscription_requests enable row level security;
drop policy if exists "subscription_requests_authenticated" on subscription_requests;
drop policy if exists "subscription_requests_select" on subscription_requests;
drop policy if exists "subscription_requests_insert" on subscription_requests;
drop policy if exists "subscription_requests_update" on subscription_requests;

create policy "subscription_requests_select" on subscription_requests
  for select to authenticated
  using (
    exists (
      select 1 from public.users
      where uid = auth.uid()::text and role = 'super_admin' and is_active = true
    )
    or pharmacy_id = (
      select pharmacy_id from public.users
      where uid = auth.uid()::text and is_active = true
      limit 1
    )
  );

create policy "subscription_requests_insert" on subscription_requests
  for insert to authenticated
  with check (public.is_active_user());

create policy "subscription_requests_update" on subscription_requests
  for update to authenticated
  using (
    exists (
      select 1 from public.users
      where uid = auth.uid()::text and role = 'super_admin' and is_active = true
    )
    or exists (
      select 1 from public.users
      where uid = auth.uid()::text
        and role in ('admin', 'super_admin')
        and is_active = true
    )
  )
  with check (
    exists (
      select 1 from public.users
      where uid = auth.uid()::text and role = 'super_admin' and is_active = true
    )
    or exists (
      select 1 from public.users
      where uid = auth.uid()::text
        and role in ('admin', 'super_admin')
        and is_active = true
    )
  );
