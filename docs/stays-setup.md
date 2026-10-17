# Shortlets, hotels and Airbnb: setup

## 1. Run the SQL (once)

Supabase Dashboard → SQL Editor → paste all of `supabase/stays.sql` → Run.
It is safe to run again. It needs the earlier files (push notifications,
reviews) to have been run already — they have.

At the bottom it prints two checks:

- Three column names: **hotel_name**, **max_guests**, **min_nights**.
- One job name: **ile-stay-reminders**.

Until this is run, nothing breaks: the Shortlets tab is simply empty and the
"Stays" option doesn't appear in the listing form. Amenities work already.

## 2. What people see afterwards

- **Home page:** four cards — Homes, Shortlets & hotels, Land, Shops & offices.
- **Search tabs:** Rent · Buy · Shortlets · Commercial. Shortlets has check-in
  and check-out dates, guests and amenities filters.
- **Listing form (website and app):** a **Stays** category with Shortlet
  apartment, Hotel room and Airbnb / private room; price per night, cleaning
  fee, caution deposit, max guests, minimum nights, check-in/out times, house
  rules, and a hotel name for hotel rooms.
- **Every listing:** tick-box **Amenities** for its kind of property (old
  "What's included" items are kept).
- **Stay listing page:** pick dates on a calendar (booked nights are crossed
  out), choose guests, see "3 nights × ₦45,000" plus fees and the total, add a
  note, tap **Fix a booking**.
- **Host dashboard:** **Stay requests** with Accept, Decline (optional reason),
  Cancel and Message. Accepting one request automatically declines any others
  for the same dates.
- **My bookings:** the guest's stays, with Cancel, Message, and Review after
  check-out.
- **Notifications:** new stay request, accepted, declined, cancelled, and
  "Check-in tomorrow" the day before.

## 3. Quick test

1. Log in as a host and list a **Shortlet apartment** (price per night, max
   guests 2, minimum nights 2).
2. Log in as someone else, open it, pick 3 nights and 2 guests, tap **Fix a
   booking**.
3. Back as the host: Dashboard → Stay requests → **Accept**. Those nights now
   show as booked on the listing's calendar.

## 4. Optional

Redeploy the `send-push` Edge Function so the check-in reminder follows each
person's "Reminders" notification setting (until then it follows "Bookings").
