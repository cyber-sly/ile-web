-- Booking wording for push and in-app notifications ("Booking confirmed",
-- "New booking request", "Booking tomorrow"). Same functions as in
-- push_notifications.sql, with the new wording only.
--
-- Run once in Supabase -> SQL Editor. Safe to re-run.

create or replace function public.ile_notify_inspection()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  l record;
  v_actor uuid := auth.uid();
  v_seeker text;
  v_when text := public.ile_when(new.preferred_date, new.preferred_time);
  v_to_seeker jsonb := jsonb_build_object('route', 'viewings');
  v_to_lister jsonb := jsonb_build_object('route', 'dashboard');
begin
  select title, landlord_id into l from public.listings where id = new.listing_id;
  if l.landlord_id is null then
    return new;
  end if;
  v_seeker := coalesce(public.ile_first_name(new.tenant_id), 'Someone');

  if tg_op = 'INSERT' then
    if new.status = 'confirmed' then
      perform public.ile_notify(l.landlord_id, 'viewing_booked', 'Booking fixed',
        v_seeker || ' booked ' || l.title || ' for ' || v_when || '.', v_to_lister);
    elsif new.status = 'pending' then
      perform public.ile_notify(l.landlord_id, 'viewing_request', 'New booking request',
        v_seeker || ' wants to book ' || l.title || ' on ' || v_when || '.', v_to_lister);
    end if;
    return new;
  end if;

  if new.status is not distinct from old.status then
    return new;
  end if;

  if new.status = 'confirmed' then
    if v_actor = new.tenant_id then
      -- The home-seeker accepted the lister's suggested time.
      perform public.ile_notify(l.landlord_id, 'viewing_confirmed', 'Booking confirmed',
        l.title || ', ' || v_when || '. See you there.', v_to_lister);
    else
      perform public.ile_notify(new.tenant_id, 'viewing_confirmed', 'Booking confirmed',
        l.title || ', ' || v_when || '. See you there.', v_to_seeker);
    end if;
  elsif new.status = 'countered' then
    perform public.ile_notify(new.tenant_id, 'viewing_countered', 'New time suggested',
      'The lister suggested ' || public.ile_when(new.proposed_date, new.proposed_time) || ' for ' || l.title || '.', v_to_seeker);
  elsif new.status = 'declined' then
    if v_actor = new.tenant_id then
      perform public.ile_notify(l.landlord_id, 'viewing_declined', 'Suggested time declined',
        v_seeker || ' declined your suggested time for ' || l.title || '.', v_to_lister);
    elsif old.status = 'confirmed' then
      perform public.ile_notify(new.tenant_id, 'viewing_cancelled', 'Booking cancelled',
        l.title || ', ' || v_when || ' was cancelled.', v_to_seeker);
    else
      perform public.ile_notify(new.tenant_id, 'viewing_declined', 'Booking request declined',
        l.title || ': the lister can''t do that time.', v_to_seeker);
    end if;
  elsif new.status = 'cancelled' then
    perform public.ile_notify(l.landlord_id, 'viewing_cancelled', 'Booking cancelled',
      v_seeker || ' cancelled ' || l.title || ', ' || v_when || '.', v_to_lister);
  end if;
  return new;
exception when others then
  return new; -- a notification problem must never block a booking
end;
$$;

create or replace function public.ile_viewing_reminders()
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
    select i.tenant_id, l.landlord_id, l.title, i.preferred_time
    from public.inspections i join public.listings l on l.id = i.listing_id
    where i.status = 'confirmed' and i.preferred_date = v_tomorrow
  loop
    perform public.ile_notify(r.tenant_id, 'viewing_reminder', 'Booking tomorrow',
      r.title || coalesce(' at ' || ltrim(to_char(r.preferred_time, 'HH12:MI AM'), '0'), '') || '.',
      jsonb_build_object('route', 'viewings'), false);
    perform public.ile_notify(r.landlord_id, 'viewing_reminder', 'Booking tomorrow',
      r.title || coalesce(' at ' || ltrim(to_char(r.preferred_time, 'HH12:MI AM'), '0'), '') || '.',
      jsonb_build_object('route', 'dashboard'), false);
  end loop;
  perform public.ile_kick_push();
end;
$$;
