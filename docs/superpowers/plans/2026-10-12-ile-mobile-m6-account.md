# Ile Mobile — Milestone 6: Reviews, Reports, Profiles, Account, Google & Apple Sign-in Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The app reaches feature parity with the website for accounts: leave reviews after viewings, report listings, see lister profiles, a full Account tab (edit profile with a camera photo, change password, log out of all devices, delete account), and sign in with Google (Android and iOS) and Apple (iOS).

**Architecture:** The website's account rules (profile form mapping, review and report calls, lister profile loading, account deletion) move into `shared/` with client-first functions and tests, and the website switches to them. The app adds a review sheet on viewing cards and dashboard requests, a report sheet on listings, a `u/[id]` lister profile screen, a redesigned Account tab with Edit profile / Change password / Delete account screens, and Google sign-in through the system browser (Supabase OAuth with the `ile://` redirect) plus native Sign in with Apple (`expo-apple-authentication` → `signInWithIdToken`). No schema changes.

**Tech Stack:** Expo SDK 57, Expo Router, TanStack Query, `expo-web-browser` + `expo-linking` (installed), `expo-apple-authentication`, `expo-crypto` (installed), `expo-image-picker` + `expo-image-manipulator` (M4), Supabase Auth/Storage/RPCs, jest-expo, Node `node --test`.

**Spec:** `docs/superpowers/specs/2026-10-09-ile-mobile-app-design.md` (build step 8; section 2 "Account", "Lister profile", release blockers 1–2)

**Previous milestone:** `docs/superpowers/plans/2026-10-09-ile-mobile-m5-push.md` (merged to `main` at db29146).

## Global Constraints

- Every M1–M5 Global Constraint still applies (platform-free `shared/`, `npx expo install`, anon key only, theme tokens, `friendlyError` for every shown error, commit trailer, never stage `brag-output/`). Edits to `.sql` files only with the Edit/Write tools, never with replacement scripts (the `$$` lesson from M5).
- No schema changes. Uses the existing `leave_review(p_inspection, p_rating, p_comment, p_accurate)`, `my_reviewed_inspections(p_ids)`, `user_ratings`, `lister_response_times`, `listing_reports` insert (unique open report → code `23505`), `my_profile()`, `profiles` update (existing column grants), `avatars` bucket (`<uid>/<timestamp>.jpg`), `account_deletion_ready()`, `delete_my_account()`.
- Copy matches the website: review button "Review <first name>" (home-seeker → lister) / "Rate <first name>" (lister → home-seeker); report reasons from `REPORT_REASONS`; "You've already reported this listing. We're looking into it."; deletion confirm "Enter your password to confirm" (email accounts) or `Type "DELETE" to confirm` (Google/Apple-only accounts).
- Profile limits (from `profiles_extended.sql`): name ≤ 80, bio ≤ 300, ≤ 8 languages, business name ≤ 100, office address ≤ 200, ≤ 15 areas, listing since 1950–this year, registration number ≤ 50. Avatar: square, 512 px JPEG 0.85; the previous photo is deleted only after the profile saves.
- Passwords: at least 8 characters (same constant as sign-up: `MIN_PASSWORD = 8`, moved to `shared/account.js`).
- "Log out of all devices" = `signOut({ scope: "global" })`, preceded by removing this phone's push token (M5 `logOutThisDevice` order).
- Account deletion on the phone also clears this device: push token, saved-homes device list, drafts, outbox, query cache, last search, recent listings.
- Google sign-in: `signInWithOAuth({ provider: "google", options: { redirectTo: "ile://auth-callback", skipBrowserRedirect: true } })` → `WebBrowser.openAuthSessionAsync` → tokens from the returned URL → `setSession`. New Google/Apple users get the role chosen on the sign-up screen (default home-seeker), written to auth metadata and `profiles` like the website's `/auth/callback`. Buttons appear only when the provider is enabled in Supabase (`/auth/v1/settings`, same as the website).
- Sign in with Apple: iOS only, shown only when `AppleAuthentication.isAvailableAsync()`; raw nonce from `expo-crypto`, SHA-256 hashed for Apple; `signInWithIdToken({ provider: "apple", token, nonce: raw })`. Apple only shares the name on the first sign-in — save it then.

## Review Focus

