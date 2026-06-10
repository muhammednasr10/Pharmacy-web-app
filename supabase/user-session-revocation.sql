-- Immediate app logout when super admin unlinks a user (run in Supabase SQL Editor)

create table if not exists public.user_session_revocations (
  uid text primary key,
  revoked_at timestamptz not null default now(),
  revoked_by text,
  reason text
);

alter table public.user_session_revocations enable row level security;

drop policy if exists "user_session_revocations_select_own" on public.user_session_revocations;
create policy "user_session_revocations_select_own" on public.user_session_revocations
  for select to authenticated
  using (uid = auth.uid()::text);

create or replace function public.revoke_user_app_access(
  p_uid text,
  p_account_id text default null,
  p_revoked_by text default null,
  p_reason text default 'unlink'
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_super_admin() then
    raise exception 'not_authorized';
  end if;

  if coalesce(trim(p_uid), '') = '' then
    raise exception 'uid_required';
  end if;

  insert into public.user_session_revocations (uid, revoked_by, reason)
  values (trim(p_uid), nullif(trim(p_revoked_by), ''), coalesce(nullif(trim(p_reason), ''), 'unlink'))
  on conflict (uid) do update set
    revoked_at = now(),
    revoked_by = excluded.revoked_by,
    reason = excluded.reason;

  delete from public.users where uid = trim(p_uid);

  if p_account_id is not null and trim(p_account_id) <> '' then
    update public.pharmacy_login_accounts
    set
      link_request_pending = false,
      link_requested_by = null,
      link_requested_by_name = null,
      link_requested_at = null,
      updated_at = now()
    where id = trim(p_account_id);
  end if;
end;
$$;

revoke all on function public.revoke_user_app_access(text, text, text, text) from public;
grant execute on function public.revoke_user_app_access(text, text, text, text) to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    alter publication supabase_realtime add table public.user_session_revocations;
  end if;
exception
  when duplicate_object then null;
end $$;

notify pgrst, 'reload schema';
