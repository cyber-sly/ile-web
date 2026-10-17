# Profiles, usernames and phone numbers: setup

## 1. Run the SQL (once)

Supabase Dashboard → SQL Editor → paste all of `supabase/profiles_privacy.sql` → Run.
It is safe to run again. Run `supabase/stays.sql` first if you haven't yet, so
phone sharing also works for stays.

At the bottom it prints two column names: **show_as** and **username**.

Until this is run, nothing breaks: profiles of home-seekers still say "not
found", and the username and phone fields don't appear in Edit profile.

## 2. What changes

- **Anyone's profile can be opened.** Tap a name (on a booking request, a stay
  request or a chat) to see their basic card: photo, name, role, member since.
  Listers also show their listings and reviews. Home-seeker profiles are hidden
  from Google.
- **Usernames (optional).** In Edit profile people can pick a username (3–20
  letters, numbers or _) and choose whether others see their **Name** or their
  **@username**. The form checks if a username is free as they type. Email
  addresses are never shown to anyone.
- **Phone numbers (private).** People can add a Nigerian number in Edit profile.
  Nobody can see it on their profile. Once a viewing is **confirmed** (or a stay
  is **accepted**), each side sees the other's number with a **Call** button on
  the booking. If someone hasn't added a number, the booking says
  "No phone number added. Use chat."

## 3. Quick test (two accounts, A and B)

1. On A: Edit profile → add a username, choose **@username**, add a phone → Save.
2. On B: open one of A's listings → tap A's name → A's profile opens showing @username.
3. On B: fix a booking on A's listing. Before A confirms, no phone shows anywhere.
4. On A: confirm the booking. Both A and B now see the other's number with **Call**.
5. Try taking A's username on B → "That username is taken."
