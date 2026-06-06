-- Per-shift allowed lateness (minutes) stored inside work_shifts jsonb
-- Run in Supabase SQL Editor (after add-pharmacy-shifts.sql)

update public.pharmacies
set work_shifts = (
  select coalesce(
    jsonb_agg(
      case
        when elem ? 'allowedLateMinutes' then elem
        else elem || jsonb_build_object('allowedLateMinutes', 15)
      end
    ),
    work_shifts
  )
  from jsonb_array_elements(work_shifts) as elem
)
where work_shifts is not null
  and jsonb_array_length(work_shifts) > 0;

notify pgrst, 'reload schema';
