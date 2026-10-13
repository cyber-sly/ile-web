# Ile: Share cards, invite codes and earned boosts

Date: 2026-10-13 · Status: approved in conversation, awaiting written review

## Goal

Make Ile spread by word of mouth before the store launch (M7). Listers first: every
listing becomes something a lister is glad to post, and every lister has a reason to
bring other listers. Launch focus: Lagos, Ogun and Abuja (FCT).

Success looks like: listers share listings to WhatsApp chats, Status and Instagram
Stories; new people and new listers arrive through those shares; listers can see the
result and earn free boosts for it.

## Decisions (from the founder)

- Grow supply (listers) first. Cities: Lagos, Ogun, Abuja.
- Why listers share: (A) their listing gets seen and booked, and they can see it; plus
  (B) they earn free boost days for bringing people in.
- Rewards (option C): 7 boost days per invited lister who posts a real listing; 3 boost
  days per 5 invited home-seekers; cap 30 earned boost days per calendar month; only
  people who confirm their email count.
- Share formats (option C): a tracked link AND a ready-to-post image card.
- Attribution: code in the link plus an optional "Invite code" field at sign-up (no paid
  attribution service).

## What gets built

### 1. Personal invite code

- Every profile has a unique `invite_code`: up to 6 letters from the first name,
  uppercased, plus 1–3 digits (e.g. `TUNDE7`). Letters only from A–Z; if the name has
  none, `ILE` is used. Generated for new sign-ups and backfilled for existing users.
- Codes are matched case-insensitively and ignore spaces.
- Account page (app and website) shows "Your invite code: TUNDE7" with:
  - "Invite a lister": shares the message
    `List your property on Ile for free. Serious home-seekers book viewings straight from your listing. Sign up with my code TUNDE7: <site>/signup?role=landlord&ref=TUNDE7`
  - "Copy code".

### 2. Who invited whom

- `profiles.referred_by` (uuid of the inviter), set once, at sign-up only, from the
  invite code; never changeable afterwards, by anyone except the database.
- Ignored when: code unknown, code is the person's own, or the account already has one.
- Website: any page opened with `?ref=CODE` stores the code on that device for 30 days
  (first code wins until it expires). Sign-up pre-fills the Invite code field from it.
- App: sign-up has an optional "Invite code" field (pre-filled when a `ref` param is
  present). Google/Apple sign-up passes the code the same way as the role.
- Unknown code at sign-up: the account is still created; the person sees
  "We couldn't find that invite code, so it wasn't added." No raw errors (friendlyError).

### 3. Share sheet (app and website, on every listing)

Anyone can share any listing; links carry the sharer's code when they are logged in.

- "Send link": native share (app) / Web Share API or copy (website) with the message
  `<title> · <price><suffix> · <place>\n<site>/listings/<id>?ref=<CODE>`
- "Post to Status / Stories": the image card (section 4), shared as an image with the
  link in the caption.
- Listers see a "Share" button on each of their listings in the dashboard too.

### 4. Image card

- Website route `GET /share/listing/<id>/card?ref=<CODE>` returns a 1080×1920 PNG
  (Next.js `ImageResponse`): cover photo (top ~60%), "For rent"/"For sale" badge, price
  with suffix, title, place, key facts, the Ile logo, a QR code of the tracked link, and
  "Use code <CODE> on Ile". Website colours and fonts.
- Only active, not-moderated listings; otherwise 404. Cached per listing+code for a day.
- App: downloads the PNG and opens the share sheet (needs `expo-sharing` +
  `expo-file-system`; `expo-sharing` is a new native module, so this part ships in the
  next app build, at M7). Website: opens the image with "Save image" / Web Share.

### 5. Boost days

- `boost_ledger` table: `user_id, days (int, + or −), reason, related ids, created_at`.
  Balance = sum of `days`. Reasons: `invited_lister`, `invited_seekers`, `spent`,
  later `purchased`.
- Only the database writes rewards (security-definer functions and a scheduled job);
  clients can only call `spend_boost_days(listing_id, days)`.
- `spend_boost_days`: listing must be the caller's own and active; `days` 1–30 and ≤
  balance; extends `listings.boosted_until` from max(now, current boosted_until);
  writes a `spent` line. Plain-language errors.
- `is_boosted` = `boosted_until > now()`. Search and "Fresh on Ile" put boosted listings
  first (then the existing order). The "Boosted" badge uses the same rule.

### 6. Rewards (scheduled, hourly via pg_cron)

- Invited lister: the invitee confirmed their email and has a listing that has been
  active for at least 3 days with no `actioned` report → inviter gets +7, once per
  invitee.
- Invited seekers: every 5 invitees (not already counted as listers) who confirmed
  their email → inviter gets +3, once per batch of 5.
- Monthly cap: earned (non-purchased) days per calendar month (Africa/Lagos) ≤ 30;
  rewards over the cap are not granted (not carried over).
- Suspicious pattern: more than 10 invitees with confirmed email within 1 hour for the
  same inviter → that inviter's new rewards go to `held` status for admin review
  (admin page lists them with Approve / Reject).
- Each grant sends a push/in-app notification: "You earned 7 boost days 🎉" (uses the
  existing notifications table and send-push).

### 7. Share stats

- `share_visits`: one row per (listing, code, device, day) when a listing page opens
  with `?ref=`. Device = random id stored on the device (no personal data).
- Bookings: a booking made within 30 days of arriving with a code stores that code
  (`inspections.ref_code`).
- Lister dashboard card: "Your shares: N views · N bookings · N joined with your code ·
  N boost days left", plus "Boost a listing".

## Out of scope (for now)

- Paid boosts (payments on hold), rankings/"Top lister" badges, paid attribution
  services, opening shared links directly in the app (needs the custom domain, M7).

## Error handling

- Every user-facing failure uses friendlyError copy; sharing never blocks on stats
  recording (visit/booking tracking fails silently).
- Offline: share sheet "Send link" still works; image card shows "Connect to make the
  image".

## Testing

- Shared pure rules with node tests: code generation and normalising, ref storage
  expiry, reward calculation (lister rule, seekers per 5, monthly cap, no double pay),
  share message text.
- App component tests: share sheet options, sign-up invite field, dashboard stats card.
- SQL dollar-quoting test covers the new SQL file; founder runs the SQL in Supabase.
- Image route: renders for an active listing, 404 for missing/inactive.
