// Saved homes: shared between the website and the app. Functions that talk
// to the database take a Supabase client as their first argument.

// Account saves first (their order), then device saves not already there.
export function mergeSavedIds(local, remote) {
  const out = remote.map(String);
  for (const id of local.map(String)) if (!out.includes(id)) out.push(id);
  return out;
}

export async function fetchSavedIds(client) {
  const { data, error } = await client
    .from("saved_listings")
    .select("listing_id")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data || []).map((r) => String(r.listing_id));
}

export async function saveListing(client, userId, listingId) {
  const { error } = await client
    .from("saved_listings")
    .upsert({ user_id: userId, listing_id: listingId }, { onConflict: "user_id,listing_id", ignoreDuplicates: true });
  if (error) throw new Error(error.message);
}

export async function unsaveListing(client, userId, listingId) {
  const { error } = await client.from("saved_listings").delete().eq("user_id", userId).eq("listing_id", listingId);
  if (error) throw new Error(error.message);
}

// Move device saves into the account (duplicates ignored).
export async function importSavedIds(client, userId, ids) {
  if (!ids.length) return;
  const rows = ids.map((id) => ({ user_id: userId, listing_id: id }));
  const { error } = await client
    .from("saved_listings")
    .upsert(rows, { onConflict: "user_id,listing_id", ignoreDuplicates: true });
  if (error) throw new Error(error.message);
}
