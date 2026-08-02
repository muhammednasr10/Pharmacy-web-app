-- إصلاح JWT (كان فيه أسطر جديدة تمنع auth.uid من الشغل)
-- شغّل هذا الملف في SQL Editor بعد fix-admin-login-now.sql

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

notify pgrst, 'reload schema';
