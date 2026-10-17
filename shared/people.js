// Public details about other people (listers, home-seekers): names, photos,
// ratings and reply times. Each takes a Supabase client first.

function uniqueIds(ids) {
  return [...new Set(ids.filter(Boolean))];
}

// The name other people see: "@username" when the person chose that,
// otherwise their name.
export function displayName(profile) {
  const username = profile?.username?.trim();
  if (profile?.show_as === "username" && username) return `@${username}`;
  return profile?.full_name?.trim() || "Ile member";
}

export const RESERVED_USERNAMES = ["admin", "ile", "support", "help", "official", "moderator"];

export function normalizeUsername(input) {
  return String(input ?? "").trim().replace(/^@+/, "").toLowerCase();
}

// Plain-language problem with a username, or null when it's fine.
export function usernameError(input) {
  const u = normalizeUsername(input);
  if (!/^[a-z0-9_]{3,20}$/.test(u)) return "Use 3 to 20 letters, numbers or underscores.";
  if (u.startsWith("_") || u.endsWith("_")) return "A username can't start or end with _.";
  if (RESERVED_USERNAMES.includes(u)) return "That username isn't available.";
  return null;
}

// "0803 123 4567", "803-123-4567", "+234 803 123 4567" -> "+2348031234567".
export function normalizePhone(input) {
  const digits = String(input ?? "").replace(/[^0-9]/g, "");
  let national = null;
  if (/^0[0-9]{10}$/.test(digits)) national = digits.slice(1);
  else if (/^[1-9][0-9]{9}$/.test(digits)) national = digits;
  else if (/^234[0-9]{10}$/.test(digits)) national = digits.slice(3);
  return national ? `+234${national}` : null;
}

export function phoneError(input) {
  if (!String(input ?? "").trim()) return null;
  return normalizePhone(input) ? null : "Enter a Nigerian number, e.g. 0803 123 4567.";
}

// "+2348031234567" -> "0803 123 4567"
export function localPhone(phone) {
  const n = normalizePhone(phone);
  if (!n) return phone || "";
  const local = `0${n.slice(4)}`;
  return `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}`;
}

// { id: { name, avatar, username } }. Before supabase/profiles_privacy.sql is
// run there are no username columns, so it falls back to names.
export async function fetchPeople(client, ids) {
  const unique = uniqueIds(ids);
  if (unique.length === 0) return {};
  let { data, error } = await client.from("profiles").select("id, full_name, avatar_url, username, show_as").in("id", unique);
  if (error?.code === "42703") ({ data } = await client.from("profiles").select("id, full_name, avatar_url").in("id", unique));
  return Object.fromEntries(
    (data || []).map((p) => [p.id, { name: displayName(p), avatar: p.avatar_url, username: p.username || null }])
  );
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

// { id: { occupation, move_in_timeline } } for home-seekers who booked with me.
export async function fetchTenantDetails(client, ids) {
  const unique = uniqueIds(ids);
  if (unique.length === 0) return {};
  const { data } = await client.rpc("tenant_details", { p_ids: unique });
  return Object.fromEntries((data || []).map((r) => [r.id, r]));
}
