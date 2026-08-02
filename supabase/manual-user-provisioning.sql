-- =============================================================================
-- إضافة مستخدم يدوياً (بدون Supabase Auth)
-- المصدر الرسمي: جدول public.users + password_hash
-- شغّل أولاً: supabase/custom-app-auth.sql
-- =============================================================================

-- 1) تحقق من المستخدمين الموجودين:
-- select uid, email, role, pharmacy_id,
--        case when password_hash is null or password_hash = '' then 'no' else 'yes' end as has_password
-- from public.users
-- order by email;

-- 2) إذا الإيميل غير موجود — أنشئ مالك النظام (غيّر القيم):
-- insert into public.users (uid, name, email, role, pharmacy_id, is_active, password_hash)
-- values (
--   gen_random_uuid()::text,
--   'مدير النظام',
--   'admin@victory.com',
--   'super_admin',
--   'main',
--   true,
--   public.hash_app_password('كلمة_المرور_هنا')
-- );

-- 3) إذا الإيميل موجود لكن بدون كلمة مرور — حدّث (استخدم الإيميل الفعلي من الخطوة 1):
-- update public.users
-- set password_hash = public.hash_app_password('كلمة_المرور_هنا'), updated_at = now()
-- where lower(email) = 'admin@victory.com';

-- role      = مثل cashier أو pharmacy_admin (راجع تبويب «أدوار» في التطبيق)
-- pharmacy_id = معرف الفرع مثل nasr أو main
