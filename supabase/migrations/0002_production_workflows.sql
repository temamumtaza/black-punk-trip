-- Production write paths. Client code must use these authenticated RPCs instead
-- of composing multi-table writes in the browser.

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $bpt$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
      nullif(split_part(new.email, '@', 1), ''),
      'Traveler'
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$bpt$;

insert into public.profiles (id, display_name, avatar_url, created_at)
select
  u.id,
  coalesce(nullif(trim(u.raw_user_meta_data ->> 'display_name'), ''), nullif(split_part(coalesce(u.email, 'Traveler'), '@', 1), ''), 'Traveler'),
  u.raw_user_meta_data ->> 'avatar_url',
  coalesce(u.created_at, now())
from auth.users u
on conflict (id) do nothing;

update storage.buckets
set file_size_limit = 8388608,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/heic', 'image/heif', 'image/webp']::text[]
where id = 'trip-receipts';

drop policy if exists "admins can update active trips" on public.trips;
drop policy if exists "users can create trips" on public.trips;
drop policy if exists "members can create expenses while active" on public.expenses;
drop policy if exists "creators and admins can update expenses while active" on public.expenses;
drop policy if exists "members can create allocations for active trips" on public.expense_allocations;
drop policy if exists "creators and admins can update allocations" on public.expense_allocations;
drop policy if exists "creators and admins can delete allocations" on public.expense_allocations;
drop policy if exists "admins can create settlements" on public.settlements;
drop policy if exists "members can mark their settlement paid" on public.settlements;

create or replace function public.can_read_profile(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_profile_id = auth.uid()
    or exists (
      select 1
      from public.trip_members mine
      join public.trip_members target on target.trip_id = mine.trip_id
      where mine.user_id = auth.uid() and target.user_id = p_profile_id
    );
$$;

drop policy if exists "profiles are visible to authenticated users" on public.profiles;
create policy "profiles are visible to shared trip members"
  on public.profiles for select to authenticated using (public.can_read_profile(id));

revoke all on function public.create_trip(text, text, date, date) from public;
revoke all on function public.join_trip_by_invite(text) from public;
revoke all on function public.is_trip_member(uuid) from public;
revoke all on function public.is_trip_admin(uuid) from public;
revoke all on function public.expense_trip_id(uuid) from public;
revoke all on function public.can_edit_expense(uuid) from public;
grant execute on function public.create_trip(text, text, date, date) to authenticated;
grant execute on function public.join_trip_by_invite(text) to authenticated;
grant execute on function public.is_trip_member(uuid) to authenticated;
grant execute on function public.is_trip_admin(uuid) to authenticated;
grant execute on function public.expense_trip_id(uuid) to authenticated;
grant execute on function public.can_edit_expense(uuid) to authenticated;
revoke all on function public.can_read_profile(uuid) from public;
grant execute on function public.can_read_profile(uuid) to authenticated;

create or replace function public.save_expense(
  p_trip_id uuid,
  p_title text,
  p_amount bigint,
  p_expense_date date,
  p_paid_by uuid,
  p_split_type public.split_type,
  p_allocations jsonb,
  p_expense_id uuid default null,
  p_notes text default null,
  p_category text default 'other',
  p_receipt_url text default null
)
returns public.expenses
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  saved_expense public.expenses;
  existing_expense public.expenses;
  target_trip public.trips;
  allocation_count integer;
  allocation_total bigint;
begin
  if auth.uid() is null then
    raise exception 'AUTH_REQUIRED';
  end if;

  if not public.is_trip_member(p_trip_id) then
    raise exception 'TRIP_ACCESS_DENIED';
  end if;

  select * into target_trip from public.trips where id = p_trip_id for update;
  if target_trip.id is null then
    raise exception 'TRIP_NOT_FOUND';
  end if;
  if target_trip.status <> 'active' then
    raise exception 'TRIP_LOCKED';
  end if;

  if p_title is null or char_length(trim(p_title)) not between 1 and 160 then
    raise exception 'INVALID_TITLE';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'INVALID_AMOUNT';
  end if;

  if p_expense_date is null then
    raise exception 'INVALID_DATE';
  end if;

  if p_category not in ('accommodation', 'food', 'transport', 'activity', 'shopping', 'other') then
    raise exception 'INVALID_CATEGORY';
  end if;

  if p_receipt_url is not null and p_receipt_url !~ ('^' || p_trip_id::text || '/[A-Za-z0-9._-]+$') then
    raise exception 'INVALID_RECEIPT';
  end if;

  if not exists (select 1 from public.trip_members where trip_id = p_trip_id and user_id = p_paid_by) then
    raise exception 'PAYER_NOT_IN_TRIP';
  end if;

  if p_allocations is null or jsonb_typeof(p_allocations) <> 'array' then
    raise exception 'INVALID_ALLOCATIONS';
  end if;

  select count(*), coalesce(sum(coalesce(item.amount, 0)), 0)
    into allocation_count, allocation_total
  from jsonb_to_recordset(p_allocations) as item(user_id uuid, amount bigint);

  if allocation_count = 0 or allocation_total <> p_amount then
    raise exception 'ALLOCATIONS_DO_NOT_RECONCILE';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_allocations) as item(user_id uuid, amount bigint)
    where item.user_id is null or item.amount is null or item.amount < 0
  ) then
    raise exception 'INVALID_ALLOCATION_AMOUNT';
  end if;

  if exists (
    select item.user_id
    from jsonb_to_recordset(p_allocations) as item(user_id uuid, amount bigint)
    group by item.user_id
    having count(*) > 1
  ) then
    raise exception 'DUPLICATE_ALLOCATION';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_allocations) as item(user_id uuid, amount bigint)
    where not exists (
      select 1 from public.trip_members tm
      where tm.trip_id = p_trip_id and tm.user_id = item.user_id
    )
  ) then
    raise exception 'ALLOCATION_MEMBER_NOT_IN_TRIP';
  end if;

  if p_expense_id is null then
    insert into public.expenses (trip_id, title, notes, category, amount, expense_date, paid_by, created_by, split_type, receipt_url)
    values (p_trip_id, trim(p_title), nullif(trim(p_notes), ''), p_category, p_amount, p_expense_date, p_paid_by, auth.uid(), p_split_type, p_receipt_url)
    returning * into saved_expense;
  else
    select * into existing_expense
    from public.expenses
    where id = p_expense_id and trip_id = p_trip_id
    for update;

    if existing_expense.id is null then
      raise exception 'EXPENSE_NOT_FOUND';
    end if;

    if existing_expense.created_by <> auth.uid() and not public.is_trip_admin(p_trip_id) then
      raise exception 'EXPENSE_ACCESS_DENIED';
    end if;

    update public.expenses
    set title = trim(p_title),
        notes = nullif(trim(p_notes), ''),
        category = p_category,
        amount = p_amount,
        expense_date = p_expense_date,
        paid_by = p_paid_by,
        split_type = p_split_type,
        receipt_url = p_receipt_url,
        updated_at = now()
    where id = p_expense_id
    returning * into saved_expense;
  end if;

  delete from public.expense_allocations where expense_id = saved_expense.id;
  insert into public.expense_allocations (expense_id, user_id, amount)
  select saved_expense.id, item.user_id, item.amount
  from jsonb_to_recordset(p_allocations) as item(user_id uuid, amount bigint);

  return saved_expense;
