import { cache } from "react";
import { createClient } from "@supabase/supabase-js";

// Anonymous, sessionless client for server components and metadata. It sees
// exactly what a logged-out visitor sees (public listings), which is what
// search engines and link previews should get.
export const supabaseServer = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

// Deduped per request, so generateMetadata and the page share one query.
export const getListing = cache(async (id) => {
  const { data } = await supabaseServer.from("listings").select("*").eq("id", id).maybeSingle();
  return data;
});
