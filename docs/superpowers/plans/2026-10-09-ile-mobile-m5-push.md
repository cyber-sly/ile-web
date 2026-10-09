# Ile Mobile — Milestone 5: Push Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** People get a push notification on their phone for new messages, viewing requests and bookings, status changes (confirmed, new time suggested, declined, cancelled) and new reviews, plus a daily "viewing tomorrow" reminder and a day-30 "still available?" nudge for listers; tapping one opens the right screen; each person controls which kinds they get.

**Architecture:** The database decides *what* to notify: triggers on `messages`, `inspections` and `reviews` insert rows into a new `notifications` table (with collapsing for chat bursts), and daily `pg_cron` jobs add reminders. A Supabase Edge Function `send-push`, called by `pg_net` right after each insert and swept every minute by cron, sends pending rows to the Expo Push API (FCM for Android, APNs for iOS), respects `notification_prefs`, and deletes tokens Expo reports as invalid. The app registers an Expo push token per device into `push_tokens`, removes it at logout, and routes notification taps. The message-building rules are pure JS in `shared/notifications.js`, tested with `node --test`; the Edge Function uses a byte-identical copy in `supabase/functions/_shared/` (a test keeps them identical).

**Tech Stack:** Supabase Postgres (triggers, RLS, `pg_cron`, `pg_net`, Vault), Supabase Edge Functions (Deno) + Supabase CLI, Expo Push API, `expo-notifications`, `expo-device`, EAS Build (development build: Expo Go cannot receive push on Android since SDK 53), Firebase Cloud Messaging (Android).

**Spec:** `docs/superpowers/specs/2026-10-09-ile-mobile-app-design.md` (build step 7; section 3)

**Previous milestone:** `docs/superpowers/plans/2026-10-09-ile-mobile-m4-lister-tools.md` (merged to `main` at e3c5c5d).

## Global Constraints

- Every M1–M4 Global Constraint still applies (platform-free `shared/`, `npx expo install`, anon key only in the app, theme tokens, `friendlyError` for every shown error, commit trailer, never stage `brag-output/`).
- New schema ships as `supabase/push_notifications.sql`, safe to re-run; the founder runs it. The service role key is never in the app or the repo: the Edge Function gets it from Supabase's built-in env; the database calls the function with a random `PUSH_SECRET` stored in Vault (`vault.secrets`, name `push_secret`) and in the function's secrets.
- Tables: `push_tokens (token text primary key, user_id uuid → auth.users on delete cascade, platform text check in ('android','ios'), updated_at timestamptz)`; `notifications (id uuid pk, user_id uuid → auth.users on delete cascade, type text, title text, body text, data jsonb, read_at timestamptz, sent_at timestamptz, created_at timestamptz default now())`; `notification_prefs (user_id uuid pk → auth.users on delete cascade, messages bool default true, bookings bool default true, reminders bool default true, hide_message_text bool default false, updated_at)`. RLS on all three: each user reads/writes only their own rows; `notifications` rows are created only by security-definer triggers and the function (no client insert).
- Notification types and categories: `message` → messages; `viewing_request`, `viewing_booked`, `viewing_confirmed`, `viewing_countered`, `viewing_declined`, `viewing_cancelled`, `review` → bookings; `viewing_reminder`, `still_available` → reminders.
- Copy (exact):
  - message: title `"<First name>"`, body = message text (first 120 characters) or `"Sent you a message"` when the recipient hides message text.
  - viewing_request: `"New viewing request"` / `"<First name> wants to view <listing title> on <date time>."`
  - viewing_booked: `"Viewing booked"` / `"<First name> booked <listing title> for <date time>."`
  - viewing_confirmed: `"Viewing confirmed"` / `"<listing title>, <date time>. See you there."`
  - viewing_countered: `"New time suggested"` / `"The lister suggested <date time> for <listing title>."`
  - viewing_declined: `"Viewing request declined"` / `"<listing title>: the lister can't do that time."` (home-seeker) — when a lister declines a confirmed viewing: `viewing_cancelled` `"Viewing cancelled"` / `"<listing title>, <date time> was cancelled."`
  - viewing_cancelled (home-seeker cancels): to the lister `"Viewing cancelled"` / `"<First name> cancelled <listing title>, <date time>."`
  - review: `"New review"` / `"You got a <n>-star review."`
  - viewing_reminder (both parties, 08:00 Lagos the day before): `"Viewing tomorrow"` / `"<listing title> at <time>."`
  - still_available (lister, day 30 since confirming): `"Is it still available?"` / `"Confirm <listing title> so it stays in search."`
