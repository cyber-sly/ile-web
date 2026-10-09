import { useEffect, useSyncExternalStore } from "react";
import { AppState } from "react-native";
import { onlineManager } from "@tanstack/react-query";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { fetchUnreadCount } from "@shared/messaging.js";
import { supabase } from "./supabase";

// Unread message count for the Inbox tab badge: one query and one realtime
// channel for the whole app, refreshed on reconnect and when reopened.
let count = 0;
let userId: string | null = null;
let channel: RealtimeChannel | null = null;
const listeners = new Set<() => void>();

function emit(next: number) {
  count = next;
  listeners.forEach((l) => l());
}

export async function refreshUnread() {
  const uid = userId;
  if (!uid) return emit(0);
  try {
    const next = await fetchUnreadCount(supabase, uid);
    if (userId === uid) emit(next);
  } catch {}
}

function connect(nextUser: string | null) {
  if (nextUser === userId) return;
  if (channel) supabase.removeChannel(channel);
  channel = null;
  userId = nextUser;
  refreshUnread();
  if (!nextUser) return;
  channel = supabase
    .channel(`unread-${nextUser}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => refreshUnread())
    .subscribe();
}

onlineManager.subscribe((online) => {
  if (online) refreshUnread();
});
AppState.addEventListener("change", (state) => {
  if (state === "active") refreshUnread();
});

export function useUnreadCount(currentUserId: string | null): number {
  useEffect(() => {
    connect(currentUserId);
  }, [currentUserId]);
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => count
  );
}
