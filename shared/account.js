// Account rules shared by the website and the app: profile editing, reviews,
// reports, public lister profiles and account deletion. Functions that talk
// to the database take a Supabase client first.
import { freshCutoff } from "./property.js";

export const MIN_PASSWORD = 8;
export const MEDIA_BUCKETS = ["listing-images", "listing-videos", "avatars"];

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// --- Account deletion -------------------------------------------------------

// Email/password accounts confirm with their password; Google- or Apple-only
// accounts (no password) confirm by typing DELETE.
export function hasPassword(user) {
  return (user?.identities || []).some((i) => i.provider === "email");
}

// Re-check the password without changing the current session.
export async function verifyPassword(client, email, password) {
  const { error } = await client.auth.signInWithPassword({ email, password });
  return !error;
}

// Every file in a user's folder (<user id>/...) in one bucket.
async function listUserFiles(client, bucket, userId) {
  const paths = [];
  for (let offset = 0; ; offset += 100) {
    const { data, error } = await client.storage.from(bucket).list(userId, { limit: 100, offset });
    if (error) throw new Error(error.message);
    paths.push(...(data || []).filter((f) => f.id).map((f) => `${userId}/${f.name}`));
    if (!data || data.length < 100) return paths;
  }
}

// Permanently delete the signed-in user's account.
// 1. Make sure deletion will work before removing anything.
// 2. Remove their photos and videos (only the Storage API can).
// 3. Delete the account; supabase/account_deletion.sql decides what's removed
//    and what's kept (chats, anonymous reviews).
// 4. Sign this device out. Callers clear their own local data afterwards.
export async function deleteMyAccount(client, userId) {
  const { data: ready, error: readyError } = await client.rpc("account_deletion_ready");
  if (readyError || !ready) {
    throw new Error("Account deletion isn't available right now. Nothing was deleted. Please try again later.");
  }
  for (const bucket of MEDIA_BUCKETS) {
    const paths = await listUserFiles(client, bucket, userId);
    for (let i = 0; i < paths.length; i += 100) {
      const { error } = await client.storage.from(bucket).remove(paths.slice(i, i + 100));
      if (error) throw new Error(`Couldn't remove your photos: ${error.message}`);
    }
  }
  const { error } = await client.rpc("delete_my_account");
  if (error) throw new Error(error.message);
  // The server session is already gone; clear what's left on this device.
  try {
    await client.auth.signOut({ scope: "local" });
  } catch {}
}

// --- Profile ------------------------------------------------------------------

// The signed-in user's full profile, including private fields.
export async function fetchMyProfile(client) {
  const { data, error } = await client.rpc("my_profile");
  if (error) throw new Error(error.message);
  return data?.[0] || null;
}

export async function saveProfile(client, userId, changes) {
  const { error } = await client.from("profiles").update(changes).eq("id", userId);
  if (error) throw new Error(error.message);
  // Keep the name on the auth account in sync (used in menus and emails).
  if ("full_name" in changes) await client.auth.updateUser({ data: { full_name: changes.full_name } });
}

export const EMPTY_PROFILE_FORM = {
  full_name: "",
  bio: "",
  languages: [],
  home_state: "",
  lister_type: "",
  business_name: "",
  office_address: "",
  areas_covered: [],
  listing_since: "",
  registration_body: "",
  registration_number: "",
  occupation: "",
  move_in_timeline: "",
};

export function profileToForm(profile) {
  return Object.fromEntries(
    Object.entries(EMPTY_PROFILE_FORM).map(([k, empty]) => {
      const value = profile?.[k];
      if (value === null || value === undefined) return [k, Array.isArray(empty) ? [] : ""];
      return [k, Array.isArray(empty) ? value : String(value)];
    })
  );
}

