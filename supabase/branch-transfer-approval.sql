-- =============================================================================
-- Branch transfer approval — اعتماد نقل المخزون بين الفروع
-- Run AFTER branch-stock-transfers.sql and branch-manager-role.sql
-- =============================================================================

alter table branch_stock_transfers
  add column if not exists status text not null default 'completed';

alter table branch_stock_transfers
  add column if not exists reviewed_by text,
  add column if not exists reviewed_by_name text,
  add column if not exists reviewed_at timestamptz,
  add column if not exists rejection_reason text;

alter table branch_stock_transfers
  drop constraint if exists branch_stock_transfers_status_check;

alter table branch_stock_transfers
  add constraint branch_stock_transfers_status_check
  check (status in ('pending', 'completed', 'rejected'));

create index if not exists idx_branch_stock_transfers_pending
  on branch_stock_transfers (status, to_pharmacy_id, created_at desc)
  where status = 'pending';

drop policy if exists "branch_stock_transfers_update" on branch_stock_transfers;

create policy "branch_stock_transfers_update" on branch_stock_transfers
  for update to authenticated
  using (
    public.is_super_admin()
    or (
      public.is_active_user()
      and status = 'pending'
      and (
        public.is_org_pharmacy_admin()
        or (
          public.is_branch_manager()
          and to_pharmacy_id = public.current_user_pharmacy_id()
        )
      )
    )
  )
  with check (
    public.is_super_admin()
    or (
      public.is_active_user()
      and status in ('completed', 'rejected')
      and (
        public.is_org_pharmacy_admin()
        or (
          public.is_branch_manager()
          and to_pharmacy_id = public.current_user_pharmacy_id()
        )
      )
    )
  );

notify pgrst, 'reload schema';
