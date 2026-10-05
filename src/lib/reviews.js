import { supabase } from "@/lib/supabaseClient";

// Today's date in Nigeria, as YYYY-MM-DD, to match how viewing dates are stored.
function todayInLagos() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" });
}

// Mirrors leave_review(): the viewing was marked done, or it was confirmed
// and its date has passed.
export function canReview(inspection) {
  if (inspection.status === "done") return true;
  return inspection.status === "confirmed" && inspection.preferred_date < todayInLagos();
}

// { userId: { average, total, accurate_pct } } for listers or tenants.
export async function fetchRatings(userIds, role) {
  const ids = [...new Set(userIds.filter(Boolean))];
  if (ids.length === 0) return {};
  const { data } = await supabase.rpc("user_ratings", { p_users: ids, p_role: role });
  return Object.fromEntries((data || []).map((r) => [r.user_id, r]));
}

// Ids of viewings the current user has already reviewed, from a list.
export async function fetchReviewedIds(userId, inspectionIds) {
  if (inspectionIds.length === 0) return new Set();
  const { data } = await supabase
    .from("reviews")
    .select("inspection_id")
    .eq("reviewer_id", userId)
    .in("inspection_id", inspectionIds);
  return new Set((data || []).map((r) => r.inspection_id));
}
