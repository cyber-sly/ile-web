-- Row-level security policies for the `inspections` table.
--
-- Run once in the Supabase Dashboard -> SQL Editor. This is the fix for
-- two symptoms that are actually the same underlying gap:
--   1. A tenant's inspection request never showed up on the landlord's
--      dashboard.
--   2. A landlord's counter-proposed date/time never showed up on the
--      tenant's My Bookings page.
-- Both happen because there was no policy granting a landlord any access
-- to inspection rows on their own listings (only, at best, a policy
-- scoped to the tenant who created the row) — so the landlord's read of
-- other tenants' bookings, and the landlord's update when countering a
-- request, were both silently blocked.

alter table public.inspections enable row level security;

-- A tenant can see their own booking requests; a landlord can see every
-- request made against any listing they own.
drop policy if exists "Tenants and landlords can view relevant inspections" on public.inspections;
create policy "Tenants and landlords can view relevant inspections"
on public.inspections
for select
to authenticated
using (
  tenant_id = auth.uid()
  or listing_id in (select id from public.listings where landlord_id = auth.uid())
);

-- A tenant can only create a booking under their own tenant_id.
drop policy if exists "Tenants can request an inspection" on public.inspections;
create policy "Tenants can request an inspection"
on public.inspections
for insert
to authenticated
with check (tenant_id = auth.uid());

-- A tenant can update their own booking (accept/decline a counter-offer,
-- cancel a pending request); a landlord can update any booking against
-- their own listings (confirm, decline, propose a new time, mark done).
drop policy if exists "Tenants and landlords can update relevant inspections" on public.inspections;
create policy "Tenants and landlords can update relevant inspections"
on public.inspections
for update
to authenticated
using (
  tenant_id = auth.uid()
  or listing_id in (select id from public.listings where landlord_id = auth.uid())
)
with check (
  tenant_id = auth.uid()
  or listing_id in (select id from public.listings where landlord_id = auth.uid())
);
