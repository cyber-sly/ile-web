# Ile Mobile — Design Parity with the Website Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The app looks like the website on a phone: a new Home tab (the website's home page), website-style Log in / Sign up / Forgot password, and every screen rebuilt from app versions of the website's buttons, fields, badges, cards, headings, empty states and placeholders.

**Architecture:** A small "website kit" in `mobile/src/components/kit/` mirrors `src/components/ui/*` and `PropertyCard.jsx` (same variants, tones, radii, shadows from `globals.css`). Pure helpers that decide what a component shows (badges per listing, category line, active-filter chips, fact icons, tab title) live in `mobile/src/lib/ui/` with unit tests. Navigation gains a Home tab; the current Search tab becomes a `/search` results screen. Screens then swap their ad-hoc pieces for kit pieces. Look and layout only.

**Tech Stack:** Expo SDK 57, Expo Router, React Native, `expo-image`, `expo-linear-gradient` (new, for photo gradients), lucide-react-native, jest-expo + react-test-renderer, Node `node --test` for `shared/`.

**Spec:** `docs/superpowers/specs/2026-10-12-ile-mobile-design-parity-design.md`

## Global Constraints

- Look and layout only: no behaviour, data, colour or font changes. Every existing test keeps passing.
- Every M1–M6 constraint still applies (`npx expo install`, theme tokens from `mobile/src/theme.ts`, `friendlyError` for shown errors, commit trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, never stage `brag-output/`, scripted edits only through the exact-text helper — never `String.replace` with `$` in replacements).
- Website values to copy exactly (from `src/app/globals.css` and `src/components/ui/*`):
  - radii: control 10, card 16, hero 20;
  - shadows: card `0 1px 2px rgba(30,27,22,0.04)`, float `0 14px 34px -18px rgba(30,27,22,0.45)`;
  - button heights: sm 36, md 44, lg 48, icon 44 round;
  - button variants: primary (palm bg, white), secondary (palm border + text), neutral (line-strong border, surface bg, ink), ghost (ink-muted), danger (clay bg, white), danger-ghost (clay text), onDark (surface bg, ink);
  - badge tones: neutral (ink 5% bg, ink-muted), palm (palm-soft, palm), gold (gold-soft, gold-ink), clay (clay-soft, clay), solid (palm, white), sale (ink, white), overlay (surface 95%, ink); pill, 12 px semibold;
  - card: surface bg, line border, radius card, shadow card, 4:3 photo, 16 px body padding, price 18 px bold with muted suffix, category line 11 px bold uppercase gold-ink;
  - photo gradient: `#0F1C15` from 85% at the bottom to transparent.
- Website copy to use verbatim (from `src/app/page.js`, `HomeHero.jsx`, `login/page.jsx`, `signup/page.jsx`):
  - hero: "Find your place in Nigeria, *without the wahala.*" / "Homes, land and shops to rent or buy, from Lagos to Kano. Free to search, free to view. No inspection fees.";
  - promises: "Free to search, save and view" · "No inspection or search fees" · "Prices shown upfront on every listing";
  - "Fresh on Ile" / "The newest homes and property listed across Nigeria." / "See all";
  - categories: "Homes for rent" (Flats, self-contains and duplexes.), "Homes for sale" (Own your home, with the asking price upfront.), "Land" (Plots and farmland, with the title document shown.), "Shops and offices" (Space to run your business.), each "Browse", with the website's Unsplash images;
  - "How Ile works": Search for free / Book a viewing / Move in (website body text);
  - owners panel: "For owners and agents" / "Have a property to let or sell?" / "List it free in a few minutes. Serious home-seekers book viewings straight from your listing, and you manage every request in one dashboard." / "List your property free";
  - log in quote "Your next place is *already listed.*" (image `photo-1600607687939-ce8a6c25118c`); sign up quote "A home, a shop, a plot. *Without the wahala.*" (image `photo-1613977257363-707ba9348227`).
- Tabs: Home · Saved · Inbox · Viewings/Dashboard · Account; the last tab is titled "Log in" when logged out.
- Gates per task: `npx jest`, `npx tsc --noEmit`, `npx expo lint` in `mobile/`; `npm run test:shared`, `npm run lint`, `npm run build` when `shared/` or `src/` change.

## Review Focus

