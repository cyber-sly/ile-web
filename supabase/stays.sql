-- Stays: shortlet apartments, hotel rooms and Airbnb rooms by the night, with
-- stay requests the host accepts or declines, and stay reviews.
-- Spec: docs/superpowers/specs/2026-10-17-ile-stays-amenities-design.md
--
-- Run once in Supabase -> SQL Editor. Safe to re-run.
-- Needs push_notifications.sql (ile_notify, ile_first_name) and reviews.sql.

-- ---------------------------------------------------------------------------
-- Listings: the Stays category, per-night prices and stay details
-- ---------------------------------------------------------------------------

alter table public.listings drop constraint if exists listings_category_check;
alter table public.listings add constraint listings_category_check
  check (category in ('homes', 'land', 'commercial', 'stays'));

alter table public.listings drop constraint if exists listings_property_type_check;
alter table public.listings add constraint listings_property_type_check
  check (property_type in (
    'flat', 'self_contain', 'mini_flat', 'room', 'duplex', 'bungalow', 'terrace',
    'residential_land', 'commercial_land', 'farmland',
    'shop', 'office', 'warehouse',
    'shortlet', 'hotel_room', 'airbnb'
  ));

alter table public.listings drop constraint if exists listings_price_period_check;
alter table public.listings add constraint listings_price_period_check
  check (price_period in ('year', 'month', 'total', 'plot', 'night'));

alter table public.listings
  add column if not exists max_guests integer,
  add column if not exists min_nights integer,
  add column if not exists check_in_time time,
  add column if not exists check_out_time time,
  add column if not exists cleaning_fee numeric,
  add column if not exists hotel_name text,
  add column if not exists house_rules text;

alter table public.listings drop constraint if exists listings_stay_fields_check;
alter table public.listings add constraint listings_stay_fields_check
  check (
    (max_guests is null or max_guests between 1 and 50)
    and (min_nights is null or min_nights between 1 and 365)
    and (cleaning_fee is null or cleaning_fee >= 0)
    and (hotel_name is null or char_length(hotel_name) <= 100)
    and (house_rules is null or char_length(house_rules) <= 1000)
    and (category <> 'stays' or (max_guests is not null and price_period = 'night'))
  );

create index if not exists listings_features_idx on public.listings using gin (features);

-- ---------------------------------------------------------------------------
-- Stay bookings (written only through the functions below)
-- ---------------------------------------------------------------------------

