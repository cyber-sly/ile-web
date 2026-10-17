# Ile: Profiles for everyone, usernames and private phone numbers

Date: 2026-10-17 · Status: approved in conversation, awaiting written review

## Goal

Anyone's basic profile can be viewed; people can choose a username so their
real name isn't what others see; phone numbers are private and only shared
between two people once a booking between them is confirmed. Website and app.

## Decisions (from the founder)

- **Profiles for everyone (A):** basic info for home-seekers and listers;
  listers additionally show listings and business details. Email and phone are
  never shown on profiles.
- **Usernames (A):** optional, unique; each person chooses whether others see
  their **name** or their **@username**.
- **Phone (A & B):** private by default (only the owner and Ile); shared with
  the other person once a viewing is confirmed or a stay accepted.

## 1. Profile page

Website `/u/[id]` and the app's profile screen, for every account:

- Photo, display name (section 3), role ("Home-seeker" / "Lister" / lister
  type), "Member since", bio, languages, rating and reviews.
- Listers also: listings, business name, areas covered, registration body,
  response time (as today).
- A profile with no listings and no reviews still shows the basic card (never
  "not found" for an existing account). Deleted accounts: "not found".
- Names in chats, booking requests, stay requests and reviews link to the
  person's profile.
- Build note: find and fix the exact reason profiles currently fail to show
  for some people, with a test that reproduces it.

## 2. Account settings ("Edit profile", website and app)

- **Username** (optional): 3–20 characters, `a–z`, `0–9`, `_`; stored
  lowercase; unique case-insensitively; can't start or end with `_`; a short
  reserved list is refused (`admin`, `ile`, `support`, `help`, `official`,
  `moderator`). Live check shows "Available" / "Taken" / the rule broken.
- **Show others my:** Name / @username (default Name). Choosing @username
  without a username isn't allowed ("Choose a username first.").
- **Phone number** (optional): Nigerian numbers in `0803 123 4567`,
  `803 123 4567` or `+234 803 123 4567` form, stored as `+2348031234567`.
  Hint: "Private. Only shared with the other person after a booking is
  confirmed."

## 3. Display name rule (one shared function, both clients)

`displayName(profile)`:
- `show_as = 'username'` and a username exists → `@username`
- else the trimmed full name
- else `"Ile member"`

Used everywhere a person's name appears: profiles, chats and inbox, booking and
stay requests, reviews, listing "Listed by", account header.

## 4. Phone sharing after a booking

- When a viewing is `confirmed` or a stay is `accepted`, both people see the
  other's phone number on that booking (dashboard request card, My bookings
  card, stay cards, booking screen) with a **Call** button (`tel:` link), if
  that person added a number. Otherwise: "No phone number added. Use chat."
- Before confirmation, or once declined/cancelled: nothing shown.
- Enforced in the database: `booking_contact(kind, id)` returns the other
  person's phone only if the caller is the guest or host of that booking and
  its status is confirmed/accepted.

## 5. Database (`supabase/profiles_privacy.sql`, founder runs it)

- `profiles.username text`, unique index on `lower(username)`, check on the
  format; `profiles.show_as text default 'name' check in ('name','username')`;
  `phone` already exists (format check added: null or `^\+234[0-9]{10}$`).
- Column grants: `username`, `show_as` readable by everyone (needed to show the
  chosen name); `username`, `show_as`, `phone` updatable by the owner (phone
  stays unreadable to others); the owner reads their own phone through
  `my_phone()`.
- `username_available(p_username text) returns boolean` (anon + authenticated).
- `booking_contact(p_kind text, p_id uuid) returns text` (authenticated).
- A trigger refuses `show_as = 'username'` when username is null.
- Reserved usernames enforced in the database too.

## 6. Before the SQL is run

Nothing breaks: settings hide the username/phone fields until the columns
exist; `displayName` falls back to the full name; booking cards show no phone
line.

## Error handling

Plain messages via `friendlyError`; "That username is taken." for unique
violations; invalid phone: "Enter a Nigerian number, e.g. 0803 123 4567."

## Testing

- `shared/` node tests: username rules, `displayName`, phone normalising and
  validation, the profile-not-found cause.
- SQL text checks (grants exclude phone from public select; contact function
  checks status and participants).
- App component tests: settings username/phone fields, phone line on a
  confirmed booking card.
- Website lint/build; app tests, types, lint; final fresh review.

## Out of scope

Phone verification by SMS, showing phones on listings, username search,
changing email.
