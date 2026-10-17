-- Profiles for everyone, usernames, and phone numbers shared only between the
-- two people on a confirmed booking.
-- Spec: docs/superpowers/specs/2026-10-17-ile-profiles-privacy-design.md
--
-- Run once in Supabase -> SQL Editor. Safe to re-run.
-- Needs messaging_slots.sql, profiles_extended.sql and (for stays) stays.sql.

-- ---------------------------------------------------------------------------
-- Everyone's basic profile can be read. Which columns are readable is set by
-- the column grants (profiles_extended.sql and below), so private details such
-- as phone, home state and occupation stay hidden. Before this, only people
-- with a listing (or someone you'd dealt with) could be seen, so home-seekers'
-- profile pages showed "not found".
-- ---------------------------------------------------------------------------

drop policy if exists "Basic profiles are public" on public.profiles;
create policy "Basic profiles are public"
on public.profiles for select to anon, authenticated
using (true);

-- ---------------------------------------------------------------------------
-- Username and what others see
-- ---------------------------------------------------------------------------

alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists show_as text not null default 'name';

create unique index if not exists profiles_username_key on public.profiles (lower(username));

alter table public.profiles drop constraint if exists profiles_username_check;
alter table public.profiles add constraint profiles_username_check
  check (
    username is null or (
      username ~ '^[a-z0-9_]{3,20}$'
      and username !~ '^_' and username !~ '_$'
      and username not in ('admin', 'ile', 'support', 'help', 'official', 'moderator')
    )
  );

alter table public.profiles drop constraint if exists profiles_show_as_check;
alter table public.profiles add constraint profiles_show_as_check
  check (show_as in ('name', 'username') and (show_as <> 'username' or username is not null));

-- Tidy numbers saved earlier in other Nigerian formats (0803..., 234803...)
-- so the check below doesn't block later updates of those rows.
update public.profiles
set phone = '+234' || right(regexp_replace(phone, '[^0-9]', '', 'g'), 10)
where phone is not null
  and phone !~ '^\+234[0-9]{10}$'
  and regexp_replace(phone, '[^0-9]', '', 'g') ~ '^(234|0)?[789][01][0-9]{8}$';

alter table public.profiles drop constraint if exists profiles_phone_check;
alter table public.profiles add constraint profiles_phone_check
  check (phone is null or phone ~ '^\+234[0-9]{10}$') not valid;

-- The name others see: "@username" for people who chose it, otherwise their
-- name. Readers get this column, not full_name, so the real name of someone
-- showing their @username can't be read by anyone else. The owner still sees
-- full_name through my_profile().
alter table public.profiles add column if not exists public_name text generated always as (
  case when show_as = 'username' and username is not null then '@' || username
       else nullif(trim(full_name), '') end
) stored;

revoke select (full_name) on public.profiles from anon, authenticated;

-- Readable by everyone (needed to show the chosen name); phone is NOT here.
grant select (username, show_as, public_name) on public.profiles to anon, authenticated;
-- The owner can change these on their own row (RLS limits updates to self).
grant update (username, show_as, phone) on public.profiles to authenticated;

-- ---------------------------------------------------------------------------
-- Functions
-- ---------------------------------------------------------------------------

create or replace function public.my_phone()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select phone from public.profiles where id = auth.uid();
$$;

revoke execute on function public.my_phone() from public, anon;
grant execute on function public.my_phone() to authenticated;

-- Is this username free (and allowed)? Your own current username counts as free.
create or replace function public.username_available(p_username text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    lower(coalesce(p_username, '')) ~ '^[a-z0-9_]{3,20}$'
    and lower(p_username) !~ '^_' and lower(p_username) !~ '_$'
    and lower(p_username) not in ('admin', 'ile', 'support', 'help', 'official', 'moderator')
    and not exists (
      select 1 from public.profiles
      where lower(username) = lower(p_username) and id is distinct from auth.uid()
    );
$$;

grant execute on function public.username_available(text) to anon, authenticated;

-- The other person's phone number on a booking, only once it's confirmed
-- (viewings) or accepted (stays), and only for the two people involved.
create or replace function public.booking_contact(p_kind text, p_id uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_guest uuid;
  v_host uuid;
  v_status text;
  v_other uuid;
begin
  if auth.uid() is null then
    return null;
  end if;
  if p_kind = 'viewing' then
    select i.tenant_id, l.landlord_id, i.status into v_guest, v_host, v_status
    from public.inspections i join public.listings l on l.id = i.listing_id
    where i.id = p_id;
    if v_status not in ('confirmed', 'done') then
      return null;
    end if;
  elsif p_kind = 'stay' then
    select b.guest_id, l.landlord_id, b.status into v_guest, v_host, v_status
    from public.stay_bookings b join public.listings l on l.id = b.listing_id
    where b.id = p_id;
    if v_status is distinct from 'accepted' then
      return null;
    end if;
  else
    return null;
  end if;
  if auth.uid() = v_guest then
    v_other := v_host;
  elsif auth.uid() = v_host then
    v_other := v_guest;
  else
    return null;
  end if;
  return (select phone from public.profiles where id = v_other);
end;
$$;

revoke execute on function public.booking_contact(text, uuid) from public, anon;
grant execute on function public.booking_contact(text, uuid) to authenticated;

-- Push notifications ("Ada: ...") follow the same rule as the screens:
-- "@username" for people who chose it, otherwise their first name.
create or replace function public.ile_first_name(p_user uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    case when show_as = 'username' and username is not null then '@' || username
         else nullif(split_part(trim(full_name), ' ', 1), '') end,
    'Someone')
  from public.profiles where id = p_user;
$$;

-- ---------------------------------------------------------------------------
-- Checks: the three new columns.
-- ---------------------------------------------------------------------------

select column_name from information_schema.columns
where table_schema = 'public' and table_name = 'profiles' and column_name in ('username', 'show_as', 'public_name')
order by column_name;
