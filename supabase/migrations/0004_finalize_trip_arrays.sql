-- Use transaction-local PL/pgSQL arrays for settlement matching. This keeps
-- finalize_trip self-contained and makes it visible to schema lint analysis.

create or replace function public.finalize_trip(p_trip_id uuid)
returns setof public.settlements
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_trip public.trips;
  member_ids uuid[];
  member_balances bigint[];
  debtor_index integer;
  creditor_index integer;
  debtor_id uuid;
  creditor_id uuid;
  debtor_balance bigint;
  creditor_balance bigint;
  transfer_amount bigint;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  if not public.is_trip_admin(p_trip_id) then raise exception 'ADMIN_REQUIRED'; end if;

  select * into target_trip from public.trips where id = p_trip_id for update;
  if target_trip.id is null then raise exception 'TRIP_NOT_FOUND'; end if;
  if target_trip.status <> 'active' then raise exception 'TRIP_ALREADY_FINALIZED'; end if;

  if exists (
    select 1
    from public.expenses e
    where e.trip_id = p_trip_id
      and (
        not exists (select 1 from public.trip_members tm where tm.trip_id = p_trip_id and tm.user_id = e.paid_by)
        or (select coalesce(sum(ea.amount), 0) from public.expense_allocations ea where ea.expense_id = e.id) <> e.amount
        or exists (
          select 1 from public.expense_allocations ea
          where ea.expense_id = e.id
            and not exists (select 1 from public.trip_members tm where tm.trip_id = p_trip_id and tm.user_id = ea.user_id)
        )
      )
  ) then
    raise exception 'INVALID_TRIP_EXPENSES';
  end if;

  select
    array_agg(tm.user_id order by tm.user_id),
    array_agg((coalesce(paid.total_paid, 0) - coalesce(share.total_share, 0))::bigint order by tm.user_id)
  into member_ids, member_balances
  from public.trip_members tm
  left join (
    select e.paid_by as user_id, sum(e.amount)::bigint as total_paid
    from public.expenses e where e.trip_id = p_trip_id group by e.paid_by
  ) paid on paid.user_id = tm.user_id
  left join (
    select ea.user_id, sum(ea.amount)::bigint as total_share
    from public.expense_allocations ea
    join public.expenses e on e.id = ea.expense_id
    where e.trip_id = p_trip_id group by ea.user_id
  ) share on share.user_id = tm.user_id
  where tm.trip_id = p_trip_id;

  loop
    select indexes.i
    into debtor_index
    from generate_subscripts(member_balances, 1) as indexes(i)
    where member_balances[indexes.i] < 0
    order by member_balances[indexes.i], member_ids[indexes.i]
    limit 1;
    exit when not found;

    select indexes.i
    into creditor_index
    from generate_subscripts(member_balances, 1) as indexes(i)
    where member_balances[indexes.i] > 0
    order by member_balances[indexes.i] desc, member_ids[indexes.i]
    limit 1;
    if not found then raise exception 'UNBALANCED_TRIP'; end if;

    debtor_id := member_ids[debtor_index];
    creditor_id := member_ids[creditor_index];
    debtor_balance := member_balances[debtor_index];
    creditor_balance := member_balances[creditor_index];
    transfer_amount := least(abs(debtor_balance), creditor_balance);
    if transfer_amount <= 0 then raise exception 'INVALID_SETTLEMENT'; end if;

    insert into public.settlements (trip_id, from_user_id, to_user_id, amount, status)
    values (p_trip_id, debtor_id, creditor_id, transfer_amount, 'pending');

    member_balances[debtor_index] := debtor_balance + transfer_amount;
    member_balances[creditor_index] := creditor_balance - transfer_amount;
  end loop;

  update public.trips
  set status = 'finalized', finalized_at = now()
  where id = p_trip_id;

  return query select * from public.settlements where trip_id = p_trip_id order by created_at, id;
end;
$$;
