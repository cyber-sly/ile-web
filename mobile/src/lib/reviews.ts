import { canReview } from "@shared/reviews.js";

type Client = any;

// Whether a viewing can be reviewed now, was already reviewed, or not yet.
export function reviewState(inspection: { id: string; status: string; preferred_date: string }, reviewedIds: Set<string>) {
  if (reviewedIds.has(String(inspection.id))) return "reviewed" as const;
  return canReview(inspection) ? ("can-review" as const) : ("not-yet" as const);
}

// Which of these viewings the signed-in person already reviewed.
export async function fetchReviewedIds(client: Client, ids: string[]): Promise<Set<string>> {
  if (ids.length === 0) return new Set();
  const { data } = await client.rpc("my_reviewed_inspections", { p_ids: ids });
  return new Set((data || []).map(String));
}
