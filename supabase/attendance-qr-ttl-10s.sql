-- Reduce rotating attendance QR window from 15s to 10s.
-- Run after secure-attendance-geofence.sql

create or replace function public.build_attendance_qr_token(p_pharmacy_id text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_secret text;
  v_window bigint;
  v_body text;
  v_sig text;
begin
  if coalesce(trim(p_pharmacy_id), '') = '' then
    raise exception 'branch_required';
  end if;

  v_secret := public.ensure_pharmacy_attendance_qr_secret(p_pharmacy_id);
  v_window := floor(extract(epoch from now()))::bigint;
  v_window := v_window - (v_window % 10);
  v_body := p_pharmacy_id || '|' || v_window::text;
  v_sig := encode(hmac(v_body, v_secret, 'sha256'), 'hex');
  return 'ATTQR|' || v_body || '|' || v_sig;
end;
$$;

create or replace function public.verify_attendance_qr_token(p_qr_payload text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_parts text[];
  v_body text;
  v_sig text;
  v_expected_sig text;
  v_secret text;
  v_now bigint;
  v_branch_id text;
  v_window_ts bigint;
begin
  if coalesce(trim(p_qr_payload), '') = '' then
    return jsonb_build_object('valid', false, 'error', 'empty_payload');
  end if;

  v_parts := string_to_array(trim(p_qr_payload), '|');
  if array_length(v_parts, 1) <> 4 or v_parts[1] <> 'ATTQR' then
    return jsonb_build_object('valid', false, 'error', 'invalid_format');
  end if;

  v_branch_id := nullif(trim(v_parts[2]), '');
  v_window_ts := nullif(trim(v_parts[3]), '')::bigint;
  v_sig := lower(trim(v_parts[4]));

  if v_branch_id is null or v_window_ts is null or v_sig is null then
    return jsonb_build_object('valid', false, 'error', 'invalid_format');
  end if;

  v_now := floor(extract(epoch from now()))::bigint;
  if v_now < v_window_ts or (v_now - v_window_ts) > 10 then
    return jsonb_build_object('valid', false, 'error', 'qr_expired', 'branch_id', v_branch_id);
  end if;

  v_secret := public.ensure_pharmacy_attendance_qr_secret(v_branch_id);
  v_body := v_branch_id || '|' || v_window_ts::text;
  v_expected_sig := encode(hmac(v_body, v_secret, 'sha256'), 'hex');

  if v_expected_sig <> v_sig then
    return jsonb_build_object('valid', false, 'error', 'invalid_signature');
  end if;

  return jsonb_build_object('valid', true, 'branch_id', v_branch_id, 'window_ts', v_window_ts);
end;
$$;
