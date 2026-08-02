-- =============================================================================
-- إعادة ضبط دخول مالك النظام (Super Admin)
-- شغّل في Supabase → SQL Editor
--
-- الإيميل الافتراضي: admin@victory.com
-- كلمة المرور: Mn01125526012#
--
-- قبل التشغيل: الصق JWT Secret من Supabase → Settings → API → Legacy JWT Secret
-- في السطر المعلّم أدناه (مثل fix-admin-login-now.sql)
-- =============================================================================

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.app_auth_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

alter table public.app_auth_settings enable row level security;
revoke all on table public.app_auth_settings from anon, authenticated;

insert into public.app_auth_settings (key, value)
values ('jwt_secret', 'YOUR_JWT_SECRET_HERE')
on conflict (key) do update
  set value = excluded.value, updated_at = now();

create or replace function public.hash_app_password(p_password text)
returns text
language sql
immutable
set search_path = public, extensions
as $$
  select extensions.crypt(p_password, extensions.gen_salt('bf'));
$$;

create or replace function public.verify_app_password(p_password text, p_hash text)
returns boolean
language sql
immutable
set search_path = public, extensions
as $$
  select p_hash is not null
    and p_hash <> ''
    and (
      extensions.crypt(p_password, p_hash) = p_hash
      or (p_hash not like '$2%' and p_password = p_hash)
    );
$$;

do $$
declare
  v_owner_email text := 'admin@victory.com';
  v_password text := 'Mn01125526012#';
  v_uid text;
  v_updated integer;
begin
  update public.users
  set
    password_hash = public.hash_app_password(v_password),
    role = 'super_admin',
    pharmacy_id = coalesce(nullif(trim(pharmacy_id), ''), 'main'),
    is_active = true,
    updated_at = now()
  where lower(email) in ('admin@victory.com', 'admin@pharmacy.com');

  get diagnostics v_updated = row_count;

  if v_updated = 0 then
    v_uid := gen_random_uuid()::text;
    insert into public.users (uid, name, email, role, pharmacy_id, is_active, password_hash)
    values (
      v_uid,
      'مدير النظام',
      v_owner_email,
      'super_admin',
      'main',
      true,
      public.hash_app_password(v_password)
    );
  end if;
end $$;

-- تحقق سريع
select
  email,
  role,
  pharmacy_id,
  is_active,
  case when password_hash is null or password_hash = '' then 'no' else 'yes' end as has_password
from public.users
where lower(email) in ('admin@victory.com', 'admin@pharmacy.com')
   or role = 'super_admin'
order by email;

-- بعد وضع JWT Secret الصحيح جرّب:
-- select public.app_client_login('admin@victory.com', 'Mn01125526012#');

notify pgrst, 'reload schema';
