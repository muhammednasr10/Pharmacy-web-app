-- =============================================================================
-- Secure attendance — Dynamic QR (15s) + GPS geofencing
-- Maps: pharmacies.id = branch_id, attendance_records = attendance log
-- Run AFTER attendance-self-checkin-rls.sql
-- =============================================================================

create extension if not exists pgcrypto;

alter table public.pharmacies
  add column if not exists latitude double precision,
  add column if not exists longitude double precision,
  add column if not exists geofence_radius_m integer not null default 30,
  add column if not exists attendance_qr_secret text;

comment on column public.pharmacies.latitude is 'Branch GPS latitude for attendance geofence';
comment on column public.pharmacies.longitude is 'Branch GPS longitude for attendance geofence';
comment on column public.pharmacies.geofence_radius_m is 'Allowed check-in radius in meters (default 30)';
comment on column public.pharmacies.attendance_qr_secret is 'HMAC secret for rotating attendance QR tokens';

-- Optional audit columns on attendance_records
alter table public.attendance_records
  add column if not exists check_in_lat double precision,
  add column if not exists check_in_lng double precision,
  add column if not exists check_out_lat double precision,
  add column if not exists check_out_lng double precision,
  add column if not exists check_in_distance_m double precision,
  add column if not exists check_out_distance_m double precision;

