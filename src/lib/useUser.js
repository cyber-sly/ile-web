"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

// Current Supabase user, kept in sync with sign-in/sign-out.
// `user` is undefined while loading, null when signed out.
export function useUser() {
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  return user;
}

export function isLandlord(user) {
  return user?.user_metadata?.role === "landlord";
}

// Login link that brings the user back to where they were.
export function loginHref(next) {
  return next && next !== "/" ? `/login?next=${encodeURIComponent(next)}` : "/login";
}
