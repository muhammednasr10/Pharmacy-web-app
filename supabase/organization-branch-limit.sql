-- =============================================================================
-- Organization branch limit — حد أقصى لعدد الفروع لكل صيدلية/مجموعة
-- Run AFTER multi-branch-organizations.sql
-- =============================================================================

alter table organizations
  add column if not exists max_branches integer not null default 1;

alter table pharmacies
  add column if not exists max_branches integer;

alter table organizations
  drop constraint if exists organizations_max_branches_check;

alter table organizations
  add constraint organizations_max_branches_check
  check (max_branches >= 1);

update organizations
set max_branches = 1
where max_branches is null;

update pharmacies p
set max_branches = o.max_branches
from organizations o
where p.organization_id = o.id
  and p.max_branches is null;

drop policy if exists "organizations_update" on organizations;

create policy "organizations_update" on organizations
  for update to authenticated
  using (public.is_super_admin())
  with check (public.is_super_admin());

create or replace function public.set_organization_max_branches(
  target_organization_id text,
  new_max_branches integer
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_count integer;
begin
  if auth.uid() is null then
    raise exception 'forbidden';
  end if;

  if not exists (
    select 1
    from public.users
    where uid = auth.uid()::text
      and role = 'super_admin'
      and coalesce(is_active, true) = true
  ) then
    raise exception 'forbidden';
  end if;

  if new_max_branches is null or new_max_branches < 1 then
    raise exception 'invalid_max_branches';
  end if;

  if not exists (
    select 1 from public.organizations where id = target_organization_id
  ) then
    raise exception 'organization_not_found';
  end if;

  select count(*)::integer
  into current_count
  from public.pharmacies
  where organization_id = target_organization_id;

  if new_max_branches < current_count then
    raise exception 'below_current_branches';
  end if;

  update public.organizations
  set max_branches = new_max_branches,
      updated_at = now()
  where id = target_organization_id;

  update public.pharmacies
  set max_branches = new_max_branches
  where organization_id = target_organization_id;
end;
$$;

grant execute on function public.set_organization_max_branches(text, integer) to authenticated;

notify pgrst, 'reload schema';
