-- Trust & safety: listing reports, moderation (admins), auto-hide after
-- repeated reports, and "still available?" freshness checks.
--
-- Run once in the Supabase Dashboard -> SQL Editor BEFORE deploying the app
-- code that uses it. Safe to re-run.
--
-- To make yourself an admin afterwards (replace the email):
--   insert into public.admins (user_id)
--   select id from auth.users where email = 'you@example.com'
--   on conflict do nothing;

---------------------------------------------------------------------------
-- Admins
---------------------------------------------------------------------------

create table if not exists public.admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admins enable row level security;

-- Each user can check whether they themselves are an admin; nobody can add
-- admins from the app (only via the SQL editor).
drop policy if exists "Users can see their own admin row" on public.admins;
create policy "Users can see their own admin row"
on public.admins for select to authenticated
using (user_id = auth.uid());

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

grant execute on function public.is_admin() to authenticated;

---------------------------------------------------------------------------
-- Listing status: add moderation states, and a freshness date
--   under_review: hidden after repeated reports, waiting for an admin
--   removed:      taken down by an admin; the owner can't relist it
---------------------------------------------------------------------------

alter table public.listings drop constraint if exists listings_status_check;
alter table public.listings add constraint listings_status_check
  check (status in ('active', 'let', 'sold', 'under_review', 'removed'));

alter table public.listings
  add column if not exists last_confirmed_at timestamptz not null default now();

create index if not exists listings_fresh_idx on public.listings (status, last_confirmed_at desc);

-- Owners can't lift moderation; only admins set or clear it.
create or replace function public.guard_listing_moderation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Dashboard/service edits, admins, and system actions (auto-review) pass.
  if auth.uid() is null
     or public.is_admin()
     or current_setting('ile.system_action', true) = 'on' then
    return new;
  end if;
  if old.status in ('under_review', 'removed') and new.status is distinct from old.status then
    raise exception 'This listing is under review by Ile. Contact support if you think this is a mistake.';
  end if;
  if new.status in ('under_review', 'removed') and new.status is distinct from old.status then
    raise exception 'Only Ile moderators can take a listing down';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_listing_moderation on public.listings;
create trigger guard_listing_moderation
before update on public.listings
for each row execute function public.guard_listing_moderation();

-- Admins can update any listing (to remove or restore it).
drop policy if exists "Admins can moderate listings" on public.listings;
create policy "Admins can moderate listings"
on public.listings for update to authenticated
using (public.is_admin())
with check (public.is_admin());

---------------------------------------------------------------------------
-- Reports
---------------------------------------------------------------------------

create table if not exists public.listing_reports (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings (id) on delete cascade,
  reporter_id uuid not null references auth.users (id) on delete cascade,
  reason text not null check (reason in (
    'fake', 'unavailable', 'misleading', 'upfront_fee', 'scam', 'duplicate', 'other'
  )),
  details text check (details is null or char_length(details) <= 1000),
  status text not null default 'open' check (status in ('open', 'actioned', 'dismissed')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references auth.users (id) on delete set null
);

-- One open report per person per listing.
create unique index if not exists listing_reports_one_open
  on public.listing_reports (listing_id, reporter_id) where status = 'open';
create index if not exists listing_reports_open_idx
  on public.listing_reports (status, created_at desc);

alter table public.listing_reports enable row level security;

drop policy if exists "Signed-in users can report listings" on public.listing_reports;
create policy "Signed-in users can report listings"
on public.listing_reports for insert to authenticated
with check (
  reporter_id = auth.uid()
  and status = 'open'
  and listing_id not in (select id from public.listings where landlord_id = auth.uid())
);

drop policy if exists "Reporters and admins can see reports" on public.listing_reports;
create policy "Reporters and admins can see reports"
on public.listing_reports for select to authenticated
using (reporter_id = auth.uid() or public.is_admin());

drop policy if exists "Admins can resolve reports" on public.listing_reports;
create policy "Admins can resolve reports"
on public.listing_reports for update to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Three different people reporting the same live listing hides it from
-- search until an admin looks at it.
create or replace function public.auto_review_reported_listing()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (
    select count(distinct reporter_id) from public.listing_reports
    where listing_id = new.listing_id and status = 'open'
  ) >= 3 then
    -- Flag lasts for this transaction only.
    perform set_config('ile.system_action', 'on', true);
    update public.listings set status = 'under_review'
    where id = new.listing_id and status = 'active';
    perform set_config('ile.system_action', 'off', true);
  end if;
  return new;
end;
$$;

drop trigger if exists auto_review_reported_listing on public.listing_reports;
create trigger auto_review_reported_listing
after insert on public.listing_reports
for each row execute function public.auto_review_reported_listing();

-- Admin actions in one step: remove or restore a listing and close its reports.
create or replace function public.moderate_listing(p_listing uuid, p_action text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Admins only';
  end if;
  if p_action = 'remove' then
    update public.listings set status = 'removed' where id = p_listing;
    update public.listing_reports set status = 'actioned', resolved_at = now(), resolved_by = auth.uid()
    where listing_id = p_listing and status = 'open';
  elsif p_action = 'restore' then
    update public.listings set status = 'active', last_confirmed_at = now() where id = p_listing;
    update public.listing_reports set status = 'dismissed', resolved_at = now(), resolved_by = auth.uid()
    where listing_id = p_listing and status = 'open';
  elsif p_action = 'dismiss' then
    update public.listing_reports set status = 'dismissed', resolved_at = now(), resolved_by = auth.uid()
    where listing_id = p_listing and status = 'open';
    update public.listings set status = 'active' where id = p_listing and status = 'under_review';
  else
    raise exception 'Unknown action %', p_action;
  end if;
end;
$$;

grant execute on function public.moderate_listing(uuid, text) to authenticated;

-- Viewings can only be booked on live listings; under_review/removed are
-- already excluded because the booking policy requires status = 'active'.
