# Profiles, Usernames and Private Phones Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every account has a viewable basic profile; people can pick a username and choose to show it instead of their name; phone numbers stay private except between the two people on a confirmed booking.

**Architecture:** Pure rules (display name, username and phone formats) live in `shared/` and are used by both clients; `fetchPeople` and the profile fetch apply the display-name rule centrally. The database (`supabase/profiles_privacy.sql`) opens public profile rows (columns are already restricted by grants), adds username/show_as with checks, and exposes the phone only through a function that checks the booking. Clients work before the SQL is run.

**Tech Stack:** Next.js 16, Expo SDK 57, Supabase (RLS, column grants, security-definer functions).

**Spec:** `docs/superpowers/specs/2026-10-17-ile-profiles-privacy-design.md`

## Global Constraints

- Root cause of "profile not found": `messaging_slots.sql:259-267` only lets people read a profile if it has a listing or shares context with them. Fix: a select policy `using (true)` for anon and authenticated (public columns are already limited by `profiles_extended.sql:75-78`; `phone` is not granted).
- Username: 3–20 chars, `^[a-z0-9_]+$`, not starting/ending with `_`, stored lowercase, unique case-insensitively; reserved: `admin`, `ile`, `support`, `help`, `official`, `moderator`.
- `show_as` in (`name`, `username`), default `name`; `username` required for `username`.
- Phone: accepts `0803 123 4567`, `803 123 4567`, `+234 803 123 4567` (spaces/dashes ignored); stored `+234` + 10 digits; DB check `^\+234[0-9]{10}$`.
- `displayName(profile)`: `@username` when `show_as = 'username'` and username set; else trimmed `full_name`; else `"Ile member"`.
- Copy: "Private. Only shared with the other person after a booking is confirmed." · "That username is taken." · "Enter a Nigerian number, e.g. 0803 123 4567." · "Choose a username first." · "No phone number added. Use chat."
- Phone shown only for viewings `confirmed` (or `done`) and stays `accepted`, to that booking's guest/host.
- All user-facing errors via `friendlyError`. Before the SQL runs: username/phone fields hidden, names fall back to full name, no phone lines.

## Review Focus

- **SQL not run:** `fetchPeople`/profile fetch select `username, show_as` → missing columns must fall back, not fail. Pinned in Task 1 (`fetchPeople falls back when username columns are missing`).
- **Choosing @username with no username** is blocked in the form and the database. Pinned in Task 4 (`validateProfileForm refuses show_as username without a username`).
- **A deleted or non-existent account** still shows "not found"; an existing home-seeker never does. Pinned in Task 3 (profile fetch test).
- **Phone leaks:** public profile reads must never include phone. Pinned in Task 2 (SQL test: grants exclude phone).
- **Username case:** "Tunde_Homes" and "tunde_homes" are the same username. Pinned in Task 1 (`normalizeUsername`).

---

### Task 1: Shared rules — display name, username, phone

**Files:** Modify `shared/people.js`, `shared/__tests__/people.test.js`

**Interfaces (produces):** `displayName(profile) -> string`; `normalizeUsername(input) -> string` (trim, lowercase, strip leading `@`); `usernameError(input) -> string|null` (messages: "Use 3 to 20 letters, numbers or underscores.", "A username can't start or end with _.", "That username isn't available."); `RESERVED_USERNAMES`; `normalizePhone(input) -> string|null` (`+234XXXXXXXXXX` or null); `phoneError(input) -> string|null` (null when empty or valid); `fetchPeople(client, ids)` returns `{ id: { name, avatar, username } }` using `displayName`, selecting `id, full_name, avatar_url, username, show_as` and retrying `id, full_name, avatar_url` on error code `42703`.

- [ ] **Step 1: Failing tests:** `displayName prefers @username only when chosen` (`{full_name:"Ada Obi", username:"ada", show_as:"username"}` → `@ada`; `show_as:"name"` → `Ada Obi`; `{show_as:"username"}` no username → `Ile member`; `{}` → `Ile member`); `normalizeUsername` (`" @Tunde_Homes "` → `tunde_homes`); `usernameError` (`"ab"`, `"bad-name"`, `"_tunde"`, `"admin"`, `"tunde_homes"`→null); `normalizePhone` (`"0803 123 4567"`, `"803-123-4567"`, `"+234 803 123 4567"` → `+2348031234567`; `"12345"` → null); `fetchPeople falls back when username columns are missing` (fake client: first select errors 42703, second returns rows → names from full_name).
- [ ] **Step 2: Run** `node --test "shared/__tests__/*.test.js"` — FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `feat(shared): display names, usernames and phone formats`

---

### Task 2: Database — public profiles, username, phone sharing

**Files:** Create `supabase/profiles_privacy.sql`; create `shared/privacy.js`, `shared/__tests__/privacy.test.js`; modify `shared/__tests__/sql.test.js`

