# Online status, last seen, and editing sent messages: design

Part D of the founder's changes (item 7). Website (Next.js) and app (Expo) behave the same.

## Goal

- People chatting can see whether the other person is **online** or when they were **last seen**, so a home-seeker knows a lister is active and keeps waiting for a reply.
- People can **edit a message they sent** within **3 minutes**.

## Decisions (founder)

- Status is visible **only to people you have a chat with** (chat header + inbox). Not on public profiles. No "Active today" badge on lister profiles for now.
- Presence uses a **once-a-minute check-in**, not live presence channels.
- Edits are allowed after the message has been read; the old text is not kept.

## Part 1: Online and last seen

### Data

- New table `public.presence (user_id uuid primary key references auth.users on delete cascade, last_seen_at timestamptz not null)`. RLS on, **no policies and no grants** to anon/authenticated: only the functions below touch it. Not added to the realtime publication.
- `touch_presence()` (security definer, authenticated only): upserts the caller's row with `now()`, but skips the write when the existing `last_seen_at` is less than **50 seconds** old.
- `chat_presence(p_conversations uuid[])` (security definer, authenticated only): returns `(conversation_id, last_seen_at)` with the **other** participant's time, only for conversations where `auth.uid()` is the tenant or landlord. Conversations without a presence row are left out. At most 100 ids per call.

### Check-in (shared `shared/presence.js`)

- `touchPresence(client)` calls the RPC and never throws.
- Website: a small hook in the signed-in layout checks in on load and every **60 s** while `document.visibilityState === "visible"`, and again when the tab becomes visible.
- App: same, every 60 s while `AppState` is `active`, and on returning to the foreground. Skipped when offline.

### Display rules (shared, pure)

`presenceLabel(lastSeenAt, now)`:
- within **2 minutes** → `{ online: true, text: "Online" }`
- same Lagos calendar day → `"Last seen 10:42"` (24-hour `HH:MM`, Lagos time)
- the previous Lagos day → `"Last seen yesterday"`
- older → `"Last seen 12 Oct"` (plus the year if not this year)
- missing/invalid → `null` (show nothing)

### Where it shows

- **Chat header** (website `/messages/[id]`, app `chat/[id]`): under the name, green "Online" or grey "Last seen …".
- **Inbox** (website `/messages`, app inbox tab): a green dot on the avatar of anyone online.
- Both fetch `chat_presence` on open and refresh every **60 s** while visible. One small read; no live connection.
- Before `presence_edit.sql` is run the RPC is missing: nothing shows, nothing breaks.

### Load

One tiny upsert per active person per minute, only while looking; repeat check-ins within 50 s are skipped by the database. ~1,000 people online at once ≈ 17 small writes/second.

## Part 2: Edit a sent message within 3 minutes

### Data

- `messages.edited_at timestamptz` (nullable).
- `edit_message(p_id uuid, p_body text)` (security definer, authenticated only) — refuses with a clear error code/message when:
  - the caller isn't the sender;
  - `now() - created_at > 3 minutes 15 seconds` (15 s grace for slow networks) → "You can only edit a message within 3 minutes of sending it.";
  - the trimmed body is empty or over 2000 characters.
  Otherwise sets `body = trim(p_body)` and `edited_at = now()` and returns the updated row. Unchanged text is a no-op that returns the row.
- `guard_message_update()` is redefined, keeping today's rules (recipient may only set `read_at`; the account-deletion branch) and adding: a body/`edited_at` change is allowed only while `edit_message` has set the transaction-local flag `ile.editing = 'on'`. Any other change to `edited_at` is refused.
- The new-message push trigger fires on insert only, so an edit sends **no push**.

### Shared (`shared/messages.js` or the existing messaging module)

- `EDIT_WINDOW_MS = 3 * 60 * 1000`.
- `canEdit(message, userId, now)` → sender is me, not a temporary/unsent message, `now - created_at < EDIT_WINDOW_MS`.
- `editMessage(client, id, body)` → calls the RPC; errors pass through `friendlyError`, with the window error shown as "You can only edit a message within 3 minutes of sending it."

### UI

- **App:** long-press your own message → action sheet with **Edit** (only while `canEdit`).
- **Website:** an **Edit** button on hover over your own message (on touch screens, tap the message to show it).
- Editing moves the text into the composer with an "Editing message · Cancel" bar; Send saves the edit. The Edit option disappears by itself when the 3 minutes pass (re-checked every few seconds while the chat is open).
- Edited messages show a small **"edited"** label beside the time, for both people. Updates arrive live through the existing realtime UPDATE subscription; the inbox preview follows.
- Offline: Edit is disabled, like Send.
- Before the SQL is run (`edited_at` missing): the Edit option doesn't appear.

## Errors

All user-visible errors go through `friendlyError`; never raw database text.

## Testing

- Shared node tests: `presenceLabel` (online boundary at 2 min, today/yesterday/older, Lagos time zone, null input), `canEdit` (owner, window edges, temp messages), `editMessage`/`touchPresence`/`fetchChatPresence` with fake clients (missing RPC → null/false, never throws where stated).
- SQL text tests: presence table has no grants; `chat_presence` checks `auth.uid()`; `edit_message` checks sender and the 3-minute window; the guard keeps the account-deletion branch and the read-only rule.
- App jest: chat header shows Online/Last seen; long-press shows Edit only within the window; "edited" label renders.
- Gates: shared tests, website lint + build, app jest + tsc + lint + android export.

## Setup

`supabase/presence_edit.sql`, run once by the founder, safe to re-run; `docs/presence-edit-setup.md` explains it and gives a two-account test.
