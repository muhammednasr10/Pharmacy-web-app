-- Monthly investment / cost plan (خطة التكاليف المتوقعة)
-- Run AFTER add-pharmacy-costs.sql

create table if not exists public.pharmacy_cost_plans (
  id bigint primary key,
  pharmacy_id text not null references public.pharmacies(id),
  plan_month text not null,
  category text not null default 'other',
  title text not null,
  planned_amount numeric(12, 2) not null default 0,
  notes text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  updated_at timestamptz not null default timezone('utc'::text, now())
);

create index if not exists pharmacy_cost_plans_pharmacy_month_idx
  on public.pharmacy_cost_plans (pharmacy_id, plan_month);

alter table public.pharmacy_cost_plans enable row level security;

drop policy if exists "pharmacy_cost_plans_select" on public.pharmacy_cost_plans;
create policy "pharmacy_cost_plans_select" on public.pharmacy_cost_plans
  for select to authenticated
  using (public.is_active_user() and public.can_read_pharmacy_row(pharmacy_id));

drop policy if exists "pharmacy_cost_plans_write" on public.pharmacy_cost_plans;
create policy "pharmacy_cost_plans_write" on public.pharmacy_cost_plans
  for all to authenticated
  using (
    public.is_active_user()
    and public.can_write_pharmacy_row(pharmacy_id)
    and (public.is_super_admin() or public.is_pharmacy_admin())
  )
  with check (
    public.is_active_user()
    and public.can_write_pharmacy_row(pharmacy_id)
    and (public.is_super_admin() or public.is_pharmacy_admin())
  );

notify pgrst, 'reload schema';
