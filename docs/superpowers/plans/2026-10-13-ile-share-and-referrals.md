# Share Cards, Invite Codes and Earned Boosts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Listers can share listings as tracked links and Status/Stories image cards, every account has an invite code, invites earn boost days, and boost days put listings first.

**Architecture:** Supabase holds the truth: invite codes, who-invited-whom, a boost-day ledger, share visits, and an hourly reward job, all behind security-definer RPCs (clients never write rewards). `shared/referrals.js` holds the pure rules and the RPC wrappers used by both the Next.js website and the Expo app. The website renders the 1080×1920 card with `next/og` `ImageResponse`.

**Tech Stack:** Next.js 16 / React 19 / Tailwind v4 (website), Expo SDK 57 + Expo Router + TanStack Query (app), Supabase (Postgres, RLS, pg_cron), `qrcode` (new website dependency), `expo-sharing` (new app dependency, only used when the native module exists).

**Spec:** `docs/superpowers/specs/2026-10-13-ile-share-and-referrals-design.md`

## Global Constraints

- Invite code: up to 6 letters A–Z from the first name, uppercased, + 1–3 digits; `ILE` when the name has no A–Z letters; unique; matched case-insensitively ignoring spaces.
- Rewards: +7 days per invited lister (invitee email confirmed + a listing active ≥ 3 days with no `actioned` report), once per invitee; +3 days per batch of 5 invited seekers (email confirmed, not counted as listers); ≤ 30 earned days per calendar month (Africa/Lagos), excess not granted or carried; > 10 confirmed invitees within 1 hour for one inviter → new rewards `held`.
- `spend_boost_days`: own active listing only; days 1–30 and ≤ balance; extends `boosted_until` from max(now, current).
- Ref memory on the website: 30 days, first code wins until it expires.
- Copy (exact):
  - Invite: `List your property on Ile for free. Serious home-seekers book viewings straight from your listing. Sign up with my code {CODE}: {site}/signup?role=landlord&ref={CODE}`
  - Share link: `{title} · {price}{suffix} · {place}\n{site}/listings/{id}?ref={CODE}` (no `?ref=` when logged out)
  - Unknown code: `We couldn't find that invite code, so it wasn't added.`
  - Reward push title: `You earned {N} boost days 🎉`
  - Card footer: `Use code {CODE} on Ile`
  - Dashboard: `Your shares: {views} views · {bookings} bookings · {joined} joined with your code · {balance} boost days left`
  - Offline image: `Connect to make the image`
- Every user-facing error goes through `friendlyError` (shared/errors.js). Visit/booking tracking failures are silent.
- Only the anon key in clients; rewards only written inside the database.
- Each schema change ships as a SQL file the founder runs; app/website code must tolerate the SQL not being run yet (RPC missing → hide the feature, no crash).

## Review Focus

- **SQL not run yet:** the website and app call RPCs that don't exist yet → share link still works, invite/boost cards hidden, no error screen. Pinned in Task 2 (`fetchReferralSummary returns null when the function is missing`).
- **Expired boost:** a listing whose `boosted_until` is in the past must not show the badge or sort first. Pinned in Task 3 (`isBoosted is false for a past date`) plus the 5-minute expiry job in Task 2.
- **Codes typed by hand:** `" tunde7 "`, `"Tunde7"` must match `TUNDE7`; `"TUNDE-7"`/empty → treated as no code. Pinned in Task 1 (`normalizeCode`).
- **Logged-out sharer:** share link has no `?ref=` and the card says no code line. Pinned in Task 1 (`shareMessage without a code`) and Task 5 (card renders without `ref`).
- **Old dev app without expo-sharing:** "Post to Status / Stories" must be hidden, not crash. Pinned in Task 7 (`image option hidden when the sharing module is missing`).

---

### Task 1: Shared referral rules

**Files:**
- Create: `shared/referrals.js`, `shared/__tests__/referrals.test.js`
- Modify: `shared/property.js` (add `isBoosted`), `shared/__tests__/property.test.js`

**Interfaces:**
- Produces:
  - `normalizeCode(input: string|null|undefined) -> string|null` — trims, removes spaces, uppercases; null unless `/^[A-Z]{1,6}\d{1,3}$/`.
  - `shareMessage({ listing, site, code }) -> string` — exact copy above; uses `priceParts` (full suffix) and `placeLabel`.
  - `inviteMessage({ site, code }) -> string` — exact copy above.
  - `shareUrl({ site, listingId, code }) -> string`, `cardUrl({ site, listingId, code }) -> string` (`{site}/share/listing/{id}/card[?ref=CODE]`).
  - `rememberRef(storage, code, now = Date.now()) -> void` and `readRef(storage, now = Date.now()) -> string|null` — storage is `{ getItem, setItem, removeItem }`; key `ile:ref`; value `{ code, at }`; 30-day expiry; an unexpired stored code is never replaced.
  - `seekerProgress(count: number) -> { batches: number, toNext: number }` — batches of 5 (`toNext` 1–5).
  - In `shared/property.js`: `isBoosted(listing, now = Date.now()) -> boolean` — `boosted_until` parsed and `> now`.

