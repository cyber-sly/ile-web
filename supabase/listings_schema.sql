-- Adds richer listing details, a for-sale/for-rent tag, and multi-photo /
-- video support to the `listings` table.
--
-- Run this once in the Supabase Dashboard -> SQL Editor, BEFORE deploying
-- the app code that uses these columns (src/app/listings/new,
-- src/app/listings/[id], src/app/listings/[id]/edit).

alter table public.listings
  add column if not exists address text,
  add column if not exists description text,
  add column if not exists features text[] not null default '{}',
  add column if not exists image_urls text[] not null default '{}',
  add column if not exists video_urls text[] not null default '{}',
  add column if not exists listing_type text not null default 'rent';

alter table public.listings
  drop constraint if exists listings_listing_type_check;
alter table public.listings
  add constraint listings_listing_type_check check (listing_type in ('rent', 'sale'));

-- Backfill: carry the existing single image_url into the new gallery array
-- so listings created before this change still show a photo.
update public.listings
set image_urls = array[image_url]
where image_url is not null and image_urls = '{}';

-- `image_url` is kept as-is going forward — the app now treats it as the
-- cover photo (image_urls[0]) for places that only show one image, like
-- listing cards on /listings and the homepage.

-- A storage bucket for listing videos (listing-images already exists and
-- is used for photos). Mirrors whatever public-read / owner-write setup
-- listing-images already has — check the Storage section of the dashboard
-- if uploads fail and adjust these to match.
insert into storage.buckets (id, name, public)
values ('listing-videos', 'listing-videos', true)
on conflict (id) do nothing;

drop policy if exists "Public read access to listing videos" on storage.objects;
create policy "Public read access to listing videos"
on storage.objects for select
using (bucket_id = 'listing-videos');

drop policy if exists "Landlords can upload their own listing videos" on storage.objects;
create policy "Landlords can upload their own listing videos"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'listing-videos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Landlords can delete their own listing videos" on storage.objects;
create policy "Landlords can delete their own listing videos"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'listing-videos'
  and (storage.foldername(name))[1] = auth.uid()::text
);