- **Home with no listings yet or offline:** "Fresh on Ile" shows placeholders while loading, then the website's empty state ("No listings yet" + "List the first property"), or a short offline line — never a blank gap — pinned by Task 3 `freshSectionState` test.
- **Removing an active filter chip:** removing the state chip also clears the LGA (website rule) — pinned by Task 4 `activeFilterChips` removal test.
- **Logged-out person on the last tab:** it reads "Log in" and opens the log-in screen — pinned by Task 3 `accountTabTitle` test.
- **Listing of each category:** land shows the gold "RESIDENTIAL LAND" line and title-document facts; homes show no gold line — pinned by Task 1 `categoryLine` tests and Task 5 `factIcon` coverage test.
- **Small phones (360 px wide):** hero text and the floating search box fit without clipping — pinned by Task 7 screenshot check at 360 × 800.

---

### Task 1: The website kit

**Files:**
- Install: `npx expo install expo-linear-gradient`
- Modify: `mobile/src/theme.ts` (add `shadows.card`, `shadows.float` as RN shadow + elevation styles; `colors.sale = "#1E1B16"`, `colors.heroShade = "#0F1C15"`)
- Create in `mobile/src/components/kit/`: `Button.tsx`, `Field.tsx`, `Badge.tsx`, `SectionHeading.tsx`, `EmptyState.tsx`, `Skeleton.tsx`, `PhotoHeader.tsx`, `index.ts`
- Create: `mobile/src/lib/ui/listingBadges.ts`, `mobile/src/lib/ui/__tests__/listingBadges.test.ts`
- Modify: `mobile/src/components/Button.tsx` and `mobile/src/components/Field.tsx` become re-exports of the kit versions (existing screens keep working; the Field password-eye test stays green)