- [ ] **Step 1: Write the failing tests** in `shared/__tests__/referrals.test.js`:
  - `normalizeCode` — `" tunde7 "`→`"TUNDE7"`, `"Tunde 7"`→`"TUNDE7"`, `"TUNDE-7"`→`null`, `""`→`null`, `"ABCDEFG1"`→`null`.
  - `shareMessage with a code` — listing `{ id:"l1", title:"2-bed flat", price:350000, listing_type:"rent", lga:"Ikeja", state:"Lagos" }`, site `https://ile.test`, code `TUNDE7` → `"2-bed flat · ₦350,000/year · Ikeja, Lagos\nhttps://ile.test/listings/l1?ref=TUNDE7"` (adjust only the place text to whatever `placeLabel` returns for that listing).
  - `shareMessage without a code` — same listing, `code: null` → ends with `/listings/l1` (no `?ref`).
  - `inviteMessage` — equals the exact invite copy with `TUNDE7` and `https://ile.test`.
  - `rememberRef keeps the first code for 30 days` — remember `AAA1` at t0, remember `BBB2` at t0+1 day → `readRef` = `AAA1`; at t0+31 days `readRef` = null and remembering `BBB2` then stores it.
  - `seekerProgress` — 0→`{batches:0,toNext:5}`, 7→`{batches:1,toNext:3}`, 10→`{batches:2,toNext:5}`.
  - In `property.test.js`: `isBoosted is false for a past date` / true for a future date / false when missing.
- [ ] **Step 2: Run** `node --test "shared/__tests__/*.test.js"` — Expected: FAIL (module/functions missing).
- [ ] **Step 3: Implement** the functions above.
- [ ] **Step 4: Run** the same command — Expected: all pass.
- [ ] **Step 5: Commit** `feat(shared): referral codes, share messages and boost rule`

---

### Task 2: Database — codes, ledger, visits, rewards (SQL) and client wrappers

**Files:**
- Create: `supabase/referrals_boosts.sql`
- Modify: `shared/referrals.js` (RPC wrappers), `shared/__tests__/referrals.test.js`

**Interfaces:**
- SQL produces (all `security definer`, `set search_path = public`, `$$`-quoted):
  - `profiles.invite_code text unique`, `profiles.referred_by uuid references auth.users on delete set null` — no column grants to `anon`/`authenticated` (read through RPCs only).
  - `listings.boosted_until timestamptz`; `inspections.ref_code text`.
  - `ile_make_invite_code(p_name text) returns text` — rule from Global Constraints, random 1–3 digits, retries until unique.
  - Backfill: every profile without a code gets one.
  - `ile_handle_new_user()` (replace; keep the existing body from `fix_signup_trigger.sql`) also sets `invite_code` and `referred_by` from `raw_user_meta_data ->> 'invite_code'` (normalised; ignored if unknown or own).
  - `invite_code_exists(p_code text) returns boolean` — granted to `anon, authenticated`.
  - `claim_invite_code(p_code text) returns boolean` — caller's `referred_by` set only if null, account created < 24 h ago, code known and not own. Granted to `authenticated`.
  - `boost_ledger (id, user_id, days int, reason text check in ('invited_lister','invited_seekers','spent','purchased'), status text default 'granted' check in ('granted','held','rejected'), invitee_id uuid, listing_id uuid, batch int, created_at)`; unique `(user_id, reason, invitee_id)` for `invited_lister`, unique `(user_id, reason, batch)` for `invited_seekers`. RLS: owner may select own rows; no client insert/update/delete.
  - `share_visits (listing_id, code, device, day date, created_at)` unique `(listing_id, code, device, day)`; no client access.
  - `record_share_visit(p_listing uuid, p_code text, p_device text) returns void` — ignores unknown code/listing; `on conflict do nothing`. Granted to `anon, authenticated`.
  - `record_booking_ref(p_inspection uuid, p_code text) returns void` — only the booking's tenant, only when `ref_code` is null and the code is known and not the tenant's own.
  - `my_referral_summary() returns json` — `{ code, balance, joined, listers, views, bookings, seekers_confirmed }` for `auth.uid()`; balance = sum of `granted` days.
  - `spend_boost_days(p_listing uuid, p_days int) returns timestamptz` — rules from Global Constraints; raises `'You can only boost your own active listing'`, `'Choose between 1 and 30 days'`, `'You don''t have enough boost days'`.
  - `ile_grant_referral_rewards() returns void` — rules from Global Constraints; notifies via `ile_notify(inviter, 'boost_earned', 'You earned N boost days 🎉', <body>, jsonb)` only for `granted` lines.
  - `ile_expire_boosts() returns void` — sets `boosted_until = null` where `< now()`.
  - Admin: `admin_held_rewards() returns setof boost_ledger`, `admin_resolve_reward(p_id uuid, p_approve boolean) returns void` — both check `public.admins`; approving notifies.
  - Schedules: `cron.schedule('ile-referral-rewards', '15 * * * *', ...)`, `cron.schedule('ile-boost-expiry', '*/5 * * * *', ...)` (unschedule-if-exists first, as in `push_notifications.sql`).
  - Ends with check queries (counts of profiles without a code, the two cron jobs).
