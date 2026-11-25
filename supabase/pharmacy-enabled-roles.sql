-- Which roles a pharmacy uses when assigning login accounts / staff.
-- null = all available roles enabled (backward compatible).

alter table pharmacies
  add column if not exists enabled_role_keys jsonb;

notify pgrst, 'reload schema';
