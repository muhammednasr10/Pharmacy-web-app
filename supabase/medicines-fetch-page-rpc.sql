-- Paginated medicine reads for large catalogs (bypasses slow RLS table scans)
-- Run after medicines-pagination-count-rpc.sql

create or replace function public.fetch_pharmacy_medicines_page(
  p_pharmacy_id text,
  p_page integer default 1,
  p_page_size integer default 50,
  p_search text default null,
  p_stock_filter text default 'all',
  p_low_stock_threshold integer default 10,
  p_expiring_soon_days integer default 90,
  p_in_stock_only boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_search text := nullif(btrim(p_search), '');
  v_today date := current_date;
  v_expiring_limit date;
  v_page integer := greatest(1, coalesce(p_page, 1));
  v_page_size integer := greatest(1, least(coalesce(p_page_size, 50), 200));
  v_offset integer;
  v_total bigint;
  v_rows jsonb;
begin
  if coalesce(btrim(p_pharmacy_id), '') = '' then
    raise exception 'pharmacy_required';
  end if;

  if not (public.is_super_admin() or public.can_read_pharmacy_row(p_pharmacy_id)) then
    raise exception 'forbidden';
  end if;

  v_expiring_limit := v_today + make_interval(days => greatest(1, coalesce(p_expiring_soon_days, 90)));
  v_offset := (v_page - 1) * v_page_size;

  select count(*)
    into v_total
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

  select coalesce(jsonb_agg(to_jsonb(page_row) order by page_row.id), '[]'::jsonb)
    into v_rows
  from (
    select m.*
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
      )
    order by m.id
    limit v_page_size
    offset v_offset
  ) page_row;

  return jsonb_build_object(
    'total', coalesce(v_total, 0),
    'rows', coalesce(v_rows, '[]'::jsonb)
  );
end;
$$;

revoke all on function public.fetch_pharmacy_medicines_page(text, integer, integer, text, text, integer, integer, boolean) from public;
grant execute on function public.fetch_pharmacy_medicines_page(text, integer, integer, text, text, integer, integer, boolean) to anon, authenticated;

notify pgrst, 'reload schema';
