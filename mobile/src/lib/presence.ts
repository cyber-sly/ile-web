import { useEffect, useState } from "react";
import { AppState } from "react-native";
import { onlineManager, useQuery } from "@tanstack/react-query";
import { CHECK_IN_MS, fetchChatPresence, touchPresence } from "@shared/presence.js";
import { supabase } from "./supabase";
import { useSession } from "./useSession";

// Is the app in front of the person right now?
function useAppActive() {
  const [active, setActive] = useState(AppState.currentState === "active");
  useEffect(() => {
    const sub = AppState.addEventListener("change", (s) => setActive(s === "active"));
    return () => sub.remove();
  }, []);
  return active;
}

// Tells the database "still here" once a minute while the app is open and in
// front of a signed-in person. Mounted once, in the root layout.
export function usePresenceCheckIn() {
  const { user } = useSession();
  const active = useAppActive();
  const userId = user?.id ?? null;

  useEffect(() => {
    if (!userId || !active) return;
    const check = () => {
      if (onlineManager.isOnline()) touchPresence(supabase);
    };
    check();
    const timer = setInterval(check, CHECK_IN_MS);
    return () => clearInterval(timer);
  }, [userId, active]);
}

// { conversationId: lastSeenAt } for the other person in each chat, refreshed
// every minute while the app is in front. Not kept offline (stale "Online"
// would mislead).
export function useChatPresence(conversationIds: string[]): Record<string, string> {
  const active = useAppActive();
  const ids = [...new Set(conversationIds)].sort();
  // Redraw every 30 s so inbox dots go out when someone leaves, even though
  // their saved time (and so the query data) stops changing.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!active || ids.length === 0) return;
    const timer = setInterval(() => setTick((n) => n + 1), 30 * 1000);
    return () => clearInterval(timer);
  }, [active, ids.length]);
  const { data } = useQuery({
    queryKey: ["chat-presence", ...ids],
    queryFn: () => fetchChatPresence(supabase, ids) as Promise<Record<string, string>>,
    enabled: ids.length > 0,
    refetchInterval: active ? CHECK_IN_MS : false,
    staleTime: CHECK_IN_MS / 2,
  });
  return data ?? {};
}