- Collapse: no new `message` notification for the same recipient and conversation while an earlier one from the last 5 minutes is still unread (`read_at is null`); the conversation's messages being read (recipient opens the chat) sets `read_at` on its `message` notifications.
- Deep links (`data`): message → `{ route: "chat", id: conversation_id }`; viewing types and reminders → `{ route: "viewings" }` for home-seekers, `{ route: "dashboard" }` for listers; review → `{ route: "account" }`; still_available → `{ route: "dashboard" }`.
- Android channel `default`, importance high; iOS shows banners in the foreground too.
- The app asks for notification permission only after the person taps "Turn on notifications" on an explainer card (never on first launch).

## Review Focus

- **A burst of 10 chat messages:** the recipient gets one push, not ten, until they read the chat — pinned by Task 2's collapse test (SQL test harness) and Task 1's message-building tests.
- **A phone that uninstalled the app or switched accounts:** Expo's `DeviceNotRegistered` deletes the token; logging out deletes this device's token so the next person on the phone doesn't get the previous account's pushes — pinned by Task 1 `invalidTokens` test and Task 4 logout test.
- **Someone turned off message notifications or hides message text:** no push for messages, or a push without the text, while bookings still arrive — pinned by Task 1 `buildMessages` pref tests.
- **The send-push function called by anyone on the internet:** it rejects requests without the secret and never leaks rows — pinned by Task 3's auth check test.
- **Function or Expo outage:** rows stay `sent_at is null` and the every-minute sweep sends them later; a row is sent at most once (`sent_at` claimed atomically with `update … where sent_at is null returning`) — pinned by Task 3 claim query review and test of the batching helper.

---

### Task 1: Shared notification rules (and the Edge Function copy)

**Files:**
- Create: `shared/notifications.js`, `shared/__tests__/notifications.test.js`, `supabase/functions/_shared/notifications.js` (identical copy)
- Modify: `package.json` (`test:shared` also runs nothing new; the copy test lives in `shared/__tests__`)

**Interfaces (Produces):**
- `CATEGORY_BY_TYPE` (per Global Constraints); `categoryOf(type) -> "messages" | "bookings" | "reminders"`
- `buildMessages(rows, tokensByUser, prefsByUser) -> { messages: ExpoMessage[], skipped: string[] }` — one Expo message per (row, token): `{ to, title, body, data: { ...row.data, notificationId: row.id }, sound: "default", channelId: "default", priority: "high" }`; rows whose category is off in prefs are skipped (ids in `skipped`); message rows for users with `hide_message_text` get body `"Sent you a message"`; users without prefs get defaults (all on, text shown); users without tokens are skipped.
- `chunk(list, size = 100) -> list[]` (Expo accepts up to 100 per request)
- `invalidTokens(messages, tickets) -> string[]` — tokens whose ticket is `{ status: "error", details: { error: "DeviceNotRegistered" } }`
- `notificationRoute(data, isLister) -> string` — `"/chat/<id>"`, `"/viewings"`, `"/account"`; unknown → `"/"`

