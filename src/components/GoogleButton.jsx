"use client";

import { useState } from "react";
import { supabase, setRememberMe } from "@/lib/supabaseClient";
import { PENDING_ROLE_KEY, useProviderEnabled } from "@/lib/oauth";

// Google's "G" mark, in its official colours.
function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

// "Continue with Google" plus an "or with email" divider. Sends the user to
// Google, then back to /auth/callback, which finishes setup and returns them
// to `next`. `role` (signup page only) is remembered across the round trip.
// Renders nothing until Google is enabled in Supabase.
export default function GoogleButton({ next, role, remember = true, label = "Continue with Google" }) {
  const enabled = useProviderEnabled("google");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function start() {
    setBusy(true);
    setError("");
    setRememberMe(remember);
    try {
      if (role) localStorage.setItem(PENDING_ROLE_KEY, role);
      else localStorage.removeItem(PENDING_ROLE_KEY);
    } catch {}

    const callback = new URL("/auth/callback", window.location.origin);
    if (next) callback.searchParams.set("next", next);

    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callback.toString(),
        // Always show the account picker, so people on shared devices can
        // choose the right Google account.
        queryParams: { prompt: "select_account" },
      },
    });
    // On success the browser is already leaving for Google.
    if (oauthError) {
      setBusy(false);
      setError(
        /provider is not enabled|unsupported provider/i.test(oauthError.message)
          ? "Google sign-in isn't switched on yet. Please use email for now."
          : oauthError.message
      );
    }
  }

  if (!enabled) return null;

  return (
    <div>
      <button
        type="button"
        onClick={start}
        disabled={busy}
        className="flex h-12 w-full items-center justify-center gap-3 rounded-[var(--radius-control)] border border-line-strong bg-white font-semibold text-ink transition-colors hover:bg-ink/[0.03] disabled:opacity-60"
      >
        <GoogleMark /> {busy ? "Opening Google…" : label}
      </button>
      {error && <p className="mt-2 text-sm font-medium text-clay">{error}</p>}
      <OrDivider />
    </div>
  );
}

function OrDivider() {
  return (
    <div className="my-6 flex items-center gap-3 text-xs font-semibold uppercase tracking-wider text-ink-muted">
      <span className="h-px flex-1 bg-line-strong" /> or with email <span className="h-px flex-1 bg-line-strong" />
    </div>
  );
}
