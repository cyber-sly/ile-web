"use client";

import { useCallback, useEffect, useState } from "react";
import { CHECK_IN_MS, fetchChatPresence, touchPresence } from "@shared/presence.js";
import { supabase } from "@/lib/supabaseClient";

const visible = () => typeof document === "undefined" || document.visibilityState === "visible";

// Runs `fn` now and every minute while the tab is visible, and again when the
// tab comes back into view. Stops when hidden.
function useWhileVisible(fn, enabled) {
  useEffect(() => {
    if (!enabled) return;
    let timer = null;
    const start = () => {
      if (timer || !visible()) return;
      fn();
      timer = setInterval(fn, CHECK_IN_MS);
    };
    const stop = () => {
      clearInterval(timer);
      timer = null;
    };
    const onChange = () => (visible() ? start() : stop());
    start();
    document.addEventListener("visibilitychange", onChange);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onChange);
    };
  }, [fn, enabled]);
}

const checkIn = () => touchPresence(supabase);

// Tells the database "still here" while a signed-in person has Ile open.
// Mounted once, in the Navbar.
export function usePresenceCheckIn(user) {
  useWhileVisible(checkIn, Boolean(user?.id));
}

// { conversationId: lastSeenAt } for the other person in each chat, refreshed
// every minute while the tab is visible.
export function useChatPresence(conversationIds) {
  const key = [...new Set(conversationIds.filter(Boolean))].sort().join(",");
  const [result, setResult] = useState({ key: "", presence: {} });

  const refresh = useCallback(() => {
    fetchChatPresence(supabase, key.split(",")).then((presence) => setResult({ key, presence }));
  }, [key]);
  useWhileVisible(refresh, Boolean(key));

  // Results for an older set of chats are ignored.
  return result.key === key ? result.presence : {};
}
