-- =============================================================================
-- مسح كل بيانات الأدوية (كل الفروع + الكتالوج المركزي)
-- شغّل في Supabase → SQL Editor
--
-- يحافظ على: الفواتير، المشتريات، المرتجعات (يُفك ارتباط medicine_id فقط)
-- يحذف: medicines, stock_movements, branch_stock_transfers, held_invoices,
--        medicine_catalog_reference
-- =============================================================================

-- فك ارتباط الفواتير والمشتريات قبل الحذف
alter table invoice_items drop constraint if exists invoice_items_medicine_id_fkey;
alter table invoice_items
  add constraint invoice_items_medicine_id_fkey
    foreign key (medicine_id) references medicines(id) on delete set null;

alter table purchases drop constraint if exists purchases_medicine_id_fkey;

do $$
begin
  alter table purchases
    add constraint purchases_medicine_id_fkey
      foreign key (medicine_id) references medicines(id) on delete set null;
exception
  when duplicate_object then null;
end $$;

-- أعداد قبل المسح
select 'before' as phase, 'medicines' as tbl, count(*)::bigint as rows from public.medicines
union all
select 'before', 'medicine_catalog_reference', count(*)::bigint from public.medicine_catalog_reference
union all
select 'before', 'stock_movements', count(*)::bigint from public.stock_movements
union all
select 'before', 'branch_stock_transfers', count(*)::bigint from public.branch_stock_transfers
union all
select 'before', 'held_invoices', count(*)::bigint from public.held_invoices;

do $$
declare
  v_medicines bigint;
  v_catalog bigint;
  v_movements bigint;
  v_transfers bigint;
  v_held bigint;
begin
  update public.invoice_items set medicine_id = null where medicine_id is not null;
  update public.purchases set medicine_id = null where medicine_id is not null;

  delete from public.held_invoices;
  get diagnostics v_held = row_count;

  delete from public.branch_stock_transfers;
  get diagnostics v_transfers = row_count;

  delete from public.stock_movements;
  get diagnostics v_movements = row_count;

  delete from public.medicines;
  get diagnostics v_medicines = row_count;

  if to_regclass('public.medicine_catalog_reference') is not null then
    delete from public.medicine_catalog_reference;
    get diagnostics v_catalog = row_count;
  else
    v_catalog := 0;
  end if;

  raise notice 'cleared medicines: %, catalog_reference: %, stock_movements: %, transfers: %, held_invoices: %',
    v_medicines, v_catalog, v_movements, v_transfers, v_held;
end $$;

-- أعداد بعد المسح (يجب أن تكون 0)
select 'after' as phase, 'medicines' as tbl, count(*)::bigint as rows from public.medicines
union all
select 'after', 'medicine_catalog_reference', count(*)::bigint from public.medicine_catalog_reference
union all
select 'after', 'stock_movements', count(*)::bigint from public.stock_movements
union all
select 'after', 'branch_stock_transfers', count(*)::bigint from public.branch_stock_transfers
union all
select 'after', 'held_invoices', count(*)::bigint from public.held_invoices;

notify pgrst, 'reload schema';
