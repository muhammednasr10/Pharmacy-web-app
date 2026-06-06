-- Pharmacy shifts A/B/C + employee assignment + sales/attendance integration
-- Run in Supabase SQL Editor (after add-work-schedule-settings.sql)

alter table public.pharmacies add column if not exists work_shifts jsonb not null default '[
  {"id":"A","label":"Shift A","labelAr":"شيفت أ","dayStart":"08:00","dayEnd":"16:00","breaks":[{"start":"12:00","end":"13:00"}]},
  {"id":"B","label":"Shift B","labelAr":"شيفت ب","dayStart":"16:00","dayEnd":"00:00","breaks":[]},
  {"id":"C","label":"Shift C","labelAr":"شيفت ج","dayStart":"00:00","dayEnd":"08:00","breaks":[]}
]'::jsonb;

alter table public.pharmacies add column if not exists default_shift_id text not null default 'A';

alter table public.employees add column if not exists assigned_shift_id text not null default 'A';

alter table public.invoices add column if not exists shift_id text;
alter table public.attendance_records add column if not exists shift_id text;

-- Migrate legacy single schedule into shift A when work_shifts is empty
update public.pharmacies
set work_shifts = jsonb_build_array(
  jsonb_build_object(
    'id', 'A',
    'label', 'Shift A',
    'labelAr', 'شيفت أ',
    'dayStart', coalesce(payroll_work_day_start, '08:00'),
    'dayEnd', coalesce(payroll_work_day_end, '16:00'),
    'breaks', coalesce(payroll_work_breaks, '[]'::jsonb)
  ),
  jsonb_build_object('id', 'B', 'label', 'Shift B', 'labelAr', 'شيفت ب', 'dayStart', '16:00', 'dayEnd', '00:00', 'breaks', '[]'::jsonb),
  jsonb_build_object('id', 'C', 'label', 'Shift C', 'labelAr', 'شيفت ج', 'dayStart', '00:00', 'dayEnd', '08:00', 'breaks', '[]'::jsonb)
)
where work_shifts is null
   or work_shifts = '[]'::jsonb
   or jsonb_array_length(work_shifts) < 3;

update public.employees
set assigned_shift_id = 'A'
where assigned_shift_id is null or assigned_shift_id = '';

notify pgrst, 'reload schema';
