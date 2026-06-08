-- Run in Supabase SQL Editor
-- Admin choice when employee checks out early: permission (إذن) or deduction (خصم)

alter table public.attendance_records
  add column if not exists early_leave_outcome text;

alter table public.attendance_records
  drop constraint if exists attendance_records_early_leave_outcome_check;

alter table public.attendance_records
  add constraint attendance_records_early_leave_outcome_check
  check (early_leave_outcome is null or early_leave_outcome in ('permission', 'deduction'));
