// Listing search: URL params <-> filters <-> Supabase query.
// Filters live in the URL so results can be shared and survive refresh.
import { freshCutoff } from "./property.js";

export const PAGE_SIZE = 24;

// Rent and Buy cover homes; Land and Commercial cover both purposes.
export const SEARCH_TABS = [
  { value: "rent", label: "Rent", heading: "Homes for rent" },
  { value: "sale", label: "Buy", heading: "Homes for sale" },
  { value: "land", label: "Land", heading: "Land" },
  { value: "commercial", label: "Commercial", heading: "Commercial property" },
];

export const SORTS = [
  { value: "new", label: "Newest" },
  { value: "low", label: "Lowest price" },
  { value: "high", label: "Highest price" },
];

const KEYS = ["tab", "q", "state", "lga", "ptype", "purpose", "min", "max", "beds", "title", "sort"];

export function readFilters(searchParams) {
  const f = Object.fromEntries(KEYS.map((k) => [k, searchParams.get(k) || ""]));
  // Older links used ?type=rent|sale and ?location=...
  if (!f.tab) f.tab = ["rent", "sale"].includes(searchParams.get("type")) ? searchParams.get("type") : "rent";
  if (!f.q && searchParams.get("location")) f.q = searchParams.get("location");
  if (!SEARCH_TABS.some((t) => t.value === f.tab)) f.tab = "rent";
  return f;
}

// Changing tab or state clears filters that no longer apply.
export function nextParams(current, changes) {
  const merged = { ...current, ...changes };
  if ("tab" in changes && changes.tab !== current.tab) {
    Object.assign(merged, { ptype: "", purpose: "", beds: "", title: "" });
  }
  if ("state" in changes && changes.state !== current.state) merged.lga = "";
  const params = new URLSearchParams();
  for (const k of KEYS) if (merged[k]) params.set(k, merged[k]);
  if (merged.tab === "rent") params.delete("tab");
  return params;
}

// PostgREST `or` filters are comma/paren separated, so strip those from user text.
function clean(text) {
  return text.replace(/[,()*%\\]/g, " ").trim();
}

// `client` is a Supabase client (web or mobile), passed in so this file
// stays free of platform code.
export function buildQuery(client, f, page = 0) {
  let query = client
    .from("listings")
    .select("*", { count: "exact" })
    .eq("status", "active")
    .gte("last_confirmed_at", freshCutoff());

  if (f.tab === "rent" || f.tab === "sale") query = query.eq("category", "homes").eq("listing_type", f.tab);
  else {
    query = query.eq("category", f.tab);
    if (f.purpose === "rent" || f.purpose === "sale") query = query.eq("listing_type", f.purpose);
  }

  if (f.state) query = query.eq("state", f.state);
  if (f.lga) query = query.eq("lga", f.lga);
  if (f.ptype) query = query.eq("property_type", f.ptype);
  if (Number(f.min) > 0) query = query.gte("price", Number(f.min));
  if (Number(f.max) > 0) query = query.lte("price", Number(f.max));
  if (Number(f.beds) > 0) query = query.gte("bedrooms", Number(f.beds));
  if (f.title) query = query.eq("title_document", f.title);

  const q = clean(f.q || "");
  if (q) {
    const like = `%${q}%`;
    query = query.or(
      ["title", "area", "lga", "state", "location", "address"].map((c) => `${c}.ilike.${like}`).join(",")
    );
  }

  if (f.sort === "low") query = query.order("price", { ascending: true });
  else if (f.sort === "high") query = query.order("price", { ascending: false });
  else query = query.order("created_at", { ascending: false });

  return query.range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
}

// The app keeps filters as an object; this applies the same clearing rules
// as the website's URL params.
export function applyFilterChange(filters, changes) {
  return readFilters(nextParams(filters, changes));
}