**Interfaces (Produces):**
- `Button({ label, onPress, variant = "primary", size = "md", full = true, loading, disabled, icon?: LucideIcon })` with the variants and sizes above (existing `variant="secondary" | "ghost" | "danger"` callers keep their meaning).
- `Field(TextInputProps & { label: string; icon?: LucideIcon; optional?: boolean; hint?: string; error?: string })` (password eye kept).
- `Badge({ tone, icon?, children })`; `ListingTypeBadge({ type })` ("For sale" sale tone / "For rent" solid); `VerifiedBadge`, `BoostedBadge` (website labels "Verified" / "Boosted" with BadgeCheck / Zap icons); `StatusBadge({ status })` (from `VIEWING_STATUS`; replaces `components/StatusBadge.tsx`, which becomes a re-export).
- `SectionHeading({ title, subtitle?, action?: { label, onPress } })` (serif 24/28).
- `EmptyState({ icon, title, children?, action?, tone = "palm" })` (dashed border, surface 60%, round icon chip 56).
- `Skeleton({ width?, height, radius? })`, `CardSkeleton()`, `RowSkeleton()` (pulsing line colour, respects reduce motion).
- `PhotoHeader({ image, quote: ReactNode, onClose? })` (220 tall, gradient, logo, close button, serif 22 quote).
- `listingBadges(listing) -> ("boosted" | "type")[]` and `categoryLine(listing) -> string | null` (`typeLabel(property_type)` upper-cased when category isn't homes, else null).

- [ ] **Step 1: Write failing tests** (`listingBadges.test.ts`): `categoryLine shows the type for land and commercial only` — `{category:"land", property_type:"residential_land"}` → `"RESIDENTIAL LAND"`; `{category:"homes", property_type:"flat"}` → null. `listingBadges puts boosted before the type badge` — `{is_boosted:true}` → `["boosted","type"]`; `{}` → `["type"]`. `kit Badge renders the website label for each listing type` (react-test-renderer: `ListingTypeBadge type="sale"` text "For sale"; "rent" → "For rent").
- [ ] **Step 2: Run** `npx jest src/lib/ui` — Expected: FAIL.
- [ ] **Step 3: Implement** the kit, theme tokens and re-exports.
- [ ] **Step 4: Run** the mobile gate — Expected: all pass (existing tests included).
- [ ] **Step 5: Commit** `feat(mobile): website design kit`

---

### Task 2: Website listing card

**Files:**
- Modify: `mobile/src/components/PropertyCard.tsx`
- Create: `mobile/src/components/__tests__/PropertyCard.test.tsx`

**Interfaces:** Consumes Task 1. Produces `PropertyCard({ listing, width? })` — website card (shadow card, badges on the photo top-left from `listingBadges`, heart top-right, gold `categoryLine`, price + muted short suffix, one-line title, MapPin + `placeLabel`, `keyFacts` line). `width` fixes the card width for horizontal rows (Home); default fills the column.

- [ ] **Step 1: Write failing tests**: `shows the gold category line for land`; `shows For rent and Boosted badges on the photo` (mocks `expo-router`, `@/lib/saved`).
- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the mobile gate.
- [ ] **Step 5: Commit** `feat(mobile): website listing card`

---

### Task 3: Home tab and navigation

**Files:**
- Copy asset: `public/videos/hero-poster.jpg` → `mobile/assets/images/hero.jpg`
- Move: `mobile/src/app/(tabs)/index.tsx` → `mobile/src/app/search.tsx` (results screen; restyled in Task 4)
- Create: `mobile/src/app/(tabs)/index.tsx` (Home), `mobile/src/components/home/{Hero,SearchCard,Promises,FreshListings,Categories,HowItWorks,OwnersPanel}.tsx`, `mobile/src/lib/ui/home.ts`, `mobile/src/lib/ui/__tests__/home.test.ts`
- Modify: `shared/search.js` (+ `fetchLatestListings`), `shared/__tests__/search.test.js`, `src/app/page.js` (use it), `mobile/src/app/(tabs)/_layout.tsx` (Home tab with House icon; last tab title from `accountTabTitle`), `mobile/src/app/_layout.tsx` (register `search`, header hidden)

**Interfaces (Produces):**
- `fetchLatestListings(client, limit = 8) -> listings` (`status = active`, `last_confirmed_at >= freshCutoff()`, newest first, `limit`) — the website's home query.
- `accountTabTitle(user) -> "Account" | "Log in"`; logged out, the tab press opens `/login`.
- `freshSectionState({ isPending, online, count }) -> "loading" | "offline" | "empty" | "list"`.
- `HOME_CATEGORIES` = the four website categories with `{ title, blurb, image, tab }` (`rent` / `sale` / `land` / `commercial`).
- Home sections per the spec and Global Constraints copy; Search, tab chips, category tiles and "See all" call `changeFilters({ tab, q })` then `router.push("/search")`; owners panel → `/list/new` if logged in as lister, `/signup` (role landlord) otherwise. "Fresh on Ile" uses `["home-latest"]` (persisted) and `PropertyCard width={250}` in a horizontal list.

- [ ] **Step 1: Write failing tests** — shared: `fetchLatestListings asks for fresh active listings, newest first` (fake builder records `eq status active`, `gte last_confirmed_at`, `order created_at desc`, `limit 8`). App: `accountTabTitle says Log in when logged out`; `freshSectionState shows placeholders, offline, empty or the list` (pending+online → loading; pending+offline → offline; 0 → empty; 3 → list); `HOME_CATEGORIES uses the website's four categories in order`.
- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: Implement** (website `src/app/page.js` switches to `fetchLatestListings`).
- [ ] **Step 4: Run** the website and mobile gates (regenerate typed routes).
- [ ] **Step 5: Commit** `feat(mobile): home tab like the website`

---

### Task 4: Search results like the website's listings page

**Files:**
- Modify: `mobile/src/app/search.tsx`, `mobile/src/app/filters.tsx` (kit fields and buttons)
- Create: `mobile/src/lib/ui/filterChips.ts`, `mobile/src/lib/ui/__tests__/filterChips.test.ts`

**Interfaces:** `activeFilterChips(filters) -> { key, label }[]` (state → `stateLabel`, lga, ptype → `typeLabel`, purpose → "For rent"/"For sale", min/max → "From ₦1.5m" / "Up to ₦5m" via `formatNairaShort`, beds → "2+ beds", title → `titleShort`); removing calls `changeFilters({ [key]: "" })`. Screen: back button, serif heading from `SEARCH_TABS` heading + "N results", search field (kit Field with Search icon), tab chips, Filters button with count, chip row, website cards (full width), `CardSkeleton` ×3 while loading, kit `EmptyState` (Home icon, "No homes match these filters", "Try another area or fewer filters.", "Clear filters").

- [ ] **Step 1: Write failing tests**: `activeFilterChips lists applied filters in order with readable labels`; `removing the state chip also clears the LGA` (`applyFilterChange` result of `{state:""}` on `{state:"Lagos", lga:"Eti-Osa"}` has `lga ""`, and the chips list no longer has lga).
- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the mobile gate.
- [ ] **Step 5: Commit** `feat(mobile): search results like the website`

---

### Task 5: Log in, Sign up, Forgot password, and the listing screen

**Files:**
- Modify: `mobile/src/app/(auth)/login.tsx`, `signup.tsx`, `forgot-password.tsx` (PhotoHeader + website copy and order; headers hidden in `_layout.tsx` for these modals), `mobile/src/components/SocialButtons.tsx` (`placement: "top"` puts buttons first and the "or" divider after them), `mobile/src/app/listing/[id].tsx`, `mobile/src/components/MoveInCost.tsx`
- Create: `mobile/src/lib/ui/factIcons.ts`, `mobile/src/lib/ui/__tests__/factIcons.test.ts`

**Interfaces:** `FACT_ICONS` key → lucide icon for every `detailFacts` key (type Building2, bedrooms BedDouble, bathrooms Bath, furnishing Sofa, size Ruler, title FileCheck2, parking Car, toilets Bath, lister UserRound — as on the website). Listing screen: badges row (ListingTypeBadge, "Serviced" palm badge with Sparkles, VerifiedBadge, BoostedBadge), serif title, MapPin + `fullPlace`, price, facts grid (two columns, surface cells, 1 px line gaps, 11 px uppercase muted labels with icons, 15 px bold values), "About this place/land", "What's included" (green tick circles), MoveInCost in a surface card with float shadow like the website's booking panel.

- [ ] **Step 1: Write failing tests**: `every detail fact has an icon` (for land, homes and commercial sample listings, each `detailFacts` key is in `FACT_ICONS`); `SocialButtons on top shows the buttons before the divider` (extend `SocialButtons.test.tsx`: in render order, the "Continue with Google" button precedes the "or" text).
- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the mobile gate.
- [ ] **Step 5: Commit** `feat(mobile): website sign-in screens and listing page`

---

### Task 6: Every other screen on the kit

**Files (modify):** `mobile/src/app/(tabs)/saved.tsx`, `inbox.tsx`, `account.tsx`; `mobile/src/app/chat/[id].tsx`, `u/[id].tsx`, `notifications.tsx`, `book/[id].tsx`, `list/[id]/times.tsx`, `account/profile.tsx`, `account/password.tsx`, `account/delete.tsx`; `mobile/src/components/{MyViewings,ViewingCard,ReviewSheet,ReportSheet,NotificationsCard}.tsx`; `mobile/src/components/dashboard/*.tsx`; `mobile/src/components/wizard/**/*.tsx`

**Interfaces:** Consumes Task 1–2. Rules: page titles use the serif page heading (30); lists of listings use `PropertyCard`; loading lists show `CardSkeleton`/`RowSkeleton` instead of a lone spinner; empty lists use kit `EmptyState` with the website's copy for the matching page (Saved: Heart, "No saved homes yet"; Inbox: MessagesSquare, "No messages yet"; Viewings: CalendarX, "No viewings booked yet"; Dashboard listings: Home, "You haven't listed anything yet"); buttons and inputs use kit `Button`/`Field` (with icons where the website has them: Mail, Lock, UserRound, MapPin, Search); status pills use kit `StatusBadge`.

- [ ] **Step 1: Write failing test** `mobile/src/lib/ui/__tests__/kitUsage.test.ts`: `screens no longer use the old status badge or bare loading spinners for lists` — reads the files listed above and asserts none imports `@/components/StatusBadge` and the Saved, Inbox, MyViewings and Dashboard files import `CardSkeleton` or `RowSkeleton`.
- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: Implement** the sweep.
- [ ] **Step 4: Run** the mobile gate.
- [ ] **Step 5: Commit** `feat(mobile): every screen on the website kit`

---

### Task 7: Side-by-side check with the website

**Files:** none committed except fixes found; screenshots go to the plan workspace.

- [ ] **Step 1:** `npx expo export --platform web` in `mobile/`, serve `dist/`, and capture headless-Chrome screenshots (`--window-size=390,844` and `360,800`, `--virtual-time-budget=8000`) of Home, `/search`, a listing, `/login`, `/signup` and the Account tab; capture the website's matching pages (`https://ile-web-ten.vercel.app/`, `/listings`, a listing, `/login`, `/signup`, `/account`) at 390 × 844.
- [ ] **Step 2:** Compare pairs; for each visible mismatch in the spec's scope (spacing, type sizes, colours, missing section), fix it with a test where the difference is logic, otherwise visually, and re-shoot.
- [ ] **Step 3: Run** the full verification (website gate, mobile gate, `npx expo export --platform android`, `npx expo-doctor`).
- [ ] **Step 4: Commit** `fix(mobile): design parity touch-ups` (only if fixes were needed).
