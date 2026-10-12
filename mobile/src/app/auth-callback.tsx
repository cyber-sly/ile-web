import { Redirect } from "expo-router";

// Google sends people back to ile://auth-callback. The sign-in itself is
// finished in lib/oauth.ts; this screen only stops Android showing
// "Unmatched route" for that address.
export default function AuthCallback() {
  return <Redirect href="/" />;
}
