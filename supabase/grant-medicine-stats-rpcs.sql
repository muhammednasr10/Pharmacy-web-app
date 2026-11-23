-- Dashboard / inventory catalog counts
grant execute on function public.pharmacy_medicine_stats(text, integer, integer) to authenticated;
grant execute on function public.pharmacy_medicine_stats(text, integer, integer) to service_role;

grant execute on function public.count_pharmacy_medicines(text, text, text, integer, integer, boolean) to authenticated;
grant execute on function public.count_pharmacy_medicines(text, text, text, integer, integer, boolean) to service_role;

revoke execute on function public.pharmacy_medicine_stats(text, integer, integer) from public;
revoke execute on function public.count_pharmacy_medicines(text, text, text, integer, integer, boolean) from public;
