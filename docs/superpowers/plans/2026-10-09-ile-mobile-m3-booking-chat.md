# Ile Mobile — Milestone 3: Booking, Viewings, Chat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** In the app, home-seekers can book a viewing from a listing (an open slot, confirmed instantly, or a requested time), manage their viewings (accept or decline a new time, cancel), and everyone can chat in-app in real time, with chats and viewings readable offline and messages typed offline sent when the connection returns.

**Architecture:** Booking and messaging rules move from the website into `shared/viewings.js` and `shared/messaging.js` (client-first functions plus pure helpers, tested with `node --test`), and the website switches to them with no behaviour change. The app adds a booking sheet, the Viewings tab, the Inbox tab, and a chat screen built on TanStack Query and Supabase Realtime. A small persisted outbox queues messages typed offline. Push notifications are M5; this milestone is in-app only.

**Tech Stack:** Expo SDK 57, Expo Router, TanStack Query v5 (M2 setup), Supabase JS Realtime, AsyncStorage, jest-expo + react-test-renderer, Node `node --test`.

**Spec:** `docs/superpowers/specs/2026-10-09-ile-mobile-app-design.md` (build step 5; sections 2 and 4)

**Previous milestone:** `docs/superpowers/plans/2026-10-09-ile-mobile-m2-browse.md` (merged to `main` at 57338f2).

## Global Constraints

- Every M1 and M2 Global Constraint still applies: `shared/` is platform-free, client-first, with relative `.js` imports; `npx expo install` for native packages; public Supabase key only; theme tokens from `mobile/src/theme.ts`; commit trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; never stage `brag-output/`.
- No schema changes. The app uses the existing tables, RLS and RPCs exactly as the website does: `inspections` (insert = request, update = accept, decline or cancel), `listing_open_slots(p_listing, p_days = 14)`, `book_viewing_slot(p_listing, p_date, p_time)`, `start_conversation(p_listing, p_tenant)`, `conversations`, `messages`, `inbox_summary()`.
- Active viewing statuses: `ACTIVE_STATUSES = ["countered", "pending", "confirmed"]`. One active request per listing per home-seeker; the app shows the existing one instead of a second booking form.
- Dates: "today" is Nigeria's date (`Africa/Lagos`), the same as `shared/reviews.js`. Cancelling a confirmed viewing is allowed only before its date (`!viewingDateReached`).
- Message body: trimmed, 1–2000 characters. Server rate limits (20 per minute, 500 per day) show as an error and are not retried automatically.
- Copy matches the website. Booking: "Pick a viewing time", "Confirmed instantly. Free.", "None of these work? Request another time", "Request a viewing", "The lister will confirm or suggest another time.", "Viewings on Ile are free. Never pay an inspection fee to see a property." Viewings: "The lister suggested <date time>", "Accept new time", "Decline", "Cancel viewing", "No viewings booked yet". Chat: "· Seen" under your last read message.
- Website gate after every task that touches `shared/` or `src/`: `npm run test:shared`, `npm run lint` and `npm run build` pass. Mobile gate after every task: `npx jest`, `npx tsc --noEmit` and `npx expo lint` pass in `mobile/`.
- Listers: their Dashboard tab and responding to requests (confirm, suggest a time) arrive in M4. In M3 listers use Inbox and chat; the Book button is hidden on their own listings.

## Review Focus

- **The slot is taken between seeing it and tapping Book** (another person booked it): show the RPC's error and reload the open times; never show a false "booked" — pinned by Task 3's `bookSlot` error test plus the sheet reloading slots on error.
- **Message typed with no connection, app closed, reopened online:** it is sent exactly once, in order, and shows "Waiting for connection" until then; a server rejection (rate limit) stops retrying and shows "Not sent. Tap to retry." — pinned by Task 5 outbox tests.
- **App backgrounded while a chat is open, messages arrive meanwhile:** returning to the app shows them (Realtime may have dropped), and they are marked read — pinned by Task 6 refetching the thread when the app becomes active and on reconnect.
- **Conversation whose other person deleted their account, or whose listing was removed:** shows "Deleted user" or "Listing removed" rather than crashing — pinned by Task 1 `threadFrom` tests.
- **Accepting a countered time:** the viewing becomes confirmed at the lister's proposed date and time (preferred ← proposed), exactly like the website — pinned by Task 1 `acceptChanges` test.

