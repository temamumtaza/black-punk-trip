-- Keep the settlement working table explicitly in pg_temp when referenced from
-- dynamic SQL. This avoids false-positive relation errors from Supabase's
-- plpgsql schema linter while retaining transaction-local isolation.

create or replace function public.finalize_trip(p_trip_id uuid)
returns setof public.settlements
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_trip public.trips;
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

  create temporary table bpt_balances (
    user_id uuid primary key,
    balance bigint not null
  ) on commit drop;

  execute $sql$
    insert into pg_temp.bpt_balances (user_id, balance)
    select tm.user_id,
      coalesce(paid.total_paid, 0) - coalesce(share.total_share, 0)
    from public.trip_members tm
    left join (
      select e.paid_by as user_id, sum(e.amount)::bigint as total_paid
      from public.expenses e where e.trip_id = $1 group by e.paid_by
    ) paid on paid.user_id = tm.user_id
    left join (
      select ea.user_id, sum(ea.amount)::bigint as total_share
      from public.expense_allocations ea
      join public.expenses e on e.id = ea.expense_id
      where e.trip_id = $1 group by ea.user_id
    ) share on share.user_id = tm.user_id
    where tm.trip_id = $1
  $sql$ using p_trip_id;

  loop
    execute $sql$
      select user_id, balance
      from pg_temp.bpt_balances
      where balance < 0
      order by balance asc, user_id
      limit 1
    $sql$ into debtor_id, debtor_balance;
    exit when not found;

    execute $sql$
      select user_id, balance
      from pg_temp.bpt_balances
      where balance > 0
      order by balance desc, user_id
      limit 1
    $sql$ into creditor_id, creditor_balance;
    if not found then raise exception 'UNBALANCED_TRIP'; end if;

    transfer_amount := least(abs(debtor_balance), creditor_balance);
    if transfer_amount <= 0 then raise exception 'INVALID_SETTLEMENT'; end if;

    insert into public.settlements (trip_id, from_user_id, to_user_id, amount, status)
    values (p_trip_id, debtor_id, creditor_id, transfer_amount, 'pending');

    execute 'update pg_temp.bpt_balances set balance = balance + $1 where user_id = $2'
      using transfer_amount, debtor_id;
    execute 'update pg_temp.bpt_balances set balance = balance - $1 where user_id = $2'
      using transfer_amount, creditor_id;
  end loop;

  update public.trips
  set status = 'finalized', finalized_at = now()
  where id = p_trip_id;

  return query select * from public.settlements where trip_id = p_trip_id order by created_at, id;
end;
$$;
