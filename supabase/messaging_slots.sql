-- Phase 3: profiles, in-app messaging, and bookable viewing slots.
--
-- Run once in the Supabase Dashboard -> SQL Editor BEFORE deploying the app
-- code that uses these tables. Safe to re-run.

---------------------------------------------------------------------------
-- Profiles: a public-ish name for every user, so each side of a booking or
-- chat knows who they're dealing with. Phone numbers are deliberately not
-- stored: contact happens in the app.
---------------------------------------------------------------------------

-- This project already has a profiles table (id, full_name, role, phone,
-- created_at). Create it only if missing, with the same shape.
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  role text not null default 'tenant',
  phone text,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Phone numbers stay private: other users can read names and roles only.
-- (Column grants apply on top of the row policies below.)
revoke select on public.profiles from anon, authenticated;
grant select (id, full_name, role, created_at) on public.profiles to anon, authenticated;

-- New signups get a profile from what they typed. Named ile_* so it never
-- replaces a handle_new_user() trigger the project may already have.
create or replace function public.ile_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    coalesce(new.raw_user_meta_data ->> 'role', 'tenant')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists ile_on_auth_user_created on auth.users;
create trigger ile_on_auth_user_created
after insert on auth.users
for each row execute function public.ile_handle_new_user();

-- Existing users without a profile.
insert into public.profiles (id, full_name, role)
select
  id,
  coalesce(raw_user_meta_data ->> 'full_name', ''),
  coalesce(raw_user_meta_data ->> 'role', 'tenant')
from auth.users
on conflict (id) do nothing;

-- Fill in blank names on existing profiles from signup data.
update public.profiles p
set full_name = u.raw_user_meta_data ->> 'full_name'
from auth.users u
where u.id = p.id
  and coalesce(trim(p.full_name), '') = ''
  and coalesce(trim(u.raw_user_meta_data ->> 'full_name'), '') <> '';

---------------------------------------------------------------------------
-- Conversations and messages
---------------------------------------------------------------------------

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references public.listings (id) on delete set null,
  tenant_id uuid not null references auth.users (id) on delete cascade,
  landlord_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  unique (listing_id, tenant_id)
);

