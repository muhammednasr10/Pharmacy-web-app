-- Allow clearing password after approve/reject (run once in Supabase SQL Editor)
alter table login_account_requests alter column password drop not null;

notify pgrst, 'reload schema';
