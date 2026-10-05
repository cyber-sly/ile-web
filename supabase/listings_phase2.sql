-- Phase 2: property types (homes, land, commercial), State -> LGA -> Area
-- locations, "listed by", move-in costs, and let/sold status. Also opens
-- listing to every signed-in user, not just "landlord" accounts.
--
-- Run once in the Supabase Dashboard -> SQL Editor BEFORE deploying the app
-- code that uses these columns. Safe to re-run.
--
-- Allowed values must match src/lib/property.js.

alter table public.listings
  add column if not exists category text not null default 'homes',
  add column if not exists property_type text not null default 'flat',
  add column if not exists state text,
  add column if not exists lga text,
  add column if not exists area text,
  add column if not exists bathrooms integer,
  add column if not exists toilets integer,
  add column if not exists furnishing text,
  add column if not exists serviced boolean not null default false,
  add column if not exists size_value numeric,
  add column if not exists size_unit text,
  add column if not exists title_document text,
  add column if not exists parking_spaces integer,
  add column if not exists price_period text,
  add column if not exists lister_type text not null default 'owner',
  add column if not exists agency_fee_percent numeric,
  add column if not exists legal_fee_percent numeric,
  add column if not exists caution_deposit numeric,
  add column if not exists service_charge numeric,
  add column if not exists status text not null default 'active';

-- Existing rows: rentals are priced per year, sales as a total.
update public.listings
set price_period = case when listing_type = 'sale' then 'total' else 'year' end
where price_period is null;

alter table public.listings alter column price_period set default 'year';
alter table public.listings alter column price_period set not null;

alter table public.listings drop constraint if exists listings_category_check;
alter table public.listings add constraint listings_category_check
  check (category in ('homes', 'land', 'commercial'));

alter table public.listings drop constraint if exists listings_property_type_check;
alter table public.listings add constraint listings_property_type_check
  check (property_type in (
    'flat', 'self_contain', 'mini_flat', 'room', 'duplex', 'bungalow', 'terrace',
    'residential_land', 'commercial_land', 'farmland',
    'shop', 'office', 'warehouse'
  ));

alter table public.listings drop constraint if exists listings_furnishing_check;
alter table public.listings add constraint listings_furnishing_check
  check (furnishing is null or furnishing in ('unfurnished', 'semi_furnished', 'furnished'));

alter table public.listings drop constraint if exists listings_size_unit_check;
alter table public.listings add constraint listings_size_unit_check
  check (size_unit is null or size_unit in ('sqm', 'plot', 'acre', 'hectare'));

alter table public.listings drop constraint if exists listings_title_document_check;
alter table public.listings add constraint listings_title_document_check
  check (title_document is null or title_document in (
    'c_of_o', 'governors_consent', 'deed_of_assignment', 'gazette', 'survey', 'other'
  ));

alter table public.listings drop constraint if exists listings_price_period_check;
alter table public.listings add constraint listings_price_period_check
  check (price_period in ('year', 'month', 'total', 'plot'));

alter table public.listings drop constraint if exists listings_lister_type_check;
alter table public.listings add constraint listings_lister_type_check
  check (lister_type in ('owner', 'agent', 'caretaker', 'developer'));

alter table public.listings drop constraint if exists listings_status_check;
alter table public.listings add constraint listings_status_check
  -- under_review/removed come from trust_safety.sql; listed here so re-running
  -- this file never drops them.
  check (status in ('active', 'let', 'sold', 'under_review', 'removed'));

alter table public.listings drop constraint if exists listings_numbers_check;
alter table public.listings add constraint listings_numbers_check
  check (
    price >= 0
    and (bedrooms is null or bedrooms >= 0)
    and (bathrooms is null or bathrooms >= 0)
    and (toilets is null or toilets >= 0)
    and (size_value is null or size_value > 0)
    and (parking_spaces is null or parking_spaces >= 0)
    and (agency_fee_percent is null or agency_fee_percent between 0 and 100)
    and (legal_fee_percent is null or legal_fee_percent between 0 and 100)
    and (caution_deposit is null or caution_deposit >= 0)
    and (service_charge is null or service_charge >= 0)
  );

-- Search filters by these.
create index if not exists listings_search_idx
  on public.listings (status, category, listing_type, created_at desc);
create index if not exists listings_state_lga_idx on public.listings (state, lga);
create index if not exists listings_price_idx on public.listings (price);

-- Anyone signed in can list, under their own id. (Replaces the
-- landlord-only policy from listings_rls.sql.)
drop policy if exists "Landlords can insert their own listings" on public.listings;
drop policy if exists "Signed-in users can insert their own listings" on public.listings;
create policy "Signed-in users can insert their own listings"
on public.listings
for insert
to authenticated
with check (landlord_id = auth.uid());

-- Same rules as inspections_status_guard.sql, plus: you can only book a
-- viewing on a listing that is still available.
drop policy if exists "Tenants can request an inspection" on public.inspections;
create policy "Tenants can request an inspection"
on public.inspections
for insert
to authenticated
with check (
  tenant_id = auth.uid()
  and coalesce(status, 'pending') = 'pending'
  and listing_id in (select id from public.listings where status = 'active')
  and listing_id not in (select id from public.listings where landlord_id = auth.uid())
  and not exists (
    select 1 from public.inspections existing
    where existing.listing_id = inspections.listing_id
      and existing.tenant_id = auth.uid()
      and existing.status in ('pending', 'countered', 'confirmed')
  )
);
