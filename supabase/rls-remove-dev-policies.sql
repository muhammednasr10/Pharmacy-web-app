-- =============================================================================
-- RLS hardening — remove dev/testing policies that bypass tenant isolation
-- Run AFTER multi-tenant-saas.sql and accountant-org-read.sql
-- =============================================================================

-- Legacy names from schema.sql / early migrations
drop policy if exists "Allow read/write for testing" on public.medicines;
drop policy if exists "Allow read/write for testing" on public.invoices;
drop policy if exists "Allow read/write for testing" on public.invoice_items;
drop policy if exists "Allow read/write for testing" on public.users;
drop policy if exists "Allow read/write for testing" on public.customer_payments;
drop policy if exists "Allow read/write for testing" on public.purchases;
drop policy if exists "Allow read/write for testing" on public.returns;
drop policy if exists "Allow read/write for testing" on public.stock_movements;
drop policy if exists "Allow read/write for testing" on public.activity_logs;
drop policy if exists "Allow read/write for testing" on public.customers;
drop policy if exists "Allow read/write for testing" on public.customer_activities;
drop policy if exists "Allow read/write for testing" on public.pharmacy_costs;

-- Renamed dev policies (some environments)
drop policy if exists "Allow all medicines during development" on public.medicines;
drop policy if exists "Allow all invoices during development" on public.invoices;
drop policy if exists "Allow all invoice_items during development" on public.invoice_items;
drop policy if exists "Allow all customer_payments during development" on public.customer_payments;
drop policy if exists "Allow all purchases during development" on public.purchases;
drop policy if exists "Allow all returns during development" on public.returns;
drop policy if exists "Allow all stock_movements during development" on public.stock_movements;
drop policy if exists "Allow all activity_logs during development" on public.activity_logs;

-- Leaks all users (emails, roles) to any authenticated/anon client
drop policy if exists "Allow read users for app" on public.users;

-- CRM + costs never received tenant_* policies — add them now
do $$
declare
  t text;
  tenant_tables text[] := array[
    'customers', 'customer_activities', 'pharmacy_costs'
  ];
begin
  foreach t in array tenant_tables loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "tenant_select" on public.%I', t);
    execute format('drop policy if exists "tenant_insert" on public.%I', t);
    execute format('drop policy if exists "tenant_update" on public.%I', t);
    execute format('drop policy if exists "tenant_delete" on public.%I', t);

    execute format(
      'create policy "tenant_select" on public.%I for select to authenticated
         using (public.is_active_user() and public.can_read_pharmacy_row(pharmacy_id))',
      t
    );
    execute format(
      'create policy "tenant_insert" on public.%I for insert to authenticated
         with check (public.is_active_user() and public.can_access_pharmacy_row(pharmacy_id))',
      t
    );
    execute format(
      'create policy "tenant_update" on public.%I for update to authenticated
         using (public.is_active_user() and public.can_access_pharmacy_row(pharmacy_id))
         with check (public.is_active_user() and public.can_access_pharmacy_row(pharmacy_id))',
      t
    );
    execute format(
      'create policy "tenant_delete" on public.%I for delete to authenticated
         using (
           public.is_active_user()
           and public.can_access_pharmacy_row(pharmacy_id)
           and (public.is_super_admin() or public.is_pharmacy_admin())
         )',
      t
    );
  end loop;
end $$;
