-- Push notifications: device tokens, a notifications table filled by
-- triggers and daily schedules, and per-person settings. The send-push Edge
-- Function delivers pending rows through the Expo Push API.
--
-- Before running (see docs/push-setup.md):
--   1. Enable the pg_cron and pg_net extensions (Database -> Extensions).
--   2. Add two Vault secrets: push_secret and push_function_url.
-- Run in the Supabase Dashboard -> SQL Editor. Safe to re-run.

---------------------------------------------------------------------------
-- Tables
---------------------------------------------------------------------------

create table if not exists public.push_tokens (
  token text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  platform text not null check (platform in ('android', 'ios')),
  updated_at timestamptz not null default now()
);
create index if not exists push_tokens_user_idx on public.push_tokens (user_id);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null,
  title text not null,
  body text not null,
  data jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);
create index if not exists notifications_pending_idx on public.notifications (created_at) where sent_at is null;

create table if not exists public.notification_prefs (
  user_id uuid primary key references auth.users (id) on delete cascade,
  messages boolean not null default true,
  bookings boolean not null default true,
  reminders boolean not null default true,
  hide_message_text boolean not null default false,
  updated_at timestamptz not null default now()
);

---------------------------------------------------------------------------
-- Row level security: everyone sees and manages only their own rows.
-- Notifications are created only by the functions below, never by the app.
---------------------------------------------------------------------------

alter table public.push_tokens enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_prefs enable row level security;

drop policy if exists "Users see their own devices" on public.push_tokens;
create policy "Users see their own devices" on public.push_tokens
for select to authenticated using (user_id = auth.uid());
-- Devices are added and removed through register/unregister_push_token().
revoke insert, update, delete on public.push_tokens from anon, authenticated;

drop policy if exists "Users see their own notifications" on public.notifications;
create policy "Users see their own notifications" on public.notifications
for select to authenticated using (user_id = auth.uid());
drop policy if exists "Users mark their own notifications read" on public.notifications;
create policy "Users mark their own notifications read" on public.notifications
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke insert, delete on public.notifications from anon, authenticated;
revoke update on public.notifications from anon, authenticated;
grant update (read_at) on public.notifications to authenticated;

drop policy if exists "Users see their own notification settings" on public.notification_prefs;
create policy "Users see their own notification settings" on public.notification_prefs
for select to authenticated using (user_id = auth.uid());
drop policy if exists "Users create their own notification settings" on public.notification_prefs;
create policy "Users create their own notification settings" on public.notification_prefs
for insert to authenticated with check (user_id = auth.uid());
drop policy if exists "Users change their own notification settings" on public.notification_prefs;
create policy "Users change their own notification settings" on public.notification_prefs
for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

---------------------------------------------------------------------------
-- Devices. A phone's token moves to whoever is logged in on it now.
---------------------------------------------------------------------------