- JS wrappers in `shared/referrals.js` (each takes `client` first):
  - `inviteCodeExists(client, code) -> Promise<boolean>`
  - `claimInviteCode(client, code) -> Promise<boolean>`
  - `recordShareVisit(client, { listingId, code, device }) -> Promise<void>` (never throws)
  - `recordBookingRef(client, inspectionId, code) -> Promise<void>` (never throws)
  - `fetchReferralSummary(client) -> Promise<Summary|null>` — returns `null` when the RPC is missing (PostgREST `PGRST202` or message containing "Could not find the function"); throws `Error(message)` otherwise.
  - `spendBoostDays(client, listingId, days) -> Promise<string>` (new `boosted_until`); throws `Error(message)`.
  - `fetchHeldRewards(client)`, `resolveHeldReward(client, id, approve)`.

- [ ] **Step 1: Write the failing tests** (fake `client.rpc`):
  - `fetchReferralSummary returns null when the function is missing` (rpc resolves `{ error: { code: "PGRST202", message: "Could not find the function public.my_referral_summary" } }`).
  - `fetchReferralSummary returns the summary` and calls `rpc("my_referral_summary")`.
  - `recordShareVisit never throws` (rpc rejects) and passes `{ p_listing, p_code, p_device }`.
  - `spendBoostDays passes listing and days and throws the database message`.
  - `inviteCodeExists normalises before asking` (`" tunde7"` → `p_code: "TUNDE7"`; invalid shape → false without calling rpc).
- [ ] **Step 2: Run** `node --test "shared/__tests__/*.test.js"` — Expected: FAIL.
- [ ] **Step 3: Write `supabase/referrals_boosts.sql`** per the Interfaces, header comment "Run once in Supabase → SQL Editor. Safe to re-run.", and the wrappers.
- [ ] **Step 4: Run** `node --test "shared/__tests__/*.test.js"` — Expected: all pass, including the existing `sql.test.js` dollar-quoting check over the new file.
- [ ] **Step 5: Commit** `feat(db): invite codes, boost ledger, share visits and hourly rewards`

---

### Task 3: Boosted listings first, badge from `boosted_until`

**Files:**
- Modify: `shared/search.js` (`buildQuery`, `fetchLatestListings`), `shared/__tests__/search.test.js`, `src/components/PropertyCard.jsx`, `src/components/ListingDetail.jsx`, `mobile/src/lib/ui/listingBadges.ts`, `mobile/src/app/listing/[id].tsx`, matching tests.

**Interfaces:**
- Consumes: `isBoosted` (Task 1).
- Produces: both queries call `.order("boosted_until", { ascending: false, nullsFirst: false })` before their existing order; every "Boosted" badge uses `isBoosted(listing)` instead of `listing.is_boosted`.

- [ ] **Step 1: Failing tests:** `buildQuery orders boosted listings first` and `fetchLatestListings orders boosted listings first` (fake client records `order` calls; first call is `boosted_until` desc nulls last); `listingBadges shows boosted only while boosted_until is in the future` (mobile).
- [ ] **Step 2: Run** shared tests and `cd mobile && npx jest src/lib/ui` — Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** both — Expected: pass.
- [ ] **Step 5: Commit** `feat: boosted listings first while their boost lasts`

---

### Task 4: Website — remember the code, invite code at sign-up, Google claim, booking credit

