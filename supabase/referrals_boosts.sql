-- Invite codes, earned boost days, share tracking and boosting.
-- Spec: docs/superpowers/specs/2026-10-13-ile-share-and-referrals-design.md
--
-- Run once in Supabase -> SQL Editor. Safe to re-run.
-- Needs pg_cron (already on for push notifications).

-- ---------------------------------------------------------------------------
-- Columns
-- ---------------------------------------------------------------------------

alter table public.profiles add column if not exists invite_code text;
alter table public.profiles add column if not exists referred_by uuid references auth.users (id) on delete set null;
create unique index if not exists profiles_invite_code_key on public.profiles (invite_code);
create index if not exists profiles_referred_by_idx on public.profiles (referred_by);
-- Profiles use column grants (messaging_slots.sql, profiles_extended.sql), so
-- these two new columns are not readable or writable from the app; they are
-- only reached through the functions below.

alter table public.listings add column if not exists boosted_until timestamptz;
create index if not exists listings_boosted_until_idx on public.listings (boosted_until) where boosted_until is not null;

alter table public.inspections add column if not exists ref_code text;

-- ---------------------------------------------------------------------------
-- Codes
-- ---------------------------------------------------------------------------

-- " tunde 7" -> "TUNDE7"; anything that can't be a code -> null.
create or replace function public.ile_normalize_code(p_code text)
returns text
language sql
immutable
set search_path = public
as $$
  select case
    when upper(regexp_replace(coalesce(p_code, ''), '\s', '', 'g')) ~ '^[A-Z]{1,6}[0-9]{1,3}$'
    then upper(regexp_replace(coalesce(p_code, ''), '\s', '', 'g'))
  end;
$$;

-- Up to 6 letters from the first name + 1-3 digits ("TUNDE7"); "ILE" when the
-- name has no A-Z letters. When a name's codes run out, letters from the whole
-- name are used, then the last letter is varied.
create or replace function public.ile_make_invite_code(p_name text)
returns text
language plpgsql
volatile
set search_path = public
as $$
declare
  v_first text := left(regexp_replace(upper(split_part(trim(coalesce(p_name, '')), ' ', 1)), '[^A-Z]', '', 'g'), 6);
  v_whole text := left(regexp_replace(upper(coalesce(p_name, '')), '[^A-Z]', '', 'g'), 6);
  v_base text;
  v_candidate text;
  v_try int := 0;
begin
  if v_first = '' then v_first := 'ILE'; end if;
  if v_whole = '' then v_whole := 'ILE'; end if;
  v_base := v_first;
  loop
    v_try := v_try + 1;
    if v_try = 400 then v_base := v_whole; end if;
    if v_try > 800 then
      v_base := left(v_whole, 5) || chr(65 + floor(random() * 26)::int);
    end if;
    v_candidate := v_base || case
      when v_try % 400 < 30 then (1 + floor(random() * 9))::int::text
      when v_try % 400 < 120 then (10 + floor(random() * 90))::int::text
      else (100 + floor(random() * 900))::int::text
    end;
    exit when not exists (select 1 from public.profiles where invite_code = v_candidate);
    if v_try > 5000 then
      raise exception 'Could not make an invite code';
    end if;
  end loop;
  return v_candidate;
end;
$$;

revoke execute on function public.ile_make_invite_code(text) from public, anon, authenticated;

-- Everyone who doesn't have a code yet gets one (one row at a time so each
-- new code is visible to the next uniqueness check).
do $$
declare
  r record;
begin
  for r in select id, full_name from public.profiles where invite_code is null loop
    update public.profiles set invite_code = public.ile_make_invite_code(r.full_name) where id = r.id;
  end loop;
end;
$$;

-- New accounts: profile, role (tenant or landlord only), invite code, and who
-- invited them (from the sign-up form's invite code; ignored if unknown).
create or replace function public.ile_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested text := new.raw_user_meta_data ->> 'role';
  v_inviter uuid;
begin
  select id into v_inviter
  from public.profiles
  where invite_code = public.ile_normalize_code(new.raw_user_meta_data ->> 'invite_code');

  insert into public.profiles (id, full_name, role, invite_code, referred_by)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 80),
    case when requested in ('tenant', 'landlord') then requested else 'tenant' end,
    public.ile_make_invite_code(new.raw_user_meta_data ->> 'full_name'),
    v_inviter
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists ile_on_auth_user_created on auth.users;
create trigger ile_on_auth_user_created
after insert on auth.users
for each row execute function public.ile_handle_new_user();

create or replace function public.invite_code_exists(p_code text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where invite_code = public.ile_normalize_code(p_code));
$$;

grant execute on function public.invite_code_exists(text) to anon, authenticated;

