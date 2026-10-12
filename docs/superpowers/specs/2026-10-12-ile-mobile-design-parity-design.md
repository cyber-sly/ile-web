# Ile mobile app: design parity with the website

**Date:** 2026-10-12
**Status:** Approved in conversation (Home and Log in/Sign up mockups approved 2026-10-12)

## Why

The founder's feedback after M6: the app works like the website but doesn't
look like it, and it has no home page. People who use both should see the same
Ile. Success: opening the app feels like the website on a phone: same home
page, same sign-in screens, same cards, buttons, fields, badges and headings,
while staying a native app.

## Decisions

| Topic | Decision |
|---|---|
| Direction | **C**: match the website's phone layout; adapt only where it's awkward in an app. |
| First screen | A new **Home** tab (the website's home page). No one-time welcome screen. |
| Tabs | **Home · Saved · Inbox · Viewings/Dashboard · Account** ("Log in" when logged out, like the website's mobile bar). |
| Search | Full results screen opened from Home (search box, tab chips, category tiles, "See all"). |
| Sign-in screens | Website's wording, fields and order; the website's desktop photo + quote becomes a photo header. Google above the form, as on the website. |
| Scope | Look and layout only. Behaviour, data, colours and fonts unchanged. |

## 1. The app's website kit

App versions of the website's building blocks (`src/components/ui/*`,
`PropertyCard.jsx`), so every screen matches automatically:

- **Button**: variants primary, secondary (outline), neutral, ghost, onDark, danger, danger-ghost; sizes sm, md, lg; full width; loading.
- **Field**: label (+ "Optional"), icon inside the box, hint or error under it, password eye; multiline and select-like variants.
- **Badge**: tones neutral, palm, gold, clay, solid, sale; `ListingTypeBadge`, `VerifiedBadge`, `BoostedBadge`, `StatusBadge` (labels from `shared/viewings.js`).
- **PropertyCard**: website card: shadow, type and boosted badges on the photo, gold category line ("LAND · C OF O"), price with suffix, title, pin + place, facts.
- **SectionHeading**: serif heading with optional subline and "See all" link.
- **EmptyState** (icon, heading, text, action) and **Skeleton** placeholders (cards, rows) replacing spinners.
- **PhotoHeader**: photo with dark gradient, logo, close button and serif quote.
- **Shadows**: website card and float shadows as shared style tokens in `theme.ts`.

## 2. Screens

- **Home (new)**, top to bottom as approved:
  - hero photo (`/videos/hero-poster.jpg` bundled), logo, "Find your place in Nigeria, *without the wahala.*" and the line under it;
  - floating search box (Rent/Buy/Land/Commercial + area field + Search);
  - the three promises;
  - "Fresh on Ile" (newest 8, horizontal cards, "See all");
  - "What are you looking for?" (four photo tiles);
  - "How Ile works";
  - the dark "For owners and agents / Have a property to let or sell?" panel ("List your property free" → sign up as lister or the listing form).
- **Search results** (from the current Search tab): heading from `SEARCH_TABS` ("Homes for rent") with the result count, tab chips, search field, Filters button with active-filter chips (tap to remove), website cards, skeletons while loading, website empty state.
- **Log in / Sign up**: as approved (photo header + quote, website copy and order, Google/Apple above the form with an "or" divider). **Forgot password**: same layout without the photo.
- **Listing screen**:
  - badges row (type, serviced, verified, boosted) and pin + full place;
  - facts in the website's bordered two-column grid with small uppercase labels and icons;
  - "About this place" and "What's included" with green tick circles;
  - price and move-in cost styled like the website's booking panel.
- **Saved, Inbox, chat, Viewings, Dashboard, listing wizard, viewing times, lister profile, Account, Edit profile, notifications**: same layouts, rebuilt with the kit (cards, badges, headings, empty states, buttons and fields), following the matching website pages.
- **Tab bar**: website mobile bar look; last tab reads "Log in" when logged out.

## 3. Checks

- Unit tests for kit pieces with logic (badge choice per listing, category line text, active-filter chips, empty-state actions).
- Type check, lint, Jest, Android bundle, Expo doctor, as in every milestone.
- Screenshots of Home, results, listing, Log in, Sign up and Account from the app's web preview, compared with the website at phone width before hand-over; the founder then checks on the phone.

## Out of scope

New features, behaviour changes, colour or font changes, a welcome/onboarding screen, the website's hero video (the app shows the still photo, as the website does on phones).
