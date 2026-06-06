-- Employee profile photo (base64 data URL)
-- Run in Supabase SQL Editor

alter table public.employees add column if not exists photo_base64 text;

notify pgrst, 'reload schema';
