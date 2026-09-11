-- Adds a real negotiation flow to inspection bookings: a landlord can
-- decline a request outright, or counter it with a different date/time,
-- which the tenant then accepts or declines. Also lets a tenant cancel a
-- request they no longer want.
--
-- Run once in the Supabase Dashboard -> SQL Editor, before deploying the
-- app code that uses these columns/statuses (src/app/dashboard,
-- src/app/my-bookings, src/app/listings/[id]).

alter table public.inspections
  add column if not exists preferred_time time,
  add column if not exists proposed_date date,
  add column if not exists proposed_time time,
  add column if not exists landlord_note text;

alter table public.inspections
  alter column status set default 'pending';

-- Status lifecycle:
--   pending    -> tenant requested, awaiting landlord response
--   countered  -> landlord proposed a different date/time, awaiting tenant
--   confirmed  -> a date/time both sides agreed on
--   declined   -> landlord said no, or tenant rejected the countered time
--   cancelled  -> tenant withdrew the request
--   done       -> the inspection took place
alter table public.inspections
  drop constraint if exists inspections_status_check;
alter table public.inspections
  add constraint inspections_status_check
  check (status in ('pending', 'countered', 'confirmed', 'declined', 'cancelled', 'done'));
