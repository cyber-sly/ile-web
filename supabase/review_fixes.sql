-- Fixes from the full review pass. Run once in the Supabase Dashboard ->
-- SQL Editor after all earlier files. Safe to re-run.
--
--  1. Confirmed viewings can be cancelled (tenant) or declined (lister)
--  2. "Mark as viewed" and reviews only once the viewing date has arrived
--  3. Reviewer identities are no longer exposed on public reviews
--  4. Open slots skip times that overlap an existing booking
--  5. Saving viewing times is atomic
--  6. Listers can't push "last confirmed" into the future
--  7. Inbox summary computed in the database (accurate unread counts)

---------------------------------------------------------------------------
-- 1 + 2. Booking status rules (replaces the function from
-- inspections_status_guard.sql; the trigger already points at it)
---------------------------------------------------------------------------

create or replace function public.guard_inspection_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_landlord boolean;
  is_tenant boolean;
  today date := (now() at time zone 'Africa/Lagos')::date;
begin
  if auth.uid() is null then
    return new;
  end if;

  if new.listing_id is distinct from old.listing_id or new.tenant_id is distinct from old.tenant_id then
    raise exception 'A booking cannot be moved to another listing or person';
  end if;

  select exists (
    select 1 from public.listings where id = old.listing_id and landlord_id = auth.uid()
  ) into is_landlord;
  is_tenant := old.tenant_id = auth.uid();

  if is_landlord then
    if not (
      (old.status = 'pending' and new.status in ('confirmed', 'countered', 'declined'))
      or (old.status = 'countered' and new.status = 'declined')
      or (old.status = 'confirmed' and new.status = 'declined')
      or (old.status = 'confirmed' and new.status = 'done')
    ) then
      raise exception 'Landlords cannot change a booking from % to %', old.status, new.status;
    end if;
    if old.status = 'confirmed' and new.status = 'done' and old.preferred_date > today then
      raise exception 'You can mark a viewing as done on or after its date';
    end if;
    if new.preferred_date is distinct from old.preferred_date
       or new.preferred_time is distinct from old.preferred_time then
      raise exception 'Landlords cannot change the requested time; propose a new one instead';
    end if;
    return new;
  end if;

  if is_tenant then
    if old.status = 'pending' and new.status = 'cancelled' then
      null;
    elsif old.status = 'confirmed' and new.status = 'cancelled' then
      null;
    elsif old.status = 'countered' and new.status = 'confirmed' then
      new.preferred_date := old.proposed_date;
      new.preferred_time := old.proposed_time;
    elsif old.status = 'countered' and new.status = 'declined' then
      null;
    else
      raise exception 'Tenants cannot change a booking from % to %', old.status, new.status;
    end if;
    if new.proposed_date is distinct from old.proposed_date
       or new.proposed_time is distinct from old.proposed_time
       or new.landlord_note is distinct from old.landlord_note then
      raise exception 'Tenants cannot change the landlord''s proposal';
    end if;
    return new;
  end if;

  raise exception 'Not allowed to update this booking';
end;
$$;

