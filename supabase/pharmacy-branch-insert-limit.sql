-- =============================================================================
-- Branch / warehouse insert limit — enforce max_branches per organization
-- In this app each row in `pharmacies` is a branch/warehouse (no separate branches table).
-- Run AFTER organization-branch-limit.sql
-- =============================================================================

create or replace function public.enforce_organization_branch_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id text;
  v_max integer;
  v_count integer;
begin
  v_org_id := nullif(trim(coalesce(new.organization_id, '')), '');

  if v_org_id is null then
    return new;
  end if;

  select coalesce(o.max_branches, 1)
  into v_max
  from public.organizations o
  where o.id = v_org_id;

  if v_max is null then
    v_max := 1;
  end if;

  select count(*)::integer
  into v_count
  from public.pharmacies p
  where p.organization_id = v_org_id;

  if v_count >= v_max then
    raise exception 'branch_limit_reached';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_enforce_organization_branch_limit on public.pharmacies;

create trigger trg_enforce_organization_branch_limit
  before insert on public.pharmacies
  for each row
  execute function public.enforce_organization_branch_limit();

comment on function public.enforce_organization_branch_limit() is
  'Blocks INSERT into pharmacies when organization branch count >= organizations.max_branches';

notify pgrst, 'reload schema';
