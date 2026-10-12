# Google and Apple sign-in in the app

## Google (Android and iPhone) — 2 minutes

The app uses the same Google setup as the website. It only needs permission to
return to the app after Google:

1. Supabase dashboard → **Authentication → URL Configuration**.
2. Under **Redirect URLs**, click **Add URL** and add each of these (one per entry):
   ```
   ile://auth-callback
   ile://**
   ```
3. Click **Save**. Don't change the Site URL.

Test: open the Ile test app → Account → Log in → **Continue with Google**. After
choosing your Google account, you should land back in the app, logged in.
A brand-new Google account picks up the "I want to" choice from the sign-up screen
(home-seeker or lister).

## Apple (iPhone only) — when you have the Apple Developer account

Apple requires "Sign in with Apple" on iPhone because the app offers Google sign-in.
The code is already in the app; it switches on once these steps are done:

1. https://developer.apple.com/account → **Certificates, Identifiers & Profiles → Identifiers**.
   Open (or let Expo create during the first iOS build) the App ID **ng.ile.app**
   and tick **Sign in with Apple**. Save.
2. Supabase dashboard → **Authentication → Sign In / Providers → Apple** → switch it on.
   In **Client IDs**, enter `ng.ile.app`. Save. (The "Secret Key" fields are only needed
   for Apple sign-in on the website, which we aren't adding now.)
3. Build the iPhone test app: in `ile-web\mobile`, run
   `npx eas-cli build --profile development --platform ios`.

Test on an iPhone: Log in → **Continue with Apple**.

If you change the app id from `ng.ile.app`, use the new id in both places above.

**Before the App Store submission:** Apple expects apps with Sign in with Apple to
revoke the person's Apple sign-in when they delete their account. That needs Apple's
secret key (created in your Apple Developer account), so it will be added together
with the iPhone release work.
