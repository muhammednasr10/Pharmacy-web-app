-- Username login: resolve username → email for signInWithPassword
-- Run in Supabase SQL Editor

create or replace function public.resolve_login_email(login_identifier text)
returns text
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_id text := lower(trim(login_identifier));
  v_email text;
  v_count int;
begin
  if v_id = '' then
    return null;
  end if;

  -- Already an email
  if position('@' in v_id) > 0 then
    select u.email into v_email
    from public.users u
    where lower(u.email) = v_id
      and u.is_active = true
    limit 1;
    return v_email;
  end if;

  select count(*) into v_count
  from public.users u
  where lower(u.username) = v_id
    and u.is_active = true;

  if v_count = 0 then
    return null;
  end if;

  if v_count > 1 then
    return null;
  end if;

  select u.email into v_email
  from public.users u
  where lower(u.username) = v_id
    and u.is_active = true
  limit 1;

  return v_email;
end;
$$;

revoke all on function public.resolve_login_email(text) from public;
grant execute on function public.resolve_login_email(text) to anon, authenticated;

-- Example: set username for pharmacy admin (change email to yours)
-- update public.users set username = 'admin' where email = 'your@email.com';

notify pgrst, 'reload schema';
