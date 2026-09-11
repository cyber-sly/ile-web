-- Row-level security policies for the `listings` table.
--
-- This project has no Supabase CLI / migrations set up, so there's nowhere
-- for this to run automatically. Paste it into the Supabase Dashboard ->
-- SQL Editor for this project and run it once.
--
-- Context: the app already gates the /listings/new page in the UI so only
-- users signed up with role = "landlord" (see src/app/signup/page.jsx) can
-- see and submit the posting form. That check happens entirely in the
-- browser, so it can be bypassed by calling the Supabase API directly.
-- These policies enforce the same rule at the database level.

alter table public.listings enable row level security;

-- Anyone (including anonymous visitors) can browse listings.
drop policy if exists "Listings are viewable by everyone" on public.listings;
create policy "Listings are viewable by everyone"
on public.listings
for select
using (true);

-- Only signed-in users whose account role is "landlord" can create a
-- listing, and only under their own landlord_id (no posting on someone
-- else's behalf).
drop policy if exists "Landlords can insert their own listings" on public.listings;
create policy "Landlords can insert their own listings"
on public.listings
for insert
to authenticated
with check (
  landlord_id = auth.uid()
  and coalesce(auth.jwt() -> 'user_metadata' ->> 'role', '') = 'landlord'
);

-- A landlord can only edit their own listings (used by the dashboard's
-- "Edit" flow and /listings/[id]/edit).
drop policy if exists "Landlords can update their own listings" on public.listings;
create policy "Landlords can update their own listings"
on public.listings
for update
to authenticated
using (landlord_id = auth.uid())
with check (landlord_id = auth.uid());

-- A landlord can only delete their own listings (used by the dashboard's
-- "Delete" button).
drop policy if exists "Landlords can delete their own listings" on public.listings;
create policy "Landlords can delete their own listings"
on public.listings
for delete
to authenticated
using (landlord_id = auth.uid());

-- Note on the role check: `role` is stored in Supabase auth user_metadata
-- (set at signup), which is included in the JWT and readable via
-- auth.jwt(), but it is also self-editable by the user via
-- supabase.auth.updateUser(). That's an acceptable trade-off here because
-- signup already lets anyone freely choose "landlord" with no verification
-- step — self-promoting later grants no more access than just signing up
-- as a landlord in the first place. If landlord status ever becomes a
-- verified/privileged tier (e.g. ID-checked, paid, admin-approved), move
-- `role` into `app_metadata` (only settable via the service role / a
-- server-side function) or a separate `profiles` table instead, since
-- both of those are outside the end user's own write access.
