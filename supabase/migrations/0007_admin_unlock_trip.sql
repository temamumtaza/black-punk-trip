-- Allow only trip admins to reopen a finalized trip. Pending settlement rows are
-- disposable projections and are rebuilt when the trip is finalized again; a
-- paid settlement is immutable and therefore blocks reopening.

create or replace function public.unlock_trip(p_trip_id uuid)
returns public.trips
language plpgsql
security definer
set search_path = public, pg_temp
as $bpt$
declare
  target_trip public.trips;
  reopened_trip public.trips;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if not public.is_trip_admin(p_trip_id) then
    raise exception 'ADMIN_REQUIRED';
  end if;

  select * into target_trip
  from public.trips
  where id = p_trip_id
  for update;

  if target_trip.id is null then
    raise exception 'TRIP_NOT_FOUND';
  end if;
  if target_trip.status <> 'finalized' then
    raise exception 'TRIP_NOT_FINALIZED';
  end if;
  if exists (
    select 1
    from public.settlements
    where trip_id = p_trip_id and status = 'paid'
  ) then
    raise exception 'SETTLEMENT_ALREADY_PAID';
  end if;

  delete from public.settlements
  where trip_id = p_trip_id and status = 'pending';

  update public.trips
  set status = 'active', finalized_at = null
  where id = p_trip_id
  returning * into reopened_trip;

  return reopened_trip;
end;
$bpt$;

-- Lock the trip before marking a settlement paid so it serializes with
-- unlock_trip and cannot race with pending-settlement cleanup.
create or replace function public.mark_settlement_paid(p_settlement_id uuid)
returns public.settlements
language plpgsql
security definer
set search_path = public, pg_temp
as $bpt$
declare
  target_trip_id uuid;
  target_trip public.trips;
  updated_settlement public.settlements;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  select s.trip_id into target_trip_id
  from public.settlements s
  where s.id = p_settlement_id;

  if target_trip_id is null then
    raise exception 'SETTLEMENT_ACCESS_DENIED';
  end if;

  select * into target_trip
  from public.trips t
  where t.id = target_trip_id and t.status = 'finalized'
  for update;

  if target_trip.id is null then
    raise exception 'SETTLEMENT_ACCESS_DENIED';
  end if;

  update public.settlements s
  set status = 'paid', paid_at = coalesce(s.paid_at, now())
  where s.id = p_settlement_id
    and s.status = 'pending'
    and (s.from_user_id = auth.uid() or public.is_trip_admin(s.trip_id))
  returning * into updated_settlement;

  if updated_settlement.id is null then
    raise exception 'SETTLEMENT_ACCESS_DENIED';
  end if;
  return updated_settlement;
end;
$bpt$;

revoke all on function public.unlock_trip(uuid) from public;
revoke all on function public.mark_settlement_paid(uuid) from public;
grant execute on function public.unlock_trip(uuid) to authenticated;
grant execute on function public.mark_settlement_paid(uuid) to authenticated;