create index if not exists conversations_tenant_idx on public.conversations (tenant_id, last_message_at desc);
create index if not exists conversations_landlord_idx on public.conversations (landlord_id, last_message_at desc);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  sender_id uuid not null references auth.users (id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists messages_conversation_idx on public.messages (conversation_id, created_at);
create index if not exists messages_unread_idx on public.messages (conversation_id) where read_at is null;

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

drop policy if exists "Participants can view conversations" on public.conversations;
create policy "Participants can view conversations"
on public.conversations for select to authenticated
using (auth.uid() in (tenant_id, landlord_id));

-- Conversations are created through start_conversation() below, never directly.

drop policy if exists "Participants can view messages" on public.messages;
create policy "Participants can view messages"
on public.messages for select to authenticated
using (
  conversation_id in (
    select id from public.conversations where auth.uid() in (tenant_id, landlord_id)
  )
);

drop policy if exists "Participants can send messages" on public.messages;
create policy "Participants can send messages"
on public.messages for insert to authenticated
with check (
  sender_id = auth.uid()
  and read_at is null
  and conversation_id in (
    select id from public.conversations where auth.uid() in (tenant_id, landlord_id)
  )
);

drop policy if exists "Participants can mark messages read" on public.messages;
create policy "Participants can mark messages read"
on public.messages for update to authenticated
using (
  conversation_id in (
    select id from public.conversations where auth.uid() in (tenant_id, landlord_id)
  )
);

-- Only the recipient may change a message, and only to mark it read.
create or replace function public.guard_message_update()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  if new.body is distinct from old.body
     or new.sender_id is distinct from old.sender_id
     or new.conversation_id is distinct from old.conversation_id
     or new.created_at is distinct from old.created_at then
    raise exception 'Messages cannot be edited';
  end if;
  if old.sender_id = auth.uid() and new.read_at is distinct from old.read_at then
    raise exception 'Only the recipient can mark a message read';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_message_update on public.messages;
create trigger guard_message_update
before update on public.messages
for each row execute function public.guard_message_update();

-- Keep conversations sorted by latest activity.
create or replace function public.touch_conversation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations set last_message_at = new.created_at where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists touch_conversation on public.messages;
create trigger touch_conversation
after insert on public.messages
for each row execute function public.touch_conversation();

-- Get or create the conversation for a listing.
--   Home-seeker: start_conversation(listing)          -> chat with the lister
--   Lister:      start_conversation(listing, tenant)  -> only with someone who
--                has booked a viewing on that listing (no cold messaging)
create or replace function public.start_conversation(p_listing uuid, p_tenant uuid default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_landlord uuid;
  v_tenant uuid;
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Log in to send messages';
  end if;

  select landlord_id into v_landlord from public.listings where id = p_listing;
  if v_landlord is null then
    raise exception 'Listing not found';
  end if;

  if auth.uid() = v_landlord then
    if p_tenant is null then
      raise exception 'Choose who to message';
    end if;
    if not exists (
      select 1 from public.inspections where listing_id = p_listing and tenant_id = p_tenant
    ) then
      raise exception 'You can only message people who have booked a viewing';
    end if;
    v_tenant := p_tenant;
  else
    v_tenant := auth.uid();
  end if;

  insert into public.conversations (listing_id, tenant_id, landlord_id)
  values (p_listing, v_tenant, v_landlord)
  on conflict (listing_id, tenant_id) do nothing;

  select id into v_id from public.conversations where listing_id = p_listing and tenant_id = v_tenant;
  return v_id;
end;
$$;

grant execute on function public.start_conversation(uuid, uuid) to authenticated;

-- Live updates for the inbox and open chats (RLS still applies).
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end;
$$;

---------------------------------------------------------------------------
-- Profile visibility: listers' names are public (shown on listings); anyone
-- else is visible only to people they share a booking or chat with.
---------------------------------------------------------------------------

create or replace function public.shares_context(other uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select other = auth.uid()
    or exists (
      select 1 from public.conversations c
      where (c.tenant_id = auth.uid() and c.landlord_id = other)
         or (c.landlord_id = auth.uid() and c.tenant_id = other)
    )
    or exists (
      select 1 from public.inspections i
      join public.listings l on l.id = i.listing_id
      where (i.tenant_id = auth.uid() and l.landlord_id = other)
         or (l.landlord_id = auth.uid() and i.tenant_id = other)
    );
$$;

drop policy if exists "Lister names are public" on public.profiles;
create policy "Lister names are public"
on public.profiles for select to anon, authenticated
using (id in (select landlord_id from public.listings));

drop policy if exists "People you deal with are visible" on public.profiles;
create policy "People you deal with are visible"
on public.profiles for select to authenticated
using (public.shares_context(id));

drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles for update to authenticated
using (id = auth.uid())
with check (id = auth.uid());

---------------------------------------------------------------------------
-- Viewing slots: weekly availability per listing; home-seekers book an open
-- slot and it's confirmed instantly. Times are Nigeria time (WAT).
---------------------------------------------------------------------------

alter table public.listings
  add column if not exists viewing_slot_minutes integer not null default 30;

alter table public.listings drop constraint if exists listings_viewing_slot_minutes_check;
alter table public.listings add constraint listings_viewing_slot_minutes_check
  check (viewing_slot_minutes in (15, 30, 45, 60));

create table if not exists public.listing_availability (
  id bigint generated always as identity primary key,
  listing_id uuid not null references public.listings (id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6), -- 0 = Sunday
  start_time time not null,
  end_time time not null,
  check (end_time > start_time)
);

create index if not exists listing_availability_listing_idx on public.listing_availability (listing_id);

alter table public.listing_availability enable row level security;

drop policy if exists "Availability is public" on public.listing_availability;
create policy "Availability is public"
on public.listing_availability for select
using (true);

drop policy if exists "Owners manage availability" on public.listing_availability;
create policy "Owners manage availability"
on public.listing_availability for all to authenticated
using (listing_id in (select id from public.listings where landlord_id = auth.uid()))
with check (listing_id in (select id from public.listings where landlord_id = auth.uid()));

-- One active booking per listing per time.
create unique index if not exists inspections_one_per_slot
  on public.inspections (listing_id, preferred_date, preferred_time)
  where status in ('pending', 'confirmed') and preferred_time is not null;

-- Open slots for the next p_days days (max 30), at least 2 hours from now.
create or replace function public.listing_open_slots(p_listing uuid, p_days integer default 14)
returns table (slot_date date, slot_time time)
language sql
stable
security definer
set search_path = public
as $$
  with now_local as (
    select (now() at time zone 'Africa/Lagos') as ts
  ),
  listing as (
    select viewing_slot_minutes as mins from public.listings
    where id = p_listing and status = 'active'
  ),
  days as (
    select (n.ts::date + g)::date as d
    from now_local n, generate_series(0, least(greatest(p_days, 1), 30) - 1) g
  ),
  slots as (
    select d.d as slot_date, t as slot_ts
    from days d
    join public.listing_availability a
      on a.listing_id = p_listing and a.weekday = extract(dow from d.d)
    cross join listing l
    cross join lateral generate_series(
      d.d + a.start_time,
      d.d + a.end_time - make_interval(mins => l.mins),
      make_interval(mins => l.mins)
    ) as t
  )
  select distinct s.slot_date, s.slot_ts::time
  from slots s, now_local n
  where s.slot_ts > n.ts + interval '2 hours'
    and not exists (
      select 1 from public.inspections i
      where i.listing_id = p_listing
        and i.preferred_date = s.slot_date
        and i.preferred_time = s.slot_ts::time
        and i.status in ('pending', 'confirmed')
    )
  order by 1, 2;
$$;

grant execute on function public.listing_open_slots(uuid, integer) to anon, authenticated;

-- Book an open slot: confirmed straight away, no back-and-forth.
create or replace function public.book_viewing_slot(p_listing uuid, p_date date, p_time time)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Log in to book a viewing';
  end if;
  if exists (select 1 from public.listings where id = p_listing and landlord_id = auth.uid()) then
    raise exception 'You cannot book a viewing on your own listing';
  end if;
  if exists (
    select 1 from public.inspections
    where listing_id = p_listing and tenant_id = auth.uid()
      and status in ('pending', 'countered', 'confirmed')
  ) then
    raise exception 'You already have a viewing booked for this listing';
  end if;
  if not exists (
    select 1 from public.listing_open_slots(p_listing, 30)
    where slot_date = p_date and slot_time = p_time
  ) then
    raise exception 'That time is no longer available. Please pick another.';
  end if;

  insert into public.inspections (listing_id, tenant_id, preferred_date, preferred_time, status)
  values (p_listing, auth.uid(), p_date, p_time, 'confirmed')
  returning id into v_id;
  return v_id;
end;
$$;

grant execute on function public.book_viewing_slot(uuid, date, time) to authenticated;
