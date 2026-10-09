"use client";

import { useEffect, useSyncExternalStore } from "react";
import { supabase } from "@/lib/supabaseClient";

// Get or create the conversation for a listing and return its id.
// Listers pass the tenant they want to message.
export async function startConversation(listingId, tenantId = null) {
  const { data, error } = await supabase.rpc("start_conversation", {
    p_listing: listingId,
    p_tenant: tenantId,
  });
  if (error) throw new Error(error.message);
  return data;
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
  // RLS limits this to the user's own conversations.
  const { count: c } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .is("read_at", null)
    .or(`sender_id.is.null,sender_id.neq.${currentUser}`);
  count = c || 0;
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
