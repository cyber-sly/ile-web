# Online Status, Last Seen and Message Editing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chat partners see "Online" / "Last seen …", and senders can edit a message within 3 minutes, on the website and the app.

**Architecture:** One SQL file adds a private `presence` table with two security-definer RPCs, plus `messages.edited_at` and an `edit_message` RPC that passes the existing guard trigger through a transaction-local flag. Pure rules and RPC wrappers live in `shared/` (node-tested); the website and app add a once-a-minute check-in, a presence line in chat headers, inbox dots, and edit UI.

**Tech Stack:** Supabase Postgres (RLS, security definer, plpgsql), Next.js 16 / React 19 / Tailwind v4, Expo SDK 57 / Expo Router / jest-expo, node:test.

**Spec:** `docs/superpowers/specs/2026-10-17-ile-presence-edit-design.md`

## Global Constraints

- Status visible only to chat partners; never on public profiles.
- Check-in every 60 s only while visible/active; database skips writes when the last one is < 50 s old.
- Online = last seen within 2 minutes. Labels: "Online", "Last seen HH:MM" (Lagos, 24-hour), "Last seen yesterday", "Last seen 12 Oct" (+ year if not this year).
- Edit window 3 minutes in the UI; database allows 3 min 15 s. Error copy: "You can only edit a message within 3 minutes of sending it."
- Edited label copy: "edited". Editing bar copy: "Editing message" + "Cancel".
- Edits send no push. Old text not kept.
- Before `supabase/presence_edit.sql` is run: nothing shows, nothing breaks, no Edit option.
- Never show raw errors: `friendlyError` from `shared/errors.js`.
- Presence table: RLS on, no policies, no grants to anon/authenticated, not in the realtime publication.

## Review Focus

- **Clock skew:** a phone whose clock is minutes off must not show the Edit option wrongly for long, and the database is the final judge; a refused late edit shows the friendly copy, and the composer keeps the text. Pinned in Task 3 (`editMessage passes the window error through friendly`).
- **Unsent/temporary messages** (app outbox `pending`, website optimistic rows) must never offer Edit. Pinned in Task 3 (`canEdit refuses pending and temp messages`).
- **Guard regressions:** the redefined guard must still block recipients editing the body and senders setting `read_at`, and keep the account-deletion branch. Pinned in Task 1 (SQL test).
- **Presence for a deleted partner / never-seen partner** → nothing shown, no crash. Pinned in Task 2 (`presenceLabel returns null for missing input`) and Task 4 (header renders nothing for null).
- **Midnight in Lagos while the device is in another zone:** "yesterday" uses Lagos days. Pinned in Task 2 (`presenceLabel uses Lagos calendar days`).

---

### Task 1: SQL — presence and edit_message

**Files:**
- Create: `supabase/presence_edit.sql`
- Test: `shared/__tests__/sql.test.js` (append)

**Interfaces:**
- Produces (database):
  - table `public.presence(user_id uuid pk → auth.users on delete cascade, last_seen_at timestamptz not null)`
  - `touch_presence() returns void` — authenticated only
  - `chat_presence(p_conversations uuid[]) returns table(conversation_id uuid, last_seen_at timestamptz)` — other participant's time; max 100 ids; authenticated only
  - `messages.edited_at timestamptz`
  - `edit_message(p_id uuid, p_body text) returns public.messages` — authenticated only; raises `'You can only edit a message within 3 minutes of sending it.'` past `interval '3 minutes 15 seconds'`; raises `'Only the sender can edit this message.'`; raises `'Messages must be 1 to 2000 characters.'`
  - `guard_message_update()` redefined (keep account_deletion.sql's version's branches) + edit branch gated on `current_setting('ile.editing', true) = 'on'`; `edited_at` changes refused otherwise.

- [ ] **Step 1: Write the failing test** `presence_edit.sql locks presence down and guards edits`:
  - no `grant ... on public.presence` to anon/authenticated (regex `/grant [^;]* on (table )?public\.presence/` absent);
  - `chat_presence` body matches `/auth\.uid\(\)/`;
  - `edit_message` body matches `/sender_id/`, `/3 minutes 15 seconds/`, `/set_config\('ile\.editing', 'on', true\)/`;
  - guard body matches `/Messages cannot be edited/`, `/Only the recipient can mark a message read/`, `/new\.sender_id is null and old\.sender_id = auth\.uid\(\)/`, `/ile\.editing/`;
  - `revoke execute on function public.touch_presence() from public, anon` present (and the same for the other two RPCs).
