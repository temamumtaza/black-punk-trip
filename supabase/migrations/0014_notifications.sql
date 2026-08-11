-- Notification preferences, browser push subscriptions, and durable events.
-- Guest profiles are intentionally excluded because they have no app session.

create extension if not exists pg_net;
create extension if not exists pg_cron;

create table if not exists public.notification_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  prompt_state text not null default 'prompt'
    check (prompt_state in ('prompt', 'snoozed', 'never', 'enabled', 'denied')),
  snooze_until date,
  push_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique check (char_length(endpoint) between 1 and 2048),
  p256dh text not null check (char_length(p256dh) between 1 and 512),
  auth text not null check (char_length(auth) between 1 and 512),
  user_agent text,
  enabled boolean not null default true,
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table if not exists public.notification_events (
  id uuid primary key default gen_random_uuid(),
  recipient_user_id uuid not null references public.profiles(id) on delete cascade,
  trip_id uuid references public.trips(id) on delete cascade,
  actor_id uuid references public.profiles(id) on delete set null,
  kind text not null check (kind in (
    'expense_created', 'expense_updated', 'expense_deleted',
    'member_joined', 'member_left', 'member_role_changed',
    'trip_finalized', 'trip_unlocked', 'settlement_paid',
    'trip_start_reminder', 'trip_end_reminder'
  )),
  title text not null check (char_length(trim(title)) between 1 and 120),
  body text not null check (char_length(trim(body)) between 1 and 500),
  path text not null check (char_length(trim(path)) between 1 and 500),
  dedupe_key text not null unique check (char_length(dedupe_key) between 1 and 500),
  read_at timestamptz,
  pushed_at timestamptz,
  push_attempts integer not null default 0 check (push_attempts >= 0),
  last_push_error text,
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions(user_id) where enabled;
create index if not exists notification_events_recipient_idx
  on public.notification_events(recipient_user_id, created_at desc);
create index if not exists notification_events_dispatch_idx
  on public.notification_events(created_at) where pushed_at is null;

alter table public.notification_preferences enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.notification_events enable row level security;

drop policy if exists "users can read their notification preferences" on public.notification_preferences;
create policy "users can read their notification preferences"
  on public.notification_preferences for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "users can read their push subscriptions" on public.push_subscriptions;
create policy "users can read their push subscriptions"
  on public.push_subscriptions for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "users can manage their push subscriptions" on public.push_subscriptions;
create policy "users can manage their push subscriptions"
  on public.push_subscriptions for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "users can read their notifications" on public.notification_events;
create policy "users can read their notifications"
  on public.notification_events for select to authenticated
  using (recipient_user_id = auth.uid());

drop policy if exists "users can mark their notifications read" on public.notification_events;
create policy "users can mark their notifications read"
  on public.notification_events for update to authenticated
  using (recipient_user_id = auth.uid())
  with check (recipient_user_id = auth.uid());

grant select on public.notification_preferences to authenticated;
grant select, insert, update, delete on public.push_subscriptions to authenticated;
grant select, update on public.notification_events to authenticated;

create or replace function public.update_notification_preference(
  p_prompt_state text,
  p_snooze_until date default null,
  p_push_enabled boolean default false
)
returns public.notification_preferences
language plpgsql
security definer
set search_path = public, pg_temp
as $bpt$
declare
  saved public.notification_preferences;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_prompt_state not in ('prompt', 'snoozed', 'never', 'enabled', 'denied') then
    raise exception 'INVALID_NOTIFICATION_PREFERENCE';
  end if;
  if p_prompt_state = 'snoozed' and p_snooze_until is null then
    raise exception 'INVALID_NOTIFICATION_SNOOZE';
  end if;

  insert into public.notification_preferences (user_id, prompt_state, snooze_until, push_enabled)
  values (auth.uid(), p_prompt_state, p_snooze_until, p_push_enabled)
  on conflict (user_id) do update set
    prompt_state = excluded.prompt_state,
    snooze_until = excluded.snooze_until,
    push_enabled = excluded.push_enabled,
    updated_at = now()
  returning * into saved;
  return saved;
end;
$bpt$;

create or replace function public.upsert_push_subscription(
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_user_agent text default null
)
returns public.push_subscriptions
language plpgsql
security definer
set search_path = public, pg_temp
as $bpt$
declare
  saved public.push_subscriptions;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if p_endpoint is null or char_length(p_endpoint) not between 1 and 2048 then raise exception 'INVALID_PUSH_SUBSCRIPTION'; end if;
  if p_p256dh is null or p_auth is null or char_length(p_p256dh) > 512 or char_length(p_auth) > 512 then raise exception 'INVALID_PUSH_SUBSCRIPTION'; end if;

  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, user_agent, enabled, last_seen_at)
  values (auth.uid(), p_endpoint, p_p256dh, p_auth, nullif(trim(p_user_agent), ''), true, now())
  on conflict (endpoint) do update set
    user_id = auth.uid(),
    p256dh = excluded.p256dh,
    auth = excluded.auth,
    user_agent = excluded.user_agent,
    enabled = true,
    last_seen_at = now()
  returning * into saved;
  return saved;