-- Google/Apple sign-ups can't send the code with the account, so the app or
-- website claims it right after the first sign-in. Only within 24 hours of
-- creating the account, only once, never your own code, never a loop.
create or replace function public.claim_invite_code(p_code text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inviter uuid;
  v_inviter_ref uuid;
  v_created timestamptz;
begin
  if auth.uid() is null then
    return false;
  end if;
  select id, referred_by into v_inviter, v_inviter_ref
  from public.profiles
  where invite_code = public.ile_normalize_code(p_code);
  if v_inviter is null or v_inviter = auth.uid() or v_inviter_ref = auth.uid() then
    return false;
  end if;
  select created_at into v_created from auth.users where id = auth.uid();
  if v_created is null or v_created < now() - interval '24 hours' then
    return false;
  end if;
  update public.profiles set referred_by = v_inviter where id = auth.uid() and referred_by is null;
  return found;
end;
$$;

grant execute on function public.claim_invite_code(text) to authenticated;

-- ---------------------------------------------------------------------------
-- Boost days ledger and share visits (no direct writes from the app)
-- ---------------------------------------------------------------------------

create table if not exists public.boost_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  days int not null,
  reason text not null check (reason in ('invited_lister', 'invited_seekers', 'spent', 'purchased')),
  status text not null default 'granted' check (status in ('granted', 'held', 'rejected')),
  invitee_id uuid references auth.users (id) on delete set null,
  listing_id uuid references public.listings (id) on delete set null,
  batch int,
  created_at timestamptz not null default now()
);
create index if not exists boost_ledger_user_idx on public.boost_ledger (user_id, created_at desc);
create unique index if not exists boost_ledger_lister_once on public.boost_ledger (user_id, invitee_id) where reason = 'invited_lister';
create unique index if not exists boost_ledger_seeker_batch_once on public.boost_ledger (user_id, batch) where reason = 'invited_seekers';

alter table public.boost_ledger enable row level security;
drop policy if exists "Users can see their own boost days" on public.boost_ledger;
create policy "Users can see their own boost days"
on public.boost_ledger for select to authenticated
using (user_id = auth.uid());

create table if not exists public.share_visits (
  listing_id uuid not null references public.listings (id) on delete cascade,
  code text not null,
  device text not null,
  day date not null,
  created_at timestamptz not null default now(),
  primary key (listing_id, code, device, day)
);
create index if not exists share_visits_code_idx on public.share_visits (code);
alter table public.share_visits enable row level security;
-- No policies: only the functions below read or write it.

create index if not exists inspections_ref_code_idx on public.inspections (ref_code) where ref_code is not null;

-- Owners can edit their listings, and tenants their viewings, but only the
-- functions below may change boosted_until and ref_code.
create or replace function public.ile_guard_listing_boost()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if coalesce(current_setting('ile.boosting', true), '') <> 'on' then
    if tg_op = 'INSERT' then
      new.boosted_until := null;
    elsif new.boosted_until is distinct from old.boosted_until then
      new.boosted_until := old.boosted_until;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists ile_guard_listing_boost on public.listings;
create trigger ile_guard_listing_boost
before insert or update on public.listings
for each row execute function public.ile_guard_listing_boost();

create or replace function public.ile_guard_inspection_ref()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if coalesce(current_setting('ile.ref', true), '') <> 'on' then
    if tg_op = 'INSERT' then
      new.ref_code := null;
    elsif new.ref_code is distinct from old.ref_code then
      new.ref_code := old.ref_code;
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists ile_guard_inspection_ref on public.inspections;
create trigger ile_guard_inspection_ref
before insert or update on public.inspections
for each row execute function public.ile_guard_inspection_ref();

