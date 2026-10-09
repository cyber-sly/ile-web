# Ile mobile app: design

**Date:** 2026-10-09
**Status:** Approved in conversation, awaiting written-spec review

## Goal

Native Android and iPhone apps for Ile, built from **one codebase**, with
feature parity with the website for home-seekers and listers, plus push
notifications, offline support and phone features (camera, location, native
sharing). Released to Google Play and the App Store at the same time when
ready.

**Why an app (founder's answer: all of these):** store presence and trust;
push notifications; faster and lighter use on phones and weak data; phone
features.

## Decisions

| Topic | Decision |
|---|---|
| Framework | **Expo (React Native)**, one JS codebase for Android + iOS. Flutter rejected (no logic reuse); a Capacitor wrapper rejected (App Store guideline 4.2, weak offline). |
| Platforms | Android and iPhone built and tested together; both stores at launch. |
| Scope of v1 | Full parity for home-seekers and listers (below). Admin moderation stays web-only. |
| Backend | The existing Supabase project: same tables, row-level security, RPCs, rate limits, storage rules. No separate API. |
| Repo | Same GitHub repo (`ile-web`). New `shared/` (pure business rules) and `mobile/` (Expo app) folders. Website stays at the repo root; Vercel unchanged. |

## 1. Code organisation

```
ile-web/
├── src/          website (Next.js), unchanged deployment
├── shared/       pure JS used by web AND mobile: no React, no Next, no
│                 Supabase client singletons
│   ├── nigeria.js   states + 774 LGAs
│   ├── property.js  types, price periods, move-in cost, freshness,
│   │                report reasons, labels
│   ├── format.js    naira, dates, times
│   ├── search.js    filters -> query (takes a Supabase client as argument)
│   └── reviews.js   canReview / viewingDateReached (pure)
├── supabase/     SQL migrations (shared)
└── mobile/       Expo app, with its own package.json and node_modules
```

- Website imports shared modules via a `@shared/*` path alias. `src/lib/*`
  keeps thin re-exports where that avoids churn.
- Mobile resolves `../shared` via Metro `watchFolders` and the same alias.
- Separate dependency trees, so React Native version needs never affect the
  website.
- **Acceptance for the extraction step:** website lint and build pass, and all
  routes respond as before (smoke test), before any mobile code is written.

### Auth on mobile

- `@supabase/supabase-js` with session storage encrypted via the device
  keystore (Supabase's documented secure-store pattern for React Native).
- Carries over: "Keep me logged in", 30-day inactivity logout, log out of this
  device / all devices, change password, forgot password.
- Google sign-in on Android and iOS. **Sign in with Apple on iOS**, required
  by App Store guideline 4.8 when third-party login is offered.

## 2. Screens and navigation

Bottom tabs, matching the mobile website: **Search · Saved · Inbox ·
Viewings (home-seekers) or Dashboard (listers) · Account**.

Stack screens:
- **Listing:** photo/video carousel, facts, move-in cost, lister + rating,
  book (slot picker bottom sheet, or request a time), message, native share,
  save, report.
- **Lister profile** (`/u/[id]` equivalent).
- **Chat thread:** realtime, read receipts.
- **New / edit listing wizard:** What → Where ("Use my location" fills
  state/LGA) → Details (by category) → Price & fees (live move-in total) →
  Photos (camera or gallery, compress, reorder) → Review & publish.
- **Viewing times** (weekly availability; uses `set_listing_availability`).
- **Auth:** log in, sign up (role choice), forgot password, Google, Apple (iOS).
- **Search filters** in a bottom sheet; **"Near me"** reverse-geocodes the
  phone's location to a state/LGA filter (listings have no coordinates).

Design system: the same tokens as the web (cream, palm green, gold, clay,
Fraunces + Inter), implemented as React Native styles.

Links: shared URLs remain website URLs. Universal/App Links (open in app if
installed) wait for the custom domain.

## 3. Push notifications

- **`push_tokens`** table (user, Expo token, platform, updated_at); RLS so
  each user manages only their own; multiple devices per user.
- **`notifications`** table: one row per notification (user, type, title,
  body, data for deep link, read_at, sent_at). Doubles as an in-app
  notification list (and later a web bell).
- **Triggers** create notification rows on: new message (recipient), new
  viewing request or slot booking (lister), status change to confirmed /
  countered / declined / cancelled (other party), new review (reviewee).
- **Supabase Edge Function `send-push`** delivers pending rows via the Expo
  Push API (Android via FCM, iOS via APNs), batches, and deletes tokens
  reported invalid. Invoked from the database (pg_net) on insert.
- **Scheduled jobs (pg_cron), daily:** viewing-tomorrow reminders (both
  parties); "still available?" at day 30 (lister).
- **Collapse:** at most one message push per conversation per few minutes
  while unread.
- **Preferences** (Account): Messages / Bookings / Reminders toggles; "Hide
  message text on lock screen".
- Tapping a notification deep-links to the chat, booking or listing.

## 4. Offline and slow connections

- Cached data (persisted query cache): saved homes (full detail and photos,
  available offline), recently viewed listings, last search, last-loaded
  chats and viewings. An "offline" banner shows when disconnected.
- Messages composed offline are queued and sent on reconnect.
- The listing wizard autosaves a local draft; photos stay on the device until
  uploaded.
- Photos are compressed on the device (about 1600px, JPEG ~0.8) before upload,
  then uploaded one at a time with retry.
- Image disk cache; videos never auto-play.
- Live-only actions (book a slot, publish) are disabled offline with an
  explanation.
- **Saved homes move to the account:** a new `saved_listings` table (RLS
  own-rows), used by web and mobile. Logged-out saves stay on the device and
  merge into the account on login.

## 5. Testing and release

- Development builds on the founder's phone via QR (Android first, iOS via
  TestFlight once the Apple account exists).
- Automated unit tests for `shared/` (prices, move-in cost, review
  eligibility, search filter building), run before changes.
- Manual QA on a modest Android device.
- Beta: Google Play internal testing; Apple TestFlight.
- EAS Build + Submit for both stores; EAS Update for JS-only fixes.
- Store listings: name **Ile**, icon, screenshots, description, privacy
  policy URL (exists), Play Data safety and Apple App Privacy (from the
  Privacy Policy).

## Release blockers (decisions needed before store submission)

1. **In-app account deletion** is required by Apple (guideline 5.1.1(v)) and
   by Google Play. It's currently deferred by the founder. Proposed rules are
   in project memory and the conversation: delete the user's listings and
   media; keep chats for the other party as "Deleted user"; keep reviews they
   wrote, anonymised; keep reports, anonymised.
2. **Sign in with Apple** on iOS (or drop Google sign-in on iOS).

## Accounts and costs

| Item | Cost | Needed by |
|---|---|---|
| Expo account | Free | Start of build |
| Google Play Console | $25 once | Android beta |
| Apple Developer Program | $99/year | iOS beta, Sign in with Apple, APNs |
| Firebase project | Free | Android push |

## Out of scope for v1

Admin moderation in the app; payments (boosts, verified badge); email
notifications (waiting on domain and mailing platform); deep links that open
the app (waiting on domain); maps with exact coordinates.

## Build order (to be detailed in the implementation plan)

1. Extract `shared/` and repoint the website (no behaviour change).
2. `saved_listings` table and account-synced saves on the website.
3. Expo app skeleton: theme, tabs, Supabase auth (secure storage).
4. Browse and listing detail, saved homes, offline cache.
5. Booking (slots and requests), viewings, chat.
6. Lister: dashboard, listing wizard with camera, viewing times.
7. Push notifications (tables, triggers, Edge Function, cron, preferences).
8. Reviews, reports, profile, account settings, Google and Apple sign-in.
9. Testing, store assets, beta, release (after the release blockers are resolved).
