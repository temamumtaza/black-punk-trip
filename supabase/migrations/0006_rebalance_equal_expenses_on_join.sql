-- A shared expense marked "equal" follows the current trip membership.
-- When a member joins, rebuild only those allocations atomically. Explicit
-- selected_equal and custom allocations remain unchanged by design.

create or replace function public.rebalance_equal_expenses(p_trip_id uuid)
returns void
language plpgsql security definer set search_path = public, pg_temp
as $bpt$
begin
  if p_trip_id is null then
    raise exception 'TRIP_NOT_FOUND';
  end if;

  delete from public.expense_allocations ea
  using public.expenses e
  where ea.expense_id = e.id
    and e.trip_id = p_trip_id
    and e.split_type = 'equal';

  with ranked_members as (
    select
      e.id as expense_id,
      e.amount,
      tm.user_id,
      row_number() over (partition by e.id order by tm.user_id) - 1 as member_index,
      count(*) over (partition by e.id) as member_count
    from public.expenses e
    join public.trip_members tm on tm.trip_id = e.trip_id
    where e.trip_id = p_trip_id
      and e.split_type = 'equal'
  )
  insert into public.expense_allocations (expense_id, user_id, amount)
  select
    expense_id,
    user_id,
    (amount / member_count) + case when member_index < (amount % member_count) then 1 else 0 end
  from ranked_members;
end;
$bpt$;

revoke all on function public.rebalance_equal_expenses(uuid) from public;

-- Repair active trips that were already affected by a member joining before
-- this migration was deployed. Finalized trips are intentionally immutable.
do $bpt$
declare
  active_trip_id uuid;
begin
  for active_trip_id in select id from public.trips where status = 'active' loop
    perform public.rebalance_equal_expenses(active_trip_id);
  end loop;
end;
$bpt$;

create or replace function public.join_trip_by_invite(p_invite_code text)
returns public.trip_members
language plpgsql security definer set search_path = public
as $bpt$
declare
  target_trip public.trips;
  joined_member public.trip_members;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  -- Serialize joins and expense saves/finalization for this trip. This keeps
  -- the new membership and every equal allocation in one transaction.
  select * into target_trip
  from public.trips
  where invite_code = upper(trim(p_invite_code))
    and status = 'active'
  for update;
  if target_trip.id is null then raise exception 'INVITE_NOT_FOUND'; end if;

  select * into joined_member
  from public.trip_members
  where trip_id = target_trip.id and user_id = auth.uid()
  for update;

  if joined_member.trip_id is null then
    insert into public.trip_members (trip_id, user_id, role)
    values (target_trip.id, auth.uid(), 'member')
    returning * into joined_member;

    perform public.rebalance_equal_expenses(target_trip.id);
  end if;

  return joined_member;
end;
$bpt$;

revoke all on function public.join_trip_by_invite(text) from public;
grant execute on function public.join_trip_by_invite(text) to authenticated;
