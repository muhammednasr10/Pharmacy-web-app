-- =============================================================================
-- Org-wide HR access — المدير العام يرى موظفي كل فروع المجموعة
-- Run AFTER accountant-org-read.sql (uses can_read_pharmacy_row / can_write_pharmacy_row)
-- =============================================================================

-- employees
drop policy if exists "employees_select" on employees;
drop policy if exists "employees_insert" on employees;
drop policy if exists "employees_update" on employees;
drop policy if exists "employees_delete" on employees;

create policy "employees_select" on employees for select to authenticated
  using (
    public.is_active_user()
    and (public.is_super_admin() or public.can_read_pharmacy_row(pharmacy_id))
  );

create policy "employees_insert" on employees for insert to authenticated
  with check (
    public.is_active_user()
    and public.is_pharmacy_manager()
    and public.can_write_pharmacy_row(pharmacy_id)
  );

create policy "employees_update" on employees for update to authenticated
  using (
    public.is_active_user()
    and public.is_pharmacy_manager()
    and public.can_write_pharmacy_row(pharmacy_id)
  )
  with check (
    public.is_active_user()
    and public.is_pharmacy_manager()
    and public.can_write_pharmacy_row(pharmacy_id)
  );

create policy "employees_delete" on employees for delete to authenticated
  using (
    public.is_active_user()
    and public.is_pharmacy_manager()
    and public.can_write_pharmacy_row(pharmacy_id)
  );

-- employee_profiles
drop policy if exists "employee_profiles_select" on employee_profiles;
drop policy if exists "employee_profiles_insert" on employee_profiles;
drop policy if exists "employee_profiles_update" on employee_profiles;
drop policy if exists "employee_profiles_delete" on employee_profiles;

create policy "employee_profiles_select" on employee_profiles for select to authenticated
  using (
    public.is_active_user()
    and (public.is_super_admin() or public.can_read_pharmacy_row(pharmacy_id))
  );

create policy "employee_profiles_insert" on employee_profiles for insert to authenticated
  with check (
    public.is_active_user()
    and public.is_pharmacy_manager()
    and public.can_write_pharmacy_row(pharmacy_id)
  );

create policy "employee_profiles_update" on employee_profiles for update to authenticated
  using (
    public.is_active_user()
    and public.is_pharmacy_manager()
    and public.can_write_pharmacy_row(pharmacy_id)
  )
  with check (
    public.is_active_user()
    and public.is_pharmacy_manager()
    and public.can_write_pharmacy_row(pharmacy_id)
  );

create policy "employee_profiles_delete" on employee_profiles for delete to authenticated
  using (
    public.is_active_user()
    and public.is_pharmacy_manager()
    and public.can_write_pharmacy_row(pharmacy_id)
  );

-- attendance_records
drop policy if exists "attendance_records_select" on attendance_records;
drop policy if exists "attendance_records_insert" on attendance_records;
drop policy if exists "attendance_records_update" on attendance_records;
drop policy if exists "attendance_records_delete" on attendance_records;

create policy "attendance_records_select" on attendance_records for select to authenticated
  using (
    public.is_active_user()
    and (public.is_super_admin() or public.can_read_pharmacy_row(pharmacy_id))
  );

create policy "attendance_records_insert" on attendance_records for insert to authenticated
  with check (
    public.is_active_user()
    and public.is_pharmacy_manager()
    and public.can_write_pharmacy_row(pharmacy_id)
  );

create policy "attendance_records_update" on attendance_records for update to authenticated
  using (
    public.is_active_user()
    and public.is_pharmacy_manager()
    and public.can_write_pharmacy_row(pharmacy_id)
  )
  with check (
    public.is_active_user()
    and public.is_pharmacy_manager()
    and public.can_write_pharmacy_row(pharmacy_id)
  );

create policy "attendance_records_delete" on attendance_records for delete to authenticated
  using (
    public.is_active_user()
    and public.is_pharmacy_manager()
    and public.can_write_pharmacy_row(pharmacy_id)
  );

-- payroll_records
drop policy if exists "payroll_records_select" on payroll_records;
drop policy if exists "payroll_records_insert" on payroll_records;
drop policy if exists "payroll_records_update" on payroll_records;
drop policy if exists "payroll_records_delete" on payroll_records;

create policy "payroll_records_select" on payroll_records for select to authenticated
  using (
    public.is_active_user()
    and (public.is_super_admin() or public.can_read_pharmacy_row(pharmacy_id))
  );

create policy "payroll_records_insert" on payroll_records for insert to authenticated
  with check (
    public.is_active_user()
    and public.is_pharmacy_manager()
    and public.can_write_pharmacy_row(pharmacy_id)
  );

create policy "payroll_records_update" on payroll_records for update to authenticated
  using (
    public.is_active_user()
    and public.is_pharmacy_manager()
    and public.can_write_pharmacy_row(pharmacy_id)
  )
  with check (
    public.is_active_user()
    and public.is_pharmacy_manager()
    and public.can_write_pharmacy_row(pharmacy_id)
  );

create policy "payroll_records_delete" on payroll_records for delete to authenticated
  using (
    public.is_active_user()
    and public.is_pharmacy_manager()
    and public.can_write_pharmacy_row(pharmacy_id)
  );

-- employee_requests
drop policy if exists "employee_requests_select" on employee_requests;
drop policy if exists "employee_requests_insert" on employee_requests;
drop policy if exists "employee_requests_update" on employee_requests;

create policy "employee_requests_select" on employee_requests for select to authenticated
  using (
    public.is_active_user()
    and (public.is_super_admin() or public.can_read_pharmacy_row(pharmacy_id))
  );

create policy "employee_requests_insert" on employee_requests for insert to authenticated
  with check (
    public.is_active_user()
    and public.can_write_pharmacy_row(pharmacy_id)
  );

create policy "employee_requests_update" on employee_requests for update to authenticated
  using (
    public.is_active_user()
    and public.is_pharmacy_manager()
    and public.can_write_pharmacy_row(pharmacy_id)
  )
  with check (
    public.is_active_user()
    and public.is_pharmacy_manager()
    and public.can_write_pharmacy_row(pharmacy_id)
  );

notify pgrst, 'reload schema';
