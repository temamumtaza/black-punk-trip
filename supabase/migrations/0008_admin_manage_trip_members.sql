-- Membership changes affect allocation integrity, so they are only available
-- to a current admin through explicit server-side RPCs.

create or replace function public.update_trip_member_role(
  p_trip_id uuid,
  p_user_id uuid,
  p_role public.member_role
)
returns public.trip_members
language plpgsql
security definer
set search_path = public, pg_temp
as $bpt$
declare
  target_trip public.trips;
  updated_member public.trip_members;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;

  select * into target_trip from public.trips where id = p_trip_id for update;
  if target_trip.id is null then raise exception 'TRIP_NOT_FOUND'; end if;
  if target_trip.status <> 'active' then raise exception 'TRIP_LOCKED'; end if;
  if not public.is_trip_admin(p_trip_id) then raise exception 'ADMIN_REQUIRED'; end if;
  if p_user_id = auth.uid() then raise exception 'SELF_MEMBER_MANAGEMENT_FORBIDDEN'; end if;

  select * into updated_member
  from public.trip_members
  where trip_id = p_trip_id and user_id = p_user_id
  for update;
  if updated_member.trip_id is null then raise exception 'MEMBER_NOT_FOUND'; end if;

  update public.trip_members
  set role = p_role
  where trip_id = p_trip_id and user_id = p_user_id
  returning * into updated_member;

  return updated_member;
end;
$bpt$;

create or replace function public.remove_trip_member(
  p_trip_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $bpt$
declare
  target_trip public.trips;
  target_member public.trip_members;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;

  -- Serialize removal with joins, expense saves, and finalization.
  select * into target_trip from public.trips where id = p_trip_id for update;
  if target_trip.id is null then raise exception 'TRIP_NOT_FOUND'; end if;
  if target_trip.status <> 'active' then raise exception 'TRIP_LOCKED'; end if;
  if not public.is_trip_admin(p_trip_id) then raise exception 'ADMIN_REQUIRED'; end if;
  if p_user_id = auth.uid() then raise exception 'SELF_MEMBER_MANAGEMENT_FORBIDDEN'; end if;

  select * into target_member
  from public.trip_members
  where trip_id = p_trip_id and user_id = p_user_id
  for update;
  if target_member.trip_id is null then raise exception 'MEMBER_NOT_FOUND'; end if;

  -- Payer/creator and explicit allocations are accounting history. Do not
  -- silently rewrite them. Equal allocations are recalculated below instead.
  if exists (
    select 1 from public.expenses e
    where e.trip_id = p_trip_id
      and (e.paid_by = p_user_id or e.created_by = p_user_id)
  ) or exists (
    select 1
    from public.expense_allocations ea
    join public.expenses e on e.id = ea.expense_id
    where e.trip_id = p_trip_id
      and ea.user_id = p_user_id
      and e.split_type in ('selected_equal', 'custom')
  ) then
    raise exception 'MEMBER_HAS_ACTIVITY';
  end if;

  delete from public.trip_members
  where trip_id = p_trip_id and user_id = p_user_id;

  -- A "Rata" expense deliberately follows current membership.
  perform public.rebalance_equal_expenses(p_trip_id);
end;
$bpt$;

revoke all on function public.update_trip_member_role(uuid, uuid, public.member_role) from public;
revoke all on function public.remove_trip_member(uuid, uuid) from public;
grant execute on function public.update_trip_member_role(uuid, uuid, public.member_role) to authenticated;
grant execute on function public.remove_trip_member(uuid, uuid) to authenticated;
