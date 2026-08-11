create extension if not exists pgcrypto;

create type public.trip_status as enum ('active', 'finalized');
create type public.member_role as enum ('admin', 'member');
create type public.split_type as enum ('equal', 'selected_equal', 'custom');
create type public.settlement_status as enum ('pending', 'paid');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null check (char_length(trim(display_name)) between 1 and 80),
  avatar_url text,
  created_at timestamptz not null default now()
);

create table public.trips (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 120),
  description text,
  cover_url text,
  start_date date,
  end_date date,
  invite_code text not null unique default upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
  status public.trip_status not null default 'active',
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  finalized_at timestamptz,
  check (end_date is null or start_date is null or end_date >= start_date)
);

create table public.trip_members (
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role public.member_role not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (trip_id, user_id)
);

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 160),
  notes text,
  category text not null default 'other',
  amount bigint not null check (amount > 0),
  expense_date date not null default current_date,
  paid_by uuid not null references public.profiles(id),
  created_by uuid not null references public.profiles(id),
  split_type public.split_type not null,
  receipt_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.expense_allocations (
  id uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.expenses(id) on delete cascade,
  user_id uuid not null references public.profiles(id),
  amount bigint not null check (amount >= 0),
  unique (expense_id, user_id)
);

create table public.settlements (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  from_user_id uuid not null references public.profiles(id),
  to_user_id uuid not null references public.profiles(id),
  amount bigint not null check (amount > 0),
  status public.settlement_status not null default 'pending',
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  check (from_user_id <> to_user_id)
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

create index trip_members_user_idx on public.trip_members(user_id);
create index expenses_trip_idx on public.expenses(trip_id, expense_date desc);
create index allocations_expense_idx on public.expense_allocations(expense_id);
create index settlements_trip_idx on public.settlements(trip_id);

create or replace function public.is_trip_member(p_trip_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.trip_members
    where trip_id = p_trip_id and user_id = auth.uid()
  );
$$;

create or replace function public.is_trip_admin(p_trip_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.trip_members
    where trip_id = p_trip_id and user_id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.expense_trip_id(p_expense_id uuid)
returns uuid
language sql stable security definer set search_path = public
as $$
  select trip_id from public.expenses where id = p_expense_id;
$$;

create or replace function public.can_edit_expense(p_expense_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from public.expenses e
    join public.trips t on t.id = e.trip_id
    where e.id = p_expense_id
      and t.status = 'active'
      and (e.created_by = auth.uid() or public.is_trip_admin(e.trip_id))
  );
$$;

create or replace function public.join_trip_by_invite(p_invite_code text)
returns public.trip_members
language plpgsql security definer set search_path = public
as $$
declare
  target_trip public.trips;
  joined_member public.trip_members;
begin
  select * into target_trip from public.trips where invite_code = upper(trim(p_invite_code)) and status = 'active';
  if target_trip.id is null then raise exception 'INVITE_NOT_FOUND'; end if;
  insert into public.trip_members (trip_id, user_id, role)
  values (target_trip.id, auth.uid(), 'member')
  on conflict (trip_id, user_id) do update set trip_id = excluded.trip_id
  returning * into joined_member;
  return joined_member;
end;
$$;

create or replace function public.create_trip(
  p_name text,
  p_description text default null,
  p_start_date date default null,
  p_end_date date default null
)
returns public.trips
language plpgsql security definer set search_path = public
as $$
declare
  created_trip public.trips;
begin
  insert into public.trips (name, description, start_date, end_date, created_by)
  values (trim(p_name), nullif(trim(p_description), ''), p_start_date, p_end_date, auth.uid())
  returning * into created_trip;
  insert into public.trip_members (trip_id, user_id, role)
  values (created_trip.id, auth.uid(), 'admin');
  return created_trip;
end;
$$;

alter table public.profiles enable row level security;
alter table public.trips enable row level security;
alter table public.trip_members enable row level security;
alter table public.expenses enable row level security;
alter table public.expense_allocations enable row level security;
alter table public.settlements enable row level security;

create policy "profiles are visible to authenticated users"
  on public.profiles for select to authenticated using (true);
create policy "users can create their own profile"
  on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "users can update their own profile"
  on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "members can read trips"
  on public.trips for select to authenticated using (public.is_trip_member(id));
create policy "users can create trips"
  on public.trips for insert to authenticated with check (created_by = auth.uid());
create policy "admins can update active trips"
  on public.trips for update to authenticated using (public.is_trip_admin(id)) with check (public.is_trip_admin(id));

create policy "members can read membership"
  on public.trip_members for select to authenticated using (public.is_trip_member(trip_id));
create policy "users can join as themselves"
  on public.trip_members for insert to authenticated with check (user_id = auth.uid() and public.is_trip_member(trip_id));
create policy "admins can manage membership"
  on public.trip_members for update to authenticated using (public.is_trip_admin(trip_id)) with check (public.is_trip_admin(trip_id));

create policy "members can read expenses"
  on public.expenses for select to authenticated using (public.is_trip_member(trip_id));
create policy "members can create expenses while active"
  on public.expenses for insert to authenticated with check (
    created_by = auth.uid() and public.is_trip_member(trip_id)
    and exists (select 1 from public.trips where id = trip_id and status = 'active')
  );
create policy "creators and admins can update expenses while active"
  on public.expenses for update to authenticated using (
    public.is_trip_member(trip_id)
    and exists (select 1 from public.trips where id = trip_id and status = 'active')
    and (created_by = auth.uid() or public.is_trip_admin(trip_id))
  ) with check (
    public.is_trip_member(trip_id)
    and exists (select 1 from public.trips where id = trip_id and status = 'active')
    and (created_by = auth.uid() or public.is_trip_admin(trip_id))
  );

create policy "members can read allocations"
  on public.expense_allocations for select to authenticated using (public.is_trip_member(public.expense_trip_id(expense_id)));
create policy "members can create allocations for active trips"
  on public.expense_allocations for insert to authenticated with check (public.can_edit_expense(expense_id));
create policy "creators and admins can update allocations"
  on public.expense_allocations for update to authenticated using (public.can_edit_expense(expense_id)) with check (public.can_edit_expense(expense_id));
create policy "creators and admins can delete allocations"
  on public.expense_allocations for delete to authenticated using (public.can_edit_expense(expense_id));

create policy "members can read settlements"
  on public.settlements for select to authenticated using (public.is_trip_member(trip_id));
create policy "admins can create settlements"
  on public.settlements for insert to authenticated with check (public.is_trip_admin(trip_id));
create policy "members can mark their settlement paid"
  on public.settlements for update to authenticated using (public.is_trip_member(trip_id)) with check (public.is_trip_member(trip_id));

insert into storage.buckets (id, name, public)
values ('trip-receipts', 'trip-receipts', false)
on conflict (id) do nothing;

create policy "trip members can read receipts"
  on storage.objects for select to authenticated using (
    bucket_id = 'trip-receipts'
    and public.is_trip_member(((storage.foldername(name))[1])::uuid)
  );
create policy "trip members can upload receipts"
  on storage.objects for insert to authenticated with check (
    bucket_id = 'trip-receipts'
    and public.is_trip_member(((storage.foldername(name))[1])::uuid)
  );