-- Reviews only for viewings whose date has arrived.
create or replace function public.leave_review(
  p_inspection uuid,
  p_rating integer,
  p_comment text default null,
  p_accurate boolean default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant uuid;
  v_landlord uuid;
  v_listing uuid;
  v_status text;
  v_date date;
  v_id uuid;
  today date := (now() at time zone 'Africa/Lagos')::date;
begin
  if auth.uid() is null then
    raise exception 'Log in to leave a review';
  end if;

  select i.tenant_id, l.landlord_id, i.listing_id, i.status, i.preferred_date
    into v_tenant, v_landlord, v_listing, v_status, v_date
  from public.inspections i
  join public.listings l on l.id = i.listing_id
  where i.id = p_inspection;

  if v_tenant is null then
    raise exception 'Viewing not found';
  end if;
  if auth.uid() not in (v_tenant, v_landlord) then
    raise exception 'You can only review viewings you were part of';
  end if;
  if not (
    (v_status = 'done' and v_date <= today)
    or (v_status = 'confirmed' and v_date < today)
  ) then
    raise exception 'You can leave a review once the viewing has happened';
  end if;
  if p_rating is null or p_rating not between 1 and 5 then
    raise exception 'Choose a rating from 1 to 5 stars';
  end if;

  insert into public.reviews (
    inspection_id, listing_id, reviewer_id, reviewee_id, reviewee_role, rating, comment, listing_accurate
  )
  values (
    p_inspection,
    v_listing,
    auth.uid(),
    case when auth.uid() = v_tenant then v_landlord else v_tenant end,
    case when auth.uid() = v_tenant then 'lister' else 'tenant' end,
    p_rating,
    nullif(trim(p_comment), ''),
    case when auth.uid() = v_tenant then p_accurate else null end
  )
  returning id into v_id;
  return v_id;
exception
  when unique_violation then
    raise exception 'You have already reviewed this viewing';
end;
$$;

---------------------------------------------------------------------------
-- 3. Hide who wrote each review. Row policies stay; column grants remove
-- reviewer_id and inspection_id from what the API can return.
---------------------------------------------------------------------------

revoke select on public.reviews from anon, authenticated;
grant select (id, listing_id, reviewee_id, reviewee_role, rating, comment, listing_accurate, created_at)
  on public.reviews to anon, authenticated;

-- "Which of these viewings have I already reviewed?" without exposing reviewer ids.
create or replace function public.my_reviewed_inspections(p_ids uuid[])
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select inspection_id from public.reviews
  where reviewer_id = auth.uid() and inspection_id = any (p_ids);
$$;

grant execute on function public.my_reviewed_inspections(uuid[]) to authenticated;

---------------------------------------------------------------------------
-- 4. Open slots: skip any slot within one slot-length of an active booking
---------------------------------------------------------------------------

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
    select d.d as slot_date, t as slot_ts, l.mins
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
        and i.preferred_time is not null
        and i.status in ('pending', 'confirmed')
        and abs(extract(epoch from (s.slot_date + i.preferred_time) - s.slot_ts)) < s.mins * 60
    )
  order by 1, 2;
$$;

---------------------------------------------------------------------------
-- 5. Save a listing's weekly viewing times in one transaction. Runs with the
-- caller's permissions, so the existing owner-only policies still apply.
---------------------------------------------------------------------------

create or replace function public.set_listing_availability(
  p_listing uuid,
  p_minutes integer,
  p_windows jsonb -- [{"weekday":6,"start_time":"10:00","end_time":"14:00"}, ...]
)
returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  if not exists (select 1 from public.listings where id = p_listing and landlord_id = auth.uid()) then
    raise exception 'You can only set viewing times on your own listings';
  end if;

  delete from public.listing_availability where listing_id = p_listing;

  insert into public.listing_availability (listing_id, weekday, start_time, end_time)
  select p_listing, w.weekday, w.start_time, w.end_time
  from jsonb_to_recordset(coalesce(p_windows, '[]'::jsonb)) as w(weekday smallint, start_time time, end_time time);

  update public.listings set viewing_slot_minutes = p_minutes where id = p_listing;
end;
$$;

grant execute on function public.set_listing_availability(uuid, integer, jsonb) to authenticated;

---------------------------------------------------------------------------
-- 6. "Last confirmed" can never be in the future
---------------------------------------------------------------------------

create or replace function public.clamp_last_confirmed()
returns trigger
language plpgsql
as $$
begin
  if new.last_confirmed_at > now() then
    new.last_confirmed_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists clamp_last_confirmed on public.listings;
create trigger clamp_last_confirmed
before insert or update on public.listings
for each row execute function public.clamp_last_confirmed();

---------------------------------------------------------------------------
-- 7. Inbox: latest message and unread count per conversation
---------------------------------------------------------------------------

create or replace function public.inbox_summary()
returns table (conversation_id uuid, last_body text, last_sender uuid, last_at timestamptz, unread integer)
language sql
stable
security invoker
set search_path = public
as $$
  select
    c.id,
    m.body,
    m.sender_id,
    m.created_at,
    (
      select count(*)::integer from public.messages u
      where u.conversation_id = c.id and u.read_at is null and u.sender_id <> auth.uid()
    )
  from public.conversations c
  left join lateral (
    select body, sender_id, created_at from public.messages
    where conversation_id = c.id
    order by created_at desc
    limit 1
  ) m on true
  where auth.uid() in (c.tenant_id, c.landlord_id);
$$;

grant execute on function public.inbox_summary() to authenticated;
