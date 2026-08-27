-- Allow held invoices on any org branch the user can write (not only home pharmacy_id).
-- Fixes: new row violates row-level security policy for table "held_invoices"
-- when POS active warehouse differs from users.pharmacy_id (e.g. مخزن زايد).

drop policy if exists "held_invoices_select" on public.held_invoices;
drop policy if exists "held_invoices_insert" on public.held_invoices;
drop policy if exists "held_invoices_update" on public.held_invoices;
drop policy if exists "held_invoices_delete" on public.held_invoices;

create policy "held_invoices_select" on public.held_invoices
  for select to authenticated
  using (
    public.is_active_user()
    and public.can_read_pharmacy_row(pharmacy_id)
  );

create policy "held_invoices_insert" on public.held_invoices
  for insert to authenticated
  with check (
    public.is_active_user()
    and public.can_access_pharmacy_row(pharmacy_id)
  );

create policy "held_invoices_update" on public.held_invoices
  for update to authenticated
  using (
    public.is_active_user()
    and public.can_access_pharmacy_row(pharmacy_id)
  )
  with check (
    public.is_active_user()
    and public.can_access_pharmacy_row(pharmacy_id)
  );

create policy "held_invoices_delete" on public.held_invoices
  for delete to authenticated
  using (
    public.is_active_user()
    and public.can_access_pharmacy_row(pharmacy_id)
  );
