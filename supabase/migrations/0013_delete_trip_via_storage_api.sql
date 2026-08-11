-- storage.objects is protected from direct SQL deletion. Receipt cleanup is
-- performed by the client through the Storage API under the admin policy;
-- this RPC owns only the relational cascade.

create or replace function public.delete_owned_trip(p_trip_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $bpt$
declare
  target_trip public.trips;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;

  select * into target_trip from public.trips where id = p_trip_id for update;
  if target_trip.id is null then raise exception 'TRIP_NOT_FOUND'; end if;
  if not public.is_trip_admin(p_trip_id) then raise exception 'ADMIN_REQUIRED'; end if;

  delete from public.trips where id = p_trip_id;
end;
$bpt$;

revoke all on function public.delete_owned_trip(uuid) from public;
grant execute on function public.delete_owned_trip(uuid) to authenticated;
