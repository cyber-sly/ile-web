"use client";

import { useEffect, useState } from "react";

// Shared between the Google button and the /auth/callback page.

// The role chosen on the signup page ("tenant" or "landlord"), kept in
// localStorage while the user is away at Google.
export const PENDING_ROLE_KEY = "ile:pending-role";

// Which sign-in providers are switched on in Supabase (public endpoint),
// fetched once per page load.
let providersPromise;
function loadProviders() {
  providersPromise ??= fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/settings`, {
    headers: { apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY },
  })
    .then((r) => (r.ok ? r.json() : {}))
    .then((s) => s.external || {})
    .catch(() => ({}));
  return providersPromise;
}

// true once Google sign-in is enabled in Supabase; false until then, so the
// button never sends people to an error page.
export function useProviderEnabled(provider) {
  const [enabled, setEnabled] = useState(false);
  useEffect(() => {
    let cancelled = false;
    loadProviders().then((p) => !cancelled && setEnabled(Boolean(p[provider])));
    return () => {
      cancelled = true;
    };
  }, [provider]);
  return enabled;
}