**Files:**
- Create: `src/components/RefCapture.jsx` (client; mounted in `src/app/layout.js`)
- Modify: `src/app/signup/page.jsx`, `src/app/auth/callback/page.jsx`, `src/components/GoogleButton.jsx`, `src/components/ListingDetail.jsx` (after booking/request success), `src/lib/referrals.js` (binds wrappers to the website client, like `src/lib/search.js`)

**Interfaces:**
- Consumes: `normalizeCode`, `rememberRef`, `readRef`, `inviteCodeExists`, `claimInviteCode`, `recordShareVisit`, `recordBookingRef` (Tasks 1–2).
- Produces: `RefCapture` reads `?ref=` on any page → `rememberRef(localStorage, code)`; on `/listings/[id]` pages also `recordShareVisit` with a device id from `localStorage["ile:device"]` (random UUID, created once). Sign-up: optional "Invite code" `Field` (icon `Gift`, `optional`) pre-filled from `readRef`; on submit, if a code is entered and `inviteCodeExists` is false, sign-up still proceeds with no code and shows the exact "Unknown code" copy on the check-email/redirect step; valid code goes in `options.data.invite_code`. Google: `GoogleButton` stores the pending code in `localStorage["ile:pending-invite"]` alongside the role; the callback calls `claimInviteCode` for new users. Booking: after `bookSlot`/`requestViewing` returns, `recordBookingRef(id, readRef(localStorage))` when a code exists.

- [ ] **Step 1: Failing test** in `shared/__tests__/referrals.test.js`: `signupInviteCode prefers the typed code, falls back to the remembered one` — new pure helper `signupInviteCode(typed, remembered) -> string|null` (normalised typed code if non-empty, else remembered).
- [ ] **Step 2: Run** shared tests — Expected: FAIL.
- [ ] **Step 3: Implement** the helper and the website changes above.
- [ ] **Step 4: Run** shared tests, `npx eslint .`, `npx next build` — Expected: pass, 0 lint errors, build OK.
- [ ] **Step 5: Commit** `feat(web): invite codes at sign-up and share tracking`

---

### Task 5: Website — share sheet and the image card

**Files:**
- Create: `src/app/share/listing/[id]/card/route.jsx`, `src/app/share/fonts/` (copy `Fraunces_600SemiBold.ttf`, `Inter_400Regular.ttf`, `Inter_700Bold.ttf` from `mobile/node_modules/@expo-google-fonts/*`), `src/components/ShareListing.jsx`
- Modify: `src/components/ListingDetail.jsx` (Share button opens `ShareListing`), `src/app/dashboard/page.jsx` (Share button per own listing), `package.json` (`qrcode`)

**Interfaces:**
- Consumes: `shareMessage`, `shareUrl`, `cardUrl` (Task 1); `fetchReferralSummary` for the sharer's code (null → share without code).
- Produces:
  - Route `GET /share/listing/[id]/card?ref=CODE` → PNG 1080×1920 via `ImageResponse` (`runtime = "nodejs"`): cover photo top 60% (or palm block if none), type badge, price + suffix, title, place, key facts (`keyFacts`), Ile logo, QR (`qrcode.toDataURL(shareUrl)`), footer `Use code {CODE} on Ile` only when `ref` is a valid code. 404 for missing/inactive/moderated listings. `Cache-Control: public, max-age=86400`.
  - `ShareListing({ listing, onClose })` modal: "Send link" (Web Share API with `shareMessage`, else copy with "Link copied"), "Post to Status / Stories" (opens the card URL in a new tab with "Long-press or right-click to save the image" hint; on browsers with `navigator.canShare({ files })` share the fetched PNG as a file).

- [ ] **Step 1: Failing test** `shared/__tests__/referrals.test.js`: `cardUrl adds the code only when valid` (`code: "bad-code"` → no `?ref`).
- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: Implement** the route, fonts, `ShareListing`, buttons, dependency.
- [ ] **Step 4: Verify:** shared tests pass; `npx next build` OK; `npx next start` and `curl -s -o card.png -w "%{http_code} %{content_type}" "http://localhost:3000/share/listing/<active id>/card?ref=TUNDE7"` → `200 image/png`, and a random UUID → `404`; open the PNG and check it against the spec layout.
- [ ] **Step 5: Commit** `feat(web): share sheet and Status/Stories image card`

---

### Task 6: Website — invite card, share stats, boosting, admin holds

**Files:**
- Create: `src/components/InviteCard.jsx`, `src/components/ShareStats.jsx`, `src/components/BoostDialog.jsx`
- Modify: `src/app/account/page.jsx` (InviteCard), `src/app/dashboard/page.jsx` (ShareStats above "My listings", "Boost" button per active listing), `src/app/admin/page.jsx` (section "Held rewards" with Approve / Reject)