**Interfaces:**
- SQL: policy "Basic profiles are public" (select, anon+authenticated, `using (true)`); `profiles.username text`, `profiles.show_as text not null default 'name'`; unique index on `lower(username)`; check constraints for username format/reserved list, `show_as` values, `show_as <> 'username' or username is not null`, phone format; column grants: select adds `username, show_as`; update adds `username, show_as, phone`; `my_phone() returns text`; `username_available(p_username text) returns boolean` (anon+authenticated; false for invalid/reserved/taken by someone else); `booking_contact(p_kind text, p_id uuid) returns text` — `p_kind` `viewing` (inspections, status `confirmed` or `done`) or `stay` (stay_bookings, status `accepted`); caller must be the guest/tenant or the listing's landlord; returns the *other* person's phone or null.
- JS (`shared/privacy.js`, client first): `usernameAvailable(client, name) -> Promise<boolean|null>` (null when the function is missing), `fetchMyPhone(client) -> Promise<string|null>`, `fetchBookingContact(client, kind, id) -> Promise<string|null>` (never throws).

- [ ] **Step 1: Failing tests:** wrappers pass the right args and return null on PGRST202; sql test `profiles_privacy.sql opens public rows but never grants phone to readers` (has `using (true)`; every `grant select (` list in the file lacks `phone`; `booking_contact` body checks `'confirmed'` and `'accepted'` and `auth.uid()`).
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** — PASS.
- [ ] **Step 5: Commit** `feat(db): public profiles, usernames and booking-only phone sharing`

---

### Task 3: Profiles for everyone and the name rule everywhere

**Files:** Modify `shared/account.js` (`fetchListerProfile` → also selects `username, show_as` with the Task 1 fallback; returns `profile.display_name`), `shared/messaging.js` / `src/lib/messaging.js` (names via `displayName`), `src/app/u/[id]/page.jsx`, `mobile/src/app/u/[id].tsx`, `src/app/account/page.jsx`, `mobile/src/app/(tabs)/account.tsx`, name links in `src/app/dashboard/page.jsx`, `src/components/StayRequests.jsx`, `mobile/src/components/dashboard/RequestCard.tsx`, `mobile/src/components/StayCard.tsx`, chat headers (`src/app/messages/[id]/page.jsx`, `mobile/src/app/chat/[id].tsx`).

**Interfaces:** profile pages use `profile.display_name`; role line "Home-seeker" when not a lister; listings and lister-only rows only when the person is a lister; page title `${name} · Ile` (not "· Lister" for home-seekers); names in request/stay cards and chat headers link to `/u/[id]`.

- [ ] **Step 1: Failing test** (`shared/__tests__/account.test.js`): `fetchListerProfile returns a home-seeker's basic profile with their display name` (fake client: profile `{id, full_name:"Ada", username:"ada", show_as:"username"}`, no listings → `profile.display_name === "@ada"`); and returns null for a missing profile.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** shared tests; website lint; app `npx tsc --noEmit`, `npx jest`.
- [ ] **Step 5: Commit** `feat: profiles for everyone, chosen display names everywhere`

---

### Task 4: Settings — username, show as, phone

**Files:** Modify `shared/account.js` (profile form), `shared/__tests__/account.test.js`, `src/app/account/profile/page.jsx`, `mobile/src/app/account/profile.tsx`

**Interfaces:** profile form values gain `username`, `show_as` (default `name`), `phone`; `validateProfileForm` adds `username` (via `usernameError`), `show_as` ("Choose a username first."), `phone` (via `phoneError`); the save row writes normalised username/phone only when the columns are supported (`profileFieldsSupported(client) -> Promise<boolean>`, selecting `username` with limit 1). Live check: after typing stops (500 ms) call `usernameAvailable`; show "Available" / "That username is taken." Phone field shows the privacy hint and loads its value from `fetchMyPhone`.

- [ ] **Step 1: Failing tests:** `validateProfileForm refuses show_as username without a username`; `validateProfileForm checks username and phone formats`; `profile row saves the normalised username and phone`.
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement** (website and app pages).
- [ ] **Step 4: Run** shared tests; website lint; app tests, types, lint.
- [ ] **Step 5: Commit** `feat: username, show-as and private phone in profile settings`

---

### Task 5: Phone on confirmed bookings

**Files:** Create `src/components/ContactLine.jsx`, `mobile/src/components/ContactLine.tsx`, `mobile/src/components/__tests__/ContactLine.test.tsx`; modify website dashboard request card, `src/app/my-bookings/page.jsx`, `src/components/StayRequests.jsx`; app `RequestCard.tsx`, `ViewingCard.tsx`, `StayCard.tsx`.

**Interfaces:** `ContactLine({ kind: "viewing"|"stay", id, name })` renders nothing unless the booking is confirmed/accepted (the parent decides), loads `fetchBookingContact`, shows "Call {name}: 0803 123 4567" with a `tel:` link / `Linking.openURL("tel:+234…")`, or "No phone number added. Use chat."; shows the number in local format `0803 123 4567`.

- [ ] **Step 1: Failing test:** `ContactLine shows the number with a Call button, or the chat hint` (mock `fetchBookingContact` → `+2348031234567` then null).
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement** and place it on confirmed viewings and accepted stays for both sides.
- [ ] **Step 4: Run** app tests/types/lint; website lint and build.
- [ ] **Step 5: Commit** `feat: share phone numbers on confirmed bookings`

---

### Task 6: Hand-off and full verification

- [ ] **Step 1:** Full gates (shared tests, website lint + build, app jest + tsc + lint + android export).
- [ ] **Step 2:** `docs/profiles-privacy-setup.md` (run `supabase/profiles_privacy.sql`; what changes; quick test).
- [ ] **Step 3: Commit** `docs: profiles and privacy setup for the founder`
