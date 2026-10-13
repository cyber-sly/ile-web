# Share cards, invite codes and boosts: setup

## 1. Run the SQL (once)

Supabase Dashboard → SQL Editor → paste all of `supabase/referrals_boosts.sql` → Run.
It is safe to run again.

At the bottom it prints two checks:

- `profiles_without_code` should be **0** (everyone now has an invite code).
- Two job names: **ile-boost-expiry** and **ile-referral-rewards**.

Until this is run, the website and app still work: share links work, and the
invite code, share stats and boost sections simply stay hidden.

## 2. What people see afterwards

- **Account page** (website and app): "Your invite code: TUNDE7" with
  "Invite a lister" and "Copy code" (the app says "Share code").
- **Sign-up** (website and app): an optional "Invite code" box, filled in
  automatically when someone arrives from a shared link on the website.
- **Every listing**: "Share" opens "Send link" and "Post to Status / Stories".
  On the website the picture opens or shares directly. In the app the picture
  option appears **after the next app build** (M7); your current dev build only
  shows "Send link".
- **Dashboard** (website and app): "Your shares: … views · … bookings · … joined
  with your code · … boost days left", plus Share and Boost on each live listing.
- **Admin page** (website): "Held rewards" with Approve / Reject.

## 3. How rewards work

Checked every hour (at :15):

- **+7 boost days** when someone who joined with your code has confirmed their
  email and has a listing that has been live for 3 days with no upheld report.
- **+3 boost days** for every 5 people who joined with your code and confirmed
  their email.
- At most **30 earned days per month** (Lagos time).
- If more than 10 people confirm through one code within an hour, that
  person's new rewards are **held** for you to approve on the admin page.

Boosts end on time: the "Boosted" badge disappears at the end date, and a job
every 5 minutes moves the listing back into normal order.

## 4. Quick test

1. Log in on the website, open Account, copy your invite code.
2. In a private window, open `<site>/listings/<any listing id>?ref=YOURCODE`,
   then sign up: the Invite code box should already say YOURCODE.
3. Open Dashboard with your own account: "1 joined with your code" (views count
   once per device per day).

To give yourself boost days for testing, run in the SQL editor (replace the email):

```sql
insert into public.boost_ledger (user_id, days, reason)
select id, 10, 'purchased' from auth.users where email = 'you@example.com';
```