---

### Task 1: Shared viewing and messaging rules (website switches to them)

**Files:**
- Create: `shared/viewings.js`, `shared/messaging.js`, `shared/__tests__/viewings.test.js`, `shared/__tests__/messaging.test.js`
- Modify: `src/components/SlotPicker.jsx` (use `groupSlotsByDay`, `bookSlot`), `src/components/BookingPanel.jsx` (use `fetchActiveViewing`, `fetchOpenSlots`, `requestViewing`, `ACTIVE_STATUSES`), `src/app/my-bookings/page.jsx` (use `fetchMyViewings`, `sortViewings`, `acceptChanges`, `viewingActions`), `src/lib/messaging.js` (bind `startConversation`, `fetchUnreadCount`), `src/app/messages/page.jsx` (use `loadThreads`, `shortTime`)

**Interfaces:**
- Produces (`shared/viewings.js`):
  - `ACTIVE_STATUSES`
  - `groupSlotsByDay(slots: {slot_date, slot_time}[]) -> { date, times: string[] }[]` (date order preserved)
  - `sortViewings(list) -> list` (countered, pending, confirmed first, in that order; then the rest, keeping the given order)
  - `viewingActions(inspection) -> { accept: boolean, decline: boolean, cancel: boolean, message: boolean }`: accept/decline when countered; cancel when pending, or confirmed and `!viewingDateReached`; message when active
  - `acceptChanges(inspection) -> { status: "confirmed", preferred_date, preferred_time }` from `proposed_*`
  - `fetchMyViewings(client, userId)` (same select as the website's My viewings), `fetchActiveViewing(client, listingId, userId)`, `fetchOpenSlots(client, listingId)` (`[]` on error), `bookSlot(client, listingId, date, time) -> id` (throws the RPC message), `requestViewing(client, listingId, userId, date, time | null) -> row` (throws "That time is already taken. Please choose another." on `23505`), `updateViewing(client, id, changes)`
- Produces (`shared/messaging.js`):
  - `MAX_MESSAGE = 2000`; `cleanMessage(text) -> string | null` (trimmed; null if empty or too long)
  - `startConversation(client, listingId, tenantId = null) -> id`
  - `fetchUnreadCount(client, userId) -> number` (same query as the website)
  - `threadFrom(convo, userId, people, summaryRow) -> { id, otherId, otherName, otherAvatar, role, listing, latest, unread }`, where `otherName` = "Deleted user" when the other id is null, else the person's name or "Lister"/"Home-seeker"; `listing` = null when removed
  - `loadThreads(client, userId) -> { threads, error }` (website's query plus `inbox_summary`, built with `threadFrom`; uses `fetchPeople` from `shared/people.js`)
  - `fetchThread(client, id) -> { convo, messages }`, `sendMessage(client, conversationId, senderId, body) -> row`, `markRead(client, ids)`
  - `shortTime(iso, now = new Date()) -> string` (moved unchanged from the website inbox: "now", "5m", "3h", weekday, "12 Oct"); `dayLabel(iso, now)` (moved from the chat page)

- [ ] **Step 1: Write failing tests**
  - `groupSlotsByDay groups times under their date in order` — `[{d1,"10:00"},{d1,"11:00"},{d2,"09:00"}]` → `[{date:d1,times:["10:00","11:00"]},{date:d2,times:["09:00"]}]`.
  - `sortViewings puts countered, then pending, then confirmed first` — statuses `[done, confirmed, countered, pending, cancelled]` → `[countered, pending, confirmed, done, cancelled]`.
  - `viewingActions offers accept and decline for a countered time`; `viewingActions lets you cancel a pending request`; `viewingActions blocks cancelling a confirmed viewing on or after its date` (preferred_date = today in Lagos → cancel false; tomorrow → true); `viewingActions offers nothing for a cancelled viewing`.
  - `acceptChanges moves the proposed time into the booking` — `{proposed_date:"2026-11-02", proposed_time:"14:00:00"}` → `{status:"confirmed", preferred_date:"2026-11-02", preferred_time:"14:00:00"}`.
  - `requestViewing explains a taken time` — fake client returns `{ error: { code: "23505" } }` → rejects with "That time is already taken. Please choose another.".
  - `bookSlot passes the RPC error message on` — fake rpc error `{ message: "That time was just taken" }` → rejects with that message.
  - `cleanMessage trims, and rejects empty or over-long text` — `"  hi "` → `"hi"`; `"   "` → null; 2001 chars → null.
  - `threadFrom names a deleted other person` — convo `{tenant_id:"me", landlord_id:null, listings:null}` → `otherName "Deleted user"`, `listing null`, `role "Lister"`.
  - `threadFrom uses the summary row for latest message and unread count`.
  - `shortTime formats minutes, hours and days` — fixed `now`, inputs 30 s, 5 min, 3 h ago → `"now"`, `"5m"`, `"3h"`.

- [ ] **Step 2: Run** `npm run test:shared` — Expected: new tests FAIL (modules missing).
- [ ] **Step 3: Implement** both modules by moving the website's code (same queries and select strings), then switch the five website files to them.
- [ ] **Step 4: Run** the website gate — Expected: all pass. Smoke on `npm run dev`: a listing page's booking panel, `/my-bookings`, `/messages` and a chat render as before.
- [ ] **Step 5: Commit** `refactor(shared): viewing and messaging rules shared by web and app`

---

### Task 2: Listing screen actions (Book a viewing, Message lister)

**Files:**
- Create: `mobile/src/components/ListingActions.tsx`, `mobile/src/lib/messagingApp.ts`
- Modify: `mobile/src/app/listing/[id].tsx` (sticky bottom bar), `mobile/src/app/_layout.tsx` (register `book/[id]` as `formSheet`, `chat/[id]`)

**Interfaces:**
- Consumes: `startConversation` (Task 1), `useSession` (M1), `listingState` (M2).
- Produces (`messagingApp.ts`): `openChat(listingId: string, tenantId?: string) -> Promise<void>` (start or get the conversation, then `router.push("/chat/<id>")`; throws the error message).
- Produces (`ListingActions.tsx`): `<ListingActions listing />` sticky bar with "Book a viewing" (→ `/book/<id>`) and "Message" (→ `openChat`). Logged out → both open `/login`. Hidden when the user is the lister (`listing.landlord_id === user.id`) or the listing state isn't "available". Offline → buttons disabled with "Booking and messages need a connection."

- [ ] **Step 1: Write failing test** `mobile/src/components/__tests__/ListingActions.test.tsx` (react-test-renderer; mock `@/lib/useSession` and `expo-router`):
  - `shows Book and Message for a home-seeker on an available listing`
  - `hides the bar on the lister's own listing`
  - `sends logged-out people to log in` — pressing Book calls `router.push("/login")`.
- [ ] **Step 2: Run** the test — Expected: FAIL (module missing).
- [ ] **Step 3: Implement** the component and `openChat`; add the bar to the listing screen; register the routes (stub `book/[id].tsx` and `chat/[id].tsx` so typed routes compile; Tasks 3 and 6 replace them).
- [ ] **Step 4: Run** the mobile gate — Expected: pass.
- [ ] **Step 5: Commit** `feat(mobile): book and message buttons on the listing screen`

---

### Task 3: Booking sheet

**Files:**
- Create: `mobile/src/app/book/[id].tsx`, `mobile/src/components/SlotPicker.tsx`, `mobile/src/components/RequestTime.tsx`, `mobile/src/lib/requestTimes.ts`, `mobile/src/lib/__tests__/requestTimes.test.ts`

**Interfaces:**
- Consumes: `fetchActiveViewing`, `fetchOpenSlots`, `bookSlot`, `requestViewing`, `groupSlotsByDay` (Task 1); `formatDateTime`, `formatTime` (`shared/format.js`).
- Produces (`requestTimes.ts`): `requestDays(today: string, count = 21) -> string[]` (YYYY-MM-DD from today in Lagos, inclusive); `REQUEST_TIMES` = `"08:00"`…`"18:00"` hourly plus `""` meaning "Any time".
- Sheet states: loading; existing active viewing → status, date and the website's status line, button "Go to My viewings" (→ Viewings tab); open slots → `SlotPicker` (day chips, time chips in 3 columns, button "Book <date time>"; on error shows the message and reloads slots); "None of these work? Request another time" → `RequestTime` (day chips, time chips, "Request viewing"); no slots → `RequestTime` directly. Success → the existing-viewing state, and invalidate the `["viewings"]` query.

- [ ] **Step 1: Write failing tests**
  - `requestDays starts today and covers three weeks` — `requestDays("2026-10-30")` → length 21, first `"2026-10-30"`, crosses into November correctly (`"2026-11-01"` present).
  - `REQUEST_TIMES offers any time plus hourly 8am to 6pm` — first `""`, contains `"08:00"` and `"18:00"`, length 12.
- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: Implement** helpers, components and the sheet.
- [ ] **Step 4: Run** the mobile gate; phone check: book an open slot on a listing that has viewing times; request a time on one that doesn't; reopen the sheet (shows your viewing).
- [ ] **Step 5: Commit** `feat(mobile): book a viewing from the app`

---

### Task 4: Viewings tab (home-seekers)

**Files:**
- Modify: `mobile/src/app/(tabs)/viewings.tsx` (home-seekers get the list; listers keep the M1 placeholder until M4)
- Create: `mobile/src/components/ViewingCard.tsx`, `mobile/src/components/StatusBadge.tsx`
- Modify: `mobile/src/lib/queryClient.ts` (persist `["viewings", userId]`), its test

**Interfaces:**
- Consumes: `fetchMyViewings`, `sortViewings`, `viewingActions`, `acceptChanges`, `updateViewing` (Task 1); `openChat` (Task 2); `STATUS_LABELS` (`shared/property.js`).
- Screen: "My viewings" title; logged out → "Log in to see your viewings" with a Log in button; list of `ViewingCard`s (photo, title, place, status badge, date and time; countered → gold box "The lister suggested …", lister note, "Accept new time" / "Decline"; "Message"; "Cancel viewing" / "Cancel request" with a confirm `Alert`); pull to refresh; empty "No viewings booked yet" + "Find a place to view". Actions disabled offline.
- `shouldPersist` also keeps a successful `["viewings", userId]` query.

- [ ] **Step 1: Write failing test** (`queryClient.test.ts`): `shouldPersist keeps the viewings list` — `["viewings","u1"]` success → true.
- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: Implement** the persist rule, components and screen.
- [ ] **Step 4: Run** the mobile gate; phone check: accept and decline a countered time (counter it from the website's lister viewings page), cancel a pending request.
- [ ] **Step 5: Commit** `feat(mobile): viewings tab for home-seekers`

---

### Task 5: Offline outbox

**Files:**
- Create: `mobile/src/lib/outbox.ts`, `mobile/src/lib/__tests__/outbox.test.ts`

**Interfaces:**
- Produces: `createOutbox({ storage, send }) -> { items(conversationId): OutboxItem[]; add(conversationId, body): Promise<OutboxItem>; flush(): Promise<void>; retry(localId): Promise<void>; subscribe(fn): () => void }`, where `OutboxItem = { localId, conversationId, body, createdAt, state: "waiting" | "sending" | "failed" }`, `storage = { read(): Promise<OutboxItem[]>; write(items): Promise<void> }` and `send(item) -> Promise<row>` (throws `{ retryable: boolean }`). `flush` sends waiting items oldest first, one at a time; on success the item is removed; on a network error (`retryable: true`) it stays "waiting" and flushing stops; on a server rejection it becomes "failed" and flushing continues. An app-wide instance (`mobile/src/lib/outboxApp.ts`) persists to AsyncStorage key `"ile:outbox"`, sends via `sendMessage`, and flushes on start-up, on reconnect (`onlineManager`) and when the app becomes active.

- [ ] **Step 1: Write failing tests**
  - `items survive a restart` — add, then a new outbox on the same storage lists the item.
  - `flush sends oldest first and removes sent items`.
  - `a network failure keeps the message waiting and stops flushing` — first send throws `{ retryable: true }` → both items still waiting, second not attempted.
  - `a server rejection marks the message failed and moves on` — first throws `{ retryable: false }` → first "failed", second sent.
  - `flush does not send the same message twice when called again mid-send` — two concurrent `flush()` calls → `send` called once per item.
- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: Implement** `outbox.ts` and `outboxApp.ts`.
- [ ] **Step 4: Run** the mobile gate.
- [ ] **Step 5: Commit** `feat(mobile): messages typed offline are sent when back online`

---

### Task 6: Inbox and chat

**Files:**
- Modify: `mobile/src/app/(tabs)/inbox.tsx`, `mobile/src/app/(tabs)/_layout.tsx` (unread badge on Inbox)
- Create: `mobile/src/app/chat/[id].tsx`, `mobile/src/components/MessageBubble.tsx`, `mobile/src/lib/unread.ts`, `mobile/src/lib/chatMessages.ts`, `mobile/src/lib/__tests__/chatMessages.test.ts`
- Modify: `mobile/src/lib/queryClient.ts` (persist `["inbox", userId]` and `["chat", id]` for the 10 most recent threads), its test

**Interfaces:**
- Consumes: `loadThreads`, `fetchThread`, `markRead`, `fetchUnreadCount`, `cleanMessage`, `shortTime`, `dayLabel` (Task 1); outbox (Task 5); `setPersistScope` (M2).
- Produces (`chatMessages.ts`): `mergeMessages(server: Message[], pending: OutboxItem[]) -> Row[]` (server rows by `created_at`, de-duplicated by id, then pending items as "waiting"/"failed" rows); `withDayBreaks(rows, now) -> (Row | { day: string })[]` (a day label before the first message of each day); `lastSeenId(rows, userId) -> id | null` (your newest message that has `read_at`).
- Produces (`unread.ts`): `useUnreadCount(): number` (one query, one Realtime channel on `messages`, refreshed on reconnect and app active; 0 when logged out).
- Inbox: "Messages" title; logged out → log in prompt; thread rows (avatar, name, role, listing title, latest message, `shortTime`, unread badge, bold when unread); Realtime on `messages` refreshes the list; empty "No messages yet. Message a lister from any listing."
- Chat: header with avatar, name, role and the listing (tap → listing, or "Listing removed"); messages with day breaks, "· Seen" under `lastSeenId`, pending rows show "Waiting for connection" or "Not sent. Tap to retry."; composer (multiline, max 2000, Send disabled when `cleanMessage` is null); sending always goes through the outbox (instant flush when online); Realtime INSERT/UPDATE for this conversation; marks the other person's messages read while open; refetches on app active and reconnect; `KeyboardAvoidingView` via `keyboardBehavior`.
- `setPersistScope` gains `chatIds` (top 10 inbox thread ids); `shouldPersist` keeps `["inbox", userId]` and `["chat", id]` for ids in scope.

- [ ] **Step 1: Write failing tests**
  - `mergeMessages orders by time, drops duplicates, and appends pending` — server `[m2(10:01), m1(10:00), m1]` + pending `[p1]` → `[m1, m2, p1(waiting)]`.
  - `withDayBreaks adds a label before each new day` — messages on two days → `[{day}, m, m, {day}, m]`.
  - `lastSeenId picks your newest read message` — mine read at 10:00, mine unread at 10:05, theirs → id of the 10:00 one.
  - (`queryClient.test.ts`) `shouldPersist keeps the inbox and recent chats only` — `["inbox","u1"]` → true; `["chat","c1"]` with `chatIds` containing `c1` → true; `["chat","old"]` → false.
- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: Implement** helpers, unread store, Inbox, chat screen, badge and persist rules.
- [ ] **Step 4: Run** the full verification (website gate + mobile gate + `npx expo export --platform android`). Phone check: chat with yourself from a second account on the website; messages arrive live both ways; "Seen" appears; airplane mode → send → "Waiting for connection" → back online → sent once; kill the app offline and reopen online → sent.
- [ ] **Step 5: Commit** `feat(mobile): inbox and real-time chat`