- [ ] **Step 2: Run** `node --test "shared/__tests__/*.test.js"` → Expected: FAIL (file missing).
- [ ] **Step 3: Write `supabase/presence_edit.sql`.** Safe to re-run (`if not exists`, `create or replace`, `drop ... if exists`). Header comment as other files. `touch_presence`: `insert ... on conflict (user_id) do update set last_seen_at = now() where presence.last_seen_at < now() - interval '50 seconds'`. All three RPCs `security definer set search_path = public`. End with a check query printing `edited_at` column + `presence` table name.
- [ ] **Step 4: Run** the same command → Expected: PASS.
- [ ] **Step 5: Commit** `feat: presence and message editing SQL`.

### Task 2: Shared presence rules

**Files:**
- Create: `shared/presence.js`, `shared/__tests__/presence.test.js`

**Interfaces:**
- Produces:
  - `ONLINE_MS = 2 * 60 * 1000`, `CHECK_IN_MS = 60 * 1000`
  - `presenceLabel(lastSeenAt: string|null, now?: Date) → { online: boolean, text: string } | null`
  - `touchPresence(client) → Promise<void>` — never throws
  - `fetchChatPresence(client, conversationIds: string[]) → Promise<Record<conversationId, lastSeenAt>>` — `{}` on error/missing RPC/empty input (no request for empty)

- [ ] **Step 1: Write failing tests:**
  - `presenceLabel says Online within 2 minutes` — now − 119 s → `{online:true,text:"Online"}`; now − 121 s → online false.
  - `presenceLabel shows today's time in Lagos` — now `2026-10-17T15:00:00Z`, seen `2026-10-17T09:42:00Z` → `"Last seen 10:42"`.
  - `presenceLabel uses Lagos calendar days` — now `2026-10-17T23:30:00Z` (00:30 Lagos 18 Oct), seen `2026-10-17T22:00:00Z` (23:00 Lagos 17 Oct) → `"Last seen yesterday"`.
  - `presenceLabel shows a date for older visits` — seen `2026-10-12T10:00:00Z` → `"Last seen 12 Oct"`; seen `2025-12-30T10:00:00Z` → `"Last seen 30 Dec 2025"`.
  - `presenceLabel returns null for missing input` — `null`, `""`, `"nonsense"` → `null`.
  - `fetchChatPresence maps rows and makes no request for none` — fake client rows `[{conversation_id:"c1",last_seen_at:"t"}]` → `{c1:"t"}`; `[]` → `{}` with 0 calls; error → `{}`.
  - `touchPresence never throws` — client whose `rpc` rejects → resolves.
- [ ] **Step 2: Run** `node --test "shared/__tests__/*.test.js"` → Expected: FAIL (module missing).
- [ ] **Step 3: Implement** with `Intl.DateTimeFormat` and `timeZone: "Africa/Lagos"` (`en-GB`, `hour12: false`) for time and day comparison.
- [ ] **Step 4: Run** → Expected: PASS.
- [ ] **Step 5: Commit** `feat: shared presence rules`.

### Task 3: Shared edit rules

**Files:**
- Modify: `shared/messaging.js`
- Test: `shared/__tests__/messaging.test.js` (append; create if absent)

**Interfaces:**
- Produces:
  - `EDIT_WINDOW_MS = 3 * 60 * 1000`
  - `canEdit(message, userId: string, now?: Date) → boolean` — true only if `"edited_at" in message` (column exists), `message.sender_id === userId`, no `pending`, id not starting `temp-`, and `now − created_at < EDIT_WINDOW_MS` (and ≥ −60 s, tolerating small clock skew)
  - `editMessage(client, id: string, body: string) → Promise<message>` — `cleanMessage(body)`; throws `Error` with the RPC's message (friendlyError lets Ile-written sentences through)

- [ ] **Step 1: Write failing tests:**
  - `canEdit allows my message inside 3 minutes` — sent 2:59 ago → true; 3:01 ago → false; someone else's → false.
  - `canEdit refuses pending and temp messages` — `{pending:"sending"}` → false; id `temp-1` → false.
  - `canEdit is false before the edit column exists` — message without `edited_at` key → false.
  - `editMessage calls edit_message with trimmed text` — fake rpc records `["edit_message",{p_id:"m1",p_body:"hi"}]` for `"  hi "`.
  - `editMessage passes the window error through friendly` — rpc error message "You can only edit a message within 3 minutes of sending it." → `friendlyError(caught)` equals that sentence.
- [ ] **Step 2: Run** → Expected: FAIL.
- [ ] **Step 3: Implement** in `shared/messaging.js`.
- [ ] **Step 4: Run** → Expected: PASS.
- [ ] **Step 5: Commit** `feat: shared message edit rules`.

### Task 4: Presence on website and app

