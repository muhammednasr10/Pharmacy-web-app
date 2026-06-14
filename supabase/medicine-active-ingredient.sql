-- =============================================================================
-- المادة الفعالة للأدوية — active ingredient on medicines
-- Run in Supabase SQL Editor
-- =============================================================================

alter table medicines
  add column if not exists active_ingredient text;

-- استخراج المادة الفعالة من name_en للكتالوج المستورد (تجاري · علمي · مصنع)
update medicines
set active_ingredient = nullif(trim(split_part(name_en, '·', 2)), '')
where coalesce(active_ingredient, '') = ''
  and position('·' in coalesce(name_en, '')) > 0;

create index if not exists idx_medicines_active_ingredient
  on medicines (pharmacy_id, active_ingredient);

notify pgrst, 'reload schema';