- **Deleting an account fails halfway (network drops after photos are removed):** the person sees what happened and can retry; nothing is claimed deleted that isn't; the phone isn't cleared unless the account is really gone — pinned by Task 1 `deleteMyAccount` order tests and Task 4 local-clear test.
- **Google sign-in cancelled, closed, or returned with an error:** a plain message, no half-signed-in state; a brand-new Google user who chose "List property" becomes a lister — pinned by Task 5 `parseAuthRedirect` and `roleForNewUser` tests.
- **Reviewing twice, or before the viewing date:** no review button; if the server refuses anyway the message is friendly — pinned by Task 2 `reviewState` test (uses `canReview` + reviewed ids).
- **New profile photo from the camera (HEIC, huge, portrait):** saved as a 512 px square JPEG; the old photo removed only after the save — pinned by Task 4 `avatarTarget` test and save-order test.
- **"Log out of all devices" while offline:** this phone is still logged out (local), the person is told other devices may stay logged in until they're online — pinned by Task 4 `logOutEverywhere` test.

---

### Task 1: Shared account rules (website switches to them)

**Files:**
- Create: `shared/account.js`, `shared/__tests__/account.test.js`
- Modify: `src/lib/account.js` (bind `deleteMyAccount`, `hasPassword`, `verifyPassword`), `src/lib/profile.js` (bind `saveProfile`, `fetchMyProfile`), `src/app/account/profile/page.jsx` (use `profileToForm`, `formToProfileChanges`, `validateProfileForm`), `src/components/ReviewForm.jsx` (use `leaveReview`), `src/components/ReportListing.jsx` (use `reportListing`), `src/app/u/[id]/page.jsx` (use `fetchListerProfile` with the server client), `src/app/signup/page.jsx` and `mobile/src/app/(auth)/signup.tsx` (use `MIN_PASSWORD`)

**Interfaces (Produces, `shared/account.js`):**
- `MIN_PASSWORD = 8`; `MEDIA_BUCKETS = ["listing-images", "listing-videos", "avatars"]`
- `hasPassword(user) -> boolean` (an `email` identity)
- `verifyPassword(client, email, password) -> boolean`
- `deleteMyAccount(client, userId) -> void` — `account_deletion_ready` (throw "Account deletion isn't available right now. Nothing was deleted. Please try again later." when false/error) → remove every file in each bucket's `<uid>/` folder (paged list, batches of 100) → `delete_my_account` → `signOut({ scope: "local" })` (errors ignored). Platform cleanup stays in the callers.
- `fetchMyProfile(client) -> profile | null` (`my_profile`), `saveProfile(client, userId, changes)` (also `auth.updateUser({ data: { full_name } })` when the name changes)
- `profileToForm(profile, user) -> form` and `formToProfileChanges(form, isLister, thisYear) -> changes` (website mapping), `validateProfileForm(form) -> { [field]: message }` (name required ≤ 80, bio ≤ 300, ≤ 8 languages, ≤ 15 areas, office address ≤ 200, registration number ≤ 50)
- `leaveReview(client, { inspectionId, rating, comment, accurate })` (throws RPC message; "Choose a star rating." when rating is 0)
- `reportListing(client, { listingId, userId, reason, details })` (23505 → "You've already reported this listing. We're looking into it.")
- `fetchListerProfile(client, id) -> { profile, rating, reviews, listings, responseMinutes } | null` (website query; invalid id → null)

- [ ] **Step 1: Write failing tests** — `deleteMyAccount stops before touching files when deletion isn't ready`; `deleteMyAccount removes every photo folder, then the account, then signs out` (call order recorded by a fake client, including a second page of 100+ files); `deleteMyAccount stops if a photo can't be removed` (no `delete_my_account` call); `hasPassword spots email accounts`; `formToProfileChanges keeps lister fields only for listers`; `formToProfileChanges drops an out-of-range listing year`; `validateProfileForm requires a name and enforces limits`; `leaveReview needs a star rating`; `reportListing explains a repeat report`; `fetchListerProfile returns null for a malformed id without a request`.
- [ ] **Step 2: Run** `npm run test:shared` — Expected: FAIL.
- [ ] **Step 3: Implement** by moving the website code; switch the website files.
- [ ] **Step 4: Run** the website gate; smoke `next start`: `/account`, `/account/profile`, `/u/<id>`, a listing page, `/my-bookings` return 200.
- [ ] **Step 5: Commit** `refactor(shared): account, profile, review and report rules`

---