export function formToProfileChanges(v, isLister, thisYear = new Date().getFullYear()) {
  const year = Number(v.listing_since);
  return {
    full_name: v.full_name.trim(),
    bio: v.bio.trim() || null,
    languages: v.languages,
    home_state: v.home_state || null,
    occupation: v.occupation || null,
    move_in_timeline: v.move_in_timeline || null,
    ...(isLister
      ? {
          lister_type: v.lister_type || null,
          business_name: v.business_name.trim() || null,
          office_address: v.office_address.trim() || null,
          areas_covered: v.areas_covered,
          listing_since: year >= 1950 && year <= thisYear ? year : null,
          registration_body: v.registration_body || null,
          registration_number: v.registration_number.trim() || null,
        }
      : {}),
  };
}

// Limits match supabase/profiles_extended.sql.
export function validateProfileForm(v) {
  const er = {};
  if (!v.full_name.trim()) er.full_name = "Add your name.";
  else if (v.full_name.trim().length > 80) er.full_name = "Keep your name under 80 characters.";
  if (v.bio.trim().length > 300) er.bio = "Keep your bio under 300 characters.";
  if (v.languages.length > 8) er.languages = "Choose up to 8 languages.";
  if (v.areas_covered.length > 15) er.areas_covered = "Choose up to 15 areas.";
  if (v.business_name.trim().length > 100) er.business_name = "Keep the business name under 100 characters.";
  if (v.office_address.trim().length > 200) er.office_address = "Keep the office address under 200 characters.";
  if (v.registration_number.trim().length > 50) er.registration_number = "Keep the registration number under 50 characters.";
  return er;
}

// --- Reviews and reports -------------------------------------------------------

/** @param {any} client @param {{ inspectionId: string, rating: number, comment?: string, accurate?: boolean | null }} review */
export async function leaveReview(client, { inspectionId, rating, comment = "", accurate = null }) {
  if (!rating) throw new Error("Choose a star rating.");
  const { error } = await client.rpc("leave_review", {
    p_inspection: inspectionId,
    p_rating: rating,
    p_comment: comment,
    p_accurate: accurate,
  });
  if (error) throw new Error(error.message);
}

export async function reportListing(client, { listingId, userId, reason, details = "" }) {
  if (!reason) throw new Error("Choose a reason.");
  const { error } = await client.from("listing_reports").insert({
    listing_id: listingId,
    reporter_id: userId,
    reason,
    details: details.trim() || null,
  });
  if (error) {
    throw new Error(error.code === "23505" ? "You've already reported this listing. We're looking into it." : error.message);
  }
}

// --- Public lister profile -------------------------------------------------------

// Rating, reviews (reviewers stay anonymous) and live listings for a lister.
export async function fetchListerProfile(client, id) {
  if (!UUID.test(String(id))) return null;
  const [{ data: profile }, { data: ratingRows }, { data: reviews }, { data: listings }] = await Promise.all([
    client
      .from("profiles")
      .select("id, full_name, created_at, avatar_url, bio, languages, lister_type, business_name, office_address, areas_covered, listing_since, registration_body")
      .eq("id", id)
      .maybeSingle(),
    client.rpc("user_ratings", { p_users: [id], p_role: "lister" }),
    client
      .from("reviews")
      .select("id, rating, comment, listing_accurate, created_at, listings(id, title)")
      .eq("reviewee_id", id)
      .eq("reviewee_role", "lister")
      .order("created_at", { ascending: false })
      .limit(50),
    client
      .from("listings")
      .select("*")
      .eq("landlord_id", id)
      .eq("status", "active")
      .gte("last_confirmed_at", freshCutoff())
      .order("created_at", { ascending: false })
      .limit(24),
  ]);
  if (!profile) return null;
  const { data: response } = await client.rpc("lister_response_times", { p_users: [id] });
  return {
    profile,
    rating: ratingRows?.[0] || null,
    reviews: reviews || [],
    listings: listings || [],
    responseMinutes: response?.[0]?.median_minutes ?? null,
  };
}
