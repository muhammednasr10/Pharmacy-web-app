-- =============================================================================
-- Expired subscription: allow reads, block writes (tenant users)
-- Run AFTER accountant-org-read.sql
-- =============================================================================

create or replace function public.pharmacy_subscription_write_allowed(target_pharmacy_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (
      select
        coalesce(p.is_active, true)
        and coalesce(p.subscription_status, 'active') in ('active', 'trial')
        and (
          coalesce(nullif(trim(p.subscription_end_date), ''), '') = ''
          or p.subscription_end_date::date >= current_date
        )
        and (
          p.subscription_ends_at is null
          or p.subscription_ends_at >= now()
        )
      from public.pharmacies p
      where p.id = target_pharmacy_id
    ),
    false
  );
$$;

grant execute on function public.pharmacy_subscription_write_allowed(text) to authenticated;

create or replace function public.can_write_pharmacy_row(row_pharmacy_id text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.is_super_admin()
    or (
      public.pharmacy_subscription_write_allowed(row_pharmacy_id)
      and (
        row_pharmacy_id = public.current_user_pharmacy_id()
        or (
          public.is_org_pharmacy_admin()
          and public.user_shares_organization(row_pharmacy_id)
        )
      )
    );
$$;

grant execute on function public.can_write_pharmacy_row(text) to anon, authenticated;

notify pgrst, 'reload schema';
