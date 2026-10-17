# Ile: Shortlets, hotels and Airbnb stays, plus amenities on every listing

Date: 2026-10-17 · Status: approved in conversation, awaiting written review

## Goal

Let hosts list nightly stays (shortlet apartments, hotel rooms, Airbnb-style
rooms) and let guests request specific dates; give every listing a tick-box
amenities list. Website and app both.

## Decisions (from the founder)

- Booking a stay is a **stay request**: guest picks dates and guests, sees the
  total, taps "Fix a booking"; the host accepts or declines. Payment is made
  directly to the host (payments are on hold).
- **One listing per hotel room type**, grouped by a hotel name.
- Stays get their own search tab: **Rent · Buy · Shortlets · Commercial**.
- **Amenities on all listings** (homes, stays, shops and offices, land), with
  category-specific choices.
- Home page cards (4): **Homes** (rent or buy, merged) · **Shortlets & hotels**
  (new) · **Land** · **Shops & offices**.

## 1. Listing types

New category `stays` (label "Stays") with property types:

| value | label |
|---|---|
| `shortlet` | Shortlet apartment |
| `hotel_room` | Hotel room |
| `airbnb` | Airbnb / private room |

Stays use `listing_type = 'rent'` and a new price period `night`
(label "per night", suffix "/night", short "/night").

New listing columns (all nullable unless noted):

| column | type | notes |
|---|---|---|
| `max_guests` | integer | stays: required, 1–50 |
| `min_nights` | integer | stays: default 1, 1–365 |
| `check_in_time` | time | stays: optional |
| `check_out_time` | time | stays: optional |
| `cleaning_fee` | numeric | stays: optional, ≥ 0, once per stay |
| `hotel_name` | text | hotel rooms: required, ≤ 100 chars |
| `house_rules` | text | stays: optional, ≤ 1000 chars |

Reused: `caution_deposit` (refundable, once per stay), `bedrooms`,
`bathrooms`, `features` (amenities, below).

## 2. Amenities (all listings)

Stored in the existing `features text[]` as display labels, so existing
"What's included" items keep showing. The form shows the category's list as
tick boxes plus "Add your own" (free text, ≤ 40 chars, up to 30 items total).

- **Homes:** 24-hour power, Prepaid meter, Generator/inverter, Borehole/running
  water, Air conditioning, Fitted kitchen, Wardrobes, POP ceiling, Tiled floors,
  Parking, Security, Fenced compound, Gated estate, Swimming pool, Gym, Balcony,
  Elevator, CCTV
- **Stays:** Wi-Fi, 24-hour power, Generator/inverter, Air conditioning, Kitchen,
  Parking, Swimming pool, Gym, Security, TV/Netflix, Washing machine, Breakfast
  included, Hot water, Smart TV, Workspace, Balcony, Elevator, CCTV, Airport pickup
- **Shops & offices:** 24-hour power, Generator, Parking, Security, Toilet,
  Running water, Elevator, Reception area, Air conditioning, CCTV, Loading bay
- **Land:** Fenced, Gated estate, Good road access, Electricity nearby, Dry land
  (no flooding), Corner piece

Listing pages show them as a tick list ("Amenities"); cards show up to 3.

## 3. Listing form (website wizard and app wizard)

- Category step gains **Stays** with the three types.
- Stays steps: Basics (title; **hotel name** for hotel rooms) · Price (**price
  per night**, optional **cleaning fee**, optional **caution deposit**) · Space
  (bedrooms, bathrooms, **max guests**) · Stay rules (**minimum nights**,
  **check-in time**, **check-out time**, **house rules**) · Amenities · Where ·
  Photos · Description.
- All categories get an **Amenities** step.
- Validation in `shared/` (both clients): price > 0; max guests 1–50; minimum
  nights 1–365; hotel name required for hotel rooms; fees ≥ 0.

## 4. Search

- Tabs: Rent · Buy · **Shortlets** · Commercial (`tab=stays`, heading
  "Shortlets & hotels").
- Shortlets filters: check-in and check-out (hides listings with an accepted
  stay overlapping those dates), guests (`max_guests ≥ n`), type, price per
  night (min/max), state/LGA/text, amenities (listing must have all chosen).
- Cards and listing pages show "₦45,000 /night", max guests, minimum nights,
  top amenities; hotel rooms show the hotel name.

## 5. Stay requests

### Guest (listing page booking box)
- Pick check-in and check-out, and guests (1..max_guests).
- Dates covered by accepted stays show as unavailable (only dates are public).
- Breakdown: `N nights × ₦price = ₦subtotal`, then cleaning fee and caution
  deposit if set, and the total.
- Note to host (optional, ≤ 500 chars). Button: **Fix a booking**.
- Blocked: fewer nights than `min_nights`, more guests than `max_guests`,
  check-in in the past, check-out not after check-in, stays over 90 nights,
  overlapping an accepted stay, booking your own listing, unavailable listing.
- Note shown: "Pay the host directly. Never pay before you've confirmed the
  place is real."

### Host (dashboard)
- **Stay requests** section: guest name, dates, nights, guests, total, note.
- **Accept** → status `accepted`; other requested stays overlapping those dates
  are automatically declined (reason "Those dates were taken").
- **Decline** with optional reason (≤ 200 chars). **Message** opens chat.
- Host can cancel an accepted stay; guest can cancel a requested or accepted stay.

### Statuses
`requested` → `accepted` | `declined` | `cancelled`; `accepted` → `cancelled`.
A stay is "past" once its check-out date has passed.

### Notifications (existing system)
New request (host) · Accepted (guest) · Declined (guest) · Cancelled (other
party) · Day before check-in (both). Category "bookings"; reminder "reminders".

### My bookings / reviews
- Guests see stays in My bookings with their viewing bookings (upcoming first).
- After check-out of an accepted stay, guest and host can review each other
  (existing reviews, linked to the stay).

## 6. Database (`supabase/stays.sql`, founder runs it)

- Listings: category check adds `stays`; price period check adds `night`; new
  columns from section 1 with check constraints.
- `stay_bookings`: id, listing_id, guest_id, check_in, check_out, guests,
  nights, nightly_price, cleaning_fee, caution_deposit, total, note, status,
  decline_reason, created_at, updated_at. Prices are copied at request time.
- RLS: guest reads own rows; listing owner reads rows for their listings; no
  direct writes — only RPCs: `request_stay`, `respond_stay(id, accept, reason)`,
  `cancel_stay(id)`, `listing_taken_dates(listing)` (public: date ranges only),
  `stays_unavailable(check_in, check_out)` (listing ids, for search).
- Overlap rule enforced in the database (accepted stays never overlap; the
  accepting function locks the listing).
- Notifications via `ile_notify`; reminder added to the daily reminder job.
- Reviews: `reviews.stay_booking_id` (nullable) and `leave_stay_review`.

## 7. Before the SQL is run

Nothing breaks: the Shortlets tab is empty, the Stays option is hidden in the
form, and amenities still save into `features` (which already exists).

## Error handling

All user-facing errors via `friendlyError`; database errors raise plain
sentences (e.g. "This place needs at least 2 nights").

## Testing

- `shared/` node tests: nights and totals, validation (min nights, max guests,
  dates, 90-night cap, hotel name), overlap helper, amenity lists per category,
  stays search filters, period labels.
- SQL text checks (dollar quoting, overlap guard present).
- App component tests: stay booking box, stay request card, amenities step.
- Website lint and build; app tests, types, lint; final fresh review.

## Out of scope

Payments, instant booking, host availability calendars, multi-room hotel pages,
seasonal pricing.
