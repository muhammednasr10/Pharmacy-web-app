-- Low stock = positive qty at or below threshold (zeros are out_of_stock only).
-- Keep in sync with medicines-pagination-count-rpc.sql + medicines-fetch-page-rpc.sql

create or replace function public.pharmacy_medicine_stats(
  p_pharmacy_id text,
  p_low_stock_threshold integer default 20,
  p_expiring_soon_days integer default 30
)
returns jsonb
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_today date := current_date;
  v_expiring_limit date;
  v_total bigint;
  v_low_stock bigint;
  v_out_of_stock bigint;
  v_expiring bigint;
  v_expired bigint;
  v_in_stock bigint;
begin
  if coalesce(btrim(p_pharmacy_id), '') = '' then
    raise exception 'pharmacy_required';
  end if;

  if not (public.is_super_admin() or public.can_read_pharmacy_row(p_pharmacy_id)) then
    raise exception 'forbidden';
  end if;

  v_expiring_limit := v_today + make_interval(days => greatest(1, coalesce(p_expiring_soon_days, 30)));

  select
    count(*),
    count(*) filter (
      where coalesce(m.qty, 0) > 0
        and coalesce(m.qty, 0) <= greatest(0, coalesce(p_low_stock_threshold, 20))
    ),
    count(*) filter (where coalesce(m.qty, 0) <= 0),
    count(*) filter (
      where m.expiry is not null
        and m.expiry::date >= v_today
        and m.expiry::date <= v_expiring_limit
    ),
    count(*) filter (where m.expiry is not null and m.expiry::date < v_today),
    count(*) filter (where coalesce(m.qty, 0) > 0)
  into v_total, v_low_stock, v_out_of_stock, v_expiring, v_expired, v_in_stock
  from public.medicines m
  where m.pharmacy_id = p_pharmacy_id;

  return jsonb_build_object(
    'total', coalesce(v_total, 0),
    'low_stock', coalesce(v_low_stock, 0),
    'out_of_stock', coalesce(v_out_of_stock, 0),
    'expiring', coalesce(v_expiring, 0),
    'expired', coalesce(v_expired, 0),
    'in_stock', coalesce(v_in_stock, 0)
  );
end;
$function$;

grant execute on function public.pharmacy_medicine_stats(text, integer, integer) to authenticated, service_role;

notify pgrst, 'reload schema';
