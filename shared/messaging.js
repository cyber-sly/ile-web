// In-app messages: conversations about a listing between a home-seeker and
// a lister. Shared by the website and the app.
import { fetchPeople } from "./people.js";
import { serverNow } from "./presence.js";

export const MAX_MESSAGE = 2000;

// Text ready to send, or null when empty or too long.
export function cleanMessage(text) {
  const body = String(text || "").trim();
  return body && body.length <= MAX_MESSAGE ? body : null;
}

// Get or create the conversation for a listing and return its id.
// Listers pass the tenant they want to message.
/** @param {any} client @param {string} listingId @param {string | null} [tenantId] */
export async function startConversation(client, listingId, tenantId = null) {
  const { data, error } = await client.rpc("start_conversation", { p_listing: listingId, p_tenant: tenantId });
  if (error) throw new Error(error.message);
  return data;
}

// Messages sent to me that are still unread (RLS limits this to my conversations).
export async function fetchUnreadCount(client, userId) {
  const { count } = await client
    .from("messages")
    .select("id", { count: "exact", head: true })
    .is("read_at", null)
    .or(`sender_id.is.null,sender_id.neq.${userId}`);
  return count || 0;
}

// One inbox row: the other person, the listing, latest message, unread count.
export function threadFrom(convo, userId, people, summary) {
  const iAmTenant = convo.tenant_id === userId;
  const otherId = iAmTenant ? convo.landlord_id : convo.tenant_id;
  const role = iAmTenant ? "Lister" : "Home-seeker";
  return {
    ...convo,
    otherId,
    otherName: otherId ? people[otherId]?.name || role : "Deleted user",
    otherAvatar: otherId ? people[otherId]?.avatar || null : null,
    role,
    listing: convo.listings || null,
    latest: summary?.last_at ? { body: summary.last_body, sender_id: summary.last_sender, created_at: summary.last_at } : undefined,
    unread: summary?.unread || 0,
  };
}

export async function loadThreads(client, userId) {
  const { data: convos, error } = await client
    .from("conversations")
    .select("id, tenant_id, landlord_id, last_message_at, listings(id, title, image_url)")
    .order("last_message_at", { ascending: false });
  if (error) return { threads: [], error: error.message };
  const [people, { data: summary }] = await Promise.all([
    fetchPeople(client, convos.map((c) => (c.tenant_id === userId ? c.landlord_id : c.tenant_id))),
    client.rpc("inbox_summary"),
  ]);
  const byConvo = Object.fromEntries((summary || []).map((r) => [r.conversation_id, r]));
  return { threads: convos.map((c) => threadFrom(c, userId, people, byConvo[c.id])), error: "" };
}

// A conversation (with its listing) and its messages, oldest first.
export async function fetchThread(client, id) {
  const [{ data: convo, error }, { data: messages }] = await Promise.all([
    client
      .from("conversations")
      .select("id, tenant_id, landlord_id, listings(id, title, image_url, price, price_period, listing_type)")
      .eq("id", id)
      .maybeSingle(),
    client.from("messages").select("*").eq("conversation_id", id).order("created_at"),
  ]);
  if (error) throw new Error(error.message);
  return { convo, messages: messages || [] };
}

// `id` (optional) is made on the phone, so a retry after a lost response
// can't save the message twice: the second insert hits the same id.
/** @param {any} client @param {string} conversationId @param {string} senderId @param {string} body @param {string} [id] */
export async function sendMessage(client, conversationId, senderId, body, id) {
  const row = { conversation_id: conversationId, sender_id: senderId, body, ...(id && { id }) };
  const { data, error } = await client.from("messages").insert(row).select().single();
  if (error && id && error.code === "23505") return { ...row, created_at: new Date().toISOString(), read_at: null };
  if (error) throw Object.assign(new Error(error.message), { code: error.code });
  return data;
}

export async function markRead(client, ids) {
  if (ids.length === 0) return;
  await client.from("messages").update({ read_at: new Date().toISOString() }).in("id", ids).is("read_at", null);
}

// Inbox time: "now", "5m", "3h", "Tue", "12 Oct".
export function shortTime(iso, now = new Date()) {
  const d = new Date(iso);
  const diff = (now.getTime() - d.getTime()) / 1000;
  if (diff < 60) return "now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 7 * 86400) return d.toLocaleDateString("en-NG", { weekday: "short" });
  return d.toLocaleDateString("en-NG", { day: "numeric", month: "short" });
}

// Chat day divider: "Today", "Yesterday", "Friday 9 October".
export function dayLabel(iso, now = new Date()) {
  const d = new Date(iso);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (d.toDateString() === now.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString("en-NG", { weekday: "long", day: "numeric", month: "long" });
}

// --- Editing a sent message (needs supabase/presence_edit.sql) ---------------

export const EDIT_WINDOW_MS = 3 * 60 * 1000;

// True while I can still edit this message: mine, saved (not waiting in the
// outbox), under 3 minutes old, and the edit column exists (SQL has been run).
// A minute of clock difference the other way is tolerated; the database is
// the final judge.
/** @param {any} message @param {string} userId @param {Date} [now] */
export function canEdit(message, userId, now = serverNow()) {
  if (!message || !("edited_at" in message) || message.pending) return false;
  if (!userId || message.sender_id !== userId || String(message.id).startsWith("temp-")) return false;
  const age = now.getTime() - new Date(message.created_at).getTime();
  return age >= -60 * 1000 && age < EDIT_WINDOW_MS;
}

// Saves the new text and returns the updated message. The database's
// refusals are written for people, so friendlyError shows them as they are.
/** @param {any} client @param {string} id @param {string} body */
export async function editMessage(client, id, body) {
  const text = cleanMessage(body);
  if (!text) throw new Error("Messages must be 1 to 2000 characters.");
  const { data, error } = await client.rpc("edit_message", { p_id: id, p_body: text });
  if (error) throw Object.assign(new Error(error.message), { code: error.code });
  return data;
}
