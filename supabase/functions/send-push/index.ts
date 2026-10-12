// Supabase Edge Function: delivers pending notifications via the Expo Push API.
// Called by the database (pg_net) with the x-push-secret header; the logic
// lives in handler.js so it can be tested without Deno.
import { createClient } from "jsr:@supabase/supabase-js@2";
import { handle } from "./handler.js";

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});

function groupBy<T extends { user_id: string }>(rows: T[], pick: (row: T) => unknown) {
  const out: Record<string, unknown[]> = {};
  for (const r of rows) (out[r.user_id] ||= []).push(pick(r));
  return out;
}

const db = {
  async claimPending(limit: number) {
    const { data, error } = await supabase.rpc("ile_claim_notifications", { p_limit: limit });
    if (error) throw new Error(error.message);
    return data ?? [];
  },
  async tokensFor(userIds: string[]) {
    const { data, error } = await supabase.from("push_tokens").select("token, user_id").in("user_id", userIds);
    if (error) throw new Error(error.message);
    return groupBy(data ?? [], (r) => r.token);
  },
  async prefsFor(userIds: string[]) {
    const { data, error } = await supabase.from("notification_prefs").select("*").in("user_id", userIds);
    if (error) throw new Error(error.message);
    return Object.fromEntries((data ?? []).map((p) => [p.user_id, p]));
  },
  async deleteTokens(tokens: string[]) {
    await supabase.from("push_tokens").delete().in("token", tokens);
  },
  async unclaim(ids: string[]) {
    await supabase.from("notifications").update({ sent_at: null }).in("id", ids);
  },
};

Deno.serve((request) =>
  handle(request, {
    secret: Deno.env.get("PUSH_SECRET"),
    db,
    fetchImpl: fetch,
    expoToken: Deno.env.get("EXPO_ACCESS_TOKEN"),
  })
);
