-- =============================================================================
-- إصلاح تسجيل الدخول فوراً (شغّل الملف كامل في SQL Editor)
-- الإيميل: admin@victory.com أو admin@pharmacy.com
-- كلمة المرور: Mn01125526012#
-- =============================================================================

create extension if not exists pgcrypto with schema extensions;

-- -----------------------------------------------------------------------------
-- 1) JWT secret (انسخه من Supabase → Settings → JWT Keys → Legacy JWT Secret)
--    الصق القيمة مكان YOUR_JWT_SECRET_HERE ثم شغّل الملف كامل
-- -----------------------------------------------------------------------------

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

-- -----------------------------------------------------------------------------
-- 2) Helpers
-- -----------------------------------------------------------------------------

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

create or replace function public.base64url_encode(p_data bytea)
returns text
language sql
immutable
as $$
  select replace(
    replace(
      rtrim(replace(encode(p_data, 'base64'), E'\n', ''), '='),
      '+',
      '-'
    ),
    '/',
    '_'
  );
$$;

create or replace function public.sign_app_access_token(p_uid text)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_secret text;
  v_header text;
  v_payload text;
  v_signing_input text;
  v_sig bytea;
begin
  select value into v_secret
  from public.app_auth_settings
  where key = 'jwt_secret'
  limit 1;

  if v_secret is null or v_secret = '' or v_secret = 'YOUR_JWT_SECRET_HERE' then
    raise exception 'jwt_secret_not_configured';
  end if;

  v_header := public.base64url_encode(convert_to('{"alg":"HS256","typ":"JWT"}', 'utf8'));
  v_payload := public.base64url_encode(
    convert_to(
      (
        json_build_object(
          'sub', p_uid,
          'role', 'authenticated',
          'aud', 'authenticated',
          'iat', extract(epoch from now())::bigint,
          'exp', (extract(epoch from now()) + 604800)::bigint
        )
      )::text,
      'utf8'
    )
  );

  v_signing_input := v_header || '.' || v_payload;
  v_sig := extensions.hmac(v_signing_input, v_secret, 'sha256');

  return v_signing_input || '.' || public.base64url_encode(v_sig);
end;
$$;

revoke all on function public.sign_app_access_token(text) from public;

-- -----------------------------------------------------------------------------
-- 3) Login RPC (يستدعيه التطبيق مباشرة — بدون Edge Function)
-- -----------------------------------------------------------------------------

create or replace function public.app_client_login(p_email text, p_password text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.users%rowtype;
begin
  select * into v_row
  from public.users
  where lower(email) = lower(trim(p_email))
  limit 1;

  if not found then
    raise exception 'invalid_credentials';
  end if;

  if v_row.is_active is distinct from true then
    raise exception 'user_inactive';
  end if;

  if not public.verify_app_password(p_password, v_row.password_hash) then
    raise exception 'invalid_credentials';
  end if;

  if v_row.password_hash not like '$2%' then
    update public.users
    set password_hash = public.hash_app_password(p_password),
        updated_at = now()
    where uid = v_row.uid;
  end if;

  return jsonb_build_object(
    'access_token', public.sign_app_access_token(v_row.uid),
    'user', jsonb_build_object(
      'uid', v_row.uid,
      'email', v_row.email,
      'name', v_row.name,
      'role', v_row.role,
      'pharmacy_id', v_row.pharmacy_id,
      'is_active', v_row.is_active
    )
  );
end;
$$;

revoke all on function public.app_client_login(text, text) from public;
grant execute on function public.app_client_login(text, text) to anon, authenticated;

-- -----------------------------------------------------------------------------
-- 4) كلمة مرور المالك
-- -----------------------------------------------------------------------------

update public.users
set password_hash = public.hash_app_password('Mn01125526012#'),
    is_active = true,
    updated_at = now()
where lower(email) in ('admin@pharmacy.com', 'admin@victory.com');

-- -----------------------------------------------------------------------------
-- 5) تحقق
-- -----------------------------------------------------------------------------

select email, role,
       left(password_hash, 4) as hash_type,
       length(password_hash) as hash_len
from public.users
where lower(email) = 'admin@pharmacy.com';

-- اختبار (يجب أن يرجع access_token — إن فشل راجع jwt_secret):
-- select public.app_client_login('admin@pharmacy.com', 'Mn01125526012#');

notify pgrst, 'reload schema';
