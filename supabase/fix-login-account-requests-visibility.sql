-- Fix: super_admin must see all login account requests
-- Run in Supabase SQL Editor if requests don't appear on SaaS page

drop policy if exists "login_account_requests_select" on login_account_requests;

create policy "login_account_requests_select" on login_account_requests
  for select to authenticated
  using (
    public.is_super_admin()
    or (
      public.is_active_user()
      and pharmacy_id = public.current_user_pharmacy_id()
    )
  );

-- Ensure is_pharmacy_admin recognizes pharmacy_admin role
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
      and role in ('pharmacy_admin', 'admin', 'super_admin')
      and is_active = true
  );
$$;

-- Realtime (optional — helps auto-refresh)
do $$
begin
  alter publication supabase_realtime add table login_account_requests;
exception
  when duplicate_object then null;
end $$;

notify pgrst, 'reload schema';
