// Listing search: URL params <-> filters <-> Supabase query.
// Filters live in the URL so results can be shared and survive refresh.
import { categoryOf, freshCutoff, PROPERTY_TYPES } from "./property.js";
import { stateLabel } from "./nigeria.js";

export const PAGE_SIZE = 24;

// Rent and Buy cover homes and land (ptype "land" narrows to any land);
// Shortlets covers stays (shortlets, hotel rooms, Airbnbs) by the night;
// Commercial covers both purposes.
export const SEARCH_TABS = [
  { value: "rent", label: "Rent", heading: "Homes for rent" },
  { value: "sale", label: "Buy", heading: "Homes for sale" },
  { value: "stays", label: "Shortlets", heading: "Shortlets & hotels" },
  { value: "commercial", label: "Commercial", heading: "Commercial property" },
];

// Property-type filter value meaning "any kind of land".
export const LAND_TYPE = "land";

const typesIn = (category) => PROPERTY_TYPES.filter((t) => t.category === category).map(({ value, label }) => ({ value, label }));

// The property-type choices for a tab: Rent and Buy list home types, then any
// land, then each land type; Commercial lists commercial types.
export function searchTypeOptions(tab) {
  if (tab === "commercial") return typesIn("commercial");
  if (tab === "stays") return typesIn("stays");
  return [...typesIn("homes"), { value: LAND_TYPE, label: "Land (any)" }, ...typesIn("land")];
}

// True when the search is narrowed to land (any land, or one land type).
export function isLandSearch(f) {
  if (!f.ptype) return false;
  return f.ptype === LAND_TYPE || PROPERTY_TYPES.some((t) => t.value === f.ptype && t.category === "land");
}

// The search a listing belongs to, for breadcrumbs and "Browse similar".
export function browsePath(listing) {
  const category = categoryOf(listing);
  const sale = listing.listing_type === "sale";
  if (category === "commercial") return "/listings?tab=commercial";
  if (category === "stays") return "/listings?tab=stays";
  const params = new URLSearchParams();
  if (sale) params.set("tab", "sale");
  if (category === "land") params.set("ptype", LAND_TYPE);
  const query = params.toString();
  return query ? `/listings?${query}` : "/listings";
}

export const SORTS = [
  { value: "new", label: "Newest" },
  { value: "low", label: "Lowest price" },
  { value: "high", label: "Highest price" },
];

const KEYS = ["tab", "q", "state", "lga", "ptype", "purpose", "min", "max", "beds", "title", "sort", "guests", "checkin", "checkout", "amen"];

const DATE = /^\d{4}-\d{2}-\d{2}$/;

// Check-in and check-out when both are real dates in the right order.
export function stayDates(f) {
  return DATE.test(f.checkin || "") && DATE.test(f.checkout || "") && f.checkout > f.checkin
    ? { checkIn: f.checkin, checkOut: f.checkout }
    : null;
}

// "Wi-Fi,Kitchen" -> ["Wi-Fi", "Kitchen"]
export const amenitiesFilter = (f) => (f.amen || "").split(",").map((a) => a.trim()).filter(Boolean);

export function readFilters(searchParams) {
  const f = Object.fromEntries(KEYS.map((k) => [k, searchParams.get(k) || ""]));
  // Older links used ?type=rent|sale and ?location=...
  if (!f.tab) f.tab = ["rent", "sale"].includes(searchParams.get("type")) ? searchParams.get("type") : "rent";
  if (!f.q && searchParams.get("location")) f.q = searchParams.get("location");
  // The Land tab was folded into Buy (and Rent): old links open Buy, land only.
  if (f.tab === "land") {
    f.tab = "sale";
    if (!f.ptype) f.ptype = LAND_TYPE;
  }
  if (!SEARCH_TABS.some((t) => t.value === f.tab)) f.tab = "rent";
  return f;
}

