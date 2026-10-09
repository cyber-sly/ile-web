-- Richer profiles: photo, bio, languages, lister business details, and
-- optional home-seeker details. Plus an "avatars" storage bucket and a
-- computed "usually replies within" stat.
--
-- Run once in the Supabase Dashboard -> SQL Editor after all earlier files.
-- Safe to re-run.
--
-- Visibility
--   public          : name, role, photo, bio, languages, lister type,
--                     business name, office address, areas covered,
--                     listing since, which registration body (not the number)
--   private (owner) : home state, phone, registration number, occupation,
--                     move-in timeline
--   occupation + move-in timeline are also shown to listers the person has
--   booked a viewing with (via tenant_details()).

alter table public.profiles
  add column if not exists avatar_url text,
  add column if not exists bio text,
  add column if not exists languages text[] not null default '{}',
  add column if not exists home_state text,
  add column if not exists lister_type text,
  add column if not exists business_name text,
  add column if not exists office_address text,
  add column if not exists areas_covered text[] not null default '{}',
  add column if not exists listing_since smallint,
  add column if not exists registration_body text,
  add column if not exists registration_number text,
  add column if not exists occupation text,
  add column if not exists move_in_timeline text,
  add column if not exists updated_at timestamptz not null default now();

alter table public.profiles drop constraint if exists profiles_details_check;
alter table public.profiles add constraint profiles_details_check check (
  (bio is null or char_length(bio) <= 300)
  and (full_name is null or char_length(full_name) <= 80)
  and coalesce(array_length(languages, 1), 0) <= 8
  and (lister_type is null or lister_type in ('owner', 'agent', 'caretaker', 'developer'))
  and (business_name is null or char_length(business_name) <= 100)
  and (office_address is null or char_length(office_address) <= 200)
  and coalesce(array_length(areas_covered, 1), 0) <= 15
  and (listing_since is null or listing_since between 1950 and 2100)
  and (registration_body is null or registration_body in ('esvarbon', 'niesv', 'lasrera', 'redan', 'other'))
  and (registration_number is null or char_length(registration_number) <= 50)
  and (occupation is null or occupation in ('professional', 'self_employed', 'business_owner', 'student', 'other'))
  and (move_in_timeline is null or move_in_timeline in ('now', 'one_month', 'three_months', 'later'))
) not valid;

-- Photos must be the user's own upload in the avatars bucket.
create or replace function public.validate_profile()
returns trigger
language plpgsql
as $$
begin
  if new.avatar_url is not null and new.avatar_url is distinct from old.avatar_url
     and new.avatar_url !~ ('^https://[a-z0-9.-]+/storage/v1/object/public/avatars/' || new.id::text || '/[^/?#]+$') then
    raise exception 'Profile photos must be uploaded through Ile';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists validate_profile on public.profiles;
create trigger validate_profile
before update on public.profiles
for each row execute function public.validate_profile();

---------------------------------------------------------------------------
-- Column access. Row policies decide WHICH profiles are visible; these
-- grants decide WHICH COLUMNS anyone can read or change.
---------------------------------------------------------------------------

revoke select on public.profiles from anon, authenticated;
grant select (
  id, full_name, role, created_at, avatar_url, bio, languages, lister_type,
  business_name, office_address, areas_covered, listing_since, registration_body
) on public.profiles to anon, authenticated;

revoke update on public.profiles from anon, authenticated;
grant update (
  full_name, role, avatar_url, bio, languages, home_state, lister_type,
  business_name, office_address, areas_covered, listing_since,
  registration_body, registration_number, occupation, move_in_timeline
) on public.profiles to authenticated;

-- The signed-in user's own profile, including private fields.
create or replace function public.my_profile()
returns setof public.profiles
language sql
stable
security definer
set search_path = public
as $$
  select * from public.profiles where id = auth.uid();
$$;

grant execute on function public.my_profile() to authenticated;

-- Occupation and move-in timeline for home-seekers who booked a viewing on
-- one of the caller's listings, and nobody else's.
create or replace function public.tenant_details(p_ids uuid[])
returns table (id uuid, occupation text, move_in_timeline text)
language sql
stable
security definer
set search_path = public
as $$
  select p.id, p.occupation, p.move_in_timeline
  from public.profiles p
  where p.id = any (p_ids)
    and exists (
      select 1 from public.inspections i
      join public.listings l on l.id = i.listing_id
      where i.tenant_id = p.id and l.landlord_id = auth.uid()
    );
$$;

grant execute on function public.tenant_details(uuid[]) to authenticated;

---------------------------------------------------------------------------
-- "Usually replies within X": median time from a home-seeker's first message
-- in a chat to the lister's first reply, over the last 90 days. Only reported
-- once there are at least 3 chats to measure.
---------------------------------------------------------------------------

create or replace function public.lister_response_times(p_users uuid[])
returns table (user_id uuid, median_minutes integer, samples integer)
language sql
stable
security definer
set search_path = public
as $$
  with firsts as (
    select
      c.landlord_id,
      (select min(m.created_at) from public.messages m
        where m.conversation_id = c.id and m.sender_id = c.tenant_id) as asked_at,
      c.id
    from public.conversations c
    where c.landlord_id = any (p_users) and c.created_at > now() - interval '90 days'
  ),
  replies as (
    select f.landlord_id,
      extract(epoch from (
        (select min(m.created_at) from public.messages m
          where m.conversation_id = f.id and m.sender_id = f.landlord_id and m.created_at > f.asked_at)
        - f.asked_at
      )) / 60 as minutes
    from firsts f
    where f.asked_at is not null
  )
  select landlord_id, round(percentile_cont(0.5) within group (order by minutes))::integer, count(*)::integer
  from replies
  where minutes is not null
  group by landlord_id
  having count(*) >= 3;
$$;

grant execute on function public.lister_response_times(uuid[]) to anon, authenticated;

---------------------------------------------------------------------------
-- Avatars bucket: public to view; each user manages files in their own
-- folder; images only, 2MB max.
---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, allowed_mime_types, file_size_limit)
values ('avatars', 'avatars', true, array['image/jpeg', 'image/png', 'image/webp'], 2 * 1024 * 1024)
on conflict (id) do update
set public = true,
    allowed_mime_types = excluded.allowed_mime_types,
    file_size_limit = excluded.file_size_limit;

drop policy if exists "Avatars are publicly readable" on storage.objects;
create policy "Avatars are publicly readable"
on storage.objects for select
using (bucket_id = 'avatars');

drop policy if exists "Users upload their own avatar" on storage.objects;
create policy "Users upload their own avatar"
on storage.objects for insert to authenticated
with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "Users delete their own avatar" on storage.objects;
create policy "Users delete their own avatar"
on storage.objects for delete to authenticated
using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