create table if not exists public.stay_bookings (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  guest_id uuid not null references auth.users (id) on delete cascade,
  check_in date not null,
  check_out date not null,
  guests integer not null check (guests between 1 and 50),
  nights integer not null,
  nightly_price numeric not null,
  cleaning_fee numeric not null default 0,
  caution_deposit numeric not null default 0,
  total numeric not null,
  note text check (note is null or char_length(note) <= 500),
  status text not null default 'requested' check (status in ('requested', 'accepted', 'declined', 'cancelled')),
  decline_reason text check (decline_reason is null or char_length(decline_reason) <= 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (check_out > check_in)
);
create index if not exists stay_bookings_listing_idx on public.stay_bookings (listing_id, check_in);
create index if not exists stay_bookings_guest_idx on public.stay_bookings (guest_id, check_in);

alter table public.stay_bookings enable row level security;

drop policy if exists "Guests and hosts see their stays" on public.stay_bookings;
create policy "Guests and hosts see their stays"
on public.stay_bookings for select to authenticated
using (
  guest_id = auth.uid()
  or exists (select 1 from public.listings l where l.id = listing_id and l.landlord_id = auth.uid())
);
-- No insert/update/delete policies: request_stay, respond_stay and cancel_stay do the writing.

-- "Sat 07 Nov – Tue 10 Nov"
create or replace function public.ile_stay_dates(p_in date, p_out date)
returns text
language sql
immutable
set search_path = public
as $$
  select to_char(p_in, 'Dy DD Mon') || ' – ' || to_char(p_out, 'Dy DD Mon');
$$;

-- ---------------------------------------------------------------------------
-- Guest: request a stay
-- ---------------------------------------------------------------------------

create or replace function public.request_stay(p_listing uuid, p_check_in date, p_check_out date, p_guests integer, p_note text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  l public.listings;
  v_nights integer;
  v_cleaning numeric;
  v_caution numeric;
  v_id uuid;
  today date := (now() at time zone 'Africa/Lagos')::date;
begin
  if auth.uid() is null then
    raise exception 'Log in to fix a booking';
  end if;
  select * into l from public.listings where id = p_listing;
  if l.id is null or l.category <> 'stays' or l.status <> 'active' then
    raise exception 'This place isn''t taking bookings right now.';
  end if;
  if l.landlord_id = auth.uid() then
    raise exception 'You can''t book your own listing.';
  end if;
  if p_check_in is null or p_check_out is null then
    raise exception 'Choose your check-in and check-out dates.';
  end if;
  if p_check_in < today then
    raise exception 'Choose a check-in date from today.';
  end if;
  if p_check_out <= p_check_in then
    raise exception 'Check-out must be after check-in.';
  end if;
  v_nights := p_check_out - p_check_in;
  if v_nights < coalesce(l.min_nights, 1) then
    raise exception 'This place needs at least % nights.', coalesce(l.min_nights, 1);
  end if;
  if v_nights > 90 then
    raise exception 'Stays can be up to 90 nights.';
  end if;
  if p_guests is null or p_guests < 1 then
    raise exception 'Choose how many guests.';
  end if;
  if p_guests > coalesce(l.max_guests, 1) then
    raise exception 'This place sleeps up to % guests.', coalesce(l.max_guests, 1);
  end if;
  if char_length(coalesce(p_note, '')) > 500 then
    raise exception 'Keep your note under 500 characters.';
  end if;
  if exists (
    select 1 from public.stay_bookings b
    where b.listing_id = p_listing and b.status = 'accepted'
      and b.check_in < p_check_out and b.check_out > p_check_in
  ) then
    raise exception 'Some of those dates are already booked.';
  end if;
  if exists (
    select 1 from public.stay_bookings b
    where b.listing_id = p_listing and b.guest_id = auth.uid() and b.status = 'requested'
      and b.check_in < p_check_out and b.check_out > p_check_in
  ) then
    raise exception 'You''ve already asked for those dates.';
  end if;

  v_cleaning := greatest(coalesce(l.cleaning_fee, 0), 0);
  v_caution := greatest(coalesce(l.caution_deposit, 0), 0);
  insert into public.stay_bookings (
    listing_id, guest_id, check_in, check_out, guests, nights, nightly_price, cleaning_fee, caution_deposit, total, note
  )
  values (
    p_listing, auth.uid(), p_check_in, p_check_out, p_guests, v_nights, l.price, v_cleaning, v_caution,
    v_nights * l.price + v_cleaning + v_caution, nullif(trim(coalesce(p_note, '')), '')
  )
  returning id into v_id;

  perform public.ile_notify(l.landlord_id, 'stay_request', 'New stay request',
    coalesce(public.ile_first_name(auth.uid()), 'Someone') || ' wants to stay at ' || l.title || ', '
      || public.ile_stay_dates(p_check_in, p_check_out) || '.',
    jsonb_build_object('route', 'dashboard'));
  return v_id;
end;
$$;

grant execute on function public.request_stay(uuid, date, date, integer, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Host: accept or decline
-- ---------------------------------------------------------------------------

create or replace function public.respond_stay(p_id uuid, p_accept boolean, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  b public.stay_bookings;
  l public.listings;
  r record;
  v_reason text := nullif(left(trim(coalesce(p_reason, '')), 200), '');
begin
  select * into b from public.stay_bookings where id = p_id;
  if b.id is null then
    raise exception 'Booking not found.';
  end if;
  -- Lock the listing so two accepts for the same dates can't both succeed.
  select * into l from public.listings where id = b.listing_id for update;
  if l.landlord_id is distinct from auth.uid() then
    raise exception 'Only the host can answer this request.';
  end if;
  if b.status <> 'requested' then
    raise exception 'This request has already been answered.';
  end if;

  if not p_accept then
    update public.stay_bookings set status = 'declined', decline_reason = v_reason, updated_at = now() where id = p_id;
    perform public.ile_notify(b.guest_id, 'stay_declined', 'Stay request declined',
      l.title || ': ' || coalesce(v_reason, 'the host can''t do those dates.'), jsonb_build_object('route', 'viewings'));
    return;
  end if;

  if exists (
    select 1 from public.stay_bookings o
    where o.listing_id = b.listing_id and o.status = 'accepted' and o.id <> b.id
      and o.check_in < b.check_out and o.check_out > b.check_in
  ) then
    raise exception 'Those dates are already booked.';
  end if;

  update public.stay_bookings set status = 'accepted', updated_at = now() where id = p_id;
  perform public.ile_notify(b.guest_id, 'stay_accepted', 'Stay accepted',
    l.title || ', ' || public.ile_stay_dates(b.check_in, b.check_out) || '. Pay the host directly.',
    jsonb_build_object('route', 'viewings'));

  -- Other requests for overlapping dates can't happen now.
  for r in
    update public.stay_bookings o
    set status = 'declined', decline_reason = 'Those dates were taken', updated_at = now()
    where o.listing_id = b.listing_id and o.status = 'requested' and o.id <> b.id
      and o.check_in < b.check_out and o.check_out > b.check_in
    returning o.guest_id
  loop
    perform public.ile_notify(r.guest_id, 'stay_declined', 'Stay request declined',
      l.title || ': those dates were taken.', jsonb_build_object('route', 'viewings'));
  end loop;
end;
$$;

grant execute on function public.respond_stay(uuid, boolean, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Guest or host: cancel
-- ---------------------------------------------------------------------------

create or replace function public.cancel_stay(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  b public.stay_bookings;
  l public.listings;
  today date := (now() at time zone 'Africa/Lagos')::date;
begin
  select * into b from public.stay_bookings where id = p_id;
  if b.id is null then
    raise exception 'Booking not found.';
  end if;
  select * into l from public.listings where id = b.listing_id;
  if b.check_out <= today then
    raise exception 'This stay has already ended.';
  end if;
  if auth.uid() = b.guest_id and b.status in ('requested', 'accepted') then
    update public.stay_bookings set status = 'cancelled', updated_at = now() where id = p_id;
    perform public.ile_notify(l.landlord_id, 'stay_cancelled', 'Stay cancelled',
      coalesce(public.ile_first_name(b.guest_id), 'The guest') || ' cancelled ' || l.title || ', '
        || public.ile_stay_dates(b.check_in, b.check_out) || '.',
      jsonb_build_object('route', 'dashboard'));
  elsif auth.uid() = l.landlord_id and b.status = 'accepted' then
    update public.stay_bookings set status = 'cancelled', updated_at = now() where id = p_id;
    perform public.ile_notify(b.guest_id, 'stay_cancelled', 'Stay cancelled',
      'The host cancelled ' || l.title || ', ' || public.ile_stay_dates(b.check_in, b.check_out) || '.',
      jsonb_build_object('route', 'viewings'));
  else
    raise exception 'You can''t cancel this booking.';
  end if;
end;
$$;

grant execute on function public.cancel_stay(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Public availability (dates only, never who booked)
-- ---------------------------------------------------------------------------

create or replace function public.listing_taken_dates(p_listing uuid)
returns table (check_in date, check_out date)
language sql
stable
security definer
set search_path = public
as $$
  select b.check_in, b.check_out
  from public.stay_bookings b
  where b.listing_id = p_listing and b.status = 'accepted'
    and b.check_out >= (now() at time zone 'Africa/Lagos')::date
  order by b.check_in;
$$;

grant execute on function public.listing_taken_dates(uuid) to anon, authenticated;

create or replace function public.stays_unavailable(p_check_in date, p_check_out date)
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select distinct b.listing_id
  from public.stay_bookings b
  where b.status = 'accepted' and b.check_in < p_check_out and b.check_out > p_check_in;
$$;

grant execute on function public.stays_unavailable(date, date) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Reminder the day before check-in
-- ---------------------------------------------------------------------------

create or replace function public.ile_stay_reminders()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_tomorrow date := (now() at time zone 'Africa/Lagos')::date + 1;
begin
  for r in
    select b.guest_id, l.landlord_id, l.title, l.check_in_time
    from public.stay_bookings b join public.listings l on l.id = b.listing_id
    where b.status = 'accepted' and b.check_in = v_tomorrow
  loop
    perform public.ile_notify(r.guest_id, 'stay_reminder', 'Check-in tomorrow',
      r.title || coalesce(' from ' || ltrim(to_char(r.check_in_time, 'HH12:MI AM'), '0'), '') || '.',
      jsonb_build_object('route', 'viewings'), false);
    perform public.ile_notify(r.landlord_id, 'stay_reminder', 'Guest arriving tomorrow',
      r.title || '.', jsonb_build_object('route', 'dashboard'), false);
  end loop;
  perform public.ile_kick_push();
end;
$$;

revoke execute on function public.ile_stay_reminders() from public, anon, authenticated;

select cron.unschedule(jobid) from cron.job where jobname = 'ile-stay-reminders';
select cron.schedule('ile-stay-reminders', '5 7 * * *', 'select public.ile_stay_reminders()');

-- ---------------------------------------------------------------------------
-- Stay reviews (reuse public.reviews)
-- ---------------------------------------------------------------------------

alter table public.reviews alter column inspection_id drop not null;
alter table public.reviews add column if not exists stay_booking_id uuid references public.stay_bookings (id) on delete cascade;
alter table public.reviews drop constraint if exists reviews_one_source_check;
alter table public.reviews add constraint reviews_one_source_check
  check ((inspection_id is null) <> (stay_booking_id is null));
create unique index if not exists reviews_stay_reviewer_key on public.reviews (stay_booking_id, reviewer_id) where stay_booking_id is not null;

create or replace function public.leave_stay_review(p_stay uuid, p_rating integer, p_comment text default null, p_accurate boolean default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  b public.stay_bookings;
  v_host uuid;
  v_id uuid;
  today date := (now() at time zone 'Africa/Lagos')::date;
begin
  if auth.uid() is null then
    raise exception 'Log in to leave a review';
  end if;
  select * into b from public.stay_bookings where id = p_stay;
  select landlord_id into v_host from public.listings where id = b.listing_id;
  if b.id is null then
    raise exception 'Booking not found';
  end if;
  if auth.uid() not in (b.guest_id, v_host) then
    raise exception 'You can only review stays you were part of';
  end if;
  if b.status <> 'accepted' or b.check_out > today then
    raise exception 'You can leave a review once the stay has ended';
  end if;
  if p_rating is null or p_rating not between 1 and 5 then
    raise exception 'Choose a rating from 1 to 5 stars';
  end if;
  insert into public.reviews (
    stay_booking_id, listing_id, reviewer_id, reviewee_id, reviewee_role, rating, comment, listing_accurate
  )
  values (
    p_stay,
    b.listing_id,
    auth.uid(),
    case when auth.uid() = b.guest_id then v_host else b.guest_id end,
    case when auth.uid() = b.guest_id then 'lister' else 'tenant' end,
    p_rating,
    nullif(left(trim(coalesce(p_comment, '')), 1000), ''),
    case when auth.uid() = b.guest_id then p_accurate end
  )
  returning id into v_id;
  return v_id;
exception when unique_violation then
  raise exception 'You''ve already reviewed this stay';
end;
$$;

grant execute on function public.leave_stay_review(uuid, integer, text, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- Checks: the column list, then the reminder job.
-- ---------------------------------------------------------------------------

select column_name from information_schema.columns
where table_schema = 'public' and table_name = 'listings' and column_name in ('max_guests', 'min_nights', 'hotel_name')
order by column_name;
select jobname from cron.job where jobname = 'ile-stay-reminders';