### Task 2: Reviews and reports in the app

**Files:**
- Create: `mobile/src/components/ReviewSheet.tsx`, `mobile/src/components/ReportSheet.tsx`, `mobile/src/components/Stars.tsx`, `mobile/src/lib/reviews.ts`, `mobile/src/lib/__tests__/reviews.test.ts`
- Modify: `mobile/src/components/ViewingCard.tsx` (Review button), `mobile/src/components/dashboard/RequestCard.tsx` (Rate button), `mobile/src/components/MyViewings.tsx` and `mobile/src/components/dashboard/Dashboard.tsx` (load reviewed ids), `mobile/src/app/listing/[id].tsx` ("Report this listing" link for logged-in non-owners)

**Interfaces:**
- `reviews.ts`: `reviewState(inspection, reviewedIds: Set<string>) -> "can-review" | "reviewed" | "not-yet"` (uses `canReview` from `shared/reviews.js`); `fetchReviewedIds(client, ids) -> Set<string>` (`my_reviewed_inspections`).
- `ReviewSheet` (modal): stars 1–5, comment (≤ 1000), "Was the listing accurate?" yes/no for reviews of listers, submit via `leaveReview`; success → "Thanks for your review." and the card shows "Reviewed".
- `ReportSheet` (modal): reason chips from `REPORT_REASONS`, details (≤ 1000), submit via `reportListing`; success text "Thanks. We'll look into it."

- [ ] **Step 1: Write failing tests** — `reviewState offers a review after a confirmed viewing's date`; `reviewState hides it before the date`; `reviewState shows reviewed when already done`.
- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the mobile gate.
- [ ] **Step 5: Commit** `feat(mobile): reviews after viewings and listing reports`

---

### Task 3: Lister profile screen

**Files:**
- Create: `mobile/src/app/u/[id].tsx`, `mobile/src/components/ReviewList.tsx`
- Modify: `mobile/src/components/ListerLine.tsx` (tappable → `/u/<id>`), `mobile/src/app/_layout.tsx` (register)

**Interfaces:** Consumes `fetchListerProfile` (Task 1), `PropertyCard`, `formatResponseTime`, `listerLabel`, `registrationLabel`. Screen: avatar, name (or business name), lister type, member since, rating summary with accuracy %, reply time, bio, languages, areas covered, registration body (number never shown), office address, active listings (cards), reviews (anonymous: stars, comment, listing title, date). Not found → "This profile isn't available". Cached as `["lister-profile", id]` (not persisted).

- [ ] **Step 1: Write failing test** `mobile/src/components/__tests__/ReviewList.test.tsx`: `shows reviews without reviewer names` (renders comment and stars; no reviewer field rendered); `shows an empty state when there are no reviews`.
- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the mobile gate.
- [ ] **Step 5: Commit** `feat(mobile): lister profile screen`

---

### Task 4: Account tab, Edit profile, Change password, Log out everywhere, Delete account

**Files:**
- Modify: `mobile/src/app/(tabs)/account.tsx` (redesign)
- Create: `mobile/src/app/account/profile.tsx`, `mobile/src/app/account/password.tsx`, `mobile/src/app/account/delete.tsx`, `mobile/src/lib/accountApp.ts`, `mobile/src/lib/avatar.ts`, `mobile/src/lib/__tests__/accountApp.test.ts`, `mobile/src/lib/__tests__/avatar.test.ts`
- Modify: `mobile/src/app/_layout.tsx` (register), `mobile/src/lib/push.ts` (export the token storage for reuse)

