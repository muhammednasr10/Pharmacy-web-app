-- Fast medicine counts for paginated inventory (avoids RLS timeout on large catalogs)
-- Run after multi-tenant-saas.sql

create index if not exists idx_medicines_pharmacy_id_id
  on public.medicines (pharmacy_id, id);

create or replace function public.count_pharmacy_medicines(
  p_pharmacy_id text,
  p_search text default null,
  p_stock_filter text default 'all',
  p_low_stock_threshold integer default 10,
  p_expiring_soon_days integer default 90,
  p_in_stock_only boolean default false
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count bigint;
  v_search text := nullif(btrim(p_search), '');
  v_today date := current_date;
  v_expiring_limit date;
begin
  if coalesce(btrim(p_pharmacy_id), '') = '' then
    raise exception 'pharmacy_required';
  end if;

  if not (public.is_super_admin() or public.can_read_pharmacy_row(p_pharmacy_id)) then
    raise exception 'forbidden';
  end if;

  v_expiring_limit := v_today + make_interval(days => greatest(1, coalesce(p_expiring_soon_days, 90)));

  select count(*)
    into v_count
  from public.medicines m
  where m.pharmacy_id = p_pharmacy_id
    and (not p_in_stock_only or coalesce(m.qty, 0) > 0)
    and (
      v_search is null
      or m.name_ar ilike ('%' || v_search || '%')
      or m.name_en ilike ('%' || v_search || '%')
      or m.barcode ilike ('%' || v_search || '%')
      or coalesce(m.active_ingredient, '') ilike ('%' || v_search || '%')
    )
    and (
      coalesce(p_stock_filter, 'all') = 'all'
      or (p_stock_filter = 'low' and coalesce(m.qty, 0) <= greatest(0, coalesce(p_low_stock_threshold, 10)))
      or (p_stock_filter = 'expired' and m.expiry is not null and m.expiry::date < v_today)
      or (
        p_stock_filter = 'expiring'
        and m.expiry is not null
        and m.expiry::date >= v_today
        and m.expiry::date <= v_expiring_limit
      )
    );

  return coalesce(v_count, 0);
end;
$$;

revoke all on function public.count_pharmacy_medicines(text, text, text, integer, integer, boolean) from public;
grant execute on function public.count_pharmacy_medicines(text, text, text, integer, integer, boolean) to anon, authenticated;

create or replace function public.pharmacy_medicine_stats(
  p_pharmacy_id text,
  p_low_stock_threshold integer default 20,
  p_expiring_soon_days integer default 30
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
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
    count(*) filter (where coalesce(m.qty, 0) <= greatest(0, coalesce(p_low_stock_threshold, 20))),
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
$$;

revoke all on function public.pharmacy_medicine_stats(text, integer, integer) from public;
grant execute on function public.pharmacy_medicine_stats(text, integer, integer) to anon, authenticated;

notify pgrst, 'reload schema';