-- One visit per listing, code, device and day (Lagos time).
create or replace function public.record_share_visit(p_listing uuid, p_code text, p_device text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text := public.ile_normalize_code(p_code);
begin
  if v_code is null or p_device is null or length(p_device) > 64 then
    return;
  end if;
  if not exists (select 1 from public.profiles where invite_code = v_code) then
    return;
  end if;
  if not exists (select 1 from public.listings where id = p_listing and status = 'active') then
    return;
  end if;
  insert into public.share_visits (listing_id, code, device, day)
  values (p_listing, v_code, p_device, (now() at time zone 'Africa/Lagos')::date)
  on conflict do nothing;
end;
$$;

grant execute on function public.record_share_visit(uuid, text, text) to anon, authenticated;

-- Credit a booking to the code the tenant arrived with.
create or replace function public.record_booking_ref(p_inspection uuid, p_code text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code text := public.ile_normalize_code(p_code);
begin
  if auth.uid() is null or v_code is null then
    return;
  end if;
  if not exists (select 1 from public.profiles where invite_code = v_code and id <> auth.uid()) then
    return;
  end if;
  perform set_config('ile.ref', 'on', true);
  update public.inspections
  set ref_code = v_code
  where id = p_inspection and tenant_id = auth.uid() and ref_code is null;
end;
$$;

grant execute on function public.record_booking_ref(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- What the app and website read
-- ---------------------------------------------------------------------------

create or replace function public.my_referral_summary()
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_code text;
begin
  if v_uid is null then
    return null;
  end if;
  select invite_code into v_code from public.profiles where id = v_uid;
  if v_code is null then
    v_code := public.ile_make_invite_code((select full_name from public.profiles where id = v_uid));
    update public.profiles set invite_code = v_code where id = v_uid;
  end if;
  return json_build_object(
    'code', v_code,
    'balance', coalesce((select sum(days) from public.boost_ledger where user_id = v_uid and status = 'granted'), 0),
    'joined', (select count(*) from public.profiles where referred_by = v_uid),
    'listers', (select count(*) from public.boost_ledger where user_id = v_uid and reason = 'invited_lister' and status <> 'rejected'),
    'seekers_confirmed', (
      select count(*)
      from public.profiles p
      join auth.users u on u.id = p.id
      where p.referred_by = v_uid
        and u.email_confirmed_at is not null
        and not exists (
          select 1 from public.boost_ledger b
          where b.user_id = v_uid and b.reason = 'invited_lister' and b.invitee_id = p.id
        )
    ),
    'views', (select count(*) from public.share_visits where code = v_code),
    'bookings', (select count(*) from public.inspections where ref_code = v_code)
  );
end;
$$;

grant execute on function public.my_referral_summary() to authenticated;

-- ---------------------------------------------------------------------------
-- Spending boost days
-- ---------------------------------------------------------------------------

create or replace function public.spend_boost_days(p_listing uuid, p_days int)
returns timestamptz
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance int;
  v_until timestamptz;
begin
  if auth.uid() is null then
    raise exception 'Log in to boost a listing';
  end if;
  if p_days is null or p_days < 1 or p_days > 30 then
    raise exception 'Choose between 1 and 30 days';
  end if;
  -- One spend at a time per person, so the balance can't be used twice.
  perform pg_advisory_xact_lock(hashtext('ile-boost-' || auth.uid()::text));
  perform 1 from public.listings where id = p_listing and landlord_id = auth.uid() and status = 'active' for update;
  if not found then
    raise exception 'You can only boost your own active listing';
  end if;
  select coalesce(sum(days), 0) into v_balance from public.boost_ledger where user_id = auth.uid() and status = 'granted';
  if v_balance < p_days then
    raise exception 'You don''t have enough boost days';
  end if;
  perform set_config('ile.boosting', 'on', true);
  update public.listings
  set boosted_until = greatest(coalesce(boosted_until, now()), now()) + make_interval(days => p_days)
  where id = p_listing
  returning boosted_until into v_until;
  insert into public.boost_ledger (user_id, days, reason, listing_id)
  values (auth.uid(), -p_days, 'spent', p_listing);
  return v_until;
end;
$$;

grant execute on function public.spend_boost_days(uuid, int) to authenticated;

-- Ends boosts whose time is up, so they stop sorting first.
create or replace function public.ile_expire_boosts()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('ile.boosting', 'on', true);
  update public.listings set boosted_until = null where boosted_until is not null and boosted_until <= now();
end;
$$;

revoke execute on function public.ile_expire_boosts() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Earning boost days (hourly)
-- ---------------------------------------------------------------------------

-- Adds one reward line: capped at 30 earned days per Lagos calendar month
-- (anything over is dropped, not carried), held for review when an inviter
-- had more than 10 confirmed sign-ups in the last hour, otherwise granted
-- with a notification.
create or replace function public.ile_add_reward(p_user uuid, p_days int, p_reason text, p_invitee uuid, p_batch int)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_month_start timestamptz := date_trunc('month', now() at time zone 'Africa/Lagos') at time zone 'Africa/Lagos';
  v_earned int;
  v_days int;
  v_status text := 'granted';
begin
  select coalesce(sum(days), 0) into v_earned
  from public.boost_ledger
  where user_id = p_user
    and reason in ('invited_lister', 'invited_seekers')
    and status in ('granted', 'held')
    and created_at >= v_month_start;
  v_days := greatest(0, least(p_days, 30 - v_earned));

  if (
    select count(*)
    from public.profiles p
    join auth.users u on u.id = p.id
    where p.referred_by = p_user and u.email_confirmed_at > now() - interval '1 hour'
  ) > 10 then
    v_status := 'held';
  end if;

  insert into public.boost_ledger (user_id, days, reason, status, invitee_id, batch)
  values (p_user, v_days, p_reason, v_status, p_invitee, p_batch)
  on conflict do nothing;

  if found and v_status = 'granted' and v_days > 0 then
    perform public.ile_notify(
      p_user, 'boost_earned', 'You earned ' || v_days || ' boost days 🎉',
      case when p_reason = 'invited_lister'
        then 'Someone you invited listed a property. Use your boost days to put a listing first.'
        else '5 people joined Ile with your code. Use your boost days to put a listing first.'
      end,
      jsonb_build_object('route', 'dashboard'), false);
  end if;
end;
$$;

revoke execute on function public.ile_add_reward(uuid, int, text, uuid, int) from public, anon, authenticated;

create or replace function public.ile_grant_referral_rewards()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_paid int;
begin
  -- Invited listers: email confirmed and a listing live for 3+ days with no
  -- upheld report. Once per invitee.
  for r in
    select p.referred_by as inviter, p.id as invitee
    from public.profiles p
    join auth.users u on u.id = p.id
    where p.referred_by is not null
      and u.email_confirmed_at is not null
      and exists (
        select 1 from public.listings l
        where l.landlord_id = p.id
          and l.status = 'active'
          and l.created_at <= now() - interval '3 days'
          and not exists (select 1 from public.listing_reports rp where rp.listing_id = l.id and rp.status = 'actioned')
      )
      and not exists (
        select 1 from public.boost_ledger b
        where b.user_id = p.referred_by and b.reason = 'invited_lister' and b.invitee_id = p.id
      )
  loop
    perform public.ile_add_reward(r.inviter, 7, 'invited_lister', r.invitee, null);
  end loop;

  -- Invited home-seekers: every 5 with a confirmed email (not already paid as
  -- listers) earn 3 days. Batches are numbered so each is paid once.
  for r in
    select p.referred_by as inviter, count(*) as n
    from public.profiles p
    join auth.users u on u.id = p.id
    where p.referred_by is not null
      and u.email_confirmed_at is not null
      and not exists (
        select 1 from public.boost_ledger b
        where b.user_id = p.referred_by and b.reason = 'invited_lister' and b.invitee_id = p.id
      )
    group by p.referred_by
  loop
    select coalesce(max(batch), 0) into v_paid
    from public.boost_ledger
    where user_id = r.inviter and reason = 'invited_seekers';
    for b in (v_paid + 1) .. (r.n / 5)::int loop
      perform public.ile_add_reward(r.inviter, 3, 'invited_seekers', null, b);
    end loop;
  end loop;

  perform public.ile_kick_push();
end;
$$;

revoke execute on function public.ile_grant_referral_rewards() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Admin: rewards held for review
-- ---------------------------------------------------------------------------

create or replace function public.admin_held_rewards()
returns table (id uuid, user_id uuid, inviter_name text, days int, reason text, created_at timestamptz)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Only Ile moderators can see this';
  end if;
  return query
  select b.id, b.user_id, coalesce(nullif(p.full_name, ''), 'Unnamed'), b.days, b.reason, b.created_at
  from public.boost_ledger b
  left join public.profiles p on p.id = b.user_id
  where b.status = 'held'
  order by b.created_at;
end;
$$;

grant execute on function public.admin_held_rewards() to authenticated;

create or replace function public.admin_resolve_reward(p_id uuid, p_approve boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.boost_ledger;
begin
  if not public.is_admin() then
    raise exception 'Only Ile moderators can do this';
  end if;
  update public.boost_ledger
  set status = case when p_approve then 'granted' else 'rejected' end
  where id = p_id and status = 'held'
  returning * into v_row;
  if found and p_approve and v_row.days > 0 then
    perform public.ile_notify(
      v_row.user_id, 'boost_earned', 'You earned ' || v_row.days || ' boost days 🎉',
      'Use your boost days to put a listing first.', jsonb_build_object('route', 'dashboard'));
  end if;
end;
$$;

grant execute on function public.admin_resolve_reward(uuid, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- Schedules
-- ---------------------------------------------------------------------------

select cron.unschedule(jobid) from cron.job where jobname = 'ile-referral-rewards';
select cron.schedule('ile-referral-rewards', '15 * * * *', 'select public.ile_grant_referral_rewards()');

select cron.unschedule(jobid) from cron.job where jobname = 'ile-boost-expiry';
select cron.schedule('ile-boost-expiry', '*/5 * * * *', 'select public.ile_expire_boosts()');

-- ---------------------------------------------------------------------------
-- Checks: expect 0, then the two job names.
-- ---------------------------------------------------------------------------

select count(*) as profiles_without_code from public.profiles where invite_code is null;
select jobname from cron.job where jobname in ('ile-referral-rewards', 'ile-boost-expiry') order by jobname;
