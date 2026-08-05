-- =============================================================================
-- RLS security audit fixes — run AFTER rls-security-hardening.sql
-- Closes: app_notify_settings exposure, stale anon RPC grants, weak tenant policies
-- =============================================================================

-- 1) Webhook settings — service-only (no client access)
alter table if exists public.app_notify_settings enable row level security;
revoke all on table public.app_notify_settings from anon, authenticated;

-- 2) Re-apply tenant isolation if legacy secure-rls.sql policies exist
do $$
declare
  t text;
  tenant_tables text[] := array[
    'medicines', 'invoices', 'invoice_items', 'returns', 'purchases',
    'customer_payments', 'stock_movements', 'activity_logs'
  ];
begin
  foreach t in array tenant_tables loop
    execute format('drop policy if exists "authenticated_active" on public.%I', t);
    execute format('drop policy if exists "app_allow_all" on public.%I', t);
    execute format('drop policy if exists "Allow read/write for testing" on public.%I', t);

    execute format('drop policy if exists "tenant_select" on public.%I', t);
    execute format(
      'create policy "tenant_select" on public.%I for select to authenticated
         using (public.is_active_user() and public.can_read_pharmacy_row(pharmacy_id))',
      t
    );

    execute format('drop policy if exists "tenant_insert" on public.%I', t);
    execute format(
      'create policy "tenant_insert" on public.%I for insert to authenticated
         with check (public.is_active_user() and public.can_access_pharmacy_row(pharmacy_id))',
      t
    );

    execute format('drop policy if exists "tenant_update" on public.%I', t);
    execute format(
      'create policy "tenant_update" on public.%I for update to authenticated
         using (public.is_active_user() and public.can_access_pharmacy_row(pharmacy_id))
         with check (public.is_active_user() and public.can_access_pharmacy_row(pharmacy_id))',
      t
    );

    execute format('drop policy if exists "tenant_delete" on public.%I', t);
    execute format(
      'create policy "tenant_delete" on public.%I for delete to authenticated
         using (
           public.is_active_user()
           and public.can_access_pharmacy_row(pharmacy_id)
           and (public.is_super_admin() or public.is_pharmacy_admin())
         )',
      t
    );

    execute format('alter table public.%I force row level security', t);
  end loop;
end $$;

-- 3) FORCE RLS on tables missed by earlier hardening
alter table if exists public.customers force row level security;
alter table if exists public.customer_activities force row level security;
alter table if exists public.subscription_tier_configs force row level security;
alter table if exists public.pharmacy_cost_plans force row level security;
alter table if exists public.medicine_catalog_reference force row level security;

-- 4) Medicine pagination RPCs — authenticated only (logic already checks pharmacy access)
do $$
begin
  if to_regprocedure('public.count_pharmacy_medicines(text,text,text,integer,integer,boolean)') is not null then
    revoke all on function public.count_pharmacy_medicines(text, text, text, integer, integer, boolean) from anon;
    grant execute on function public.count_pharmacy_medicines(text, text, text, integer, integer, boolean) to authenticated;
  end if;

  if to_regprocedure('public.fetch_pharmacy_medicines_page(text,integer,integer,text,text,integer,integer,boolean)') is not null then
    revoke all on function public.fetch_pharmacy_medicines_page(text, integer, integer, text, text, integer, integer, boolean) from anon;
    grant execute on function public.fetch_pharmacy_medicines_page(text, integer, integer, text, text, integer, integer, boolean) to authenticated;
  end if;

  if to_regprocedure('public.pharmacy_medicine_stats(text,integer,integer)') is not null then
    revoke all on function public.pharmacy_medicine_stats(text, integer, integer) from anon;
    grant execute on function public.pharmacy_medicine_stats(text, integer, integer) to authenticated;
  end if;
end $$;

-- 5) Session revocation RPC — never anon
do $$
begin
  if to_regprocedure('public.revoke_user_app_access(text,text,text,text)') is not null then
    revoke all on function public.revoke_user_app_access(text, text, text, text) from anon;
    grant execute on function public.revoke_user_app_access(text, text, text, text) to authenticated;
  end if;
end $$;

-- 6) Remove dangerous self-registration policy if re-introduced by optional migrations
drop policy if exists "users_self_register" on public.users;

notify pgrst, 'reload schema';
