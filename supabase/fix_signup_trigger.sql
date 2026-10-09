-- Fix: "Database error saving new user" on sign-up (website and app).
--
-- Two triggers ran on every new account: the project's original
-- on_auth_user_created -> handle_new_user() and Ile's
-- ile_on_auth_user_created -> ile_handle_new_user(). Triggers fire in
-- name order, so Ile's created the profile first and the original then
-- inserted the same profile again with no "on conflict", which failed the
-- whole sign-up. Ile's trigger does everything the original did, so the
-- original is removed.
--
-- Also: the role comes from what the sign-up form sends, so only the two
-- real roles are accepted; anything else becomes "tenant".
--
-- Run once in the Supabase Dashboard -> SQL Editor. Safe to re-run.

drop trigger if exists on_auth_user_created on auth.users;
drop function if exists public.handle_new_user();

create or replace function public.ile_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested text := new.raw_user_meta_data ->> 'role';
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 80),
    case when requested in ('tenant', 'landlord') then requested else 'tenant' end
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists ile_on_auth_user_created on auth.users;
create trigger ile_on_auth_user_created
after insert on auth.users
for each row execute function public.ile_handle_new_user();

-- Check: exactly one trigger should be listed, ile_on_auth_user_created.
select t.tgname as trigger_name
from pg_trigger t
where t.tgrelid = 'auth.users'::regclass and not t.tgisinternal;
