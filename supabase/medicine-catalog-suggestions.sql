-- Pharmacy suggestions to update central medicine catalog (buy/sell/barcode).
-- Super admin reviews in Management → Suggestions.

create table if not exists public.medicine_catalog_suggestions (
  id uuid primary key default gen_random_uuid(),
  pharmacy_id text not null,
  medicine_id text not null,
  medicine_name_ar text not null default '',
  medicine_name_en text not null default '',
  old_barcode text not null default '',
  new_barcode text not null default '',
  old_buy_price numeric,
  new_buy_price numeric,
  old_sell_price numeric,
  new_sell_price numeric,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  requested_by_id text,
  requested_by_name text,
  reviewed_by_id text,
  reviewed_by_name text,
  review_note text,
  created_at timestamptz not null default timezone('utc'::text, now()),
  reviewed_at timestamptz
);

create index if not exists medicine_catalog_suggestions_status_idx
  on public.medicine_catalog_suggestions (status, created_at desc);

create index if not exists medicine_catalog_suggestions_pharmacy_idx
  on public.medicine_catalog_suggestions (pharmacy_id, created_at desc);

alter table public.medicine_catalog_suggestions enable row level security;

drop policy if exists medicine_catalog_suggestions_select on public.medicine_catalog_suggestions;
create policy medicine_catalog_suggestions_select
  on public.medicine_catalog_suggestions
  for select
  to authenticated, anon
  using (
    public.is_super_admin()
    or (public.is_active_user() and public.can_read_pharmacy_row(pharmacy_id))
  );

drop policy if exists medicine_catalog_suggestions_insert on public.medicine_catalog_suggestions;
create policy medicine_catalog_suggestions_insert
  on public.medicine_catalog_suggestions
  for insert
  to authenticated, anon
  with check (
    public.is_super_admin()
    or (public.is_active_user() and public.can_write_pharmacy_row(pharmacy_id))
  );

drop policy if exists medicine_catalog_suggestions_update on public.medicine_catalog_suggestions;
create policy medicine_catalog_suggestions_update
  on public.medicine_catalog_suggestions
  for update
  to authenticated, anon
  using (public.is_super_admin())
  with check (public.is_super_admin());

create or replace function public.approve_medicine_catalog_suggestion(
  p_suggestion_id uuid,
  p_reviewer_id text default null,
  p_reviewer_name text default null,
  p_review_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.medicine_catalog_suggestions%rowtype;
  v_catalog_id bigint;
  v_updated integer := 0;
begin
  if not public.is_super_admin() then
    raise exception 'forbidden';
  end if;

  select * into v_row
  from public.medicine_catalog_suggestions
  where id = p_suggestion_id
  for update;

  if not found then
    raise exception 'suggestion_not_found';
  end if;

  if v_row.status <> 'pending' then
    raise exception 'suggestion_not_pending';
  end if;

  select ref.id into v_catalog_id
  from public.medicine_catalog_reference ref
  where ref.barcode = nullif(btrim(v_row.old_barcode), '')
  order by ref.id
  limit 1;

  if v_catalog_id is null and nullif(btrim(v_row.new_barcode), '') is not null then
    select ref.id into v_catalog_id
    from public.medicine_catalog_reference ref
    where ref.barcode = btrim(v_row.new_barcode)
    order by ref.id
    limit 1;
  end if;

  if v_catalog_id is null then
    insert into public.medicine_catalog_reference (
      name_ar,
      name_en,
      barcode,
      qty,
      price,
      buy_price,
      expiry
    ) values (
      coalesce(nullif(btrim(v_row.medicine_name_ar), ''), 'دواء'),
      coalesce(nullif(btrim(v_row.medicine_name_en), ''), 'Medicine'),
      coalesce(nullif(btrim(v_row.new_barcode), ''), nullif(btrim(v_row.old_barcode), ''), gen_random_uuid()::text),
      0,
      coalesce(v_row.new_sell_price, v_row.old_sell_price, 0),
      coalesce(v_row.new_buy_price, v_row.old_buy_price),
      date '2099-12-31'
    )
    returning id into v_catalog_id;
    v_updated := 1;
  else
    update public.medicine_catalog_reference
    set
      barcode = coalesce(nullif(btrim(v_row.new_barcode), ''), barcode),
      buy_price = coalesce(v_row.new_buy_price, buy_price),
      price = coalesce(v_row.new_sell_price, price),
      name_ar = case
        when nullif(btrim(v_row.medicine_name_ar), '') is null then name_ar
        else btrim(v_row.medicine_name_ar)
      end,
      name_en = case
        when nullif(btrim(v_row.medicine_name_en), '') is null then name_en
        else btrim(v_row.medicine_name_en)
      end
    where id = v_catalog_id;
    get diagnostics v_updated = row_count;
  end if;

  update public.medicine_catalog_suggestions
  set
    status = 'approved',
    reviewed_by_id = nullif(btrim(coalesce(p_reviewer_id, '')), ''),
    reviewed_by_name = nullif(btrim(coalesce(p_reviewer_name, '')), ''),
    review_note = nullif(btrim(coalesce(p_review_note, '')), ''),
    reviewed_at = timezone('utc'::text, now())
  where id = p_suggestion_id;

  return jsonb_build_object(
    'ok', true,
    'catalog_id', v_catalog_id,
    'updated', v_updated
  );
end;
$$;

create or replace function public.reject_medicine_catalog_suggestion(
  p_suggestion_id uuid,
  p_reviewer_id text default null,
  p_reviewer_name text default null,
  p_review_note text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
begin
  if not public.is_super_admin() then
    raise exception 'forbidden';
  end if;

  select status into v_status
  from public.medicine_catalog_suggestions
  where id = p_suggestion_id
  for update;

  if not found then
    raise exception 'suggestion_not_found';
  end if;

  if v_status <> 'pending' then
    raise exception 'suggestion_not_pending';
  end if;

  update public.medicine_catalog_suggestions
  set
    status = 'rejected',
    reviewed_by_id = nullif(btrim(coalesce(p_reviewer_id, '')), ''),
    reviewed_by_name = nullif(btrim(coalesce(p_reviewer_name, '')), ''),
    review_note = nullif(btrim(coalesce(p_review_note, '')), ''),
    reviewed_at = timezone('utc'::text, now())
  where id = p_suggestion_id;

  return jsonb_build_object('ok', true);
end;
$$;

revoke all on function public.approve_medicine_catalog_suggestion(uuid, text, text, text) from public;
grant execute on function public.approve_medicine_catalog_suggestion(uuid, text, text, text)
  to authenticated, anon;

revoke all on function public.reject_medicine_catalog_suggestion(uuid, text, text, text) from public;
grant execute on function public.reject_medicine_catalog_suggestion(uuid, text, text, text)
  to authenticated, anon;

notify pgrst, 'reload schema';
