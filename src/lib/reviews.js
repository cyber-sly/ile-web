import { supabase } from "@/lib/supabaseClient";
import { fetchRatings as fetchRatingsWith } from "@shared/people.js";

export { canReview, viewingDateReached } from "@shared/reviews.js";

// { userId: { average, total, accurate_pct } } for listers or tenants.
export function fetchRatings(userIds, role) {
  return fetchRatingsWith(supabase, userIds, role);
}

// Ids of viewings the signed-in user has already reviewed, from a list.
// Reviewer ids aren't readable through the API, so this goes through an RPC
// that only answers for the caller.
export async function fetchReviewedIds(inspectionIds) {
  if (inspectionIds.length === 0) return new Set();
  const { data } = await supabase.rpc("my_reviewed_inspections", { p_ids: inspectionIds });
  return new Set(data || []);
}