**Interfaces:**
- `avatar.ts`: `avatarTarget(width, height) -> { originX, originY, width, height }` (centre square crop) ; `pickAvatar(source: "camera" | "library") -> localUri | "denied" | null` (crop square, resize 512, JPEG 0.85); `uploadAvatar(client, userId, uri) -> publicUrl`; `replaceAvatar(client, userId, uri, previousUrl)` (upload → `saveProfile({ avatar_url })` → remove previous file; previous removed only after save).
- `accountApp.ts`: `logOutEverywhere(deps) -> { offline: boolean }` (remove push token → `signOut({ scope: "global" })`; on network failure `signOut({ scope: "local" })` and return `offline: true`); `clearThisDevice()` (push token storage, `ile:saved-listings`, drafts for the user, outbox, query cache + persisted cache, `ile:last-search`, `ile:recent-listings`); `deleteAccountOnPhone(userId)` (`deleteMyAccount` from shared → `clearThisDevice`).
- Account tab (logged in): header card (avatar, name, email, role, completeness ring from `profileCompleteness`, "Edit profile"), tiles (Saved, Viewings or Listings, Unread), rows: Edit profile, View my public profile (listers), Notifications, Change password (email accounts), Log out, Log out of all devices, Delete account, Contact support (`mailto:` the website's `CONTACT_EMAIL`), Privacy Policy and Terms (open the website pages in the in-app browser).
- Edit profile: photo (Take photo / Choose photo / Remove), name, bio, languages (chips), home state (private), occupation and move-in (home-seekers), lister section (lister type, business name, office address, areas covered, listing since, registration body + number) — `validateProfileForm`, `formToProfileChanges`, `saveProfile`.
- Change password: new + confirm (≥ `MIN_PASSWORD`), `auth.updateUser({ password })`, messages through `friendlyError`.
- Delete account: what's removed vs kept (website copy), confirmation by password (`verifyPassword`) or typing DELETE, then `deleteAccountOnPhone`; success → the app returns to Search logged out with "Your account was deleted."

- [ ] **Step 1: Write failing tests** — `avatarTarget crops the centre square of a portrait and a landscape photo`; `replaceAvatar removes the old photo only after the profile saves` (order recorded; a failed save keeps the old photo); `logOutEverywhere removes this phone's token, then logs out everywhere`; `logOutEverywhere still logs this phone out when offline`; `deleteAccountOnPhone clears this phone only after the account is deleted` (failure → nothing cleared).
- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the mobile gate.
- [ ] **Step 5: Commit** `feat(mobile): account, edit profile, password, log out everywhere, delete account`

---

### Task 5: Google and Apple sign-in

**Files:**
- Install: `npx expo install expo-apple-authentication`
- Create: `mobile/src/lib/oauth.ts`, `mobile/src/lib/oauthRules.ts`, `mobile/src/lib/__tests__/oauthRules.test.ts`, `mobile/src/components/SocialButtons.tsx`, `docs/social-signin-setup.md`
- Modify: `mobile/app.json` (`ios.usesAppleSignIn: true`, `expo-apple-authentication` plugin), `mobile/src/app/(auth)/login.tsx` and `signup.tsx` (buttons; sign-up passes the chosen role)

**Interfaces:**
- `oauthRules.ts` (pure): `parseAuthRedirect(url) -> { accessToken, refreshToken } | { error: string } | { cancelled: true }` (tokens from the `#` fragment or query; `error_description` → error); `roleForNewUser(metadata, chosen) -> "tenant" | "landlord" | null` (null when the account already has a role); `providersEnabled(settings) -> { google: boolean, apple: boolean }`.
- `oauth.ts`: `useSocialProviders()` (fetch `/auth/v1/settings` once); `signInWithGoogle(chosenRole) -> { ok } | { error } | { cancelled }`; `signInWithApple(chosenRole)` (iOS only); both finish with `finishNewUser(chosenRole, name?)` (writes role + name to auth metadata and `profiles` when the account is new).
- `SocialButtons`: "Continue with Google" (when enabled) and the native Apple button (iOS, when available and enabled); errors via `friendlyError`; cancel shows nothing.
- `docs/social-signin-setup.md` (for the founder): add `ile://auth-callback` (and `ile://**`) to Supabase → Authentication → URL Configuration → Redirect URLs; Google needs nothing else (same Supabase Google provider as the website); Apple (when the Apple Developer account exists): enable Sign in with Apple for the App ID `ng.ile.app`, enable the Apple provider in Supabase with `ng.ile.app` in "Client IDs", rebuild iOS.

- [ ] **Step 1: Write failing tests** — `parseAuthRedirect reads tokens from the fragment`; `parseAuthRedirect reports an error from Google`; `parseAuthRedirect treats a missing URL as cancelled`; `roleForNewUser uses the chosen role for new accounts only`; `providersEnabled reads Supabase settings`.
- [ ] **Step 2: Run** — Expected: FAIL.
- [ ] **Step 3: Implement**; install; config; write the setup guide.
- [ ] **Step 4: Run** the full verification (website gate, mobile gate, `npx expo export --platform android`, `npx expo-doctor`).
- [ ] **Step 5: Commit** `feat(mobile): Google and Apple sign-in`
