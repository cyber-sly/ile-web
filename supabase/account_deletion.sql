-- Account deletion: users can delete their own account (required by the App
-- Store and Google Play), and the database follows explicit rules for what
-- goes and what stays.
--
-- Run once in the Supabase Dashboard -> SQL Editor after all earlier files.
-- Safe to re-run.
--
-- When a user is deleted:
--   deleted : profile, listings (+ their viewings, availability, reports
--             about them), viewings they booked, reviews ABOUT them,
--             push/admin rows
--   kept    : chats (other person still sees them; the deleted side shows
--             as "Deleted user"), reviews they WROTE (anonymous), reports
--             they filed (reporter removed)
-- Photos/videos in Storage are removed by the app before deletion (Storage
-- files can only be deleted through the Storage API).

---------------------------------------------------------------------------
-- Helper: replace whatever foreign key exists on a column with one that has
-- the delete rule we want. Some tables predate this repo, so we look the
-- constraint up instead of assuming its name. NOT VALID skips re-checking
-- old rows (a legacy orphan row won't block the migration); new and changed
-- rows are enforced.
---------------------------------------------------------------------------

create or replace function public._ile_set_fk(
  p_table regclass, p_column text, p_ref regclass, p_ref_column text, p_on_delete text
)
returns void
language plpgsql
as $$
declare
  c record;
  fk_name text := format('%s_%s_fkey', replace(p_table::text, 'public.', ''), p_column);
begin
  for c in
    select con.conname
    from pg_constraint con
    join pg_attribute att on att.attrelid = con.conrelid and att.attnum = any (con.conkey)
    where con.conrelid = p_table and con.contype = 'f' and att.attname = p_column
  loop
    execute format('alter table %s drop constraint %I', p_table, c.conname);
  end loop;
  execute format(
    'alter table %s add constraint %I foreign key (%I) references %s (%I) on delete %s not valid',
    p_table, fk_name, p_column, p_ref, p_ref_column, p_on_delete
  );
end;
$$;

-- Deleted with the user.
select public._ile_set_fk('public.profiles', 'id', 'auth.users', 'id', 'cascade');
select public._ile_set_fk('public.listings', 'landlord_id', 'auth.users', 'id', 'cascade');
select public._ile_set_fk('public.inspections', 'tenant_id', 'auth.users', 'id', 'cascade');
select public._ile_set_fk('public.inspections', 'listing_id', 'public.listings', 'id', 'cascade');

-- Kept, with the deleted person's side cleared.
alter table public.conversations alter column tenant_id drop not null;
alter table public.conversations alter column landlord_id drop not null;
select public._ile_set_fk('public.conversations', 'tenant_id', 'auth.users', 'id', 'set null');
select public._ile_set_fk('public.conversations', 'landlord_id', 'auth.users', 'id', 'set null');

alter table public.messages alter column sender_id drop not null;
select public._ile_set_fk('public.messages', 'sender_id', 'auth.users', 'id', 'set null');

alter table public.reviews alter column reviewer_id drop not null;
alter table public.reviews alter column inspection_id drop not null;
select public._ile_set_fk('public.reviews', 'reviewer_id', 'auth.users', 'id', 'set null');
-- A review must survive its viewing being deleted (e.g. the other person
-- deleted their account), so it no longer cascades from inspections.
select public._ile_set_fk('public.reviews', 'inspection_id', 'public.inspections', 'id', 'set null');

alter table public.listing_reports alter column reporter_id drop not null;
select public._ile_set_fk('public.listing_reports', 'reporter_id', 'auth.users', 'id', 'set null');

drop function public._ile_set_fk(regclass, text, regclass, text, text);

---------------------------------------------------------------------------
-- The message guard blocks edits to messages. Account deletion clears
-- sender_id on the deleted user's messages, so allow exactly that.
---------------------------------------------------------------------------

create or replace function public.guard_message_update()
returns trigger
language plpgsql
as $$
begin
  if auth.uid() is null then
    return new;
  end if;
  -- Account deletion: the sender's own messages lose their sender, nothing else.
  if new.sender_id is null and old.sender_id = auth.uid()
     and new.body = old.body and new.conversation_id = old.conversation_id
     and new.created_at = old.created_at then
    return new;
  end if;
  if new.body is distinct from old.body
     or new.sender_id is distinct from old.sender_id
     or new.conversation_id is distinct from old.conversation_id
     or new.created_at is distinct from old.created_at then
    raise exception 'Messages cannot be edited';
  end if;
  if old.sender_id = auth.uid() and new.read_at is distinct from old.read_at then
    raise exception 'Only the recipient can mark a message read';
  end if;
  return new;
end;
$$;

-- Nobody can send into a chat whose other person has deleted their account.
drop policy if exists "Participants can send messages" on public.messages;
create policy "Participants can send messages"
on public.messages for insert to authenticated
with check (
  sender_id = auth.uid()
  and read_at is null
  and conversation_id in (
    select id from public.conversations
    where auth.uid() in (tenant_id, landlord_id)
      and tenant_id is not null and landlord_id is not null
  )
);

-- Unread counts include messages from people who have since left.
create or replace function public.inbox_summary()
returns table (conversation_id uuid, last_body text, last_sender uuid, last_at timestamptz, unread integer)
language sql
stable
security invoker
set search_path = public
as $$
  select
    c.id,
    m.body,
    m.sender_id,
    m.created_at,
    (
      select count(*)::integer from public.messages u
      where u.conversation_id = c.id and u.read_at is null and u.sender_id is distinct from auth.uid()
    )
  from public.conversations c
  left join lateral (
    select body, sender_id, created_at from public.messages
    where conversation_id = c.id
    order by created_at desc
    limit 1
  ) m on true
  where auth.uid() in (c.tenant_id, c.landlord_id);
$$;

---------------------------------------------------------------------------
-- The deletion itself. Removing the auth user triggers every rule above,
-- and also ends all of their sessions.
---------------------------------------------------------------------------

create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null then
    raise exception 'Log in to delete your account';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- Pre-flight check the app calls before removing any photos, so files are
-- never deleted unless account deletion itself is available.
create or replace function public.account_deletion_ready()
returns boolean
language sql
stable
as $$ select auth.uid() is not null; $$;

grant execute on function public.account_deletion_ready() to authenticated;
