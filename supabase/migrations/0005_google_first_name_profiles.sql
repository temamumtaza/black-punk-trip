-- Keep profile names friendly for Google sign-ins while preserving names
-- explicitly supplied by email sign-up users.

create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $bpt$
declare
  google_first_name text;
begin
  google_first_name := nullif(
    trim(
      split_part(
        coalesce(
          nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
          nullif(trim(new.raw_user_meta_data ->> 'name'), ''),
          ''
        ),
        ' ',
        1
      )
    ),
    ''
  );

  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
      google_first_name,
      nullif(split_part(new.email, '@', 1), ''),
      'Traveler'
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$bpt$;

-- Profiles created by the previous trigger for Google users used the full
-- name or email prefix. Only replace those generated values; a nickname
-- explicitly chosen during sign-up remains untouched.
update public.profiles p
set display_name = first_name.value
from auth.users u
cross join lateral (
  select nullif(
    trim(
      split_part(
        coalesce(
          nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''),
          nullif(trim(u.raw_user_meta_data ->> 'name'), ''),
          ''
        ),
        ' ',
        1
      )
    ),
    ''
  ) as value
) first_name
where p.id = u.id
  and u.raw_app_meta_data ->> 'provider' = 'google'
  and first_name.value is not null
  and (
    p.display_name = nullif(trim(u.raw_user_meta_data ->> 'full_name'), '')
    or p.display_name = nullif(trim(u.raw_user_meta_data ->> 'name'), '')
    or p.display_name = nullif(split_part(u.email, '@', 1), '')
  );
