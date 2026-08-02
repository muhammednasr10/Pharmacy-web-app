-- إصلاح حذف مستخدمي الصيدلية (مصادقة التطبيق المخصصة)
-- شغّل في Supabase → SQL Editor

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
declare
  v_target_pharmacy_id text;
begin
  select pharmacy_id
  into v_target_pharmacy_id
  from public.users
  where uid = trim(p_uid)
  limit 1;

  if not (
    public.is_super_admin()
    or (
      v_target_pharmacy_id is not null
      and public.is_pharmacy_manager()
      and public.can_write_pharmacy_row(v_target_pharmacy_id)
    )
  ) then
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
grant execute on function public.revoke_user_app_access(text, text, text, text) to anon, authenticated;

notify pgrst, 'reload schema';
