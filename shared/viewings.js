// Viewings (the `inspections` table): booking, requests and the rules for
// what a home-seeker can do with each one. Shared by the website and the app.
import { viewingDateReached } from "./reviews.js";

// Label and colour tone for each viewing status.
export const VIEWING_STATUS = {
  pending: { tone: "gold", label: "Awaiting reply" },
  countered: { tone: "clay", label: "New time proposed" },
  confirmed: { tone: "palm", label: "Confirmed" },
  declined: { tone: "neutral", label: "Declined" },
  cancelled: { tone: "neutral", label: "Cancelled" },
  done: { tone: "neutral", label: "Viewed" },
};

// Needs attention first: a new time to answer, then waiting, then booked.
export const ACTIVE_STATUSES = ["countered", "pending", "confirmed"];

// [{ slot_date, slot_time }] -> [{ date, times }], keeping date order.
export function groupSlotsByDay(slots) {
  const byDay = new Map();
  for (const s of slots) {
    if (!byDay.has(s.slot_date)) byDay.set(s.slot_date, []);
    byDay.get(s.slot_date).push(s.slot_time);
  }
  return [...byDay.entries()].map(([date, times]) => ({ date, times }));
}

export function sortViewings(list) {
  const order = (v) => (ACTIVE_STATUSES.includes(v.status) ? ACTIVE_STATUSES.indexOf(v.status) : 9);
  return [...list].sort((a, b) => order(a) - order(b));
}

// Which buttons a home-seeker sees on a viewing.
export function viewingActions(inspection) {
  const { status } = inspection;
  return {
    accept: status === "countered",
    decline: status === "countered",
    cancel: status === "pending" || (status === "confirmed" && !viewingDateReached(inspection)),
    message: ACTIVE_STATUSES.includes(status),
  };
}

// Accepting the lister's suggested time books it.
export function acceptChanges(inspection) {
  return { status: "confirmed", preferred_date: inspection.proposed_date, preferred_time: inspection.proposed_time };
}

export async function fetchMyViewings(client, userId) {
  const { data, error } = await client
    .from("inspections")
    .select("*, listings(id, title, location, state, lga, area, price, price_period, listing_type, image_url, landlord_id)")
    .eq("tenant_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

// The home-seeker's current request for a listing, if any.
export async function fetchActiveViewing(client, listingId, userId) {
  const { data, error } = await client
    .from("inspections")
    .select("id, status, preferred_date, preferred_time, proposed_date, proposed_time")
    .eq("listing_id", listingId)
    .eq("tenant_id", userId)
    .in("status", ACTIVE_STATUSES)
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) throw new Error(error.message);
  return data?.[0] ?? null;
}

// Open viewing times for the next two weeks ([] when they can't be loaded).
export async function fetchOpenSlots(client, listingId) {
  const { data, error } = await client.rpc("listing_open_slots", { p_listing: listingId, p_days: 14 });
  return error ? [] : data || [];
}

// Book an open time; confirmed instantly. Returns the new viewing id.
export async function bookSlot(client, listingId, date, time) {
  const { data, error } = await client.rpc("book_viewing_slot", { p_listing: listingId, p_date: date, p_time: time });
  if (error) throw new Error(error.message);
  return data;
}

// Ask for a time; the lister confirms or suggests another.
export async function requestViewing(client, listingId, userId, date, time) {
  const { data, error } = await client
    .from("inspections")
    .insert({ listing_id: listingId, tenant_id: userId, preferred_date: date, preferred_time: time || null })
    .select("id, status, preferred_date, preferred_time")
    .single();
  if (error) throw new Error(error.code === "23505" ? "That time is already taken. Please choose another." : error.message);
  return data;
}

export async function updateViewing(client, id, changes) {
  const { error } = await client.from("inspections").update(changes).eq("id", id);
  if (error) throw new Error(error.message);
}
