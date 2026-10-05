-- Locks down who can make which change to an inspection booking.
--
-- Run once in the Supabase Dashboard -> SQL Editor, after
-- inspections_booking_flow.sql and inspections_rls.sql.
--
-- Why: the RLS update policy lets both the tenant and the landlord update a
-- booking row, but RLS can't say *which* columns or status changes each side
-- may make. Without this, a tenant could call the API directly and set their
-- own request to 'confirmed', or rewrite the landlord's proposed time.
--
-- Allowed transitions:
--   tenant:   pending   -> cancelled
--             countered -> confirmed  (accepting the landlord's time; the
--                                      agreed date/time is copied in here)
--             countered -> declined
--   landlord: pending   -> confirmed | countered | declined
--             countered -> declined   (withdrawing their suggestion)
--             confirmed -> done
-- Nobody can move a booking to another listing or tenant.

create or replace function public.guard_inspection_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  is_landlord boolean;
  is_tenant boolean;
begin
  -- Service-role / dashboard edits (no signed-in user) are left alone.
  if auth.uid() is null then
    return new;
  end if;

  if new.listing_id is distinct from old.listing_id or new.tenant_id is distinct from old.tenant_id then
    raise exception 'A booking cannot be moved to another listing or person';
  end if;

  select exists (
    select 1 from public.listings where id = old.listing_id and landlord_id = auth.uid()
  ) into is_landlord;
  is_tenant := old.tenant_id = auth.uid();

  if is_landlord then
    if not (
      (old.status = 'pending' and new.status in ('confirmed', 'countered', 'declined'))
      or (old.status = 'countered' and new.status = 'declined')
      or (old.status = 'confirmed' and new.status = 'done')
    ) then
      raise exception 'Landlords cannot change a booking from % to %', old.status, new.status;
    end if;
    -- The tenant's requested slot is theirs to set.
    if new.preferred_date is distinct from old.preferred_date
       or new.preferred_time is distinct from old.preferred_time then
      raise exception 'Landlords cannot change the requested time; propose a new one instead';
    end if;
    return new;
  end if;

  if is_tenant then
    if old.status = 'pending' and new.status = 'cancelled' then
      null;
    elsif old.status = 'countered' and new.status = 'confirmed' then
      -- Accepting means agreeing to exactly what the landlord proposed.
      new.preferred_date := old.proposed_date;
      new.preferred_time := old.proposed_time;
    elsif old.status = 'countered' and new.status = 'declined' then
      null;
    else
      raise exception 'Tenants cannot change a booking from % to %', old.status, new.status;
    end if;
    -- The landlord's proposal and note are theirs to set.
    if new.proposed_date is distinct from old.proposed_date
       or new.proposed_time is distinct from old.proposed_time
       or new.landlord_note is distinct from old.landlord_note then
      raise exception 'Tenants cannot change the landlord''s proposal';
    end if;
    return new;
  end if;

  raise exception 'Not allowed to update this booking';
end;
$$;

drop trigger if exists guard_inspection_update on public.inspections;
create trigger guard_inspection_update
before update on public.inspections
for each row execute function public.guard_inspection_update();

-- New requests always start as 'pending', can't be made on your own listing,
-- and can't duplicate an open request for the same listing.
drop policy if exists "Tenants can request an inspection" on public.inspections;
create policy "Tenants can request an inspection"
on public.inspections
for insert
to authenticated
with check (
  tenant_id = auth.uid()
  and coalesce(status, 'pending') = 'pending'
  and listing_id not in (select id from public.listings where landlord_id = auth.uid())
  and not exists (
    select 1 from public.inspections existing
    where existing.listing_id = inspections.listing_id
      and existing.tenant_id = auth.uid()
      and existing.status in ('pending', 'countered', 'confirmed')
  )
);
