# Ile Mobile — Milestone 2: Browse, Listing, Saved, Offline Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** In the app, people can search homes, land and commercial property with the same filters as the website, open a listing (photos, facts, move-in cost, lister), save homes to their account, and still see saved and recently viewed homes with no connection.

**Architecture:** TanStack Query fetches everything through the existing `shared/` query builders, and a persisted cache (AsyncStorage) keeps a small, chosen set of queries (saved homes, recently viewed listings, the last search's first page) across app restarts. NetInfo drives TanStack's online manager and an offline banner. Saved homes reuse `shared/saved.js` behind a small mobile store with the same rules as the website (device saves while logged out, imported into the account at login). Photos use `expo-image` with the disk cache, and saved homes' photos are prefetched so they show offline.

**Tech Stack:** Expo SDK 57, Expo Router (stack, tabs, `formSheet` modal), `@tanstack/react-query` + `@tanstack/react-query-persist-client` + `@tanstack/query-async-storage-persister`, `@react-native-community/netinfo`, `expo-image` (already installed), `expo-location`, jest-expo, Node `node --test` for `shared/`.

**Spec:** `docs/superpowers/specs/2026-10-09-ile-mobile-app-design.md` (build step 4; sections 2 and 4)

**Previous milestone:** `docs/superpowers/plans/2026-10-09-ile-mobile-m1-foundation.md` (merged to `main` at 187ac73).

## Global Constraints

- Every Global Constraint of the M1 plan still applies: `shared/` stays platform-free with client-as-first-argument queries and relative `.js` imports; `npx expo install` for native packages; public Supabase key only; M1 colour, radius and font tokens from `mobile/src/theme.ts`; commit trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; never stage `brag-output/`.
- Search results use exactly the website's rules: `buildQuery(client, filters, page)` from `shared/search.js` (active, confirmed within `FRESH_DAYS = 45`, `PAGE_SIZE = 24`).
- Website behaviour must not change: `npm run lint`, `npm run test:shared` and `npm run build` pass at the repo root after every task that touches `shared/` or `src/`.
- Mobile gate after every task: `npx jest`, `npx tsc --noEmit` and `npx expo lint` pass in `mobile/`.
- Videos never auto-play (spec section 4). Live-only actions do not exist in this milestone; booking, messaging and reporting arrive in M3/M6, so the listing screen shows none of those buttons yet.
- Shared links stay website URLs: `${EXPO_PUBLIC_SITE_URL}/listings/<id>`.
- No new schema in this milestone (no `supabase/` changes).

## Review Focus

- **Saved home that was let, sold, removed or deleted:** the Saved tab and the offline cache must drop it or show it as unavailable, never crash or show a blank card — pinned by Task 7's query filter (`status = active`) and Task 6's unavailable state test of `listingState`.
- **Opening the app with no connection after a restart:** saved homes and recently viewed listings must render from the persisted cache with the offline banner, and search must say it needs a connection instead of spinning forever — pinned by `shouldPersist` tests (Task 2) and the Task 7 airplane-mode check.
- **Logged-out hearts, then log in (including a heart on a since-deleted listing):** the hearts move into the account and nothing is lost — pinned by `createSavedStore` tests (Task 3), which reuse M1's resilient `importSavedIds`.
- **Changing tab or state in the filter sheet:** filters that no longer apply (bedrooms on Land, an LGA from another state) must be cleared, exactly like the website — pinned by `applyFilterChange` tests (Task 1).
- **"Near me" with permission denied, no GPS, or a place name that is not an exact state/LGA:** the app explains and leaves filters unchanged, or matches the closest state — pinned by `matchPlace` tests (Task 5).

---

### Task 1: Shared people fetchers and filter changes

**Files:**
- Create: `shared/people.js`, `shared/__tests__/people.test.js`
- Modify: `shared/search.js` (add `applyFilterChange`), `shared/__tests__/search.test.js`
- Modify: `src/lib/profile.js` (`fetchPeople`, `fetchResponseTimes` delegate to shared), `src/lib/reviews.js` (`fetchRatings` delegates to shared)

**Interfaces:**
- Produces (`shared/people.js`):
  - `fetchPeople(client, ids: string[]) -> Promise<{ [id]: { name: string, avatar: string | null } }>` (from `profiles`: `id, full_name, avatar_url`; name trimmed)
  - `fetchRatings(client, ids: string[], role: "lister" | "tenant") -> Promise<{ [id]: rating }>` (RPC `user_ratings`, args `p_users`, `p_role`)
  - `fetchResponseTimes(client, ids: string[]) -> Promise<{ [id]: number }>` (RPC `lister_response_times`, arg `p_users`, value `median_minutes`)
  - All three de-duplicate ids, drop falsy ids, and return `{}` without a request when none remain.
- Produces (`shared/search.js`): `applyFilterChange(filters, changes) -> filters` = `readFilters(nextParams(filters, changes))`, so the app gets the website's clearing rules without URLs.
- Web keeps the old one-argument signatures, bound to its own client (same pattern as `src/lib/search.js`).

- [ ] **Step 1: Write failing tests**

`people.test.js` with a fake client that records calls:
- `fetchPeople returns names and avatars keyed by id` — rows `[{ id: "a", full_name: " Ada ", avatar_url: "u" }]` → `{ a: { name: "Ada", avatar: "u" } }`.
- `fetchPeople makes no request for an empty or all-null id list` — `fetchPeople(client, [null, undefined])` → `{}`, zero calls.
- `fetchRatings passes de-duplicated ids and role to user_ratings` — `["a","a","b"]`, `"lister"` → rpc called with `{ p_users: ["a","b"], p_role: "lister" }`.
- `fetchResponseTimes maps median_minutes by user` — `[{ user_id: "a", median_minutes: 42 }]` → `{ a: 42 }`.

`search.test.js` additions:
- `applyFilterChange clears home-only filters when the tab changes` — `{ tab: "rent", beds: "3", ptype: "flat", ... }` + `{ tab: "land" }` → `tab "land"`, `beds ""`, `ptype ""`.
- `applyFilterChange clears the LGA when the state changes` — `{ state: "Lagos", lga: "Eti-Osa" }` + `{ state: "Oyo" }` → `lga ""`.
- `applyFilterChange keeps rent as the default tab` — `{ tab: "sale" }` + `{ tab: "rent" }` → `tab "rent"`.

- [ ] **Step 2: Run** `npm run test:shared` — Expected: the new tests FAIL (missing module / export).

- [ ] **Step 3: Implement** `shared/people.js` and `applyFilterChange`; change the web functions to `export function fetchPeople(ids) { return fetchPeopleWith(supabase, ids); }` style.

- [ ] **Step 4: Run** `npm run test:shared`, `npm run lint`, `npm run build` — Expected: all pass.

- [ ] **Step 5: Commit** `feat(shared): people fetchers and filter changes for the app`

---

### Task 2: Data layer — query cache, persistence, offline banner

**Files:**
- Install (`npx expo install`): `@tanstack/react-query @tanstack/react-query-persist-client @tanstack/query-async-storage-persister @react-native-community/netinfo`
- Create: `mobile/src/lib/queryClient.ts`, `mobile/src/lib/recent.ts`, `mobile/src/lib/__tests__/queryClient.test.ts`, `mobile/src/lib/__tests__/recent.test.ts`, `mobile/src/components/OfflineBanner.tsx`
- Modify: `mobile/src/app/_layout.tsx` (wrap in `PersistQueryClientProvider`, render `OfflineBanner`)

**Interfaces:**
- Produces (`queryClient.ts`):
  - Query keys: `["search", filters]` (infinite), `["listing", id]`, `["similar", id]`, `["saved-listings", ids]`, `["lister", userId]`.
  - `PERSIST_MAX_AGE = 7 days` (ms); queries default `gcTime` = `PERSIST_MAX_AGE`, `staleTime` = 60 s.
  - `shouldPersist(query: { queryKey: unknown[]; state: { status: string } }) -> boolean`: true only for successful `listing`, `saved-listings` and `search` queries.
  - `trimSearchPages(data)`: persisted `search` data keeps only its first page (so the cache stays small on Android's AsyncStorage).
  - `queryClient`, `persister` (key `"ile:query-cache"`), and `onlineManager` wired to NetInfo (`isConnected && isInternetReachable !== false`).
- Produces (`recent.ts`): `RECENT_MAX = 20`; `pushRecent(list: string[], id: string, max = RECENT_MAX) -> string[]` (newest first, no duplicates, capped); `readRecent() / addRecent(id)` over AsyncStorage key `"ile:recent-listings"`.
- Produces (`OfflineBanner.tsx`): renders "You're offline. Saved and recently viewed homes still work." while offline, nothing otherwise.

- [ ] **Step 1: Write failing tests**
- `shouldPersist keeps successful listing, saved and search queries` — each of the three keys with `status: "success"` → true.
- `shouldPersist skips failed queries and other keys` — `["listing","x"]` with `status: "error"` → false; `["lister","x"]` success → false.
- `trimSearchPages keeps only the first page` — `{ pages: [p1, p2], pageParams: [0, 1] }` → `{ pages: [p1], pageParams: [0] }`.
- `pushRecent puts the newest first without duplicates` — `pushRecent(["a","b"], "b")` → `["b","a"]`.
- `pushRecent caps the list` — 20 ids + a new one → length 20, new id first.

- [ ] **Step 2: Run** `npx jest src/lib/__tests__/queryClient.test.ts src/lib/__tests__/recent.test.ts` in `mobile/` — Expected: FAIL (modules missing).

- [ ] **Step 3: Implement** the modules; wrap the root layout in `PersistQueryClientProvider` with `persistOptions={{ persister, maxAge: PERSIST_MAX_AGE, dehydrateOptions: { shouldDehydrateQuery: shouldPersist } }}` and apply `trimSearchPages` when dehydrating search data.

- [ ] **Step 4: Run** the mobile gate — Expected: all pass.

- [ ] **Step 5: Commit** `feat(mobile): persisted query cache and offline banner`

---

### Task 3: Saved homes in the app

**Files:**
- Create: `mobile/src/lib/savedStore.ts`, `mobile/src/lib/__tests__/savedStore.test.ts`, `mobile/src/lib/saved.ts`, `mobile/src/components/SaveButton.tsx`

**Interfaces:**
- Consumes: `fetchSavedIds`, `saveListing`, `unsaveListing`, `importSavedIds` from `@shared/saved.js` (M1).
- Produces (`savedStore.ts`): `createSavedStore({ client, storage }) -> { getIds(): string[]; subscribe(fn): () => void; switchAccount(userId: string | null): Promise<void>; toggle(id: string): Promise<void> }`, where `storage = { read(): Promise<string[]>; write(ids: string[]): Promise<void> }`. Same rules as `src/lib/saved.js` on the web: logged out → device list; login → import device saves (failure keeps them on the device), clear device list, then always fetch account saves; toggle is optimistic and reverts only that id on failure.
- Produces (`saved.ts`): one store bound to the mobile `supabase` client and AsyncStorage key `"ile:saved-listings"`, started from `SessionProvider` user changes; `useSavedIds(): string[]` (via `useSyncExternalStore`); `toggleSaved(id)`.
- Produces (`SaveButton.tsx`): `<SaveButton listingId={string} size?="sm" | "md" />` heart; filled palm when saved; `accessibilityLabel` "Save home" / "Remove from saved".

- [ ] **Step 1: Write failing tests** (fake client + in-memory storage)
- `logged-out toggle saves on the device` — `switchAccount(null)`, `toggle("a")` → `getIds()` `["a"]`, storage holds `["a"]`, no client calls.
- `login imports device saves, clears the device list and loads the account` — storage `["a"]`, account rows `["b"]` → after `switchAccount("u1")`, `getIds()` `["b"]` (fake returns account rows after import), storage `[]`.
- `login still loads account saves when the import fails` — import rejects → `getIds()` = account rows, storage still `["a"]`.
- `failed save reverts only that heart` — logged in with `["b"]`, `saveListing` rejects for `"a"` → `getIds()` `["b"]`.

- [ ] **Step 2: Run** `npx jest src/lib/__tests__/savedStore.test.ts` — Expected: FAIL (module missing).

- [ ] **Step 3: Implement** `savedStore.ts`, `saved.ts`, `SaveButton.tsx`.

- [ ] **Step 4: Run** the mobile gate — Expected: all pass.

- [ ] **Step 5: Commit** `feat(mobile): saved homes synced with the account`

---

### Task 4: Search tab — results, tabs, filter sheet

**Files:**
- Create: `mobile/src/components/PropertyCard.tsx`, `mobile/src/components/Chip.tsx`, `mobile/src/lib/filters.ts`, `mobile/src/lib/__tests__/filters.test.ts`, `mobile/src/app/filters.tsx` (modal route)
- Modify: `mobile/src/app/(tabs)/index.tsx` (replace the M1 placeholder), `mobile/src/app/_layout.tsx` (register `filters` with `presentation: "formSheet"`, `sheetAllowedDetents: [0.75, 1]`)

**Interfaces:**
- Consumes: `buildQuery`, `SEARCH_TABS`, `SORTS`, `PAGE_SIZE`, `applyFilterChange` (`shared/search.js`); `priceParts`, `placeLabel`, `keyFacts`, `PROPERTY_TYPES`, `TITLE_DOCUMENTS` (`shared/property.js`); `NIGERIA`, `STATES`, `stateLabel` (`shared/nigeria.js`); `SaveButton` (Task 3); query keys (Task 2).
- Produces (`filters.ts`): `DEFAULT_FILTERS` (= `readFilters(new URLSearchParams())`); `useFilters(): [filters, (changes) => void]` (module store, persisted to AsyncStorage key `"ile:last-search"` so the app reopens on the last search); `activeFilterCount(filters) -> number` (counts state, lga, ptype, purpose, min, max, beds, title; not tab, q or sort).
- Produces (`PropertyCard.tsx`): `<PropertyCard listing={row} />`: cover photo (`image_urls[0]` or `image_url`, `expo-image` `cachePolicy="disk"`, 4:3, grey placeholder when none), price + suffix, place, key facts, `SaveButton`; press → `/listing/<id>`.
- Search screen: tab chips (`SEARCH_TABS`), search field (debounced 400 ms into `q`), "Filters" button with the `activeFilterCount` badge, `FlatList` of cards via `useInfiniteQuery` (`getNextPageParam`: next page when the last page had `PAGE_SIZE` rows), pull to refresh, result count from `count`, empty state "No homes match these filters" with "Clear filters", offline state "Search needs a connection" when offline and nothing cached.
- Filter sheet: purpose (Land/Commercial only), state → LGA pickers, type (by tab's category), min/max price (number keyboard), beds (Rent/Buy), title document (Land), sort; "Show results" closes; "Clear" resets all but tab.

- [ ] **Step 1: Write failing tests**
- `activeFilterCount ignores tab, search text and sort` — `{ ...DEFAULT_FILTERS, tab: "sale", q: "lekki", sort: "low" }` → 0.
- `activeFilterCount counts each applied filter` — `state`, `lga`, `beds` set → 3.

- [ ] **Step 2: Run** `npx jest src/lib/__tests__/filters.test.ts` — Expected: FAIL.

- [ ] **Step 3: Implement** `filters.ts`, `Chip`, `PropertyCard`, the search screen and the filter sheet.

- [ ] **Step 4: Run** the mobile gate, then on the phone (Expo Go): switch tabs, apply state + LGA + beds, scroll past 24 results, kill and reopen the app (same search comes back). Expected: matches the website's results for the same filters.

- [ ] **Step 5: Commit** `feat(mobile): search with tabs, filters and infinite results`

---

### Task 5: "Near me"

**Files:**
- Install: `npx expo install expo-location`
- Modify: `shared/nigeria.js` (add `matchPlace`), `shared/__tests__/nigeria.test.js`, `mobile/app.json` (expo-location plugin with `locationWhenInUsePermission: "Ile uses your location to show homes near you."`), `mobile/src/app/filters.tsx` (a "Near me" button)
- Create: `mobile/src/lib/nearMe.ts`

**Interfaces:**
- Produces (`shared/nigeria.js`): `matchPlace({ region, subregion, city }) -> { state: string, lga: string } | null`. Matching is case-insensitive and ignores the words "State", "Local Government Area", "LGA" and punctuation; "Federal Capital Territory" and "Abuja" map to `FCT`; LGA is matched within the found state from `subregion`, then `city`, else `""`; no state found → `null`.
- Produces (`nearMe.ts`): `findNearMe() -> Promise<{ state, lga } | { error: "denied" | "unavailable" | "unknown-place" }>` using foreground permission, `getCurrentPositionAsync` (balanced accuracy, 10 s timeout) and `reverseGeocodeAsync`.
- Filter sheet: button "Near me" sets state + LGA via `applyFilterChange`; errors show inline: denied → "Allow location in Settings to use Near me."; unavailable → "Couldn't get your location. Try again outside or pick a state."; unknown-place → "We couldn't match your location to a Nigerian state."

- [ ] **Step 1: Write failing tests** (`nigeria.test.js`)
- `matchPlace finds state and LGA` — `{ region: "Lagos State", subregion: "Eti-Osa" }` → `{ state: "Lagos", lga: "Eti-Osa" }`.
- `matchPlace maps the capital territory to FCT` — `{ region: "Federal Capital Territory", city: "Abuja" }` → state `"FCT"`.
- `matchPlace keeps the state when the LGA is unknown` — `{ region: "Oyo", subregion: "Somewhere" }` → `{ state: "Oyo", lga: "" }`.
- `matchPlace returns null outside Nigeria` — `{ region: "Greater London" }` → `null`.

- [ ] **Step 2: Run** `npm run test:shared` — Expected: new tests FAIL.

- [ ] **Step 3: Implement** `matchPlace`, `nearMe.ts`, the button and messages.

- [ ] **Step 4: Run** `npm run test:shared`, the mobile gate, and on the phone tap "Near me" once allowing and once denying. Expected: state/LGA filled, or the denied message.

- [ ] **Step 5: Commit** `feat(mobile): near me fills state and LGA from the phone's location`

---

### Task 6: Listing screen

**Files:**
- Install: none (`Share` from react-native, `expo-web-browser` already installed)
- Create: `mobile/src/app/listing/[id].tsx`, `mobile/src/components/PhotoCarousel.tsx`, `mobile/src/components/MoveInCost.tsx`, `mobile/src/components/ListerLine.tsx`, `mobile/src/lib/listing.ts`, `mobile/src/lib/__tests__/listing.test.ts`
- Modify: `mobile/src/app/_layout.tsx` (register `listing/[id]` with a transparent header and back button)

**Interfaces:**
- Consumes: `fetchPeople`, `fetchRatings`, `fetchResponseTimes` (Task 1); `formatResponseTime` (`shared/profileDisplay.js`); `priceParts`, `fullPlace`, `keyFacts`, `moveInCost`, `feeWarning`, `isAvailable`, `isExpired`, `listerLabel`, `furnishingLabel`, `titleLabel`, `formatSize`, `typeLabel`, `freshCutoff`, `categoryOf` (`shared/property.js`); `addRecent` (Task 2); `SaveButton` (Task 3); `PropertyCard` (Task 4).
- Produces (`listing.ts`):
  - `listingPhotos(listing) -> string[]` (`image_urls` if non-empty, else `[image_url]`, else `[]`).
  - `listingState(listing | null) -> "missing" | "unavailable" | "available"` (`null` → missing; `!isAvailable(l) || isExpired(l)` → unavailable).
  - `listingUrl(id) -> string` = `${process.env.EXPO_PUBLIC_SITE_URL}/listings/${id}`.
  - `fetchListing(client, id)` (`select("*").eq("id", id).maybeSingle()`), `fetchSimilar(client, listing)` (same filters as the website's `ListingDetail.jsx` similar query, limit 4).
- Screen, top to bottom: `PhotoCarousel` (paged horizontal list, "3 / 12" counter, video tiles labelled "Watch video" that open the URL with `WebBrowser.openBrowserAsync`, never auto-play); price + suffix; title; full place; key facts row; details (type, furnishing, size, title document where present); description; `MoveInCost` (rows, total, `feeWarning` in clay, "As stated by the lister. Confirm every fee before you pay."); `ListerLine` (avatar, name or lister type, rating or "No reviews yet", response time; not tappable until M6); the free-viewings notice "Viewings on Ile are free. Never pay an inspection fee to see a property."; similar listings. Header actions: share (`Share.share({ message: title + url, url })`) and `SaveButton`.
- States: missing → "This listing isn't available" with "Back to search"; unavailable → gold banner "No longer available" above the content; loading → skeleton blocks; offline and not cached → "Connect to the internet to see this listing."
- On load: `addRecent(id)`; `Image.prefetch(listingPhotos(listing), { cachePolicy: "disk" })` for the first 6 photos.

- [ ] **Step 1: Write failing tests** (`listing.test.ts`)
- `listingPhotos prefers the photo list` — `{ image_urls: ["a","b"], image_url: "c" }` → `["a","b"]`.
- `listingPhotos falls back to the single photo, then to none` — `{ image_urls: [], image_url: "c" }` → `["c"]`; `{}` → `[]`.
- `listingState reports missing, unavailable and available` — `null` → `"missing"`; `{ status: "let" }` → `"unavailable"`; `{ status: "active", last_confirmed_at: <today> }` → `"available"`; `{ status: "active", last_confirmed_at: <60 days ago> }` → `"unavailable"`.

- [ ] **Step 2: Run** `npx jest src/lib/__tests__/listing.test.ts` — Expected: FAIL.

- [ ] **Step 3: Implement** `listing.ts`, the components and the screen.

- [ ] **Step 4: Run** the mobile gate, then on the phone: open a home, a land plot and a shop; swipe photos; share to WhatsApp (link opens the website listing); heart it; open a let/sold listing from the website's dashboard to see the banner.

- [ ] **Step 5: Commit** `feat(mobile): listing screen with photos, move-in cost and lister`

---

### Task 7: Saved tab and offline check

**Files:**
- Modify: `mobile/src/app/(tabs)/saved.tsx` (replace the placeholder)
- Create: `mobile/src/lib/savedListings.ts`

**Interfaces:**
- Consumes: `useSavedIds` (Task 3); `PropertyCard` (Task 4); `listingPhotos` (Task 6); query key `["saved-listings", ids]` (Task 2).
- Produces (`savedListings.ts`): `fetchSavedListings(client, ids: string[]) -> Promise<row[]>` (`select("*").in("id", ids).eq("status", "active")`, `[]` without a request for no ids); `useSavedListings()` (query, keeps account order of `ids`, filters out ids un-hearted since the fetch, and prefetches every saved listing's first 3 photos to disk after success).
- Screen: title "Saved homes", count line, list of `PropertyCard`s; empty state "No saved homes yet" + "Tap the heart on any home to keep it here." + "Start searching"; logged out → a line "Log in to keep saved homes on all your devices." linking to `/login`.

- [ ] **Step 1: Write failing tests** (`mobile/src/lib/__tests__/savedListings.test.ts`)
- `fetchSavedListings asks only for active listings` — fake client records `.in("id", ["a","b"])` and `.eq("status","active")`.
- `fetchSavedListings makes no request without ids` — `[]` → `[]`, zero calls.

- [ ] **Step 2: Run** `npx jest src/lib/__tests__/savedListings.test.ts` — Expected: FAIL.

- [ ] **Step 3: Implement** `savedListings.ts` and the screen.

- [ ] **Step 4: Run** the full verification: repo root `npm run test:shared`, `npm run lint`, `npm run build`; `mobile/` gate. Then on the phone: save 3 homes and open 2 others, close the app, turn on airplane mode, reopen. Expected: offline banner; Saved shows the 3 homes with photos; the 2 recently viewed listings open; search says it needs a connection.

- [ ] **Step 5: Commit** `feat(mobile): saved tab that works offline`
