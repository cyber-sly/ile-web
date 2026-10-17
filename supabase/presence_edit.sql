-- Online status / last seen for chat partners, and editing a sent message
-- within 3 minutes.
-- Spec: docs/superpowers/specs/2026-10-17-ile-presence-edit-design.md
--
-- Run once in Supabase -> SQL Editor. Safe to re-run.
-- Needs messaging_slots.sql and account_deletion.sql. If either of those is
-- ever re-run, run this file again afterwards (they redefine the message guard).

-- ---------------------------------------------------------------------------
-- Presence: one row per person, the last time their app or website checked in.
-- No policies and no grants: only the functions below read or write it, so
-- nobody can track people they aren't chatting with.
-- ---------------------------------------------------------------------------

create table if not exists public.presence (
  user_id uuid primary key references auth.users (id) on delete cascade,
  last_seen_at timestamptz not null default now()
);

alter table public.presence enable row level security;
revoke all on public.presence from anon, authenticated;

-- Check in. Skips the write if the last check-in was under 50 seconds ago
-- (several tabs, quick reconnects).
create or replace function public.touch_presence()
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.presence (user_id, last_seen_at)
  select auth.uid(), now()
  where auth.uid() is not null
  on conflict (user_id) do update set last_seen_at = now()
  where presence.last_seen_at < now() - interval '50 seconds';
$$;

revoke execute on function public.touch_presence() from public, anon;
grant execute on function public.touch_presence() to authenticated;

-- The other person's last check-in for each of my conversations (max 100).
create or replace function public.chat_presence(p_conversations uuid[])
returns table (conversation_id uuid, last_seen_at timestamptz)
language sql
stable
security definer
set search_path = public
as $$
  select c.id, p.last_seen_at
  from public.conversations c
  join public.presence p
    on p.user_id = case when c.tenant_id = auth.uid() then c.landlord_id else c.tenant_id end
  where c.id = any (p_conversations[1:100])
    and auth.uid() in (c.tenant_id, c.landlord_id);
$$;

revoke execute on function public.chat_presence(uuid[]) from public, anon;
grant execute on function public.chat_presence(uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- Editing a sent message
-- ---------------------------------------------------------------------------

alter table public.messages add column if not exists edited_at timestamptz;

-- Same rules as account_deletion.sql (recipient may only mark read; a deleted
-- account's messages lose their sender), plus: the body and edited_at may
-- change only inside edit_message(), which sets ile.editing for this
-- transaction.
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
     and new.created_at = old.created_at
     and new.edited_at is not distinct from old.edited_at then
    return new;
  end if;
  -- An edit through edit_message(): only the sender's body and edited_at change.
  if coalesce(current_setting('ile.editing', true), '') = 'on'
     and old.sender_id = auth.uid()
     and new.sender_id = old.sender_id
     and new.conversation_id = old.conversation_id
     and new.created_at = old.created_at
     and new.read_at is not distinct from old.read_at then
    return new;
  end if;
  if new.body is distinct from old.body
     or new.edited_at is distinct from old.edited_at
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

drop trigger if exists guard_message_update on public.messages;
create trigger guard_message_update
before update on public.messages
for each row execute function public.guard_message_update();

-- Edit my own message within 3 minutes (15 seconds' grace for slow networks).
-- Errors are written for people; the app shows them as they are.
create or replace function public.edit_message(p_id uuid, p_body text)
returns public.messages
language plpgsql
security definer
set search_path = public
as $$
declare
  v_msg public.messages;
  v_body text := trim(coalesce(p_body, ''));
begin
  select * into v_msg from public.messages where id = p_id;
  if v_msg.id is null or auth.uid() is null or v_msg.sender_id is distinct from auth.uid() then
    raise exception 'Only the sender can edit this message.';
  end if;
  if now() - v_msg.created_at > interval '3 minutes 15 seconds' then
    raise exception 'You can only edit a message within 3 minutes of sending it.';
  end if;
  if char_length(v_body) < 1 or char_length(v_body) > 2000 then
    raise exception 'Messages must be 1 to 2000 characters.';
  end if;
  if v_body = v_msg.body then
    return v_msg;
  end if;
  perform set_config('ile.editing', 'on', true);
  update public.messages set body = v_body, edited_at = now() where id = p_id returning * into v_msg;
  perform set_config('ile.editing', 'off', true);
  return v_msg;
end;
$$;

revoke execute on function public.edit_message(uuid, text) from public, anon;
grant execute on function public.edit_message(uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Checks: prints "edited_at" and "presence".
-- ---------------------------------------------------------------------------

select column_name as name from information_schema.columns
where table_schema = 'public' and table_name = 'messages' and column_name = 'edited_at'
union all
select table_name from information_schema.tables
where table_schema = 'public' and table_name = 'presence';
