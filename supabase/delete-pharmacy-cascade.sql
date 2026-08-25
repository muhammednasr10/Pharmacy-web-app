-- =============================================================================
-- Cascade delete for pharmacies / organizations (Super Admin)
-- Run in Supabase SQL Editor
-- =============================================================================

create or replace function public.safe_delete_pharmacy_rows(p_table text, p_pharmacy_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  execute format('delete from %I where pharmacy_id = $1', p_table) using p_pharmacy_id;
exception
  when undefined_table then null;
  when undefined_column then null;
end;
$$;

create or replace function public.safe_delete_by_invoice(p_table text, p_pharmacy_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  execute format(
    'delete from %I where invoice_id in (select id from public.invoices where pharmacy_id = $1)',
    p_table
  ) using p_pharmacy_id;
exception
  when undefined_table then null;
  when undefined_column then null;
end;
$$;

create or replace function public.safe_delete_by_customer(p_table text, p_pharmacy_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  execute format(
    'delete from %I where customer_id in (select id from public.customers where pharmacy_id = $1)',
    p_table
  ) using p_pharmacy_id;
exception
  when undefined_table then null;
  when undefined_column then null;
end;
$$;

create or replace function public.delete_pharmacy_cascade(p_pharmacy_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_super_admin() then
    raise exception 'forbidden';
  end if;

  if coalesce(trim(p_pharmacy_id), '') = '' then
    raise exception 'pharmacy_id_required';
  end if;

  if not exists (select 1 from public.pharmacies where id = p_pharmacy_id) then
    return;
  end if;

  delete from public.branch_stock_transfers
  where from_pharmacy_id = p_pharmacy_id
     or to_pharmacy_id = p_pharmacy_id;

  -- Children that often lack pharmacy_id but FK to parent rows
  perform public.safe_delete_by_invoice('invoice_items', p_pharmacy_id);
  perform public.safe_delete_by_invoice('returns', p_pharmacy_id);
  perform public.safe_delete_by_customer('customer_follow_ups', p_pharmacy_id);
  perform public.safe_delete_by_customer('customer_payments', p_pharmacy_id);

  perform public.safe_delete_pharmacy_rows('invoice_items', p_pharmacy_id);
  perform public.safe_delete_pharmacy_rows('returns', p_pharmacy_id);
  perform public.safe_delete_pharmacy_rows('purchases', p_pharmacy_id);
  perform public.safe_delete_pharmacy_rows('customer_payments', p_pharmacy_id);
  perform public.safe_delete_pharmacy_rows('customer_follow_ups', p_pharmacy_id);
  perform public.safe_delete_pharmacy_rows('stock_movements', p_pharmacy_id);
  perform public.safe_delete_pharmacy_rows('stock_count_logs', p_pharmacy_id);
  perform public.safe_delete_pharmacy_rows('activity_logs', p_pharmacy_id);
  perform public.safe_delete_pharmacy_rows('invoices', p_pharmacy_id);
  perform public.safe_delete_pharmacy_rows('medicines', p_pharmacy_id);
  perform public.safe_delete_pharmacy_rows('pharmacy_costs', p_pharmacy_id);
  perform public.safe_delete_pharmacy_rows('pharmacy_cost_plans', p_pharmacy_id);
  perform public.safe_delete_pharmacy_rows('subscription_requests', p_pharmacy_id);
  perform public.safe_delete_pharmacy_rows('held_invoices', p_pharmacy_id);
  perform public.safe_delete_pharmacy_rows('cashier_shifts', p_pharmacy_id);
  perform public.safe_delete_pharmacy_rows('employee_requests', p_pharmacy_id);
  perform public.safe_delete_pharmacy_rows('attendance_records', p_pharmacy_id);
  perform public.safe_delete_pharmacy_rows('payroll_records', p_pharmacy_id);
  perform public.safe_delete_pharmacy_rows('employee_profiles', p_pharmacy_id);
  perform public.safe_delete_pharmacy_rows('login_account_requests', p_pharmacy_id);
  perform public.safe_delete_pharmacy_rows('pharmacy_login_accounts', p_pharmacy_id);
  perform public.safe_delete_pharmacy_rows('customers', p_pharmacy_id);
  perform public.safe_delete_pharmacy_rows('pharmacy_custom_roles', p_pharmacy_id);
  perform public.safe_delete_pharmacy_rows('pharmacy_role_configs', p_pharmacy_id);
  perform public.safe_delete_pharmacy_rows('warehouses', p_pharmacy_id);
  perform public.safe_delete_pharmacy_rows('pharmacy_settings', p_pharmacy_id);
  perform public.safe_delete_pharmacy_rows('pharmacy_signup_requests', p_pharmacy_id);

  -- Null out signup requests that only store pharmacy_id after approval
  begin
    update public.pharmacy_signup_requests
    set pharmacy_id = null
    where pharmacy_id = p_pharmacy_id;
  exception
    when undefined_table then null;
    when undefined_column then null;
  end;

  delete from public.users where pharmacy_id = p_pharmacy_id;
  delete from public.employees where pharmacy_id = p_pharmacy_id;

  delete from public.pharmacies where id = p_pharmacy_id;
end;
$$;

create or replace function public.delete_organization_cascade(p_organization_id text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_pharmacy_id text;
begin
  if not public.is_super_admin() then
    raise exception 'forbidden';
  end if;

  if coalesce(trim(p_organization_id), '') = '' then
    raise exception 'organization_id_required';
  end if;

  delete from public.branch_stock_transfers
  where organization_id = p_organization_id
     or from_pharmacy_id in (
       select id from public.pharmacies where organization_id = p_organization_id
     )
     or to_pharmacy_id in (
       select id from public.pharmacies where organization_id = p_organization_id
     );

  for v_pharmacy_id in
    select id from public.pharmacies where organization_id = p_organization_id
  loop
    perform public.delete_pharmacy_cascade(v_pharmacy_id);
  end loop;

  delete from public.organizations where id = p_organization_id;
end;
$$;

revoke all on function public.safe_delete_pharmacy_rows(text, text) from public;
revoke all on function public.safe_delete_by_invoice(text, text) from public;
revoke all on function public.safe_delete_by_customer(text, text) from public;
revoke all on function public.delete_pharmacy_cascade(text) from public;
revoke all on function public.delete_organization_cascade(text) from public;

grant execute on function public.delete_pharmacy_cascade(text) to authenticated;
grant execute on function public.delete_organization_cascade(text) to authenticated;

notify pgrst, 'reload schema';
