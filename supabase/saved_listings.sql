-- Saved homes on the account, so hearts sync across the website, the app
-- and new phones. Logged-out visitors keep saving in their browser; those
-- saves are imported into the account when they log in.
--
-- Run once in the Supabase Dashboard -> SQL Editor after hardening.sql
-- (uses enforce_rate_limit). Safe to re-run.

create table if not exists public.saved_listings (
  user_id uuid not null references auth.users (id) on delete cascade,
  listing_id uuid not null references public.listings (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

create index if not exists saved_listings_user_idx on public.saved_listings (user_id, created_at desc);
create index if not exists saved_listings_listing_idx on public.saved_listings (listing_id);

alter table public.saved_listings enable row level security;

drop policy if exists "Users see their own saved homes" on public.saved_listings;
create policy "Users see their own saved homes"
on public.saved_listings for select to authenticated
using (user_id = auth.uid());

drop policy if exists "Users save homes for themselves" on public.saved_listings;
create policy "Users save homes for themselves"
on public.saved_listings for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists "Users remove their own saved homes" on public.saved_listings;
create policy "Users remove their own saved homes"
on public.saved_listings for delete to authenticated
using (user_id = auth.uid());

drop trigger if exists rate_limit_saves on public.saved_listings;
create trigger rate_limit_saves before insert on public.saved_listings
for each row execute function public.enforce_rate_limit('user_id', '1 day', '500', 'saved homes');
