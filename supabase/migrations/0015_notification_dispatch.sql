-- Dispatch durable notification events to the Supabase Edge Function.
-- The database remains the source of truth; pg_net only queues delivery work.

alter table public.notification_events
  add column if not exists dispatch_claimed_at timestamptz;

create index if not exists notification_events_claim_idx
  on public.notification_events(dispatch_claimed_at)
  where pushed_at is null;

create or replace function public.dispatch_notification_event()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $bpt$
declare
  dispatch_secret text;
begin
  select decrypted_secret into dispatch_secret
  from vault.decrypted_secrets
  where name = 'notification_internal_secret'
  limit 1;

  if nullif(dispatch_secret, '') is null then
    return new;
  end if;

  perform net.http_post(
    url := 'https://sylsrrbownlxenwyekvb.supabase.co/functions/v1/push-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-notification-secret', dispatch_secret
    ),
    body := jsonb_build_object('type', 'event', 'event_id', new.id)
  );
  return new;
exception when others then
  -- A notification transport outage must never roll back a trip mutation.
  return new;
end;
$bpt$;

create or replace function public.trigger_notification_reminders()
returns void
language plpgsql
security definer
set search_path = public, extensions, pg_temp
as $bpt$
declare
  dispatch_secret text;
begin
  select decrypted_secret into dispatch_secret
  from vault.decrypted_secrets
  where name = 'notification_internal_secret'
  limit 1;

  if nullif(dispatch_secret, '') is null then
    return;
  end if;

  perform net.http_post(
    url := 'https://sylsrrbownlxenwyekvb.supabase.co/functions/v1/push-notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-notification-secret', dispatch_secret
    ),
    body := jsonb_build_object('type', 'reminders')
  );
exception when others then
  -- A notification transport outage must not fail the cron invocation.
  return;
end;
$bpt$;

drop trigger if exists notification_events_dispatch on public.notification_events;
create trigger notification_events_dispatch
after insert on public.notification_events
for each row execute procedure public.dispatch_notification_event();

revoke all on function public.trigger_notification_reminders() from public;
grant execute on function public.trigger_notification_reminders() to service_role;

do $bpt$
declare
  existing_job record;
begin
  for existing_job in select jobid from cron.job where jobname = 'black-punk-trip-notification-reminders' loop
    perform cron.unschedule(existing_job.jobid);
  end loop;
  perform cron.schedule(
    'black-punk-trip-notification-reminders',
    '5 * * * *',
    'select public.trigger_notification_reminders();'
  );
end;
$bpt$;
