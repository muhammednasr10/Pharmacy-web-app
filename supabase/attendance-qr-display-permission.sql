-- Allow any branch staff to display attendance QR on «حضوري» (read access is enough).
-- Run if get_dynamic_attendance_qr still requires write permission.

create or replace function public.get_dynamic_attendance_qr(p_pharmacy_id text)
returns text
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_active_user() then
    raise exception 'not_authorized';
  end if;

  if not public.can_read_pharmacy_row(p_pharmacy_id) then
    raise exception 'not_authorized';
  end if;

  return public.build_attendance_qr_token(p_pharmacy_id);
end;
$$;

notify pgrst, 'reload schema';
