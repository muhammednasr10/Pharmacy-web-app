-- =============================================================================
-- تسجيل مستخدم جديد من صفحة الدخول (بدون مدير)
-- انسخ → Supabase SQL Editor → Run
-- =============================================================================

-- 1) السماح للمستخدم الجديد بإضافة صفّه (دور كاشير + فرع main)
drop policy if exists "users_self_register" on users;

create policy "users_self_register" on users
  for insert
  to authenticated
  with check (
    uid = auth.uid()::text
    and role = 'cashier'
    and is_active = true
  );

-- 2) عند إنشاء حساب Auth، أضف صفاً في users تلقائياً (يعمل حتى مع تأكيد البريد)
create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_name text;
  v_role text;
  v_pharmacy_id text;
begin
  v_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'name'), ''),
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    split_part(new.email, '@', 1)
  );
  v_role := coalesce(nullif(trim(new.raw_user_meta_data->>'role'), ''), 'cashier');
  v_pharmacy_id := coalesce(nullif(trim(new.raw_user_meta_data->>'pharmacy_id'), ''), 'main');

  if v_role not in ('admin', 'cashier', 'inventory', 'manager') then
    v_role := 'cashier';
  end if;

  insert into public.users (uid, name, email, role, pharmacy_id, is_active)
  values (new.id::text, v_name, new.email, v_role, v_pharmacy_id, true)
  on conflict (uid) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_auth_user();