**Interfaces:**
- Consumes: `fetchReferralSummary`, `inviteMessage`, `seekerProgress`, `spendBoostDays`, `fetchHeldRewards`, `resolveHeldReward`.
- Produces: all three cards render nothing when `fetchReferralSummary` returns null. `ShareStats` shows the exact dashboard copy plus "{toNext} more home-seekers to your next 3 boost days". `BoostDialog({ listing, balance, onDone })`: day stepper 1–min(30, balance), "Boost for N days", errors via `friendlyError`, success shows "Boosted until {date}".

- [ ] **Step 1: Failing test** `shared/__tests__/referrals.test.js`: `statsLine formats the dashboard copy` — helper `statsLine(summary) -> string` (exact copy; singular "1 view", "1 booking").
- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** shared tests, lint, build — Expected: pass.
- [ ] **Step 5: Commit** `feat(web): invite card, share stats, boosting and held rewards`

---

### Task 7: App — invite code, share sheet, stats and boosting

**Files:**
- Create: `mobile/src/components/ShareSheet.tsx`, `mobile/src/components/InviteCard.tsx`, `mobile/src/components/dashboard/ShareStats.tsx`, `mobile/src/components/dashboard/BoostSheet.tsx`, `mobile/src/lib/referrals.ts` (binds wrappers; `canShareImages()`), tests under `mobile/src/components/__tests__/` and `mobile/src/lib/__tests__/`
- Modify: `mobile/src/app/(auth)/signup.tsx` (Invite code `Field`, icon `Gift`, optional, pre-filled from `ref` param), `mobile/src/lib/oauth.ts` (`signInWithGoogle(chosen?, remember?, inviteCode?)`, same for Apple; new users → `claimInviteCode`), `mobile/src/components/SocialButtons.tsx` (`inviteCode` prop), `mobile/src/app/listing/[id].tsx` (header Share opens `ShareSheet`), `mobile/src/components/dashboard/ListingRow.tsx` (Share + Boost), `mobile/src/components/dashboard/Dashboard.tsx` (ShareStats), `mobile/src/app/(tabs)/account.tsx` (InviteCard), `mobile/package.json` (`expo-sharing`)

**Interfaces:**
- Consumes: Tasks 1–2 wrappers and helpers; `["referral-summary", userId]` query key (persisted like `"dashboard"`; add to `shouldPersist` and its test).
- Produces: `canShareImages() -> boolean` = `requireOptionalNativeModule("ExpoSharing") !== null` (import from `expo-modules-core`; `expo-sharing` imported lazily only when true). `ShareSheet({ listing, code, visible, onClose })`: "Send link" (`Share.share({ message: shareMessage(...) })`), "Post to Status / Stories" only when `canShareImages()` — downloads `cardUrl` with `expo-file-system` `File.downloadFileAsync` to cache, then `Sharing.shareAsync(uri, { mimeType: "image/png" })`; offline shows the exact offline copy. Unknown code at sign-up: same rule and copy as the website.

- [ ] **Step 1: Failing tests:**
  - `image option hidden when the sharing module is missing` (mock `expo-modules-core` `requireOptionalNativeModule` → null; ShareSheet has no "Post to Status / Stories").
  - `image option shown when sharing is available`.
  - `sign-up sends a valid invite code and reports an unknown one` (mock `@/lib/supabase` and `inviteCodeExists`).
  - `shouldPersist keeps the referral summary`.
  - `ShareStats shows nothing when the summary is null`.
- [ ] **Step 2: Run** `cd mobile && npx jest` — Expected: the new tests FAIL.
- [ ] **Step 3: Implement.** `npx expo install expo-sharing`.
- [ ] **Step 4: Run** `npx jest`, `npx tsc --noEmit`, `npx expo lint`, `npx expo-doctor` — Expected: all pass.
- [ ] **Step 5: Commit** `feat(mobile): invite codes, share sheet, share stats and boosting`

---

### Task 8: Founder hand-off and full verification

**Files:**
- Create: `docs/referrals-setup.md` (run `supabase/referrals_boosts.sql`; what to check afterwards; that "Post to Status / Stories" in the app arrives with the next build)

- [ ] **Step 1:** Run the full gates: `node --test "shared/__tests__/*.test.js"`, `npx eslint .`, `npx next build` (root); `npx jest`, `npx tsc --noEmit`, `npx expo lint`, `npx expo export --platform android`, `npx expo-doctor` (mobile). Expected: all pass.
- [ ] **Step 2:** Write `docs/referrals-setup.md`.
- [ ] **Step 3: Commit** `docs: referrals setup for the founder`
