import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { AppState } from "react-native";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "./supabase";
import { loadRememberMe } from "./secureStore";
import { enforceInactivity, touchActivity } from "./session";
import { createStartupGate } from "./startupGate";

type SessionState = { session: Session | null; user: User | null; loading: boolean };
const SessionContext = createContext<SessionState>({ session: null, user: null, loading: true });

// Loads the saved session (after the 30-day inactivity check) and keeps it
// in sync with sign-in, sign-out and token refreshes.
export function SessionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SessionState>({ session: null, user: null, loading: true });

  useEffect(() => {
    let active = true;
    const gate = createStartupGate();
    (async () => {
      await loadRememberMe();
      await enforceInactivity();
      await touchActivity();
      const { data } = await supabase.auth.getSession();
      if (active) setState({ session: data.session, user: data.session?.user ?? null, loading: false });
      gate.open();
    })();
    const { data: listener } = supabase.auth.onAuthStateChange(
      gate.wrap((_event, session) => {
        setState({ session, user: session?.user ?? null, loading: false });
      })
    );
    const sub = AppState.addEventListener("change", async (s) => {
      if (s === "active") {
        await enforceInactivity();
        await touchActivity();
      }
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
      sub.remove();
    };
  }, []);

  return <SessionContext.Provider value={state}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  return useContext(SessionContext);
}

export function isLister(user: User | null): boolean {
  return user?.user_metadata?.role === "landlord";
}