// Changing tab or state clears filters that no longer apply.
export function nextParams(current, changes) {
  const merged = { ...current, ...changes };
  if ("tab" in changes && changes.tab !== current.tab) {
    Object.assign(merged, { ptype: "", purpose: "", beds: "", title: "", guests: "", checkin: "", checkout: "", amen: "" });
  }
  // A new state clears the LGA, unless one for that state comes with it (Near me).
  if ("state" in changes && changes.state !== current.state && !("lga" in changes)) merged.lga = "";
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
// Until supabase/referrals_boosts.sql has been run there is no boosted_until
// column; searches then run without the boost ordering instead of failing.
const missingBoostColumn = (error) => error?.code === "42703" && /boosted_until/.test(error.message || "");

// Runs the search: { data, count, error }.
// Before supabase/stays.sql has been run there are no stay columns or the
// stays_unavailable function; stays searches then run without stay filters.
const missingStayColumn = (error) => error?.code === "42703" && /max_guests|features/.test(error.message || "");
const missingFunction = (error) => error?.code === "PGRST202" || /could not find the function/i.test(error?.message || "");

// Stays already booked (accepted) for the chosen dates; [] if unknown.
async function unavailableStays(client, f) {
  const dates = f.tab === "stays" ? stayDates(f) : null;
  if (!dates || !client.rpc) return [];
  try {
    const { data, error } = await client.rpc("stays_unavailable", { p_check_in: dates.checkIn, p_check_out: dates.checkOut });
    if (error) {
      if (missingFunction(error)) return [];
      throw new Error(error.message);
    }
    return (data || []).map(String);
  } catch {
    return [];
  }
}

export function buildQuery(client, f, page = 0) {
  const run = async (exclude) => {
    const opts = { boostFirst: true, stayFilters: true, exclude };
    let result = await searchQuery(client, f, page, opts);
    if (missingStayColumn(result.error)) {
      opts.stayFilters = false;
      result = await searchQuery(client, f, page, opts);
    }
    if (missingBoostColumn(result.error)) {
      result = await searchQuery(client, f, page, { ...opts, boostFirst: false });
      // Both migrations missing: drop the stay filters too.
      if (missingStayColumn(result.error)) result = await searchQuery(client, f, page, { ...opts, boostFirst: false, stayFilters: false });
    }
    return result;
  };
  // Only a Shortlets search with dates needs the booked-stays lookup first.
  return f.tab === "stays" && stayDates(f) ? unavailableStays(client, f).then(run) : run([]);
}

function searchQuery(client, f, page, { boostFirst, stayFilters, exclude }) {
  let query = client
    .from("listings")
    .select("*", { count: "exact" })
    .eq("status", "active")
    .gte("last_confirmed_at", freshCutoff());

  if (f.tab === "rent" || f.tab === "sale") {
    query = query.eq("listing_type", f.tab);
    query = f.ptype === LAND_TYPE ? query.eq("category", "land") : query.in("category", ["homes", "land"]);
  } else {
    query = query.eq("category", f.tab);
    if (f.purpose === "rent" || f.purpose === "sale") query = query.eq("listing_type", f.purpose);
  }

  if (f.state) query = query.eq("state", f.state);
  if (f.lga) query = query.eq("lga", f.lga);
  if (f.ptype && f.ptype !== LAND_TYPE) query = query.eq("property_type", f.ptype);
  if (Number(f.min) > 0) query = query.gte("price", Number(f.min));
  if (Number(f.max) > 0) query = query.lte("price", Number(f.max));
  if (Number(f.beds) > 0) query = query.gte("bedrooms", Number(f.beds));
  if (f.title) query = query.eq("title_document", f.title);
  if (f.tab === "stays" && stayFilters) {
    if (Number(f.guests) > 0) query = query.gte("max_guests", Number(f.guests));
    const amen = amenitiesFilter(f);
    if (amen.length) query = query.contains("features", amen);
    if (exclude.length) query = query.not("id", "in", `(${exclude.join(",")})`);
  }

  const q = clean(f.q || "");
  if (q) {
    const like = `%${q}%`;
    query = query.or(
      ["title", "area", "lga", "state", "location", "address"].map((c) => `${c}.ilike.${like}`).join(",")
    );
  }

  // Boosted listings first while their boost lasts (expired ones are cleared
  // every few minutes by the database), then the chosen order.
  if (boostFirst) query = query.order("boosted_until", { ascending: false, nullsFirst: false });
  if (f.sort === "low") query = query.order("price", { ascending: true });
  else if (f.sort === "high") query = query.order("price", { ascending: false });
  else query = query.order("created_at", { ascending: false });

  return query.range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
}

// Page heading for the listings page: "Homes for rent in Lagos",
// "Land in Eti-Osa, Lagos", "Homes for sale matching \"Lekki\"".
export function listingsHeading(f) {
  const tab = SEARCH_TABS.find((t) => t.value === f.tab) || SEARCH_TABS[0];
  const heading = f.ptype === LAND_TYPE && f.tab !== "commercial" ? `Land for ${f.tab === "sale" ? "sale" : "rent"}` : tab.heading;
  const where = f.lga ? `${f.lga}, ${stateLabel(f.state)}` : f.state ? stateLabel(f.state) : f.q ? `"${f.q}"` : "Nigeria";
  return `${heading} ${f.q && !f.state ? "matching" : "in"} ${where}`;
}

// The app keeps filters as an object; this applies the same clearing rules
// as the website's URL params.
export function applyFilterChange(filters, changes) {
  return readFilters(nextParams(filters, changes));
}

// The newest fresh listings ("Fresh on Ile" on the home page).
export async function fetchLatestListings(client, limit = 8) {
  const latest = (boostFirst) => {
    let query = client.from("listings").select("*").eq("status", "active").gte("last_confirmed_at", freshCutoff());
    if (boostFirst) query = query.order("boosted_until", { ascending: false, nullsFirst: false });
    return query.order("created_at", { ascending: false }).limit(limit);
  };
  let { data, error } = await latest(true);
  if (missingBoostColumn(error)) ({ data, error } = await latest(false));
  if (error) throw new Error(error.message);
  return data || [];
}
