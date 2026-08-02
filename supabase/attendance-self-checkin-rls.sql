-- =============================================================================
-- Employee self check-in/out — بوابة الموظف (حضوري)
-- Run AFTER org-hr-access.sql
-- Allows staff to insert/update their own attendance row (not only managers).
-- =============================================================================

create or replace function public.is_own_attendance_user(p_user_id text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.users u
    where u.uid = auth.uid()::text
      and u.is_active = true
      and (
        u.uid = p_user_id
        or u.employee_id = p_user_id
      )
  );
$$;

grant execute on function public.is_own_attendance_user(text) to anon, authenticated;

drop policy if exists "attendance_records_insert" on attendance_records;
drop policy if exists "attendance_records_update" on attendance_records;

create policy "attendance_records_insert" on attendance_records
  for insert to authenticated
  with check (
    public.is_active_user()
    and public.can_write_pharmacy_row(pharmacy_id)
    and (
      (
        public.is_pharmacy_manager()
        and public.can_write_pharmacy_row(pharmacy_id)
      )
      or public.is_own_attendance_user(user_id)
    )
  );

create policy "attendance_records_update" on attendance_records
  for update to authenticated
  using (
    public.is_active_user()
    and public.can_write_pharmacy_row(pharmacy_id)
    and (
      (
        public.is_pharmacy_manager()
        and public.can_write_pharmacy_row(pharmacy_id)
      )
      or public.is_own_attendance_user(user_id)
    )
  )
  with check (
    public.is_active_user()
    and public.can_write_pharmacy_row(pharmacy_id)
    and (
      (
        public.is_pharmacy_manager()
        and public.can_write_pharmacy_row(pharmacy_id)
      )
      or public.is_own_attendance_user(user_id)
    )
  );

notify pgrst, 'reload schema';
