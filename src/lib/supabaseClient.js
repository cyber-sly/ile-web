import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// ---------------------------------------------------------------------------
// Session safety
//  - "Keep me logged in" off: the session lives in sessionStorage, so it ends
//    when the browser is closed (shared computers, cyber cafés).
//  - On: localStorage, like before, but a device unused for INACTIVE_DAYS has
//    its session cleared before the client starts, so the next visit needs
//    the password again.
// ---------------------------------------------------------------------------

const REMEMBER_KEY = "ile:remember-me";
const LAST_ACTIVE_KEY = "ile:last-active";
const INACTIVE_DAYS = 30;
const isBrowser = typeof window !== "undefined";

function attempt(fn) {
  try {
    return fn();
  } catch {
    return null;
  }
}

function rememberMe() {
  return attempt(() => localStorage.getItem(REMEMBER_KEY)) !== "false";
}

// Call before signing in so the new session is stored in the right place.
export function setRememberMe(remember) {
  attempt(() => localStorage.setItem(REMEMBER_KEY, remember ? "true" : "false"));
}

// Supabase reads and writes its session through this; it picks the storage
// from the user's "Keep me logged in" choice.
const sessionStore = {
  getItem: (key) => attempt(() => sessionStorage.getItem(key)) ?? attempt(() => localStorage.getItem(key)),
  setItem: (key, value) => {
    const [keep, drop] = rememberMe() ? [localStorage, sessionStorage] : [sessionStorage, localStorage];
    attempt(() => keep.setItem(key, value));
    attempt(() => drop.removeItem(key));
  },
  removeItem: (key) => {
    attempt(() => localStorage.removeItem(key));
    attempt(() => sessionStorage.removeItem(key));
  },
};

function clearStoredSessions() {
  for (const store of [localStorage, sessionStorage]) {
    attempt(() =>
      Object.keys(store)
        .filter((k) => /^sb-.+-auth-token/.test(k))
        .forEach((k) => store.removeItem(k))
    );
  }
}

function touchActivity() {
  attempt(() => localStorage.setItem(LAST_ACTIVE_KEY, String(Date.now())));
}

if (isBrowser) {
  const last = Number(attempt(() => localStorage.getItem(LAST_ACTIVE_KEY)));
  if (last && Date.now() - last > INACTIVE_DAYS * 86_400_000) clearStoredSessions();
  touchActivity();
  // Coming back to the tab counts as activity too.
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") touchActivity();
  });
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: isBrowser ? { storage: sessionStore } : { persistSession: false },
});
