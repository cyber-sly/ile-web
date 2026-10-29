# Turning on push notifications

This is a one-time setup. It takes about 45 minutes. Do the steps in order.
You'll need: your Supabase dashboard, a Google account (for Firebase), your
Expo account, and your Android phone.

Commands are typed in PowerShell. Each step says which folder to be in.

---

## 1. Switch on two Supabase extensions

1. Open your project in the Supabase dashboard.
2. Go to **Database → Extensions**.
3. Search for **pg_cron** and switch it on.
4. Search for **pg_net** and switch it on.

These let the database run daily reminders and call the notification sender.

## 2. Create a Firebase project (Android alerts go through Google's Firebase)

1. Go to https://console.firebase.google.com and sign in.
2. Click **Create a project**. Name it **Ile**. You can turn Google Analytics off.
3. On the project page, click the **Android** icon to add an app.
4. **Android package name:** `app.myile` (use your final app id if you've changed it).
   App nickname: Ile. Skip the SHA-1 field.
5. Click **Register app**, then **Download google-services.json**.
6. Put that file in the `ile-web\mobile` folder (next to `app.json`).
   This file isn't a secret (Google says so); it identifies the app to Firebase and
   must go along with each app build, so it's fine to keep it with the code.
7. Click through the remaining Firebase screens (no code changes needed).

## 3. Give Expo permission to send through Firebase

1. In Firebase, open **Project settings** (gear icon) → **Service accounts**.
2. Click **Generate new private key**, then **Generate key**. A JSON file downloads.
   Treat this file like a password: don't share it or upload it anywhere else.
3. In PowerShell, in the `ile-web\mobile` folder, run:
   ```
   npx eas-cli credentials
   ```
4. Choose **Android** → **development** (or any profile) → **Google Service Account**
   → **Manage your Google Service Account Key for Push Notifications (FCM V1)**
   → **Set up a Google Service Account Key for Push Notifications (FCM V1)**
   → **Upload a new service account key**, and pick the JSON file you downloaded.
5. Delete the downloaded JSON file from your computer once it's uploaded.

## 4. Create a secret and deploy the notification sender

1. Make a long random secret. In PowerShell:
   ```
   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
   ```
   Copy the result. You'll paste it in two places (this step and step 5).
2. In PowerShell, in the `ile-web` folder (not `mobile`), run these one at a time:
   ```
   npx supabase login
   npx supabase link --project-ref azjrfjiaivdjcmmmztsv
   npx supabase secrets set PUSH_SECRET=PASTE_YOUR_SECRET_HERE
   npx supabase functions deploy send-push
   ```
   - `login` opens your browser to approve.
   - `link` may ask for your database password; you can press Enter to skip.
   - The last command should end with "Deployed Functions … send-push".

## 5. Store the secret in the database's vault

In Supabase → **SQL Editor**, run this (paste your secret in the first line):

```sql
select vault.create_secret('PASTE_YOUR_SECRET_HERE', 'push_secret');
select vault.create_secret('https://azjrfjiaivdjcmmmztsv.supabase.co/functions/v1/send-push', 'push_function_url');
```

If you ever need to change them, Supabase → **Project Settings → Vault** lets you edit both.

## 6. Run the notifications SQL

In Supabase → **SQL Editor**, open `supabase/push_notifications.sql`, copy everything,
paste and run. It should finish with a few small result rows (the scheduled jobs).

## 7. Install the test version of Ile on your phone

Expo Go can't receive push notifications on Android, so you install a test build of Ile.

1. In PowerShell, in the `ile-web\mobile` folder:
   ```
   npx eas-cli build --profile development --platform android
   ```
   Answer **Yes** if it asks to create an Android keystore. The build runs on Expo's
   servers and takes 10–20 minutes. At the end you get a link and a QR code.
2. Open the link on your phone and download the APK. Android will ask to allow
   installing from your browser; allow it, then install **Ile**.
3. On your computer, in `ile-web\mobile`:
   ```
   npx expo start --dev-client --tunnel
   ```
4. Open the new **Ile** app on your phone (not Expo Go). It finds your computer;
   if not, scan the QR code with the phone camera.

You only rebuild the APK when native features change. Everyday code changes load
straight into this app, like in Expo Go.

## 8. Test

1. Log in on the phone, open **Inbox**, tap **Turn on notifications**, and allow.
2. On the website, log in with a **different** account and message the phone's account
   about a listing. The phone should buzz within a few seconds.
3. Send 5 more messages quickly: you should still get just one alert until you open the chat.
4. Tap the alert: it should open that chat.
5. From the website, book or request a viewing on the phone account's listing (or have the
   lister confirm one of the phone account's requests). An alert should arrive.
6. In the app, go to **Account → Notifications**, switch **Messages** off, send another
   message from the website: no alert should arrive. Switch it back on.
7. Log out in the app, send another message: no alert should arrive.

If nothing arrives: Supabase → **Edge Functions → send-push → Logs** shows each attempt.
Paste anything red to me.

---

## iPhone (later)

iPhone alerts need the Apple Developer account ($99/year). When you have it, run
`npx eas-cli build --profile development --platform ios`; Expo sets up Apple's push key
for you during that first build. Nothing else in this guide changes.
