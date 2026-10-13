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

-- public.ile_handle_new_user() is defined in supabase/referrals_boosts.sql
-- (it also records invite codes). It is not repeated here, so re-running this
-- file can never bring back an older version.

drop trigger if exists ile_on_auth_user_created on auth.users;
create trigger ile_on_auth_user_created
after insert on auth.users
for each row execute function public.ile_handle_new_user();

-- Check: exactly one trigger should be listed, ile_on_auth_user_created.
select t.tgname as trigger_name
from pg_trigger t
where t.tgrelid = 'auth.users'::regclass and not t.tgisinternal;
