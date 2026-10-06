-- Hardening for growth and abuse: indexes, rate limits, server-side upload
-- rules, and stricter input validation.
--
-- Run once in the Supabase Dashboard -> SQL Editor after all earlier files.
-- Safe to re-run.

---------------------------------------------------------------------------
-- 1. Indexes
---------------------------------------------------------------------------

-- Nearly every access rule asks "which listings does this user own?"
-- (select id from listings where landlord_id = auth.uid()). Without this
-- index that is a full table scan on every request.
create index if not exists listings_landlord_idx on public.listings (landlord_id, created_at desc);

-- Bookings by home-seeker (My viewings, access rules, rate limits) and by
-- listing (dashboard, open-slot checks, conversation checks).
create index if not exists inspections_tenant_idx on public.inspections (tenant_id, created_at desc);
create index if not exists inspections_listing_idx on public.inspections (listing_id, preferred_date);

-- Rate-limit lookups below.
create index if not exists messages_sender_idx on public.messages (sender_id, created_at desc);
create index if not exists listing_reports_reporter_idx on public.listing_reports (reporter_id, created_at desc);
create index if not exists conversations_created_idx on public.conversations (tenant_id, created_at desc);

-- Search box: "%yaba%"-style matching needs trigram indexes, otherwise every
-- search reads the whole listings table.
create extension if not exists pg_trgm with schema extensions;
create index if not exists listings_title_trgm on public.listings using gin (title extensions.gin_trgm_ops);
create index if not exists listings_area_trgm on public.listings using gin (area extensions.gin_trgm_ops);
create index if not exists listings_location_trgm on public.listings using gin (location extensions.gin_trgm_ops);
create index if not exists listings_lga_trgm on public.listings using gin (lga extensions.gin_trgm_ops);

-- Category pages filtered by state, newest first.
create index if not exists listings_state_browse_idx
  on public.listings (state, category, listing_type, created_at desc)
  where status = 'active';

---------------------------------------------------------------------------
-- 2. Rate limits
--
-- A BEFORE INSERT trigger counts the user's recent rows and refuses the
-- insert past the limit. Applies to signed-in users only; admins and
-- service-role/dashboard inserts are exempt.
--   args: user column, window (interval), max rows, friendly label
---------------------------------------------------------------------------

create or replace function public.enforce_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  user_col text := tg_argv[0];
  win interval := tg_argv[1]::interval;
  max_rows integer := tg_argv[2]::integer;
  label text := tg_argv[3];
  recent integer;
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;
  execute format(
    'select count(*) from %I.%I where %I = $1 and created_at > now() - $2',
    tg_table_schema, tg_table_name, user_col
  ) into recent using auth.uid(), win;
  if recent >= max_rows then
    raise exception 'You''re doing that too often (%). Please wait a little and try again.', label
      using errcode = 'P0429';
  end if;
  return new;
end;
$$;

-- Messages: a short burst limit and a daily cap.
drop trigger if exists rate_limit_messages_minute on public.messages;
create trigger rate_limit_messages_minute before insert on public.messages
for each row execute function public.enforce_rate_limit('sender_id', '1 minute', '20', 'messages');

drop trigger if exists rate_limit_messages_day on public.messages;
create trigger rate_limit_messages_day before insert on public.messages
for each row execute function public.enforce_rate_limit('sender_id', '1 day', '500', 'messages');

-- New listings per lister.
drop trigger if exists rate_limit_listings on public.listings;
create trigger rate_limit_listings before insert on public.listings
for each row execute function public.enforce_rate_limit('landlord_id', '1 day', '20', 'new listings');

-- Viewing requests per home-seeker.
drop trigger if exists rate_limit_inspections on public.inspections;
create trigger rate_limit_inspections before insert on public.inspections
for each row execute function public.enforce_rate_limit('tenant_id', '1 day', '15', 'viewing requests');

-- Reports per user.
drop trigger if exists rate_limit_reports on public.listing_reports;
create trigger rate_limit_reports before insert on public.listing_reports
for each row execute function public.enforce_rate_limit('reporter_id', '1 day', '10', 'reports');

