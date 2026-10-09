# Ile Mobile — Milestone 1: Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Shared business rules used by both the website and the app, saved homes synced to accounts, and an Expo app skeleton (theme, tabs, email login) the founder can open on their phone.

**Architecture:** Pure JS rules move from `src/lib/` into a root `shared/` folder (ES modules, tested with Node's built-in test runner) and the website re-exports them, so nothing changes for the site. Saved homes move to a `saved_listings` table behind the existing `useSavedIds()` API. A new `mobile/` Expo Router app, with its own dependencies, imports `shared/` through Metro `watchFolders` and talks to the same Supabase project with an encrypted session store.

**Tech Stack:** Next.js 16.3.8 (web, unchanged), Supabase JS 2.x, Expo SDK 57 / React Native 0.87 / Expo Router, expo-secure-store + AsyncStorage + aes-js (session), Node 24 `node --test` (shared tests), jest-expo (mobile unit tests).

**Spec:** `docs/superpowers/specs/2026-10-09-ile-mobile-app-design.md`

**Milestones (this plan = M1):** M1 foundation (spec build steps 1–3) · M2 browse/listing/saved/offline (step 4) · M3 booking/viewings/chat (step 5) · M4 lister tools (step 6) · M5 push (step 7) · M6 reviews/reports/profile/account/Google+Apple (step 8) · M7 testing & release (step 9). Each gets its own plan after the previous lands.

## Global Constraints

- Website behaviour must not change in Task 1: `npx eslint src shared` has 0 errors, `npx next build` passes, and every route in the Task 1 smoke list returns its current status.
- `shared/` contains no React, Next.js, React Native, browser globals, or Supabase client singletons; functions that query take a Supabase client as their first argument.
- Imports inside `shared/` are relative with the `.js` extension (e.g. `./format.js`) so Node ESM, Next/Turbopack and Metro all resolve them.
- Mobile native libraries are installed with `npx expo install <pkg>` (never plain `npm install`) so versions match SDK 57.
- Mobile uses only the public Supabase key (`EXPO_PUBLIC_SUPABASE_ANON_KEY`); no service key anywhere.
- Mobile visual tokens copy the web values in `src/app/globals.css`: cream `#F6F1E7`, surface `#FFFDF8`, line `#E8E0D0`, line-strong `#D9CFBC`, ink `#1E1B16`, ink-muted `#6B6357`, palm `#14583B`, palm-dark `#0F4530`, palm-soft `#E7F0EA`, gold `#C99A2E`, gold-soft `#F7EDD3`, gold-ink `#7A5200`, clay `#B14A2E`, clay-soft `#F6E4DE`; radii control 10, card 16, hero 20; fonts Fraunces (headlines) and Inter (body).
- Session rules carried over from web: 30-day inactivity logout (`INACTIVE_DAYS = 30`); "Log out" ends only this device's session (`signOut({ scope: "local" })`).
- Every schema change ships as a file in `supabase/` that the founder runs in the SQL Editor; app code that depends on it is not deployed before it runs.
- Commit trailer on every commit: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Never stage `brag-output/`.

## Review Focus

- **Logged-out saves at login:** hearts tapped while logged out must survive logging in (merged into the account, no duplicates) — pinned by `mergeSavedIds` tests in Task 2.
- **Saved listing later deleted or let:** the Saved page and app must not crash or show a broken card; rows cascade on delete and inactive listings are filtered — pinned by the Task 2 manual check and the saved query filter.
- **Dates rendered on the server vs the phone:** `formatDate("2026-10-12")` must give the same calendar day everywhere (no UTC shift) — pinned by a `format.test.js` case.
- **App killed or backgrounded for hours:** reopening must keep the user signed in (token refresh) unless inactive 30+ days — pinned by `isInactive` tests in Task 3 plus the manual device check.
- **Keyboard over the login form on small Android phones:** the password field and button must stay reachable — pinned by the Task 3 manual device check (KeyboardAvoidingView + ScrollView).

---

### Task 1: Extract shared business rules (no website behaviour change)

**Files:**
- Create: `shared/package.json`, `shared/format.js`, `shared/nigeria.js`, `shared/property.js`, `shared/profileDisplay.js`, `shared/search.js`, `shared/reviews.js`
- Create tests: `shared/__tests__/format.test.js`, `nigeria.test.js`, `property.test.js`, `search.test.js`, `reviews.test.js`
- Modify (become thin re-exports): `src/lib/format.js`, `src/lib/nigeria.js`, `src/lib/property.js`, `src/lib/profileDisplay.js`
- Modify: `src/lib/search.js` (re-export + bind web client), `src/lib/reviews.js` (re-export pure fns, keep fetchers), `jsconfig.json` (add `@shared/*`), `package.json` (scripts)

**Interfaces:**
- Produces (all from `shared/`, same names/behaviour as today):
  - `format.js`: `formatNaira(v)`, `formatNairaShort(v)`, `formatDate(iso)`, `formatTime(t)`, `formatDateTime(d, t)`, `pluralize(n, word)`
  - `nigeria.js`: `NIGERIA`, `STATES`, `stateLabel(state)`
  - `property.js`: every current export of `src/lib/property.js` (CATEGORIES, PROPERTY_TYPES, FURNISHING, TITLE_DOCUMENTS, SIZE_UNITS, LISTER_TYPES, periodOptions, periodLabel, defaultPeriod, typeLabel, categoryOf, furnishingLabel, titleLabel, titleShort, listerLabel, periodOf, priceParts, formatSize, placeLabel, fullPlace, keyFacts, moveInCost, feeWarning, isAvailable, FRESH_DAYS, STALE_WARNING_DAYS, freshCutoff, daysSinceConfirmed, isExpired, needsConfirming, isModerated, STATUS_LABELS, REPORT_REASONS)
  - `profileDisplay.js`: every current export of `src/lib/profileDisplay.js`
  - `search.js`: `PAGE_SIZE`, `SEARCH_TABS`, `SORTS`, `readFilters(searchParams)`, `nextParams(current, changes)`, `buildQuery(client, filters, page = 0)`
  - `reviews.js`: `canReview(inspection)`, `viewingDateReached(inspection)`
- Web keeps calling `buildQuery(filters, page)` (bound in `src/lib/search.js`) and `fetchRatings` / `fetchReviewedIds` (still in `src/lib/reviews.js`).

- [ ] **Step 1: Create `shared/package.json`**

`{ "name": "@ile/shared", "private": true, "type": "module" }` — makes Node treat `shared/*.js` as ES modules.

- [ ] **Step 2: Write the failing tests** (they import from `../format.js` etc., which don't exist yet)

`format.test.js`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { formatNaira, formatNairaShort, formatDate, formatTime } from "../format.js";

test("naira", () => {
  assert.equal(formatNaira(3500000), "₦3,500,000");
  assert.equal(formatNaira("abc"), "₦—");
  assert.equal(formatNairaShort(2400000), "₦2.4m");
  assert.equal(formatNairaShort(850000), "₦850k");
});
test("dates never shift a day", () => {
  assert.match(formatDate("2026-10-12"), /12 Oct 2026/);
});
test("times", () => {
  assert.equal(formatTime("14:00:00"), "2:00 pm");
  assert.equal(formatTime("00:30"), "12:30 am");
});
```
`nigeria.test.js`: `STATES.length === 37`; total LGAs `=== 774`; `NIGERIA.Lagos` includes `"Eti-Osa"` and `"Ibeju-Lekki"`; `stateLabel("FCT") === "FCT (Abuja)"`.

`property.test.js` (exact values):
- rent `{listing_type:"rent", price:1000000, price_period:"year", agency_fee_percent:10, legal_fee_percent:10, caution_deposit:100000, service_charge:50000}` → `moveInCost().total === 1350000`, rows labels include `"Agency fee (10%)"`.
- monthly rent `price:100000, price_period:"month", agency_fee_percent:10` → agency amount `120000` (10% of 12 months).
- `feeWarning({listing_type:"rent", state:"Lagos", agency_fee_percent:15})` is a string; same with `state:"Oyo"` is `null`.
- `isExpired({status:"active", last_confirmed_at: <46 days ago ISO>}) === true`; 10 days ago → `false`; `{status:"let"}` → `false`.
- `priceParts({price:3500000, listing_type:"rent", price_period:"year"})` → `{amount:"₦3,500,000", suffix:"/year"}`.

`search.test.js`:
- `readFilters(new URLSearchParams("type=sale&location=Yaba"))` → `tab === "sale"`, `q === "Yaba"`.
- `nextParams({tab:"rent", ptype:"flat", state:"Lagos", lga:"Ikeja"}, {tab:"land"})` has no `ptype`; `nextParams({state:"Lagos", lga:"Ikeja"}, {state:"Oyo"})` has no `lga`.
- `buildQuery(fakeClient, {tab:"rent", q:"yaba, (x)"})` with a fake client whose builder records calls: records `eq("status","active")`, `eq("category","homes")`, `eq("listing_type","rent")`, and an `or(...)` string containing `ilike.%yaba    x%`-style text with **no** `,` or `(` from user input; ends with `range(0, 23)`.

`reviews.test.js`: with today's Lagos date `T`: `canReview({status:"done", preferred_date: T})` true; `{status:"done", preferred_date: <tomorrow>}` false; `{status:"confirmed", preferred_date: <yesterday>}` true; `{status:"confirmed", preferred_date: T}` false; `viewingDateReached({preferred_date: T})` true.

- [ ] **Step 3: Run tests to verify they fail**

Run: `node --test shared/__tests__/`
Expected: FAIL — `Cannot find module '../format.js'` (and similar).

- [ ] **Step 4: Move the code into `shared/`**

Move file contents from `src/lib/format.js`, `nigeria.js`, `property.js`, `profileDisplay.js` into `shared/` unchanged except imports: `property.js` imports `./format.js` and `./nigeria.js`. Move from `src/lib/search.js` everything except the supabase import, and change the signature to `buildQuery(client, f, page = 0)` using `client.from("listings")` (it imports `freshCutoff` from `./property.js`). Move `canReview`, `viewingDateReached` and the `todayInLagos` helper from `src/lib/reviews.js` into `shared/reviews.js`.

- [ ] **Step 5: Point the website at `shared/`**

Add `"@shared/*": ["./shared/*"]` to `jsconfig.json` `compilerOptions.paths`. Replace the moved files in `src/lib/` with re-exports (`export * from "@shared/format.js";` etc.). `src/lib/search.js` becomes: re-export everything from `@shared/search.js` except `buildQuery`, plus `export function buildQuery(f, page) { return buildQueryWith(supabase, f, page); }` where `buildQueryWith` is the shared import. `src/lib/reviews.js` re-exports `canReview`, `viewingDateReached` from `@shared/reviews.js` and keeps `fetchRatings`, `fetchReviewedIds`. Add scripts: `"test:shared": "node --test shared/__tests__/"`, `"lint": "eslint src shared"`.

- [ ] **Step 6: Run tests to verify they pass**

Run: `npm run test:shared`
Expected: all tests PASS.

- [ ] **Step 7: Verify the website is unchanged**

Run: `npx eslint src shared` → 0 errors. Run: `npx next build` → "Compiled successfully". Start `npx next start -p 3100` and check these return the same status as before: `/` 200, `/listings` 200, `/listings?tab=land&state=Lagos` 200, `/listings/71eb3c66-ee00-4b47-a087-d68316523ddf` 200, `/listings/00000000-0000-0000-0000-000000000000` 404, `/u/f5009815-f42a-4e79-998b-4f7a62b6c394` 200, `/account` 200, `/account/profile` 200, `/sitemap.xml` 200. The listing page `<title>` still contains `₦`.

- [ ] **Step 8: Commit**

```bash
git add shared jsconfig.json package.json src/lib
git commit -m "Move shared business rules into shared/ for web and mobile"
```

---

### Task 2: Saved homes on the account (website)

**Files:**
- Create: `supabase/saved_listings.sql`, `shared/saved.js`, `shared/__tests__/saved.test.js`
- Modify: `src/lib/saved.js` (keep the `useSavedIds()` / `toggleSaved(id)` / `readSaved()` API), `src/app/privacy/page.jsx` (saved homes are stored on the account when logged in)

**Interfaces:**
- Consumes: Task 1 `shared/` setup.
- Produces:
  - `shared/saved.js`: `mergeSavedIds(local: string[], remote: string[]) -> string[]` (union, remote order first, no duplicates); `fetchSavedIds(client) -> Promise<string[]>`; `saveListing(client, userId, listingId)`; `unsaveListing(client, userId, listingId)`; `importSavedIds(client, userId, ids: string[])` (upsert, ignore duplicates).
  - `src/lib/saved.js`: unchanged exports; logged-in users read/write the table, logged-out users keep localStorage, and local ids are imported then cleared on sign-in.

- [ ] **Step 1: Write `supabase/saved_listings.sql`**

Table `public.saved_listings (user_id uuid not null references auth.users(id) on delete cascade, listing_id uuid not null references public.listings(id) on delete cascade, created_at timestamptz not null default now(), primary key (user_id, listing_id))`; index on `(user_id, created_at desc)`; RLS enabled; policies for `select`, `insert` (`with check user_id = auth.uid()`), and `delete` restricted to `user_id = auth.uid()`; trigger `rate_limit_saves before insert ... execute function public.enforce_rate_limit('user_id', '1 day', '500', 'saved homes')`. Header comment: run after `hardening.sql`; safe to re-run.

- [ ] **Step 2: Write the failing test**

`saved.test.js`: `mergeSavedIds(["a","b"], ["b","c"])` deep-equals `["b","c","a"]`; `mergeSavedIds([], [])` → `[]`; `mergeSavedIds(["1"], [])` → `["1"]`; inputs that are numbers are returned as strings (`mergeSavedIds([5], [])` → `["5"]`).

- [ ] **Step 3: Run it to verify it fails**

Run: `npm run test:shared` → FAIL (`mergeSavedIds` not found).

- [ ] **Step 4: Implement `shared/saved.js`**, then rework `src/lib/saved.js`

`src/lib/saved.js` keeps one module-level store (`ids: string[]`, listeners). On `supabase.auth.onAuthStateChange`: signed in → `importSavedIds(supabase, uid, readLocal())` then clear localStorage, then `fetchSavedIds` into the store; signed out → store reads localStorage. `toggleSaved(id)` updates the store optimistically and calls `saveListing`/`unsaveListing` when signed in (reverting on error), otherwise writes localStorage. `useSavedIds()` uses `useSyncExternalStore` over this store.

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm run test:shared` → PASS.

- [ ] **Step 6: Verify**

Founder runs `supabase/saved_listings.sql`. Then: anon `GET /rest/v1/saved_listings?select=listing_id` returns `[]`. `npx eslint src shared` 0 errors; `npx next build` passes. Manual (logged out → in): heart two listings logged out, log in, both still hearted; open another browser logged in as the same user → same hearts; unheart → disappears in both after refresh; a let listing does not appear on `/saved` (the saved page query keeps `isAvailable` filtering).

- [ ] **Step 7: Commit**

```bash
git add supabase/saved_listings.sql shared/saved.js shared/__tests__/saved.test.js src/lib/saved.js src/app/privacy/page.jsx
git commit -m "Sync saved homes to the account"
```

---

### Task 3: Expo app skeleton — theme, tabs, email auth

**Files:**
- Create (via generator, then edited): `mobile/` Expo Router app (`app.json`, `package.json`, `metro.config.js`, `jsconfig.json`, `.env.example`, `.gitignore`)
- Create: `mobile/src/theme.js`, `mobile/src/lib/supabase.js`, `mobile/src/lib/session.js`, `mobile/src/lib/__tests__/session.test.js`, `mobile/src/components/{Button,Field,Screen}.jsx`
- Create routes: `mobile/app/_layout.jsx`, `mobile/app/(tabs)/_layout.jsx`, `mobile/app/(tabs)/{index,saved,inbox,viewings,account}.jsx`, `mobile/app/(auth)/{login,signup,forgot-password}.jsx`

**Interfaces:**
- Consumes: `@shared/*` from Task 1 (e.g. `formatNaira` on the Search placeholder to prove resolution).
- Produces:
  - `mobile/src/theme.js`: `colors` (Global Constraints tokens), `radius = { control: 10, card: 16, hero: 20 }`, `fonts = { serif: "Fraunces_600SemiBold", sans: "Inter_400Regular", sansSemi: "Inter_600SemiBold", sansBold: "Inter_700Bold" }`.
  - `mobile/src/lib/supabase.js`: `supabase` client (encrypted session store; `detectSessionInUrl: false`; auto-refresh tied to `AppState`).
  - `mobile/src/lib/session.js`: `INACTIVE_DAYS = 30`, `isInactive(lastActiveMs: number|null, nowMs: number, days = INACTIVE_DAYS) -> boolean`, `touchActivity() -> Promise<void>`, `enforceInactivity() -> Promise<boolean>` (signs out locally and returns true when inactive).
  - `useSession()` hook (in `mobile/app/_layout.jsx` context) → `{ session, user, loading }`.

- [ ] **Step 1: Generate the app**

Run from repo root: `npx create-expo-app@latest mobile --template default@sdk-57`, then `cd mobile && npm run reset-project` (removes example screens). Expected: `mobile/package.json` lists `expo` `~57`.

- [ ] **Step 2: Install libraries**

Run in `mobile/`: `npx expo install @supabase/supabase-js @react-native-async-storage/async-storage expo-secure-store expo-crypto react-native-url-polyfill aes-js expo-font @expo-google-fonts/fraunces @expo-google-fonts/inter` and `npx expo install -- --save-dev jest-expo jest`. Add script `"test": "jest"` and jest preset `jest-expo`.

- [ ] **Step 3: Wire up `shared/` resolution**

`metro.config.js`: start from `getDefaultConfig(__dirname)`, add `config.watchFolders = [path.resolve(__dirname, "../shared")]` and `config.resolver.extraNodeModules = { "@shared": path.resolve(__dirname, "../shared") }`. `jsconfig.json`: `"paths": { "@shared/*": ["../shared/*"] }`. `.env.example` lists `EXPO_PUBLIC_SUPABASE_URL=` and `EXPO_PUBLIC_SUPABASE_ANON_KEY=`; `.gitignore` includes `.env`.

- [ ] **Step 4: Write the failing test**

`session.test.js`: `isInactive(null, NOW)` false; `isInactive(NOW - 31*DAY, NOW)` true; `isInactive(NOW - 10*DAY, NOW)` false; `isInactive(NOW - 30*DAY + 1000, NOW)` false.

- [ ] **Step 5: Run it to verify it fails**

Run (in `mobile/`): `npm test -- session` → FAIL (module not found).

- [ ] **Step 6: Implement `session.js`, `supabase.js`, `theme.js`**

`supabase.js`: import `react-native-url-polyfill/auto`; storage adapter per Supabase's React Native secure-storage pattern (random 256-bit key in `expo-secure-store`, session JSON AES-encrypted with `aes-js` in AsyncStorage); `AppState` listener calls `supabase.auth.startAutoRefresh()` when active, `stopAutoRefresh()` otherwise. `session.js` keeps `ile:last-active` in AsyncStorage; `enforceInactivity()` runs on app start before rendering signed-in screens.

- [ ] **Step 7: Run tests to verify they pass**

Run: `npm test` → PASS.

- [ ] **Step 8: Build the screens**

Root `_layout.jsx`: loads fonts, provides `useSession()`, calls `enforceInactivity()` then `touchActivity()` on start and when the app returns to foreground; unauthenticated users can still browse tabs (as on web). Tabs `_layout.jsx`: five tabs Search, Saved, Inbox, Viewings/Dashboard (by `user.user_metadata.role === "landlord"`), Account, palm active tint, cream background. Placeholder screens show the serif title and one line of copy; Search shows `formatNaira(3500000)` from `@shared/format.js` to prove shared resolution. Account shows name, email and **Log out** (`signOut({ scope: "local" })`), or Log in / Sign up buttons when signed out. Auth screens use `Field`/`Button` components, a `KeyboardAvoidingView` + `ScrollView`, and the same rules as web: sign-up sets `options.data = { full_name, role }` with role cards "Find a place" / "List property", password min 8; login has "Forgot password?"; forgot-password calls `resetPasswordForEmail(email)` and always shows "If an account exists…".

- [ ] **Step 9: Verify on a phone**

Run in `mobile/`: `npx expo-doctor` → no errors. Copy `.env.example` to `.env` with the website's public URL/key. Run `npx expo start` and open in **Expo Go** (Android) by scanning the QR. Check: tabs render in Ile colours and fonts; Search shows `₦3,500,000`; sign up a test account → lands signed in; kill and reopen the app → still signed in; Log out → signed out; on a small screen the keyboard never hides the password field or button.

- [ ] **Step 10: Link to Expo (founder)**

Founder runs `npx eas login` then, in `mobile/`, `npx eas init` (creates the project on their Expo account and writes the project ID into `app.json`). Set `app.json` `name: "Ile"`, `slug: "ile"`, `scheme: "ile"`, `android.package` and `ios.bundleIdentifier` to the founder's chosen reverse-domain id (default `ng.ile.app`).

- [ ] **Step 11: Commit**

```bash
git add mobile -- ':!mobile/.env'
git commit -m "Add Expo app skeleton: theme, tabs, email auth, shared rules"
```
