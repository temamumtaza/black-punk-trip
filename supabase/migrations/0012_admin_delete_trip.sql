-- Trip administrators can permanently remove a trip. The storage policy must
-- inspect the receipt object's path, never a nested trips.name reference.

create or replace function public.can_delete_trip_receipt(p_path text)
returns boolean
language sql
stable
security definer
set search_path = public, storage, pg_temp
as $bpt$
  with folder as (
    select (storage.foldername(p_path))[1] as trip_id
  )
  select case
    when trip_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
      then public.is_trip_admin(trip_id::uuid)
    else false
  end
  from folder;
$bpt$;

drop policy if exists "trip owners can delete their trips" on public.trips;
create policy "trip admins can delete their trips"
  on public.trips for delete
  to authenticated
  using (public.is_trip_admin(id));

drop policy if exists "trip owners can delete receipts" on storage.objects;
create policy "trip admins can delete receipts"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'trip-receipts' and public.can_delete_trip_receipt(name));

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
  if not public.is_trip_admin(p_trip_id) then raise exception 'ADMIN_REQUIRED'; end if;

  delete from storage.objects
  where bucket_id = 'trip-receipts'
    and name like concat(p_trip_id::text, '/%');

  delete from public.trips where id = p_trip_id;
end;
$bpt$;

revoke all on function public.can_delete_trip_receipt(text) from public;
revoke all on function public.delete_owned_trip(uuid) from public;
grant execute on function public.can_delete_trip_receipt(text) to authenticated;
grant execute on function public.delete_owned_trip(uuid) to authenticated;
