# Stays and Amenities Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hosts list shortlets, hotel rooms and Airbnb rooms by the night; guests request dates and hosts accept or decline; every listing gets a tick-box amenities list — on the website and in the app.

**Architecture:** Pure rules (types, amenities, nights/totals, request validation, search filters) live in `shared/` and are used by both clients. The database (`supabase/stays.sql`) holds stay bookings behind security-definer RPCs that re-check every rule, prevent overlapping accepted stays, and send notifications through `ile_notify`. Clients tolerate the SQL not being run yet.

**Tech Stack:** Next.js 16 / React 19 / Tailwind v4, Expo SDK 57 + Expo Router + TanStack Query, Supabase (Postgres, RLS, pg_cron). No new native modules (the app's date picker is a JS month grid).

**Spec:** `docs/superpowers/specs/2026-10-17-ile-stays-amenities-design.md`

## Global Constraints

- Category `stays` (label "Stays"); types `shortlet` "Shortlet apartment", `hotel_room` "Hotel room", `airbnb` "Airbnb / private room"; stays use `listing_type = 'rent'` and price period `night` (label "per night", suffix "/night", short "/night").
- Limits: max guests 1–50 (required for stays); minimum nights 1–365 (default 1); stays ≤ 90 nights; note ≤ 500 chars; decline reason ≤ 200; hotel name ≤ 100 (required for hotel rooms); house rules ≤ 1000; amenities ≤ 30 items, custom item ≤ 40 chars; fees ≥ 0.
- Cleaning fee and caution deposit are charged once per stay. Prices are copied onto the booking at request time.
- Search tabs: Rent · Buy · **Shortlets** · Commercial (`tab=stays`, heading "Shortlets & hotels").
- Home cards (4): **Homes** (rent or buy) · **Shortlets & hotels** · **Land** · **Shops & offices**.
- Stay statuses: `requested` → `accepted` | `declined` | `cancelled`; `accepted` → `cancelled`. Accepting auto-declines overlapping requested stays with reason "Those dates were taken".
- Copy: button **"Fix a booking"**; note "Pay the host directly. Never pay before you've confirmed the place is real."; breakdown line `N nights × ₦price = ₦subtotal`.
- Amenity lists (exact labels) are in spec §2.
- Every user-facing error via `friendlyError`. Clients hide stays features when the SQL hasn't run (missing column/function → no crash).

## Review Focus

- **SQL not run yet:** stays tab, stay form option and stay booking must not error; amenities still save. Pinned in Task 4 (`fetchTakenDates returns [] when the function is missing`) and Task 3 (stays search falls back without stays filters).
- **Overlap at the edges:** a stay checking out on the day another checks in does not overlap. Pinned in Task 1 (`check-out day is free for the next check-in`).
- **Editing an existing listing** with old comma-text features keeps them as amenities. Pinned in Task 2 (`old features become amenities`).
- **Price per night shown everywhere a stay appears** (cards, page, card image, share text). Pinned in Task 1 (`priceParts for a stay ends with /night`).
- **Guest count over max / nights under min chosen in the UI** must be blocked before sending. Pinned in Task 1 (`validateStayRequest`).

---

### Task 1: Shared stay rules and amenities

**Files:**
- Modify: `shared/property.js`, `shared/__tests__/property.test.js`
- Create: `shared/stays.js`, `shared/__tests__/stays.test.js`

**Interfaces:**
- Produces in `property.js`: `CATEGORIES` gains `{ value: "stays", label: "Stays", blurb: "Shortlets, hotel rooms and Airbnbs" }`; `PROPERTY_TYPES` gains the three stay types; `PERIODS.night`; `periodOptions("rent","stays") -> ["night"]`; `AMENITIES: Record<category, string[]>` (spec §2 labels, in order) and `amenitiesFor(category) -> string[]`; `keyFacts(stay)` → `["4 guests max", "2-night minimum"]` (min nights only when > 1), plus `hotel_name` first for hotel rooms; `detailFacts(stay)` adds `guests`, `minNights`, `checkIn`, `checkOut` keys.
- Produces in `stays.js`: `STAY_STATUS` (labels: requested "Requested", accepted "Accepted", declined "Declined", cancelled "Cancelled"); `stayNights(checkIn, checkOut) -> number` (date strings `YYYY-MM-DD`); `stayQuote(listing, checkIn, checkOut) -> { nights, nightly, subtotal, cleaning, caution, total, rows: {label, amount}[] }`; `rangesOverlap(a, b) -> boolean` (half-open `[check_in, check_out)`); `validateStayRequest(listing, { checkIn, checkOut, guests, note }, taken, today) -> Record<field,string>`; `stayActions(stay, role, today) -> { accept, decline, cancel, review }`; `sortStays(list, today)` (upcoming first by check_in, then past newest first).

- [ ] **Step 1: Failing tests** (`shared/__tests__/stays.test.js`, `property.test.js`):
  - `stayNights counts nights` — `("2026-11-01","2026-11-04") → 3`.
  - `stayQuote adds cleaning and caution once` — listing `{ price: 45000, cleaning_fee: 10000, caution_deposit: 20000 }`, 3 nights → subtotal 135000, total 165000, first row label `3 nights × ₦45,000`.
  - `check-out day is free for the next check-in` — `rangesOverlap({check_in:"2026-11-01",check_out:"2026-11-04"},{check_in:"2026-11-04",check_out:"2026-11-06"}) → false`; `"2026-11-03".."2026-11-05" → true`.
  - `validateStayRequest` — errors for: guests 5 with `max_guests: 4` (`guests: "This place sleeps up to 4 guests."`), 1 night with `min_nights: 2` (`checkOut: "This place needs at least 2 nights."`), check-in before today (`checkIn: "Choose a check-in date from today."`), check-out not after check-in (`checkOut: "Check-out must be after check-in."`), 91 nights (`checkOut: "Stays can be up to 90 nights."`), overlap with a taken range (`checkIn: "Some of those dates are already booked."`), note over 500 (`note: "Keep your note under 500 characters."`); `{}` for a valid request.
  - `priceParts for a stay ends with /night` — `{ category:"stays", listing_type:"rent", price_period:"night", price: 45000 }` → suffix `/night`.
  - `amenitiesFor gives each category its list` — `amenitiesFor("stays")[0] === "Wi-Fi"`, `amenitiesFor("land")` includes `"Corner piece"`, `amenitiesFor("homes")` includes `"Prepaid meter"`.
  - `keyFacts for stays` — hotel room `{ category:"stays", property_type:"hotel_room", hotel_name:"Eko Suites", max_guests: 2, min_nights: 1 }` → `["Eko Suites", "2 guests max"]`.
  - `stayActions` — host on requested → accept+decline; guest on requested → cancel; either on accepted before check-out → cancel; on accepted after check-out → review only.
- [ ] **Step 2: Run** `node --test "shared/__tests__/*.test.js"` — Expected: FAIL.
- [ ] **Step 3: Implement.** Dates compared as strings/UTC days; money with `formatNaira`.
- [ ] **Step 4: Run** — Expected: PASS.
- [ ] **Step 5: Commit** `feat(shared): stay types, amenities and stay booking rules`

---

### Task 2: Listing draft, validation and wizard steps

**Files:**
- Modify: `shared/lister.js`, `shared/__tests__/lister.test.js`, `mobile/src/lib/wizardSteps.ts`, `mobile/src/lib/__tests__/wizardSteps.test.ts`

**Interfaces:**
- Consumes: Task 1 constants.
- Produces: `EMPTY_DRAFT` gains `maxGuests: ""`, `minNights: "1"`, `checkInTime: ""`, `checkOutTime: ""`, `cleaningFee: ""`, `hotelName: ""`, `houseRules: ""`; `features` becomes `string[]` (default `[]`). `draftFromListing` maps the new columns; old `features` arrays pass through. `draftToRow` writes `max_guests`, `min_nights`, `check_in_time`, `check_out_time`, `cleaning_fee`, `hotel_name` (hotel rooms only), `house_rules` only for stays (null otherwise), `bedrooms`/`bathrooms` for homes and stays, `price_period: "night"` for stays, `caution_deposit` for rent and stays, `features` trimmed, deduped, ≤ 30. `validateDraft` adds: `maxGuests` "Enter how many guests can stay (1–50).", `minNights` "Minimum nights must be between 1 and 365.", `hotelName` "Enter the hotel's name.", `cleaningFee` "Enter ₦0 or more.", `houseRules` "Keep house rules under 1000 characters.", `features` "Up to 30 amenities, each under 40 characters.".
- App `STEPS` becomes `["what","where","details","stay","amenities","price","photos","review"]` with `stepsFor(category) -> Step[]` (omits `stay` unless stays); titles `stay: "Stay rules"`, `amenities: "Amenities"`; `FIELDS.stay = ["maxGuests","minNights","hotelName","houseRules"]`, `FIELDS.amenities = ["features"]`, `price` adds `cleaningFee`.

- [ ] **Step 1: Failing tests:** `stays draft saves stay fields and per-night price`; `non-stays drafts save no stay fields`; `hotel rooms need a hotel name`; `old features become amenities` (`draftFromListing({ features: ["Borehole", "POP"] }).features` deep-equals the array); `features are trimmed, deduped and capped at 30`; app `stepsFor("stays") includes stay; stepsFor("homes") does not`.
- [ ] **Step 2: Run** shared tests and `cd mobile && npx jest src/lib/__tests__/wizardSteps.test.ts` — FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** — PASS (also update existing tests that relied on comma-string `features`).
- [ ] **Step 5: Commit** `feat(shared): listing drafts for stays and amenities`

---

### Task 3: Search — Shortlets tab and filters

**Files:**
- Modify: `shared/search.js`, `shared/__tests__/search.test.js`, `src/lib/search.js`

**Interfaces:**
- Produces: `SEARCH_TABS` = rent, sale, `{ value: "stays", label: "Shortlets", heading: "Shortlets & hotels" }`, commercial. Filter keys add `guests`, `checkin`, `checkout`, `amen` (comma-separated labels). `searchTypeOptions("stays")` → the three stay types. `buildQuery(client, f, page)` for stays: `category = stays`; `guests` → `.gte("max_guests", n)`; `amen` → `.contains("features", list)`; valid `checkin`/`checkout` → calls `client.rpc("stays_unavailable", { p_check_in, p_check_out })` first and adds `.not("id", "in", "(ids)")` when non-empty; RPC/column missing → runs without those filters. Changing tab clears `guests`, `checkin`, `checkout`, `amen`. `browsePath(stay)` → `/listings?tab=stays`.

- [ ] **Step 1: Failing tests:** `search tabs are Rent, Buy, Shortlets and Commercial`; `stays search filters by guests, amenities and free dates` (fake client records `gte max_guests 3`, `contains features ["Wi-Fi","Kitchen"]`, rpc args and `not id in (a,b)`); `stays search still works when stays_unavailable is missing` (rpc returns PGRST202 → no `not` call, result returned); `changing tab clears stay filters`; `browsePath for a stay`.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `feat(shared): Shortlets search tab and stay filters`

---

### Task 4: Database and stay booking calls

**Files:**
- Create: `supabase/stays.sql`
- Modify: `shared/stays.js` (wrappers), `shared/__tests__/stays.test.js`, `shared/__tests__/sql.test.js`

**Interfaces:**
- SQL (security definer, `set search_path = public`, re-runnable):
  - listings: category check `('homes','land','commercial','stays')`; price period check adds `night`; columns `max_guests int check 1..50`, `min_nights int check 1..365`, `check_in_time time`, `check_out_time time`, `cleaning_fee numeric check >= 0`, `hotel_name text check length <= 100`, `house_rules text check length <= 1000`.
  - `stay_bookings` per spec §6 with `status check in ('requested','accepted','declined','cancelled')`, `check (check_out > check_in)`, `check (guests between 1 and 50)`, `check (note is null or length(note) <= 500)`, `check (decline_reason is null or length(decline_reason) <= 200)`; indexes on (listing_id, check_in), (guest_id, check_in); RLS select for guest or listing owner; no client write policies.
  - `request_stay(p_listing uuid, p_check_in date, p_check_out date, p_guests int, p_note text) returns uuid` — re-checks every rule from Task 1 (own listing, active stays listing, guests ≤ max_guests, nights ≥ min_nights, ≤ 90, check-in ≥ today Lagos, no overlap with accepted) with the same messages; copies prices; notifies host ('stay_request', 'New stay request').
  - `respond_stay(p_id uuid, p_accept boolean, p_reason text) returns void` — listing owner only, requested only; on accept locks the listing row, refuses if an accepted stay overlaps ("Those dates are already booked."), sets accepted, auto-declines overlapping requested ones with "Those dates were taken" and notifies them; notifies guest ('stay_accepted' "Stay accepted" / 'stay_declined' "Stay request declined").
  - `cancel_stay(p_id uuid) returns void` — guest (requested/accepted) or owner (accepted), before check-out; notifies the other party ('stay_cancelled' "Stay cancelled").
  - `listing_taken_dates(p_listing uuid) returns table (check_in date, check_out date)` — accepted, check_out ≥ today; granted to anon.
  - `stays_unavailable(p_check_in date, p_check_out date) returns setof uuid` — listings with an accepted overlap; granted to anon.
  - Reminder: `ile_stay_reminders()` daily 07:05 ("Check-in tomorrow"), scheduled `ile-stay-reminders`.
  - Reviews: `reviews.inspection_id` drop not null, add `stay_booking_id uuid references stay_bookings on delete cascade`, check exactly one of the two set, unique (stay_booking_id, reviewer_id); `leave_stay_review(p_stay uuid, p_rating int, p_comment text, p_accurate boolean) returns uuid` — guest or owner of an accepted stay whose check_out ≤ today.
  - `shared/notifications.js` (+ Edge copy) maps `stay_*` types to "bookings".
- Wrappers in `stays.js` (client first): `requestStay`, `respondStay`, `cancelStay`, `fetchTakenDates(client, listingId) -> [] on missing`, `fetchMyStays(client, userId)`, `fetchStayRequests(client, listingIds)`, `leaveStayReview`.

- [ ] **Step 1: Failing tests:** `fetchTakenDates returns [] when the function is missing`; `requestStay passes dates, guests and note and throws the database message`; `respondStay passes accept and reason`; sql: `stays.sql re-checks overlap and locks the listing on accept` (text contains `for update` in respond_stay and an overlap condition `check_in < ` … `check_out >`); `Edge Function copy matches` stays green after the notifications change.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** shared tests — PASS.
- [ ] **Step 5: Commit** `feat(db): stay bookings, stay listing columns and stay reviews`

---

### Task 5: Website listing form — stays and amenities

**Files:**
- Modify: `src/components/ListingForm.jsx`
- Create: `src/components/AmenityPicker.jsx`

**Interfaces:**
- Consumes: Tasks 1–2.
- Produces: category choice shows Stays (hidden when the database lacks the `max_guests` column — detected by `supabase.from("listings").select("max_guests").limit(1)` error code 42703); stays sections: hotel name (hotel rooms), price per night, cleaning fee, caution deposit, bedrooms, bathrooms, max guests, minimum nights, check-in/check-out times, house rules; `AmenityPicker({ category, value, onChange })` — tick boxes from `amenitiesFor(category)` plus "Add your own" input; shown for every category.

- [ ] **Step 1: Failing test** `shared/__tests__/copy.test.js`: `listing form offers amenities and stays` — `src/components/ListingForm.jsx` source contains `AmenityPicker` and `"stays"`.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** shared tests, `npx eslint .`, `npx next build` — pass.
- [ ] **Step 5: Commit** `feat(web): stays and amenities in the listing form`

---

### Task 6: Website — Shortlets search, home cards, listing page and stay booking

**Files:**
- Modify: `src/components/ListingsBrowser.jsx`, `src/components/SearchBox.jsx`, `src/app/page.js`, `src/components/ListingDetail.jsx`, `src/components/PropertyCard.jsx`
- Create: `src/components/StayBookingPanel.jsx`, `src/components/DateRangePicker.jsx`

**Interfaces:**
- Consumes: Tasks 1, 3, 4.
- Produces: Shortlets tab filters (check-in, check-out, guests, type, min/max price per night, amenities multi-select); home cards = Homes (`/listings`), Shortlets & hotels (`/listings?tab=stays`), Land (`/listings?tab=sale&ptype=land`), Shops & offices (`/listings?tab=commercial`); listing page "Amenities" tick list (replaces "What's included"), stay facts, house rules, check-in/out times; `StayBookingPanel` replaces `BookingPanel` for stays: `DateRangePicker` (taken dates disabled), guests stepper, `stayQuote` breakdown, note, "Fix a booking" → `requestStay`, then shows the request status; errors from `validateStayRequest` and `friendlyError`.

- [ ] **Step 1: Failing test** (`copy.test.js`): `home page has the four category cards` — `src/app/page.js` contains `"Shortlets & hotels"`, `"Shops & offices"` and no `"Homes for sale"`.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** shared tests, lint, build; then `npx next start` and load `/listings?tab=stays` and a stay listing page (200, no console errors).
- [ ] **Step 5: Commit** `feat(web): Shortlets search, home cards and stay booking`

---

### Task 7: Website — stay requests, My bookings and stay reviews

**Files:**
- Modify: `src/app/dashboard/page.jsx`, `src/app/my-bookings/page.jsx`, `src/components/ReviewForm.jsx`
- Create: `src/components/StayRequestCard.jsx`

**Interfaces:**
- Consumes: Task 4 wrappers, Task 1 `stayActions`, `sortStays`, `STAY_STATUS`.
- Produces: dashboard "Stay requests" section (requested first, then upcoming accepted, past collapsed) with Accept / Decline (reason dialog) / Message / Cancel; My bookings lists stays (upcoming first) with Cancel and Review; `ReviewForm` accepts `{ stayId }` and calls `leaveStayReview`.

- [ ] **Step 1: Failing test** (`stays.test.js`): `sortStays puts upcoming first` (requested/accepted with future check_in ascending, then past by check_out descending).
- [ ] **Step 2: Run** — FAIL (if not covered in Task 1; otherwise extend with a declined/cancelled ordering case).
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** shared tests, lint, build.
- [ ] **Step 5: Commit** `feat(web): stay requests, stays in My bookings, stay reviews`

---

### Task 8: App wizard — stays and amenities

**Files:**
- Modify: `mobile/src/components/wizard/ListingWizard.tsx`, `steps/What.tsx`, `steps/Details.tsx`, `steps/Price.tsx`, `steps/Review.tsx`
- Create: `mobile/src/components/wizard/steps/Stay.tsx`, `steps/Amenities.tsx`, `mobile/src/components/__tests__/Amenities.test.tsx`

**Interfaces:**
- Consumes: Task 2 `stepsFor`, Task 1 `amenitiesFor`.
- Produces: wizard walks `stepsFor(draft.category)`; What step shows Stays (hidden when unsupported, same detection as Task 5 via a cached query); Stay step fields; Amenities step: chips from `amenitiesFor`, "Add your own" field, max 30.

- [ ] **Step 1: Failing test:** `Amenities step toggles a chip and adds a custom amenity` (render with `category="stays"`, press "Wi-Fi", add "Rooftop", expect `onChange` with `["Wi-Fi","Rooftop"]`).
- [ ] **Step 2: Run** `cd mobile && npx jest src/components/__tests__/Amenities.test.tsx` — FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npx jest`, `npx tsc --noEmit`, `npx expo lint`.
- [ ] **Step 5: Commit** `feat(mobile): stays and amenities in the listing wizard`

---

### Task 9: App — Shortlets search, home cards, listing page and stay booking

**Files:**
- Modify: `mobile/src/app/search.tsx`, `mobile/src/app/filters.tsx`, `mobile/src/lib/ui/home.ts`, `mobile/src/components/home/Sections.tsx`, `mobile/src/app/listing/[id].tsx`, `mobile/src/components/ListingActions.tsx`, `mobile/src/app/_layout.tsx`
- Create: `mobile/src/app/stay/[id].tsx`, `mobile/src/components/MonthGrid.tsx`, `mobile/src/components/__tests__/StayBooking.test.tsx`

**Interfaces:**
- Consumes: Tasks 1, 3, 4.
- Produces: `HOME_CATEGORIES` = homes (tab rent), stays (tab stays), land (tab land), commercial; filter sheet shows guests, amenities chips for stays; check-in/out via `MonthGrid` in the filter sheet; listing page shows Amenities, stay facts, house rules; `ListingActions` primary for stays opens `/stay/[id]`; stay screen: `MonthGrid` range picker (taken dates disabled), guests stepper, quote, note, "Fix a booking" → `requestStay`.

- [ ] **Step 1: Failing tests:** `HOME_CATEGORIES are Homes, Shortlets & hotels, Land, Shops & offices` (update `home.test.ts`); `stay screen shows the breakdown and blocks too many guests` (mock supabase + `fetchTakenDates`; choose 3 nights; expect `3 nights × ₦45,000`; set guests over max → error text "This place sleeps up to 2 guests.").
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npx jest`, `npx tsc --noEmit`, `npx expo lint`.
- [ ] **Step 5: Commit** `feat(mobile): Shortlets search, home cards and stay booking`

---

### Task 10: App — stay requests, My bookings and stay reviews

**Files:**
- Modify: `mobile/src/components/dashboard/Dashboard.tsx`, `mobile/src/components/MyViewings.tsx`, `mobile/src/components/ReviewSheet.tsx`, `mobile/src/lib/queryClient.ts`
- Create: `mobile/src/components/StayCard.tsx`, `mobile/src/components/__tests__/StayCard.test.tsx`

**Interfaces:**
- Consumes: Task 4 wrappers, Task 1 `stayActions`.
- Produces: dashboard "Stay requests"; My bookings shows stays first by date; `StayCard({ stay, role, onChanged })` with Accept / Decline (reason sheet) / Cancel / Message / Review; query keys `["stays", userId]`, `["stay-requests", userId]` persisted offline.

- [ ] **Step 1: Failing test:** `StayCard shows Accept and Decline to the host for a request, Cancel to the guest`.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npx jest`, `npx tsc --noEmit`, `npx expo lint`, `npx expo-doctor` (known patch warnings only).
- [ ] **Step 5: Commit** `feat(mobile): stay requests, stays in My bookings, stay reviews`

---

### Task 11: Hand-off and full verification

**Files:**
- Create: `docs/stays-setup.md` (run `supabase/stays.sql`; quick test steps; what hosts and guests see)

- [ ] **Step 1:** Full gates — root: shared tests, `npx eslint .`, `npx next build`; mobile: `npx jest`, `npx tsc --noEmit`, `npx expo lint`, `npx expo export --platform android`.
- [ ] **Step 2:** Write `docs/stays-setup.md`.
- [ ] **Step 3: Commit** `docs: stays setup for the founder`
