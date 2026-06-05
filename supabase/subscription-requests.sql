-- =============================================================================
-- طلبات تجديد الاشتراك — Subscription renewal requests
-- شغّل في Supabase → SQL Editor
-- =============================================================================

create table if not exists subscription_requests (
  id bigserial primary key,
  request_number text not null,
  pharmacy_id text not null,
  pharmacy_name text,
  plan text not null,
  days integer not null,
  amount numeric not null default 0,
  currency text default 'EGP',
  status text not null default 'pending',
  requested_by text,
  requested_by_name text,
  reviewed_by text,
  reviewed_by_name text,
  review_note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  reviewed_at timestamptz
);

create index if not exists idx_subscription_requests_pharmacy
  on subscription_requests (pharmacy_id);

create index if not exists idx_subscription_requests_status
  on subscription_requests (status);

create index if not exists idx_subscription_requests_created
  on subscription_requests (created_at desc);

alter table subscription_requests enable row level security;

drop policy if exists "subscription_requests_authenticated" on subscription_requests;
drop policy if exists "subscription_requests_select" on subscription_requests;
drop policy if exists "subscription_requests_insert" on subscription_requests;
drop policy if exists "subscription_requests_update" on subscription_requests;

create policy "subscription_requests_select" on subscription_requests
  for select to authenticated
  using (public.is_active_user());

create policy "subscription_requests_insert" on subscription_requests
  for insert to authenticated
  with check (public.is_active_user());

create policy "subscription_requests_update" on subscription_requests
  for update to authenticated
  using (public.is_active_user())
  with check (public.is_active_user());
