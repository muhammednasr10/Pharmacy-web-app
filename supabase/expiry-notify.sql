-- =============================================================================
-- Expiry notifications — optional phone/email for WhatsApp & mail alerts
-- Run AFTER fix-missing-columns.sql (or any migration with pharmacy settings)
-- =============================================================================

alter table pharmacies add column if not exists expiry_notify_enabled boolean default true;
alter table pharmacies add column if not exists expiry_notify_phone text;
alter table pharmacies add column if not exists expiry_notify_email text;

update pharmacies set expiry_notify_enabled = true where expiry_notify_enabled is null;

notify pgrst, 'reload schema';
