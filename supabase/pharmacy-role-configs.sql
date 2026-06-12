-- Per-branch role page + permission overrides for built-in roles
-- Run after pharmacy-custom-roles.sql

create table if not exists pharmacy_role_configs (
  id text primary key default gen_random_uuid()::text,
  pharmacy_id text not null references pharmacies(id) on delete cascade,
  role_key text not null,
  allowed_pages jsonb not null default '[]'::jsonb,
  permissions jsonb not null default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  constraint pharmacy_role_configs_role_key_check check (
    role_key in ('pharmacy_admin', 'branch_manager', 'cashier', 'inventory', 'accountant')
  ),
  constraint pharmacy_role_configs_unique unique (pharmacy_id, role_key)
);

create index if not exists idx_pharmacy_role_configs_pharmacy
  on pharmacy_role_configs (pharmacy_id);

alter table pharmacy_custom_roles
  add column if not exists permissions jsonb not null default '{}'::jsonb;

alter table pharmacy_role_configs enable row level security;

drop policy if exists "pharmacy_role_configs_select" on pharmacy_role_configs;
drop policy if exists "pharmacy_role_configs_insert" on pharmacy_role_configs;
drop policy if exists "pharmacy_role_configs_update" on pharmacy_role_configs;
drop policy if exists "pharmacy_role_configs_delete" on pharmacy_role_configs;

create policy "pharmacy_role_configs_select" on pharmacy_role_configs
  for select to authenticated
  using (
    public.is_super_admin()
    or (
      public.is_active_user()
      and (
        pharmacy_id = public.current_user_pharmacy_id()
        or (public.is_pharmacy_manager() and public.can_read_pharmacy_row(pharmacy_id))
      )
    )
  );

create policy "pharmacy_role_configs_insert" on pharmacy_role_configs
  for insert to authenticated
  with check (
    public.is_active_user()
    and (
      public.is_super_admin()
      or (public.is_pharmacy_manager() and public.can_write_pharmacy_row(pharmacy_id))
    )
  );

create policy "pharmacy_role_configs_update" on pharmacy_role_configs
  for update to authenticated
  using (
    public.is_active_user()
    and (
      public.is_super_admin()
      or (public.is_pharmacy_manager() and public.can_write_pharmacy_row(pharmacy_id))
    )
  )
  with check (
    public.is_active_user()
    and (
      public.is_super_admin()
      or (public.is_pharmacy_manager() and public.can_write_pharmacy_row(pharmacy_id))
    )
  );

create policy "pharmacy_role_configs_delete" on pharmacy_role_configs
  for delete to authenticated
  using (
    public.is_active_user()
    and (
      public.is_super_admin()
      or (public.is_pharmacy_manager() and public.can_write_pharmacy_row(pharmacy_id))
    )
  );

notify pgrst, 'reload schema';
