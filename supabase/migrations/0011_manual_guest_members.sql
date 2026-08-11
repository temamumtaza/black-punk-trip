-- A guest profile represents a person recorded by an admin without a Black
-- Punk Trip account. Its UUID is an internal participant identifier only.

alter table public.profiles
  add column if not exists is_guest boolean not null default false;

-- Authenticated profiles still use auth.users IDs. Guest profiles deliberately
-- have no auth user, so the original foreign key cannot represent both kinds.
alter table public.profiles
  drop constraint if exists profiles_id_fkey;

create or replace function public.reject_guest_expense_payer()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $bpt$
begin
  if exists (select 1 from public.profiles where id = new.paid_by and is_guest) then
    raise exception 'GUEST_CANNOT_PAY';
  end if;
  return new;
end;
$bpt$;

drop trigger if exists expenses_reject_guest_payer on public.expenses;
create trigger expenses_reject_guest_payer
  before insert or update of paid_by on public.expenses
  for each row execute procedure public.reject_guest_expense_payer();

create or replace function public.create_guest_member(
  p_trip_id uuid,
  p_display_name text
)
returns public.profiles
language plpgsql
security definer
set search_path = public, pg_temp
as $bpt$
declare
  target_trip public.trips;
  created_profile public.profiles;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;

  select * into target_trip from public.trips where id = p_trip_id for update;
  if target_trip.id is null then raise exception 'TRIP_NOT_FOUND'; end if;
  if target_trip.status <> 'active' then raise exception 'TRIP_LOCKED'; end if;
  if not public.is_trip_admin(p_trip_id) then raise exception 'ADMIN_REQUIRED'; end if;
  if p_display_name is null or char_length(trim(p_display_name)) not between 1 and 80 then
    raise exception 'INVALID_GUEST_NAME';
  end if;

  insert into public.profiles (id, display_name, is_guest)
  values (gen_random_uuid(), trim(p_display_name), true)
  returning * into created_profile;

  insert into public.trip_members (trip_id, user_id, role)
  values (p_trip_id, created_profile.id, 'member');

  -- "Rata" deliberately follows current membership, including guests.
  perform public.rebalance_equal_expenses(p_trip_id);
  return created_profile;
end;
$bpt$;

create or replace function public.update_guest_member_name(
  p_trip_id uuid,
  p_user_id uuid,
  p_display_name text
)
returns public.profiles
language plpgsql
security definer
set search_path = public, pg_temp
as $bpt$
declare
  target_trip public.trips;
  updated_profile public.profiles;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;

  select * into target_trip from public.trips where id = p_trip_id for update;
  if target_trip.id is null then raise exception 'TRIP_NOT_FOUND'; end if;
  if target_trip.status <> 'active' then raise exception 'TRIP_LOCKED'; end if;
  if not public.is_trip_admin(p_trip_id) then raise exception 'ADMIN_REQUIRED'; end if;
  if p_display_name is null or char_length(trim(p_display_name)) not between 1 and 80 then
    raise exception 'INVALID_GUEST_NAME';
  end if;
  if not exists (select 1 from public.trip_members where trip_id = p_trip_id and user_id = p_user_id) then
    raise exception 'MEMBER_NOT_FOUND';
  end if;

  update public.profiles
  set display_name = trim(p_display_name)
  where id = p_user_id and is_guest
  returning * into updated_profile;

  if updated_profile.id is null then raise exception 'GUEST_NOT_FOUND'; end if;
  return updated_profile;
end;
$bpt$;

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
  if p_role = 'admin' and exists (select 1 from public.profiles where id = p_user_id and is_guest) then
    raise exception 'GUEST_CANNOT_BE_ADMIN';
  end if;

  select * into updated_member from public.trip_members
  where trip_id = p_trip_id and user_id = p_user_id for update;
  if updated_member.trip_id is null then raise exception 'MEMBER_NOT_FOUND'; end if;

  update public.trip_members set role = p_role
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
  target_is_guest boolean;
begin
  if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
  select * into target_trip from public.trips where id = p_trip_id for update;
  if target_trip.id is null then raise exception 'TRIP_NOT_FOUND'; end if;
  if target_trip.status <> 'active' then raise exception 'TRIP_LOCKED'; end if;
  if not public.is_trip_admin(p_trip_id) then raise exception 'ADMIN_REQUIRED'; end if;
  if p_user_id = auth.uid() then raise exception 'SELF_MEMBER_MANAGEMENT_FORBIDDEN'; end if;

  select * into target_member from public.trip_members
  where trip_id = p_trip_id and user_id = p_user_id for update;
  if target_member.trip_id is null then raise exception 'MEMBER_NOT_FOUND'; end if;

  select is_guest into target_is_guest from public.profiles where id = p_user_id;
  if exists (
    select 1 from public.expenses e
    where e.trip_id = p_trip_id and (e.paid_by = p_user_id or e.created_by = p_user_id)
  ) or exists (
    select 1 from public.expense_allocations ea
    join public.expenses e on e.id = ea.expense_id
    where e.trip_id = p_trip_id and ea.user_id = p_user_id
      and e.split_type in ('selected_equal', 'custom')
  ) then
    raise exception 'MEMBER_HAS_ACTIVITY';
  end if;

  delete from public.trip_members where trip_id = p_trip_id and user_id = p_user_id;
  perform public.rebalance_equal_expenses(p_trip_id);

  if target_is_guest and not exists (select 1 from public.trip_members where user_id = p_user_id) then
    delete from public.profiles where id = p_user_id and is_guest;
  end if;
end;
$bpt$;

revoke all on function public.reject_guest_expense_payer() from public;
revoke all on function public.create_guest_member(uuid, text) from public;
revoke all on function public.update_guest_member_name(uuid, uuid, text) from public;
revoke all on function public.update_trip_member_role(uuid, uuid, public.member_role) from public;
revoke all on function public.remove_trip_member(uuid, uuid) from public;
grant execute on function public.create_guest_member(uuid, text) to authenticated;
grant execute on function public.update_guest_member_name(uuid, uuid, text) to authenticated;
grant execute on function public.update_trip_member_role(uuid, uuid, public.member_role) to authenticated;
grant execute on function public.remove_trip_member(uuid, uuid) to authenticated;
