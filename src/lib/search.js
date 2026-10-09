// Search rules live in shared/; this binds them to the website's Supabase client.
import { supabase } from "@/lib/supabaseClient";
import { buildQuery as buildQueryWith } from "@shared/search.js";

export { PAGE_SIZE, SEARCH_TABS, SORTS, readFilters, nextParams } from "@shared/search.js";

export function buildQuery(f, page = 0) {
  return buildQueryWith(supabase, f, page);
}
