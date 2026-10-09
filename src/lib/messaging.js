"use client";

import { useEffect, useSyncExternalStore } from "react";
import { supabase } from "@/lib/supabaseClient";
import { startConversation as startConversationWith, fetchUnreadCount } from "@shared/messaging.js";

// Get or create the conversation for a listing and return its id.
// Listers pass the tenant they want to message.
export function startConversation(listingId, tenantId = null) {
  return startConversationWith(supabase, listingId, tenantId);
}

// Names for a set of user ids, as { id: "Full Name" }.
export async function fetchNames(ids) {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return {};
  const { data } = await supabase.from("profiles").select("id, full_name").in("id", unique);
  return Object.fromEntries((data || []).map((p) => [p.id, p.full_name?.trim() || ""]));
}

export function firstName(name, fallback = "Someone") {
  return name?.trim().split(/\s+/)[0] || fallback;
}

// ---------------------------------------------------------------------------
// Unread message count, shared by every component that shows it. One query
// and one realtime channel no matter how many badges are on screen.
// ---------------------------------------------------------------------------

let count = 0;
let currentUser = null;
let channel = null;
const listeners = new Set();

function emit() {
  listeners.forEach((l) => l());
}

export async function refreshUnread() {
  if (!currentUser) {
    count = 0;
    emit();
    return;
  }
  count = await fetchUnreadCount(supabase, currentUser);
  emit();
}

function connect(userId) {
  if (currentUser === userId) return;
  if (channel) supabase.removeChannel(channel);
  channel = null;
  currentUser = userId;
  refreshUnread();
  if (!userId) return;
  channel = supabase
    .channel(`unread-${userId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => refreshUnread())
    .subscribe();
}

function subscribe(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useUnreadCount(user) {
  const userId = user?.id ?? null;
  useEffect(() => {
    if (user !== undefined) connect(userId);
  }, [user, userId]);
  return useSyncExternalStore(subscribe, () => count, () => 0);
}