end;
$$;

create or replace function public.delete_expense(p_expense_id uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  target_expense public.expenses;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into target_expense from public.expenses where id = p_expense_id for update;
  if target_expense.id is null then raise exception 'EXPENSE_NOT_FOUND'; end if;
  perform 1 from public.trips where id = target_expense.trip_id and status = 'active' for update;
  if not found then raise exception 'TRIP_LOCKED'; end if;
  if not public.can_edit_expense(p_expense_id) then raise exception 'EXPENSE_ACCESS_DENIED'; end if;
  delete from public.expenses where id = p_expense_id;
end;
$$;

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

  insert into bpt_balances (user_id, balance)
  select tm.user_id,
    coalesce(paid.total_paid, 0) - coalesce(share.total_share, 0)
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

  delete from public.settlements where trip_id = p_trip_id;

  loop
    select user_id, balance into debtor_id, debtor_balance
    from bpt_balances where balance < 0 order by balance asc, user_id limit 1;
    exit when not found;

    select user_id, balance into creditor_id, creditor_balance
    from bpt_balances where balance > 0 order by balance desc, user_id limit 1;
    if not found then raise exception 'UNBALANCED_TRIP'; end if;

    transfer_amount := least(abs(debtor_balance), creditor_balance);
    if transfer_amount <= 0 then raise exception 'INVALID_SETTLEMENT'; end if;

    insert into public.settlements (trip_id, from_user_id, to_user_id, amount, status)
    values (p_trip_id, debtor_id, creditor_id, transfer_amount, 'pending');

    update bpt_balances set balance = balance + transfer_amount where user_id = debtor_id;
    update bpt_balances set balance = balance - transfer_amount where user_id = creditor_id;
  end loop;

  update public.trips
  set status = 'finalized', finalized_at = now()
  where id = p_trip_id;

  return query select * from public.settlements where trip_id = p_trip_id order by created_at, id;
end;
$$;

create or replace function public.mark_settlement_paid(p_settlement_id uuid)
returns public.settlements
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  updated_settlement public.settlements;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;

  update public.settlements s
  set status = 'paid', paid_at = coalesce(s.paid_at, now())
  where s.id = p_settlement_id
    and s.status = 'pending'
    and exists (select 1 from public.trips t where t.id = s.trip_id and t.status = 'finalized')
    and (s.from_user_id = auth.uid() or public.is_trip_admin(s.trip_id))
  returning * into updated_settlement;

  if updated_settlement.id is null then raise exception 'SETTLEMENT_ACCESS_DENIED'; end if;
  return updated_settlement;
end;
$$;

revoke all on function public.save_expense(uuid, text, bigint, date, uuid, public.split_type, jsonb, uuid, text, text, text) from public;
revoke all on function public.delete_expense(uuid) from public;
revoke all on function public.finalize_trip(uuid) from public;
revoke all on function public.mark_settlement_paid(uuid) from public;
grant execute on function public.save_expense(uuid, text, bigint, date, uuid, public.split_type, jsonb, uuid, text, text, text) to authenticated;
grant execute on function public.delete_expense(uuid) to authenticated;
grant execute on function public.finalize_trip(uuid) to authenticated;
grant execute on function public.mark_settlement_paid(uuid) to authenticated;