- [ ] **Step 1: Write failing tests** (`notifications.test.js`)
  - `categoryOf maps every type`.
  - `buildMessages sends one push per device`.
  - `buildMessages skips categories the person turned off` (messages off → message row skipped, booking row sent).
  - `buildMessages hides message text when asked`.
  - `buildMessages skips people with no devices`.
  - `chunk splits into groups of 100` (250 → [100, 100, 50]).
  - `invalidTokens finds devices Expo no longer knows`.
  - `notificationRoute opens the chat, viewings or dashboard` (listers' viewing pushes → `/viewings` tab, which shows their Dashboard).
  - `the Edge Function copy matches shared/notifications.js` (byte-for-byte compare of the two files).
- [ ] **Step 2: Run** `npm run test:shared` — Expected: FAIL.
- [ ] **Step 3: Implement** `shared/notifications.js`; copy it to `supabase/functions/_shared/notifications.js`.
- [ ] **Step 4: Run** `npm run test:shared` — Expected: PASS.
- [ ] **Step 5: Commit** `feat(shared): push notification rules`

---

### Task 2: Database — tables, triggers, collapsing, schedules

**Files:**
- Create: `supabase/push_notifications.sql`, `shared/__tests__/push_sql.test.js` (static checks)

**Interfaces (Produces):** the three tables and RLS from the Global Constraints; `public.ile_notify(p_user uuid, p_type text, p_title text, p_body text, p_data jsonb)` (security definer, `search_path = public`, no client execute) that inserts a row and then calls `net.http_post` to the function URL with header `x-push-secret` from Vault (wrapped so a failed call never fails the original insert); triggers: `notify_message` (after insert on `messages`, collapsing rule), `mark_message_notifications_read` (after update of `read_at` on `messages`), `notify_inspection` (after insert or update of `status` on `inspections`, copy per Global Constraints, lister = `listings.landlord_id`), `notify_review` (after insert on `reviews`); `pg_cron` jobs `ile-viewing-reminders` (`0 7 * * *` UTC = 08:00 Lagos), `ile-still-available` (`0 8 * * *` UTC), `ile-push-sweep` (`* * * * *`, calls the function for any pending rows). The function URL is `https://<project-ref>.supabase.co/functions/v1/send-push`, read from Vault secret `push_function_url` so no project id is hard-coded.

- [ ] **Step 1: Write failing static tests** (`push_sql.test.js`, reads the SQL file):
  - `push tables have row level security` (each of the three `enable row level security`).
  - `notifications cannot be inserted by app users` (no insert policy for `notifications`; `revoke insert` present).
  - `every security definer function sets search_path`.
  - `message notifications collapse within five minutes` (the `notify_message` body contains `interval '5 minutes'` and `read_at is null`).
  - `the function secret comes from Vault` (contains `vault.decrypted_secrets` and no `eyJ` JWT-looking string).
  - `schedules are idempotent` (each `cron.schedule` preceded by `cron.unschedule` guarded by existence).
- [ ] **Step 2: Run** `npm run test:shared` — Expected: FAIL (file missing).
- [ ] **Step 3: Write** `supabase/push_notifications.sql` (header: run after enabling the `pg_cron` and `pg_net` extensions and adding the two Vault secrets — steps in `docs/push-setup.md`, Task 6).
- [ ] **Step 4: Run** `npm run test:shared` — Expected: PASS.
- [ ] **Step 5: Commit** `feat(db): notifications tables, triggers and schedules`

---

### Task 3: Edge Function `send-push`

**Files:**
- Create: `supabase/functions/send-push/index.ts`, `supabase/functions/send-push/handler.js`, `shared/__tests__/send_push.test.js`, `supabase/config.toml` (`[functions.send-push] verify_jwt = false` — the function checks its own secret)

**Interfaces:**
- `handler.js` (plain JS so Node can test it): `export async function handle(request, deps) -> Response` where `deps = { secret, db, fetchImpl }` and `db` offers `claimPending(limit) -> rows` (`update notifications set sent_at = now() where id in (select id … where sent_at is null order by created_at limit $1 for update skip locked) returning *`), `tokensFor(userIds)`, `prefsFor(userIds)`, `deleteTokens(tokens)`, `unclaim(ids)` (sets `sent_at = null` when Expo is unreachable). Steps: reject with 401 unless `x-push-secret` equals `secret`; claim up to 500 rows; `buildMessages`; send in chunks of 100 to `https://exp.host/--/api/v2/push/send`; delete `invalidTokens`; on network failure unclaim; respond `{ sent, skipped }`.
- `index.ts`: Deno entry wiring `deps` to Supabase (service role client from `Deno.env`) and `PUSH_SECRET`.

- [ ] **Step 1: Write failing tests** (`send_push.test.js`, fake `db` and `fetchImpl`):
  - `rejects requests without the secret` (401, `claimPending` never called).
  - `sends pending notifications in batches and reports counts`.
  - `deletes devices Expo says are gone`.
  - `puts notifications back when Expo can't be reached` (`fetchImpl` throws → `unclaim` called with the ids).
- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: Implement** `handler.js`, `index.ts`, `config.toml`.
- [ ] **Step 4: Run** `npm run test:shared` — Expected: PASS.
- [ ] **Step 5: Commit** `feat(push): send-push edge function`

---

### Task 4: App — permission, device token, taps

**Files:**
- Install: `npx expo install expo-notifications expo-device`
- Modify: `mobile/app.json` (`expo-notifications` plugin with `color: "#14583B"`; `android.googleServicesFile: "./google-services.json"` — the file itself is the founder's, gitignored), `mobile/.gitignore` (`google-services.json`, `GoogleService-Info.plist`), `mobile/src/lib/useSession.tsx` (register/unregister on account change), `mobile/src/app/_layout.tsx` (tap listener)
- Create: `mobile/src/lib/push.ts`, `mobile/src/lib/pushTokens.ts`, `mobile/src/lib/__tests__/pushTokens.test.ts`, `mobile/src/components/NotificationsCard.tsx`
- Modify: `mobile/src/app/(tabs)/inbox.tsx`, `mobile/src/components/dashboard/Dashboard.tsx`, `mobile/src/components/MyViewings.tsx` (show `NotificationsCard` until permission is decided)

**Interfaces:**
- `pushTokens.ts` (testable, client injected): `saveToken(client, userId, token, platform)` (upsert on `token`, sets `user_id`, `updated_at`); `removeToken(client, token)`.
- `push.ts`: `getPermission() -> "granted" | "denied" | "undetermined"`; `enablePush() -> Promise<"granted" | "denied" | "unsupported">` (requests permission, creates the Android channel, gets the Expo token with `projectId` from `Constants.expoConfig.extra.eas.projectId`, saves it); `syncPush(userId | null)` (on login: if granted, refresh and save the token; on logout or account change: remove this device's token first); `usePushTaps()` (on tap: `markRead` the notification id, then `router.push(notificationRoute(data, isLister(user)))`; also handles the notification that opened the app); foreground handler shows banner + sound.
- `NotificationsCard`: "Get notified about messages and viewings" + "Turn on notifications"; hidden when granted, when denied shows "Notifications are off. Turn them on in your phone's Settings."; hidden on simulators/Expo Go where push is unsupported.

- [ ] **Step 1: Write failing tests** (`pushTokens.test.ts`, fake client): `saveToken upserts this device for the user`; `removeToken deletes only this device`.
- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: Implement**; install packages; config changes.
- [ ] **Step 4: Run** the mobile gate and `npx expo-doctor`.
- [ ] **Step 5: Commit** `feat(mobile): push notification permission, tokens and taps`

---

### Task 5: Notification settings

**Files:**
- Create: `mobile/src/app/notifications.tsx`, `mobile/src/lib/notificationPrefs.ts`, `mobile/src/lib/__tests__/notificationPrefs.test.ts`
- Modify: `mobile/src/app/(tabs)/account.tsx` (a "Notifications" row → `/notifications`), `mobile/src/app/_layout.tsx` (register)

**Interfaces:**
- `notificationPrefs.ts`: `DEFAULT_PREFS = { messages: true, bookings: true, reminders: true, hide_message_text: false }`; `fetchPrefs(client, userId) -> prefs` (defaults when no row); `savePrefs(client, userId, prefs)` (upsert).
- Screen: four switches — "Messages", "Viewings and bookings", "Reminders", "Hide message text on lock screen" — saved on change (optimistic, reverts with a `friendlyError` message on failure); the `NotificationsCard` at the top when permission isn't granted.

- [ ] **Step 1: Write failing tests**: `fetchPrefs returns defaults when there is no row`; `savePrefs upserts the person's row`.
- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the mobile gate.
- [ ] **Step 5: Commit** `feat(mobile): notification settings`

---

### Task 6: Build and setup guide

**Files:**
- Create: `mobile/eas.json` (profiles `development` — dev client, internal distribution, Android APK; `preview` — internal APK; `production`), `docs/push-setup.md`
- Modify: `mobile/package.json` (`expo-dev-client` via `npx expo install expo-dev-client`)

**Interfaces:** `docs/push-setup.md` written for the founder, numbered, plain language: (1) enable `pg_cron` and `pg_net` in Supabase → Database → Extensions; (2) create a Firebase project, add an Android app with package `ng.ile.app` (or the confirmed id), download `google-services.json` into `mobile/`; (3) create an FCM V1 service-account key and upload it with `npx eas-cli credentials` (Android → Push notifications); (4) generate a secret, `npx supabase login`, `npx supabase link --project-ref <ref>`, `npx supabase secrets set PUSH_SECRET=<secret>`, `npx supabase functions deploy send-push`; (5) add Vault secrets `push_secret` and `push_function_url` (SQL snippet); (6) run `supabase/push_notifications.sql`; (7) `npx eas-cli build --profile development --platform android`, install the APK, `npx expo start --dev-client`; (8) test checklist. iOS section: needs the Apple Developer account; EAS creates the APNs key automatically during the first iOS build.

- [ ] **Step 1: Write failing test** (`mobile/src/lib/__tests__/easConfig.test.ts`): `eas.json has a development build profile with the dev client` (reads the file: `build.development.developmentClient === true`, `build.development.distribution === "internal"`).
- [ ] **Step 2: Run** — Expected: FAIL (file missing).
- [ ] **Step 3: Write** `eas.json`, install `expo-dev-client`, write the guide.
- [ ] **Step 4: Run** the full verification (website gate, mobile gate, `npx expo export --platform android`, `npx expo-doctor`).
- [ ] **Step 5: Commit** `docs: push setup guide and development build profile`