create or replace function public.ensure_pharmacy_attendance_qr_secret(p_pharmacy_id text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_secret text;
begin
  select attendance_qr_secret
  into v_secret
  from public.pharmacies
  where id = p_pharmacy_id;

  if v_secret is null or length(trim(v_secret)) = 0 then
    v_secret := encode(gen_random_bytes(32), 'hex');
    update public.pharmacies
    set attendance_qr_secret = v_secret,
        updated_at = now()
    where id = p_pharmacy_id;
  end if;

  return v_secret;
end;
$$;

create or replace function public.haversine_meters(
  p_lat1 double precision,
  p_lon1 double precision,
  p_lat2 double precision,
  p_lon2 double precision
)
returns double precision
language sql
immutable
as $$
  select case
    when p_lat1 is null or p_lon1 is null or p_lat2 is null or p_lon2 is null then null
    else 6371000 * 2 * asin(
      sqrt(
        power(sin(radians(p_lat2 - p_lat1) / 2), 2)
        + cos(radians(p_lat1)) * cos(radians(p_lat2)) * power(sin(radians(p_lon2 - p_lon1) / 2), 2)
      )
    )
  end;
$$;

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

-- POS display: rotating QR payload (call every ~15s)
create or replace function public.get_dynamic_attendance_qr(p_pharmacy_id text)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_active_user() then
    raise exception 'not_authorized';
  end if;

  if not public.can_read_pharmacy_row(p_pharmacy_id) then
    raise exception 'not_authorized';
  end if;

  return public.build_attendance_qr_token(p_pharmacy_id);
end;
$$;

-- Employee mobile: scan QR + GPS → check in/out
create or replace function public.process_secure_attendance(
  p_qr_payload text,
  p_latitude double precision,
  p_longitude double precision,
  p_action text default 'check_in'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid text;
  v_user record;
  v_employee record;
  v_branch record;
  v_branch_id text;
  v_qr_check jsonb;
  v_distance double precision;
  v_radius integer;
  v_work_date text;
  v_attendance_user_id text;
  v_user_name text;
  v_existing record;
  v_now timestamptz := now();
  v_action text;
begin
  v_action := lower(coalesce(trim(p_action), 'check_in'));
  if v_action not in ('check_in', 'check_out') then
    return jsonb_build_object('ok', false, 'error', 'invalid_action');
  end if;

  if not public.is_active_user() then
    return jsonb_build_object('ok', false, 'error', 'not_authorized');
  end if;

  if p_latitude is null or p_longitude is null then
    return jsonb_build_object('ok', false, 'error', 'location_required');
  end if;

  v_qr_check := public.verify_attendance_qr_token(p_qr_payload);
  if coalesce((v_qr_check->>'valid')::boolean, false) is not true then
    return jsonb_build_object(
      'ok', false,
      'error', coalesce(v_qr_check->>'error', 'qr_expired_or_invalid')
    );
  end if;

  v_branch_id := v_qr_check->>'branch_id';

  select *
  into v_branch
  from public.pharmacies
  where id = v_branch_id;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'branch_not_found');
  end if;

  if v_branch.latitude is null or v_branch.longitude is null then
    return jsonb_build_object('ok', false, 'error', 'branch_location_not_configured');
  end if;

  v_radius := coalesce(v_branch.geofence_radius_m, 30);
  v_distance := public.haversine_meters(
    p_latitude,
    p_longitude,
    v_branch.latitude,
    v_branch.longitude
  );

  if v_distance is null or v_distance > v_radius then
    return jsonb_build_object(
      'ok', false,
      'error', 'outside_geofence',
      'distance_m', round(v_distance::numeric, 1),
      'allowed_m', v_radius
    );
  end if;

  v_uid := auth.uid()::text;
  select *
  into v_user
  from public.users
  where uid = v_uid
    and is_active = true
  limit 1;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'user_not_found');
  end if;

  if v_user.employee_id is not null then
    select *
    into v_employee
    from public.employees
    where id = v_user.employee_id
      and is_active = true
    limit 1;
  end if;

  if not found then
    select *
    into v_employee
    from public.employees
    where pharmacy_id = v_branch_id
      and is_active = true
      and (
        id = v_uid
        or lower(trim(coalesce(employee_code, ''))) = lower(trim(coalesce(v_user.email, '')))
      )
    limit 1;
  end if;

  if not found then
    return jsonb_build_object('ok', false, 'error', 'employee_not_linked');
  end if;

  if v_employee.pharmacy_id <> v_branch_id then
    return jsonb_build_object('ok', false, 'error', 'employee_wrong_branch');
  end if;

  v_attendance_user_id := coalesce(nullif(trim(v_uid), ''), v_employee.id);
  v_user_name := coalesce(nullif(trim(v_employee.name), ''), nullif(trim(v_user.name), ''), 'Employee');
  v_work_date := (timezone('utc', v_now))::date::text;

  select *
  into v_existing
  from public.attendance_records
  where pharmacy_id = v_branch_id
    and user_id = v_attendance_user_id
    and work_date = v_work_date
  limit 1;

  if v_action = 'check_in' then
    if v_existing.check_in is not null then
      return jsonb_build_object('ok', false, 'error', 'already_checked_in');
    end if;

    insert into public.attendance_records (
      id,
      pharmacy_id,
      user_id,
      user_name,
      work_date,
      check_in,
      status,
      check_in_lat,
      check_in_lng,
      check_in_distance_m,
      created_at,
      updated_at
    )
    values (
      coalesce(v_existing.id, public.next_table_row_id('public.attendance_records'::regclass)),
      v_branch_id,
      v_attendance_user_id,
      v_user_name,
      v_work_date,
      v_now,
      coalesce(nullif(v_existing.status, 'absent'), 'present'),
      p_latitude,
      p_longitude,
      round(v_distance::numeric, 1),
      coalesce(v_existing.created_at, v_now),
      v_now
    )
    on conflict (pharmacy_id, user_id, work_date)
    do update set
      check_in = excluded.check_in,
      status = excluded.status,
      check_in_lat = excluded.check_in_lat,
      check_in_lng = excluded.check_in_lng,
      check_in_distance_m = excluded.check_in_distance_m,
      user_name = excluded.user_name,
      updated_at = excluded.updated_at
    where public.attendance_records.check_in is null;

    return jsonb_build_object(
      'ok', true,
      'action', 'check_in',
      'branch_id', v_branch_id,
      'work_date', v_work_date,
      'distance_m', round(v_distance::numeric, 1)
    );
  end if;

  if v_existing.check_in is null then
    return jsonb_build_object('ok', false, 'error', 'check_in_required');
  end if;

  if v_existing.check_out is not null then
    return jsonb_build_object('ok', false, 'error', 'already_checked_out');
  end if;

  update public.attendance_records
  set check_out = v_now,
      check_out_lat = p_latitude,
      check_out_lng = p_longitude,
      check_out_distance_m = round(v_distance::numeric, 1),
      updated_at = v_now
  where pharmacy_id = v_branch_id
    and user_id = v_attendance_user_id
    and work_date = v_work_date;

  return jsonb_build_object(
    'ok', true,
    'action', 'check_out',
    'branch_id', v_branch_id,
    'work_date', v_work_date,
    'distance_m', round(v_distance::numeric, 1)
  );
end;
$$;

grant execute on function public.haversine_meters(double precision, double precision, double precision, double precision) to authenticated;
grant execute on function public.get_dynamic_attendance_qr(text) to authenticated;
grant execute on function public.process_secure_attendance(text, double precision, double precision, text) to authenticated;

notify pgrst, 'reload schema';
