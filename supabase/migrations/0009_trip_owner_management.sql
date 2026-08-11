-- The creator remains the owner even when other members become admins.
-- Owner-only RPCs make trip identity and permanent deletion auditable and do
-- not rely on client-side visibility of settings controls.

create or replace function public.update_owned_trip(
  p_trip_id uuid,
  p_name text,
  p_description text default null,
  p_start_date date default null,
  p_end_date date default null
)
returns public.trips
language plpgsql
security definer
set search_path = public, pg_temp
as $bpt$
declare
  target_trip public.trips;
  updated_trip public.trips;
  normalized_name text := trim(coalesce(p_name, ''));
  normalized_description text := nullif(trim(coalesce(p_description, '')), '');
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if char_length(normalized_name) not between 1 and 120 then raise exception 'INVALID_TRIP_NAME'; end if;
  if p_end_date is not null and p_start_date is not null and p_end_date < p_start_date then raise exception 'INVALID_TRIP_DATES'; end if;

  select * into target_trip from public.trips where id = p_trip_id for update;
  if target_trip.id is null then raise exception 'TRIP_NOT_FOUND'; end if;
  if target_trip.created_by <> auth.uid() then raise exception 'OWNER_REQUIRED'; end if;

  update public.trips
  set name = normalized_name,
      description = normalized_description,
      start_date = p_start_date,
      end_date = p_end_date
  where id = p_trip_id
  returning * into updated_trip;

  return updated_trip;
end;
$bpt$;

create or replace function public.delete_owned_trip(p_trip_id uuid)
returns void
language plpgsql
security definer
set search_path = public, storage, pg_temp
as $bpt$
declare
  target_trip public.trips;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;

  select * into target_trip from public.trips where id = p_trip_id for update;
  if target_trip.id is null then raise exception 'TRIP_NOT_FOUND'; end if;
  if target_trip.created_by <> auth.uid() then raise exception 'OWNER_REQUIRED'; end if;

  -- Receipt paths are scoped by the trip UUID. Remove these objects before the
  -- relational cascade so a deleted trip leaves no private files behind.
  delete from storage.objects
  where bucket_id = 'trip-receipts'
    and name like concat(p_trip_id::text, '/%');

  delete from public.trips where id = p_trip_id;
end;
$bpt$;

revoke all on function public.update_owned_trip(uuid, text, text, date, date) from public;
revoke all on function public.delete_owned_trip(uuid) from public;
grant execute on function public.update_owned_trip(uuid, text, text, date, date) to authenticated;
grant execute on function public.delete_owned_trip(uuid) to authenticated;
