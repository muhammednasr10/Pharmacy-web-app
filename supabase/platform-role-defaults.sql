-- Platform-wide role defaults applied to every new pharmacy registration.
-- Super Admin edits these in SaaS → Roles.

create table if not exists platform_role_defaults (
  id text primary key default gen_random_uuid()::text,
  role_key text not null,
  kind text not null check (kind in ('builtin', 'custom')),
  name_ar text not null,
  name_en text not null,
  base_role text not null default 'cashier',
  allowed_pages jsonb not null default '[]'::jsonb,
  permissions jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint platform_role_defaults_role_key_unique unique (role_key)
);

create index if not exists idx_platform_role_defaults_sort
  on platform_role_defaults (sort_order, role_key);

alter table platform_role_defaults enable row level security;

drop policy if exists "platform_role_defaults_select" on platform_role_defaults;
drop policy if exists "platform_role_defaults_write" on platform_role_defaults;

-- Any authenticated active user can read defaults (needed for effective access fallback).
create policy "platform_role_defaults_select" on platform_role_defaults
  for select to authenticated
  using (public.is_active_user() or public.is_super_admin());

-- Only super admin can insert/update/delete.
create policy "platform_role_defaults_write" on platform_role_defaults
  for all to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

notify pgrst, 'reload schema';