end;
$bpt$;

create or replace function public.remove_push_subscription(p_endpoint text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $bpt$
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  delete from public.push_subscriptions where endpoint = p_endpoint and user_id = auth.uid();
end;
$bpt$;

create or replace function public.mark_notification_read(p_notification_id uuid)
returns public.notification_events
language plpgsql
security definer
set search_path = public, pg_temp
as $bpt$
declare
  saved public.notification_events;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  update public.notification_events
  set read_at = coalesce(read_at, now())
  where id = p_notification_id and recipient_user_id = auth.uid()
  returning * into saved;
  if saved.id is null then raise exception 'NOTIFICATION_NOT_FOUND'; end if;
  return saved;
end;
$bpt$;

create or replace function public.enqueue_expense_notification()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $bpt$
declare
  actor_id uuid := auth.uid();
  actor_name text;
  target_expense public.expenses;
  event_kind text;
  event_title text;
  event_body text;
  event_path text;
  event_key text;
begin
  target_expense := case when tg_op = 'DELETE' then old else new end;
  select display_name into actor_name from public.profiles where id = actor_id;
  event_kind := case tg_op when 'INSERT' then 'expense_created' when 'UPDATE' then 'expense_updated' else 'expense_deleted' end;
  event_title := case tg_op when 'INSERT' then coalesce(actor_name, 'Seseorang') || ' menambahkan talangan' when 'UPDATE' then coalesce(actor_name, 'Seseorang') || ' mengubah talangan' else coalesce(actor_name, 'Seseorang') || ' menghapus talangan' end;
  event_body := target_expense.title || '. Cek pembagian dan saldo trip.';
  event_path := format('/app?view=detail&trip=%s&expense=%s', target_expense.trip_id, target_expense.id);
  event_key := format('%s:%s:%s', event_kind, target_expense.id, coalesce(target_expense.updated_at::text, clock_timestamp()::text));

  insert into public.notification_events (recipient_user_id, trip_id, actor_id, kind, title, body, path, dedupe_key)
  select tm.user_id, target_expense.trip_id, actor_id, event_kind, event_title, event_body, event_path, event_key || ':' || tm.user_id
  from public.trip_members tm
  join public.profiles p on p.id = tm.user_id and not p.is_guest
  where tm.trip_id = target_expense.trip_id and tm.user_id is distinct from actor_id
  on conflict (dedupe_key) do nothing;
  return target_expense;
end;
$bpt$;

create or replace function public.enqueue_member_notification()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $bpt$
declare
  actor_id uuid := auth.uid();
  member_name text;
  event_kind text;
  event_title text;
  event_body text;
begin
  select display_name into member_name from public.profiles where id = case when tg_op = 'DELETE' then old.user_id else new.user_id end;
  if tg_op = 'INSERT' then
    event_kind := 'member_joined';
    event_title := coalesce(member_name, 'Anggota baru') || ' masuk ke trip';
    event_body := 'Pembagian Rata akan mengikuti jumlah anggota terbaru.';
  elsif tg_op = 'DELETE' then
    event_kind := 'member_left';
    event_title := coalesce(member_name, 'Anggota') || ' keluar dari trip';
    event_body := 'Cek kembali pembagian dan saldo trip.';
  elsif old.role is distinct from new.role then
    if new.user_id = actor_id then return new; end if;
    event_kind := 'member_role_changed';
    event_title := 'Peran anggota diperbarui';
    event_body := coalesce(member_name, 'Anggota') || ' sekarang ' || case when new.role = 'admin' then 'admin.' else 'peserta trip.' end;
  else
    return new;
  end if;

  insert into public.notification_events (recipient_user_id, trip_id, actor_id, kind, title, body, path, dedupe_key)
  select tm.user_id, coalesce(new.trip_id, old.trip_id), actor_id, event_kind, event_title, event_body,
    format('/app?view=members&trip=%s', coalesce(new.trip_id, old.trip_id)),
    format('%s:%s:%s:%s', event_kind, coalesce(new.trip_id, old.trip_id), coalesce(new.user_id, old.user_id), tm.user_id)
  from public.trip_members tm
  join public.profiles p on p.id = tm.user_id and not p.is_guest
  where tm.trip_id = coalesce(new.trip_id, old.trip_id)
    and tm.user_id is distinct from actor_id
    and tm.user_id is distinct from coalesce(new.user_id, old.user_id)
  on conflict (dedupe_key) do nothing;
  return coalesce(new, old);
end;
$bpt$;

create or replace function public.enqueue_trip_status_notification()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $bpt$
declare
  actor_id uuid := auth.uid();
  event_kind text;
  event_title text;
  event_body text;
begin
  if old.status = new.status then return new; end if;
  if new.status = 'finalized' then
    event_kind := 'trip_finalized';
    event_title := 'Settlement trip sudah siap';
    event_body := 'Cek tagihan dan selesaikan pembayaranmu.';
  else
    event_kind := 'trip_unlocked';
    event_title := 'Trip dibuka kembali';
    event_body := 'Pengeluaran trip bisa diperbarui lagi oleh anggota.';
  end if;

  insert into public.notification_events (recipient_user_id, trip_id, actor_id, kind, title, body, path, dedupe_key)
  select tm.user_id, new.id, actor_id, event_kind, event_title, event_body,
    format('/app?view=settlement&trip=%s', new.id),
    format('%s:%s:%s:%s', event_kind, new.id, new.status, tm.user_id)
  from public.trip_members tm
  join public.profiles p on p.id = tm.user_id and not p.is_guest
  where tm.trip_id = new.id and tm.user_id is distinct from actor_id
  on conflict (dedupe_key) do nothing;
  return new;
end;
$bpt$;

create or replace function public.enqueue_settlement_notification()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $bpt$
declare
  actor_id uuid := auth.uid();
begin
  if old.status = new.status or new.status <> 'paid' then return new; end if;
  insert into public.notification_events (recipient_user_id, trip_id, actor_id, kind, title, body, path, dedupe_key)
  select distinct tm.user_id, new.trip_id, actor_id, 'settlement_paid', 'Pembayaran settlement diperbarui',
    'Salah satu tagihan trip sudah ditandai lunas.', format('/app?view=settlement&trip=%s', new.trip_id),
    format('settlement_paid:%s:%s:%s', new.id, new.status, tm.user_id)
  from public.trip_members tm
  join public.profiles p on p.id = tm.user_id and not p.is_guest
  where tm.trip_id = new.trip_id
    and tm.user_id is distinct from actor_id
    and (tm.user_id in (new.from_user_id, new.to_user_id) or tm.role = 'admin')
  on conflict (dedupe_key) do nothing;
  return new;
end;
$bpt$;

drop trigger if exists expenses_enqueue_notification on public.expenses;
create trigger expenses_enqueue_notification after insert or update or delete on public.expenses
for each row execute procedure public.enqueue_expense_notification();

drop trigger if exists trip_members_enqueue_notification on public.trip_members;
create trigger trip_members_enqueue_notification after insert or update or delete on public.trip_members
for each row execute procedure public.enqueue_member_notification();

drop trigger if exists trips_enqueue_notification on public.trips;
create trigger trips_enqueue_notification after update of status on public.trips
for each row execute procedure public.enqueue_trip_status_notification();

drop trigger if exists settlements_enqueue_notification on public.settlements;
create trigger settlements_enqueue_notification after update of status on public.settlements
for each row execute procedure public.enqueue_settlement_notification();

create or replace function public.create_due_trip_reminder_events()
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $bpt$
declare
  local_today date := timezone('Asia/Jakarta', now())::date;
  created_count integer := 0;
  inserted_count integer;
begin
  insert into public.notification_events (recipient_user_id, trip_id, kind, title, body, path, dedupe_key)
  select tm.user_id, t.id, 'trip_start_reminder', 'Trip dimulai besok',
    'Pastikan semua talangan sudah dicatat sebelum berangkat.', format('/app?view=home&trip=%s', t.id),
    format('trip_start_reminder:%s:%s:%s', t.id, tm.user_id, t.start_date)
  from public.trips t
  join public.trip_members tm on tm.trip_id = t.id
  join public.profiles p on p.id = tm.user_id and not p.is_guest
  where t.start_date = local_today + 1
  on conflict (dedupe_key) do nothing;
  get diagnostics inserted_count = row_count;
  created_count := created_count + inserted_count;

  insert into public.notification_events (recipient_user_id, trip_id, kind, title, body, path, dedupe_key)
  select tm.user_id, t.id, 'trip_end_reminder', 'Trip selesai kemarin',
    'Cek talangan, tagihan, dan settlement sebelum semuanya ditutup.', format('/app?view=settlement&trip=%s', t.id),
    format('trip_end_reminder:%s:%s:%s', t.id, tm.user_id, t.end_date)
  from public.trips t
  join public.trip_members tm on tm.trip_id = t.id
  join public.profiles p on p.id = tm.user_id and not p.is_guest
  where t.end_date = local_today - 1
  on conflict (dedupe_key) do nothing;
  get diagnostics inserted_count = row_count;
  return created_count + inserted_count;
end;
$bpt$;

-- These functions are called by the future dispatch worker and cron job. The
-- public client can only create/update its own subscription and preference.
revoke all on function public.update_notification_preference(text, date, boolean) from public;
revoke all on function public.upsert_push_subscription(text, text, text, text) from public;
revoke all on function public.remove_push_subscription(text) from public;
revoke all on function public.mark_notification_read(uuid) from public;
revoke all on function public.create_due_trip_reminder_events() from public;
grant execute on function public.update_notification_preference(text, date, boolean) to authenticated;
grant execute on function public.upsert_push_subscription(text, text, text, text) to authenticated;
grant execute on function public.remove_push_subscription(text) to authenticated;
grant execute on function public.mark_notification_read(uuid) to authenticated;
grant execute on function public.create_due_trip_reminder_events() to service_role;
