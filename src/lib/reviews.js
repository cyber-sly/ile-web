import { supabase } from "@/lib/supabaseClient";

// Today's date in Nigeria, as YYYY-MM-DD, to match how viewing dates are stored.
function todayInLagos() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" });
}

// Mirrors leave_review(): the viewing was marked done, or it was confirmed
// and its date has passed.
export function canReview(inspection) {
  const today = todayInLagos();
  if (inspection.status === "done") return inspection.preferred_date <= today;
  return inspection.status === "confirmed" && inspection.preferred_date < today;
}

// Listers can mark a viewing done on or after its date.
export function viewingDateReached(inspection) {
  return inspection.preferred_date <= todayInLagos();
}

// { userId: { average, total, accurate_pct } } for listers or tenants.
export async function fetchRatings(userIds, role) {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (ids.length === 0) return {};
  const { data } = await supabase.rpc("user_ratings", { p_users: ids, p_role: role });
  return Object.fromEntries((data || []).map((r) => [r.user_id, r]));
}

// Ids of viewings the signed-in user has already reviewed, from a list.
// Reviewer ids aren't readable through the API, so this goes through an RPC
// that only answers for the caller.
export async function fetchReviewedIds(inspectionIds) {
  if (inspectionIds.length === 0) return new Set();
  const { data } = await supabase.rpc("my_reviewed_inspections", { p_ids: inspectionIds });
  return new Set(data || []);
}