-- New conversations started by a home-seeker.
drop trigger if exists rate_limit_conversations on public.conversations;
create trigger rate_limit_conversations before insert on public.conversations
for each row execute function public.enforce_rate_limit('tenant_id', '1 day', '30', 'new chats');

---------------------------------------------------------------------------
-- 3. Uploads, enforced by Supabase Storage itself (not just the browser):
-- allowed file types and maximum size per bucket. SVG is deliberately not
-- allowed because it can carry scripts.
---------------------------------------------------------------------------

update storage.buckets
set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'],
    file_size_limit = 10 * 1024 * 1024
where id = 'listing-images';

update storage.buckets
set allowed_mime_types = array['video/mp4', 'video/quicktime', 'video/webm'],
    file_size_limit = 50 * 1024 * 1024
where id = 'listing-videos';

-- Replace whatever policies existed on these two buckets with strict ones:
-- anyone can view; signed-in users can only add or delete files inside
-- their own folder (<user id>/...). Updates (overwriting files) are not allowed.
do $$
declare
  p record;
begin
  for p in
    select policyname from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and (coalesce(qual, '') || coalesce(with_check, '')) ~ 'listing-(images|videos)'
  loop
    execute format('drop policy if exists %I on storage.objects', p.policyname);
  end loop;
end;
$$;

create policy "Listing media is publicly readable"
on storage.objects for select
using (bucket_id in ('listing-images', 'listing-videos'));

create policy "Users upload listing media to their own folder"
on storage.objects for insert to authenticated
with check (
  bucket_id in ('listing-images', 'listing-videos')
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "Users delete their own listing media"
on storage.objects for delete to authenticated
using (
  bucket_id in ('listing-images', 'listing-videos')
  and (storage.foldername(name))[1] = auth.uid()::text
);

---------------------------------------------------------------------------
-- 4. Listing input validation
---------------------------------------------------------------------------

-- Photos and videos must be files the lister uploaded to Ile's own storage,
-- in their own folder: no outside image links (tracking pixels, huge files,
-- other sites' content). Checked only when the media changes, so moderation
-- and status updates on older rows are unaffected.
create or replace function public.validate_listing_media()
returns trigger
language plpgsql
as $$
declare
  url text;
  allowed text := '^https://[a-z0-9.-]+/storage/v1/object/public/listing-(images|videos)/' || new.landlord_id::text || '/[^/?#]+$';
begin
  if tg_op = 'UPDATE'
     and new.image_urls is not distinct from old.image_urls
     and new.video_urls is not distinct from old.video_urls
     and new.image_url is not distinct from old.image_url then
    return new;
  end if;
  if coalesce(array_length(new.image_urls, 1), 0) > 20 then
    raise exception 'A listing can have at most 20 photos';
  end if;
  if coalesce(array_length(new.video_urls, 1), 0) > 5 then
    raise exception 'A listing can have at most 5 videos';
  end if;
  foreach url in array coalesce(new.image_urls, '{}') || coalesce(new.video_urls, '{}') || array_remove(array[new.image_url], null)
  loop
    if url !~ allowed then
      raise exception 'Photos and videos must be uploaded through Ile';
    end if;
  end loop;
  return new;
end;
$$;

drop trigger if exists validate_listing_media on public.listings;
create trigger validate_listing_media
before insert or update on public.listings
for each row execute function public.validate_listing_media();

-- Length limits on free text (new and edited rows; existing rows untouched).
alter table public.listings drop constraint if exists listings_text_lengths_check;
alter table public.listings add constraint listings_text_lengths_check
  check (
    char_length(title) between 1 and 120
    and (description is null or char_length(description) <= 5000)
    and (address is null or char_length(address) <= 200)
    and (area is null or char_length(area) <= 100)
    and coalesce(array_length(features, 1), 0) <= 30
  ) not valid;

alter table public.inspections drop constraint if exists inspections_note_length_check;
alter table public.inspections add constraint inspections_note_length_check
  check (landlord_note is null or char_length(landlord_note) <= 500) not valid;
