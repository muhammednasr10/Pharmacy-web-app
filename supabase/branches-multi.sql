-- =============================================================================
-- نظام الفروع المتعددة (Multi-branch)
-- انسخ هذا الملف كاملاً → Supabase SQL Editor → Run
-- آمن للتكرار (لن يحذف بياناتك)
-- =============================================================================
-- الفكرة: كل صف في جدول pharmacies هو "فرع". وكل جدول بيانات فيه عمود
-- pharmacy_id يربط الصف بالفرع التابع له، عشان كل فرع يبقى له مخزونه
-- وفواتيره وبياناته منفصلة تماماً.
-- =============================================================================

-- 1) إضافة عمود pharmacy_id لكل الجداول المرتبطة بالبيانات
alter table medicines         add column if not exists pharmacy_id text;
alter table invoices          add column if not exists pharmacy_id text;
alter table returns           add column if not exists pharmacy_id text;
alter table purchases         add column if not exists pharmacy_id text;
alter table customer_payments add column if not exists pharmacy_id text;
alter table stock_movements   add column if not exists pharmacy_id text;
alter table activity_logs     add column if not exists pharmacy_id text;

-- 2) ترحيل البيانات القديمة: أي صف بدون فرع يتبع الفرع الرئيسي 'main'
update medicines         set pharmacy_id = 'main' where pharmacy_id is null;
update invoices          set pharmacy_id = 'main' where pharmacy_id is null;
update returns           set pharmacy_id = 'main' where pharmacy_id is null;
update purchases         set pharmacy_id = 'main' where pharmacy_id is null;
update customer_payments set pharmacy_id = 'main' where pharmacy_id is null;
update stock_movements   set pharmacy_id = 'main' where pharmacy_id is null;
update activity_logs     set pharmacy_id = 'main' where pharmacy_id is null;

-- 3) قيمة افتراضية للصفوف الجديدة (احتياطي لو الكود ماحطّش الفرع)
alter table medicines         alter column pharmacy_id set default 'main';
alter table invoices          alter column pharmacy_id set default 'main';
alter table returns           alter column pharmacy_id set default 'main';
alter table purchases         alter column pharmacy_id set default 'main';
alter table customer_payments alter column pharmacy_id set default 'main';
alter table stock_movements   alter column pharmacy_id set default 'main';
alter table activity_logs     alter column pharmacy_id set default 'main';

-- 4) فهارس لتسريع التصفية حسب الفرع
create index if not exists idx_medicines_pharmacy         on medicines (pharmacy_id);
create index if not exists idx_invoices_pharmacy          on invoices (pharmacy_id);
create index if not exists idx_returns_pharmacy           on returns (pharmacy_id);
create index if not exists idx_purchases_pharmacy         on purchases (pharmacy_id);
create index if not exists idx_customer_payments_pharmacy on customer_payments (pharmacy_id);
create index if not exists idx_stock_movements_pharmacy   on stock_movements (pharmacy_id);
create index if not exists idx_activity_logs_pharmacy     on activity_logs (pharmacy_id);

-- 5) (اختياري) إضافة فرع تجريبي ثانٍ. يمكنك أيضاً إضافته من داخل البرنامج.
-- insert into pharmacies (id, name, name_en, phone, address, currency, is_active)
-- values ('maadi', 'فرع المعادي', 'Maadi Branch', '01000000001', 'المعادي - القاهرة', 'ج.م', true)
-- on conflict (id) do nothing;

-- 6) تحقق: عدد الصفوف لكل فرع
select 'medicines' as tbl, pharmacy_id, count(*) as rows from medicines group by pharmacy_id
union all select 'invoices', pharmacy_id, count(*) from invoices group by pharmacy_id
order by tbl, pharmacy_id;
