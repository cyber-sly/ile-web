// Public details about other people (listers, home-seekers): names, photos,
// ratings and reply times. Each takes a Supabase client first.

function uniqueIds(ids) {
  return [...new Set(ids.filter(Boolean))];
}

// { id: { name, avatar } }
export async function fetchPeople(client, ids) {
  const unique = uniqueIds(ids);
  if (unique.length === 0) return {};
  const { data } = await client.from("profiles").select("id, full_name, avatar_url").in("id", unique);
  return Object.fromEntries((data || []).map((p) => [p.id, { name: p.full_name?.trim() || "", avatar: p.avatar_url }]));
}

// { userId: { average, total, accurate_pct } } for listers or tenants.
export async function fetchRatings(client, ids, role) {
  const unique = uniqueIds(ids);
  if (unique.length === 0) return {};
  const { data } = await client.rpc("user_ratings", { p_users: unique, p_role: role });
  return Object.fromEntries((data || []).map((r) => [r.user_id, r]));
}

// { id: minutes } median first-reply time (only listers with enough chats).
export async function fetchResponseTimes(client, ids) {
  const unique = uniqueIds(ids);
  if (unique.length === 0) return {};
  const { data } = await client.rpc("lister_response_times", { p_users: unique });
  return Object.fromEntries((data || []).map((r) => [r.user_id, r.median_minutes]));
}
