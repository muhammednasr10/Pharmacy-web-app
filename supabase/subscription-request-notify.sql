-- =============================================================================
-- Subscription request notifications (optional webhook via pg_net)
--
-- 1) Client-side (default): pharmacy app calls VITE_SUBSCRIPTION_NOTIFY_WEBHOOK_URL
--    and opens WhatsApp to super admin when a request is created.
--
-- 2) Server-side (optional): enable pg_net + set webhook URL below, then run this file.
-- =============================================================================

-- create extension if not exists pg_net with schema extensions;

create table if not exists public.app_notify_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

insert into public.app_notify_settings (key, value)
values ('subscription_request_webhook_url', '')
on conflict (key) do nothing;

comment on table public.app_notify_settings is
  'Set subscription_request_webhook_url to your n8n/Zapier endpoint for server-side alerts.';

-- Uncomment and set URL after enabling pg_net in Supabase Dashboard → Database → Extensions
/*
create or replace function public.notify_subscription_request_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url text;
begin
  select value into v_url
  from public.app_notify_settings
  where key = 'subscription_request_webhook_url'
  limit 1;

  if coalesce(trim(v_url), '') = '' then
    return new;
  end if;

  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json'),
    body := jsonb_build_object(
      'event', 'subscription_request_created',
      'request', row_to_json(new)
    )
  );

  return new;
end;
$$;

drop trigger if exists trg_notify_subscription_request_insert on public.subscription_requests;
create trigger trg_notify_subscription_request_insert
  after insert on public.subscription_requests
  for each row
  when (new.status = 'pending')
  execute function public.notify_subscription_request_insert();
*/

notify pgrst, 'reload schema';
