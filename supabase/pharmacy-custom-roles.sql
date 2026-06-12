-- Custom pharmacy roles (أدوار مخصصة) — run in Supabase SQL Editor
-- Allows login accounts and users with role keys like custom_pharmacist

create table if not exists pharmacy_custom_roles (
  id text primary key default gen_random_uuid()::text,
  pharmacy_id text not null references pharmacies(id) on delete cascade,
  role_key text not null,
  name_ar text not null,
  name_en text not null,
  base_role text not null,
  allowed_pages jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint pharmacy_custom_roles_role_key_format check (role_key ~ '^custom_[a-z0-9_]+$'),
  constraint pharmacy_custom_roles_base_role_check check (
    base_role in ('pharmacy_admin', 'branch_manager', 'cashier', 'inventory', 'accountant')
  ),
  constraint pharmacy_custom_roles_unique_key unique (pharmacy_id, role_key)
);

create index if not exists idx_pharmacy_custom_roles_pharmacy
  on pharmacy_custom_roles (pharmacy_id);

alter table pharmacy_custom_roles enable row level security;

drop policy if exists "pharmacy_custom_roles_select" on pharmacy_custom_roles;
drop policy if exists "pharmacy_custom_roles_insert" on pharmacy_custom_roles;
drop policy if exists "pharmacy_custom_roles_update" on pharmacy_custom_roles;
drop policy if exists "pharmacy_custom_roles_delete" on pharmacy_custom_roles;

create policy "pharmacy_custom_roles_select" on pharmacy_custom_roles
  for select to authenticated
  using (
    public.is_super_admin()
    or (
      public.is_active_user()
      and (
        pharmacy_id = public.current_user_pharmacy_id()
        or (
          public.is_pharmacy_manager()
          and public.can_read_pharmacy_row(pharmacy_id)
        )
      )
    )
  );

create policy "pharmacy_custom_roles_insert" on pharmacy_custom_roles
  for insert to authenticated
  with check (
    public.is_active_user()
    and (
      public.is_super_admin()
      or (
        public.is_pharmacy_manager()
        and public.can_write_pharmacy_row(pharmacy_id)
      )
    )
  );

create policy "pharmacy_custom_roles_update" on pharmacy_custom_roles
  for update to authenticated
  using (
    public.is_active_user()
    and (
      public.is_super_admin()
      or (
        public.is_pharmacy_manager()
        and public.can_write_pharmacy_row(pharmacy_id)
      )
    )
  )
  with check (
    public.is_active_user()
    and (
      public.is_super_admin()
      or (
        public.is_pharmacy_manager()
        and public.can_write_pharmacy_row(pharmacy_id)
      )
    )
  );

create policy "pharmacy_custom_roles_delete" on pharmacy_custom_roles
  for delete to authenticated
  using (
    public.is_active_user()
    and (
      public.is_super_admin()
      or (
        public.is_pharmacy_manager()
        and public.can_write_pharmacy_row(pharmacy_id)
      )
    )
  );

-- Relax role checks: built-ins + custom_* keys
alter table users drop constraint if exists users_role_check;
alter table users add constraint users_role_check check (
  role in (
    'super_admin',
    'pharmacy_admin',
    'branch_manager',
    'cashier',
    'inventory',
    'accountant'
  )
  or role ~ '^custom_[a-z0-9_]+$'
);

alter table pharmacy_login_accounts drop constraint if exists pharmacy_login_accounts_role_check;
alter table pharmacy_login_accounts add constraint pharmacy_login_accounts_role_check check (
  role in (
    'super_admin',
    'pharmacy_admin',
    'branch_manager',
    'cashier',
    'inventory',
    'accountant'
  )
  or role ~ '^custom_[a-z0-9_]+$'
);

create or replace function public.is_valid_login_account_role(p_role text, p_pharmacy_id text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select case
    when trim(p_role) in (
      'super_admin',
      'pharmacy_admin',
      'branch_manager',
      'cashier',
      'inventory',
      'accountant'
    ) then true
    when trim(p_role) ~ '^custom_[a-z0-9_]+$' then exists (
      select 1
      from public.pharmacy_custom_roles cr
      where cr.pharmacy_id = p_pharmacy_id
        and cr.role_key = trim(p_role)
        and cr.is_active = true
    )
    else false
  end;
$$;

create or replace function public.sync_auth_user_for_login_account(
  p_email text,
  p_role text,
  p_pharmacy_id text,
  p_employee_id text default null,
  p_name text default null
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid text;
  v_email text := lower(trim(p_email));
  v_role text := trim(p_role);
  v_name text;
  v_username text;
begin
  if not (public.is_super_admin() or public.is_pharmacy_manager()) then
    raise exception 'not_authorized';
  end if;

  if not public.can_write_pharmacy_row(p_pharmacy_id) then
    raise exception 'not_authorized';
  end if;

  if v_email = '' then
    raise exception 'email_required';
  end if;

  if v_role = 'admin' then
    v_role := 'pharmacy_admin';
  end if;

  if not public.is_valid_login_account_role(v_role, p_pharmacy_id) then
    raise exception 'invalid_role';
  end if;

  select id::text
  into v_uid
  from auth.users
  where lower(email) = v_email
  limit 1;

  if v_uid is null then
    raise exception 'auth_user_not_found';
  end if;

  v_name := coalesce(nullif(trim(p_name), ''), split_part(v_email, '@', 1));
  v_username := split_part(v_email, '@', 1);

  insert into public.users (uid, name, email, role, pharmacy_id, employee_id, username, is_active)
  values (
    v_uid,
    v_name,
    v_email,
    v_role,
    p_pharmacy_id,
    nullif(trim(p_employee_id), ''),
    v_username,
    true
  )
  on conflict (uid) do update set
    name = excluded.name,
    email = excluded.email,
    role = excluded.role,
    pharmacy_id = excluded.pharmacy_id,
    employee_id = coalesce(excluded.employee_id, public.users.employee_id),
    username = coalesce(public.users.username, excluded.username),
    is_active = true,
    updated_at = now();

  return v_uid;
end;
$$;

revoke all on function public.is_valid_login_account_role(text, text) from public;
grant execute on function public.is_valid_login_account_role(text, text) to authenticated;

revoke all on function public.sync_auth_user_for_login_account(text, text, text, text, text) from public;
grant execute on function public.sync_auth_user_for_login_account(text, text, text, text, text) to authenticated;

notify pgrst, 'reload schema';