create or replace function public.register_push_token(p_token text, p_platform text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Log in to turn on notifications';
  end if;
  if p_token is null or p_token !~ '^Expo(nent)?PushToken\[[A-Za-z0-9_-]+\]$' then
    raise exception 'That notification token is not valid';
  end if;
  insert into public.push_tokens (token, user_id, platform, updated_at)
  values (p_token, auth.uid(), p_platform, now())
  on conflict (token) do update set user_id = auth.uid(), platform = excluded.platform, updated_at = now();
end;
$$;

create or replace function public.unregister_push_token(p_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- The token itself is the proof: only this phone knows it. That lets a
  -- phone stop its notifications even after its session has ended (an
  -- offline logout retried later, or a session that expired).
  delete from public.push_tokens where token = p_token;
end;
$$;

revoke execute on function public.register_push_token(text, text) from public, anon;
revoke execute on function public.unregister_push_token(text) from public;
grant execute on function public.register_push_token(text, text) to authenticated;
grant execute on function public.unregister_push_token(text) to anon, authenticated;

---------------------------------------------------------------------------
-- Helpers
---------------------------------------------------------------------------

-- Ask send-push to deliver pending notifications. Never fails the caller.
create or replace function public.ile_kick_push()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url text;
  v_secret text;
begin
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'push_function_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'push_secret';
  if v_url is null or v_secret is null then
    return;
  end if;
  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', v_secret),
    body := '{}'::jsonb
  );
exception when others then
  -- Sending is retried by the every-minute sweep.
  null;
end;
$$;

-- Add a notification for one person and (by default) send it right away.
create or replace function public.ile_notify(p_user uuid, p_type text, p_title text, p_body text, p_data jsonb, p_send boolean default true)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_user is null then
    return;
  end if;
  insert into public.notifications (user_id, type, title, body, data)
  values (p_user, p_type, left(p_title, 100), left(p_body, 200), coalesce(p_data, '{}'::jsonb));
  if p_send then
    perform public.ile_kick_push();
  end if;
end;
$$;

-- "Mon 12 Oct, 10:00 AM" (or just the day when no time was given).
create or replace function public.ile_when(p_date date, p_time time)
returns text
language sql
stable
set search_path = public
as $$
  select to_char(p_date, 'Dy DD Mon') || coalesce(', ' || ltrim(to_char(p_time, 'HH12:MI AM'), '0'), '');
$$;

create or replace function public.ile_first_name(p_user uuid)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(nullif(split_part(trim(full_name), ' ', 1), ''), 'Someone') from public.profiles where id = p_user;
$$;

revoke execute on function public.ile_kick_push() from public, anon, authenticated;
revoke execute on function public.ile_notify(uuid, text, text, text, jsonb, boolean) from public, anon, authenticated;
revoke execute on function public.ile_first_name(uuid) from public, anon, authenticated;

---------------------------------------------------------------------------
-- New message -> the other person (one push per chat burst while unread)
---------------------------------------------------------------------------

create or replace function public.ile_notify_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  c record;
  v_recipient uuid;
begin
  select tenant_id, landlord_id into c from public.conversations where id = new.conversation_id;
  v_recipient := case when new.sender_id = c.tenant_id then c.landlord_id else c.tenant_id end;
  if v_recipient is null or v_recipient = new.sender_id then
    return new;
  end if;
  -- Collapse: skip while an earlier push for this chat is recent and unread.
  if exists (
    select 1 from public.notifications
    where user_id = v_recipient and type = 'message'
      and data ->> 'id' = new.conversation_id::text
      and read_at is null
      and created_at > now() - interval '5 minutes'
  ) then
    return new;
  end if;
  perform public.ile_notify(
    v_recipient, 'message', coalesce(public.ile_first_name(new.sender_id), 'Someone'), left(new.body, 120),
    jsonb_build_object('route', 'chat', 'id', new.conversation_id)
  );
  return new;
exception when others then
  return new; -- a notification problem must never block a message
end;
$$;

drop trigger if exists notify_message on public.messages;
create trigger notify_message after insert on public.messages
for each row execute function public.ile_notify_message();

-- Reading a chat clears its message notifications (ends the collapse window).
create or replace function public.ile_mark_message_notifications_read()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  c record;
  v_reader uuid;
begin
  if new.read_at is null or old.read_at is not null then
    return new;
  end if;
  select tenant_id, landlord_id into c from public.conversations where id = new.conversation_id;
  v_reader := case when new.sender_id = c.tenant_id then c.landlord_id else c.tenant_id end;
  update public.notifications set read_at = now()
  where user_id = v_reader and type = 'message' and data ->> 'id' = new.conversation_id::text and read_at is null;
  return new;
exception when others then
  return new;
end;
$$;

drop trigger if exists mark_message_notifications_read on public.messages;
create trigger mark_message_notifications_read after update of read_at on public.messages
for each row execute function public.ile_mark_message_notifications_read();

---------------------------------------------------------------------------
-- Viewings -> the other party
---------------------------------------------------------------------------

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

drop trigger if exists notify_inspection on public.inspections;
create trigger notify_inspection after insert or update of status on public.inspections
for each row execute function public.ile_notify_inspection();

---------------------------------------------------------------------------
-- New review -> the person reviewed
---------------------------------------------------------------------------

create or replace function public.ile_notify_review()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.ile_notify(new.reviewee_id, 'review', 'New review',
    'You got a ' || new.rating || '-star review.', jsonb_build_object('route', 'account'));
  return new;
exception when others then
  return new;
end;
$$;

drop trigger if exists notify_review on public.reviews;
create trigger notify_review after insert on public.reviews
for each row execute function public.ile_notify_review();

---------------------------------------------------------------------------
-- Used by send-push: take up to p_limit unsent notifications, marking them
-- sent in the same step, so two deliveries running at once never send the
-- same notification twice. send-push hands them back if Expo is unreachable.
---------------------------------------------------------------------------

create or replace function public.ile_claim_notifications(p_limit integer)
returns setof public.notifications
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  update public.notifications n set sent_at = now()
  where n.id in (
    select id from public.notifications
    where sent_at is null and created_at > now() - interval '1 day'
    order by created_at
    limit p_limit
    for update skip locked
  )
  returning n.*;
end;
$$;

revoke execute on function public.ile_claim_notifications(integer) from public, anon, authenticated;
grant execute on function public.ile_claim_notifications(integer) to service_role;

---------------------------------------------------------------------------
-- Daily reminders (times in UTC; Lagos is UTC+1)
---------------------------------------------------------------------------

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

create or replace function public.ile_still_available_reminders()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_day date := (now() at time zone 'Africa/Lagos')::date - 30;
begin
  for r in
    select landlord_id, title from public.listings
    where status = 'active' and (last_confirmed_at at time zone 'Africa/Lagos')::date = v_day
  loop
    perform public.ile_notify(r.landlord_id, 'still_available', 'Is it still available?',
      'Confirm ' || r.title || ' so it stays in search.', jsonb_build_object('route', 'dashboard'), false);
  end loop;
  perform public.ile_kick_push();
end;
$$;

revoke execute on function public.ile_viewing_reminders() from public, anon, authenticated;
revoke execute on function public.ile_still_available_reminders() from public, anon, authenticated;

select cron.unschedule(jobid) from cron.job where jobname = 'ile-viewing-reminders';
select cron.schedule('ile-viewing-reminders', '0 7 * * *', 'select public.ile_viewing_reminders()');

select cron.unschedule(jobid) from cron.job where jobname = 'ile-still-available';
select cron.schedule('ile-still-available', '0 8 * * *', 'select public.ile_still_available_reminders()');

-- Safety net: anything not yet sent (function or Expo was down) goes out within a minute.
select cron.unschedule(jobid) from cron.job where jobname = 'ile-push-sweep';
select cron.schedule('ile-push-sweep', '* * * * *',
  'select public.ile_kick_push() where exists (select 1 from public.notifications where sent_at is null and created_at > now() - interval ''1 day'')');