**Files:**
- Create: `src/lib/usePresence.js` (check-in hook + `useChatPresence(ids)`), `mobile/src/lib/presence.ts` (check-in hook + `useChatPresence`), `mobile/src/components/PresenceLine.tsx`, `mobile/src/components/__tests__/PresenceLine.test.tsx`
- Modify: `src/components/Navbar.jsx` (call check-in hook when signed in), `src/app/messages/[id]/page.jsx` (header line), `src/app/messages/page.jsx` (dots), `mobile/src/app/_layout.tsx` (check-in when signed in), `mobile/src/app/chat/[id].tsx` (header), `mobile/src/app/(tabs)/inbox.tsx` (dots)

**Interfaces:**
- Consumes: Task 2's `presenceLabel`, `touchPresence`, `fetchChatPresence`, `CHECK_IN_MS`.
- Produces: `PresenceLine({ lastSeenAt: string|null })` — renders nothing for null label; green "Online" or muted "Last seen …".
- Check-in: website runs while `document.visibilityState === "visible"` (interval `CHECK_IN_MS`, plus on `visibilitychange` to visible); app while `AppState` is `active` and `onlineManager.isOnline()`. `useChatPresence` refetches every `CHECK_IN_MS` while visible/active; app uses TanStack Query key `["chat-presence", ...ids]` (not persisted — add to the `shouldPersist` exclusions only if keys are persisted by default).

- [ ] **Step 1: Write failing test** `PresenceLine shows Online, Last seen, or nothing` — mock time; `lastSeenAt` now → text "Online"; 3 h ago same Lagos day → starts with "Last seen "; `null` → renders null.
- [ ] **Step 2: Run** `npx jest src/components/__tests__/PresenceLine.test.tsx` (from `mobile`) → Expected: FAIL (module missing).
- [ ] **Step 3: Implement** `PresenceLine`, the hooks, and the placements. Website header uses the same label with `text-palm` for Online, `text-ink-muted` otherwise; inbox dot is a 10 px palm circle with a surface-coloured ring at the avatar's bottom-right, `aria-label="Online"`.
- [ ] **Step 4: Run** the test → PASS; `npx tsc --noEmit` and lint clean (app), `npx eslint` clean (website).
- [ ] **Step 5: Commit** `feat: online status and last seen in chats`.

### Task 5: Edit sent messages on website and app

**Files:**
- Modify: `mobile/src/components/MessageBubble.tsx` (long-press → `onEdit`, "edited" label), `mobile/src/app/chat/[id].tsx` (editing state, composer bar, save via `editMessage`, re-render every 5 s while any own message is editable), `mobile/src/lib/chatMessages.ts` (`Message` gets `edited_at?: string | null`), `src/app/messages/[id]/page.jsx` (Edit button, editing bar, "edited" label, save)
- Test: `mobile/src/components/__tests__/MessageBubble.test.tsx` (append or create)

**Interfaces:**
- Consumes: Task 3's `canEdit`, `editMessage`, `EDIT_WINDOW_MS`.
- `MessageBubble` new props: `edited?: boolean`, `onEdit?: () => void` (parent passes `onEdit` only when `canEdit`). Long-press opens `Alert.alert` / action sheet with "Edit" and "Cancel".
- On save success, replace the row locally with the returned row; on error show `friendlyError(e)` and keep the text in the composer. Edit disabled offline.

- [ ] **Step 1: Write failing tests:**
  - `MessageBubble shows an edited label` — `edited` → texts include "edited".
  - `MessageBubble long-press offers Edit only when onEdit is given` — with `onEdit`, long-press triggers `Alert.alert` with a button "Edit" whose `onPress` calls `onEdit`; without it, long-press does nothing.
- [ ] **Step 2: Run** `npx jest src/components/__tests__/MessageBubble.test.tsx` → Expected: FAIL.
- [ ] **Step 3: Implement** the bubble, chat screen and website changes.
- [ ] **Step 4: Run** the test → PASS; app tsc + lint, website lint clean.
- [ ] **Step 5: Commit** `feat: edit a sent message within 3 minutes`.

### Task 6: Hand-off and full verification

- [ ] **Step 1:** `docs/presence-edit-setup.md` — run `supabase/presence_edit.sql` (after `account_deletion.sql`; re-run it if `account_deletion.sql` or `messaging_slots.sql` is ever re-run, since they redefine the guard), what people see, a two-account test.
- [ ] **Step 2:** Full gates: `node --test "shared/__tests__/*.test.js"`; website `npx eslint .` + `npx next build`; app `npx jest`, `npx tsc --noEmit`, `npx eslint .`, `npx expo export --platform android`. Expected: all pass, 0 lint errors.
- [ ] **Step 3: Commit** `docs: presence and message editing setup for the founder`.
