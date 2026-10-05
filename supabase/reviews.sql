-- Reviews after a viewing: home-seekers rate listers (public), listers rate
-- home-seekers (visible only to listers they deal with).
--
-- Run once in the Supabase Dashboard -> SQL Editor BEFORE deploying the app
-- code that uses it. Safe to re-run. Requires trust_safety.sql (is_admin)
-- and messaging_slots.sql (shares_context).

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  inspection_id uuid not null references public.inspections (id) on delete cascade,
  listing_id uuid references public.listings (id) on delete set null,
  reviewer_id uuid not null references auth.users (id) on delete cascade,
  reviewee_id uuid not null references auth.users (id) on delete cascade,
  reviewee_role text not null check (reviewee_role in ('lister', 'tenant')),
  rating smallint not null check (rating between 1 and 5),
  comment text check (comment is null or char_length(comment) <= 1000),
  -- Home-seeker -> lister only: did the property match the listing?
  listing_accurate boolean,
  created_at timestamptz not null default now(),
  unique (inspection_id, reviewer_id)
);

create index if not exists reviews_reviewee_idx on public.reviews (reviewee_id, reviewee_role, created_at desc);

alter table public.reviews enable row level security;

-- Reviews of listers are public; reviews of home-seekers are visible to the
-- author, the person reviewed, and listers that person has booked with.
drop policy if exists "Lister reviews are public" on public.reviews;
create policy "Lister reviews are public"
on public.reviews for select to anon, authenticated
using (reviewee_role = 'lister');

drop policy if exists "Tenant reviews are visible to people involved" on public.reviews;
create policy "Tenant reviews are visible to people involved"
on public.reviews for select to authenticated
using (
  reviewee_role = 'tenant'
  and (reviewer_id = auth.uid() or reviewee_id = auth.uid() or public.shares_context(reviewee_id))
);

drop policy if exists "Admins can delete reviews" on public.reviews;
create policy "Admins can delete reviews"
on public.reviews for delete to authenticated
using (public.is_admin());

-- Reviews are written through leave_review() only, which checks the viewing
-- actually happened and works out who is reviewing whom.
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
    v_status = 'done'
    or (v_status = 'confirmed' and v_date < (now() at time zone 'Africa/Lagos')::date)
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

grant execute on function public.leave_review(uuid, integer, text, boolean) to authenticated;

-- Average rating, count and listing-accuracy % for many users at once.
-- Aggregates only, so it is safe to expose; tenant ratings still need a login.
create or replace function public.user_ratings(p_users uuid[], p_role text)
returns table (user_id uuid, average numeric, total integer, accurate_pct integer)
language sql
stable
security definer
set search_path = public
as $$
  select
    r.reviewee_id,
    round(avg(r.rating)::numeric, 1),
    count(*)::integer,
    case
      when count(r.listing_accurate) = 0 then null
      else round(100.0 * count(*) filter (where r.listing_accurate) / count(r.listing_accurate))::integer
    end
  from public.reviews r
  where r.reviewee_id = any (p_users)
    and r.reviewee_role = p_role
    and (p_role = 'lister' or auth.uid() is not null)
  group by r.reviewee_id;
$$;

grant execute on function public.user_ratings(uuid[], text) to anon, authenticated;
