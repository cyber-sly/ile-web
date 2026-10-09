// The listing model: what can be listed, and how each kind is described.
// Values here must match the check constraints in supabase/listings_phase2.sql.
import { formatNaira, pluralize } from "./format.js";
import { stateLabel } from "./nigeria.js";

export const CATEGORIES = [
  { value: "homes", label: "Homes", blurb: "Flats, self-contains, duplexes" },
  { value: "land", label: "Land", blurb: "Plots and farmland" },
  { value: "commercial", label: "Commercial", blurb: "Shops, offices, warehouses" },
];

export const PROPERTY_TYPES = [
  { value: "flat", label: "Flat / apartment", category: "homes" },
  { value: "self_contain", label: "Self-contain", category: "homes" },
  { value: "mini_flat", label: "Mini flat", category: "homes" },
  { value: "room", label: "Room", category: "homes" },
  { value: "duplex", label: "Duplex", category: "homes" },
  { value: "bungalow", label: "Bungalow", category: "homes" },
  { value: "terrace", label: "Terrace", category: "homes" },
  { value: "residential_land", label: "Residential land", category: "land" },
  { value: "commercial_land", label: "Commercial land", category: "land" },
  { value: "farmland", label: "Farmland", category: "land" },
  { value: "shop", label: "Shop", category: "commercial" },
  { value: "office", label: "Office space", category: "commercial" },
  { value: "warehouse", label: "Warehouse", category: "commercial" },
];

export const FURNISHING = [
  { value: "unfurnished", label: "Unfurnished" },
  { value: "semi_furnished", label: "Semi-furnished" },
  { value: "furnished", label: "Furnished" },
];

export const TITLE_DOCUMENTS = [
  { value: "c_of_o", label: "Certificate of Occupancy (C of O)", short: "C of O" },
  { value: "governors_consent", label: "Governor's Consent", short: "Governor's Consent" },
  { value: "deed_of_assignment", label: "Registered Deed of Assignment", short: "Deed of Assignment" },
  { value: "gazette", label: "Gazette / Excision", short: "Gazette" },
  { value: "survey", label: "Survey plan only", short: "Survey only" },
  { value: "other", label: "Other", short: "Other title" },
];

export const SIZE_UNITS = [
  { value: "sqm", label: "sqm" },
  { value: "plot", label: "plot(s)" },
  { value: "acre", label: "acre(s)" },
  { value: "hectare", label: "hectare(s)" },
];

export const LISTER_TYPES = [
  { value: "owner", label: "Owner", blurb: "I own this property" },
  { value: "agent", label: "Agent", blurb: "I'm listing for an owner" },
  { value: "caretaker", label: "Caretaker", blurb: "I manage it for the owner" },
  { value: "developer", label: "Developer", blurb: "I built or am building it" },
];

const PERIODS = {
  year: { label: "per year", suffix: "/year", short: "/yr" },
  month: { label: "per month", suffix: "/month", short: "/mo" },
  total: { label: "total price", suffix: "", short: "" },
  plot: { label: "per plot", suffix: "/plot", short: "/plot" },
};

// Which price periods make sense for a listing.
export function periodOptions(listingType, category) {
  if (listingType === "rent") return ["year", "month"];
  return category === "land" ? ["total", "plot"] : ["total"];
}

export function periodLabel(period) {
  return PERIODS[period]?.label || "";
}

export function defaultPeriod(listingType) {
  return listingType === "rent" ? "year" : "total";
}

const find = (list, value) => list.find((x) => x.value === value);

export const typeLabel = (v) => find(PROPERTY_TYPES, v)?.label || "Property";
export const categoryOf = (listing) =>
  listing.category || find(PROPERTY_TYPES, listing.property_type)?.category || "homes";
export const furnishingLabel = (v) => find(FURNISHING, v)?.label;
export const titleLabel = (v) => find(TITLE_DOCUMENTS, v)?.label;
export const titleShort = (v) => find(TITLE_DOCUMENTS, v)?.short;
export const listerLabel = (v) => find(LISTER_TYPES, v)?.label;

// Period of a listing, falling back for rows created before price_period existed.
export function periodOf(listing) {
  return listing.price_period || defaultPeriod(listing.listing_type);
}

// "₦3,500,000" + "/year"
export function priceParts(listing, { short = false } = {}) {
  const p = PERIODS[periodOf(listing)];
  return { amount: formatNaira(listing.price), suffix: (short ? p?.short : p?.suffix) || "" };
}

export function formatSize(listing) {
  if (!listing.size_value) return null;
  const n = Number(listing.size_value).toLocaleString("en-NG");
  const unit = find(SIZE_UNITS, listing.size_unit)?.label || "sqm";
  return `${n} ${unit}`;
}

// Short place for cards: "Lekki Phase 1, Lagos". Older listings only have `location`.
export function placeLabel(listing) {
  if (listing.state) {
    const local = listing.area || listing.lga;
    return [local, stateLabel(listing.state)].filter(Boolean).join(", ");
  }
  return listing.location || "";
}

// Full place for the listing page: "Lekki Phase 1, Eti-Osa, Lagos".
export function fullPlace(listing) {
  if (!listing.state) return listing.location || "";
  return [listing.area, listing.lga, stateLabel(listing.state)].filter(Boolean).join(", ");
}

// The 2-3 facts that matter most for this kind of property, for cards.
export function keyFacts(listing) {
  const category = categoryOf(listing);
  const facts = [];
  if (category === "homes") {
    const beds = Number(listing.bedrooms) || 0;
    if (beds) facts.push(pluralize(beds, "bed"));
    if (listing.bathrooms) facts.push(pluralize(listing.bathrooms, "bath"));
    if (!beds && listing.property_type) facts.push(typeLabel(listing.property_type));
  } else {
    const size = formatSize(listing);
    if (size) facts.push(size);
    if (category === "land" && listing.title_document) facts.push(titleShort(listing.title_document));
    if (category === "commercial") facts.push(typeLabel(listing.property_type));
  }
  return facts;
}

// Upfront cost breakdown. Fees are a percentage of one year's rent (or of the
// sale price); caution and service charge are fixed naira amounts.
export function moveInCost(listing) {
  const price = Number(listing.price) || 0;
  const isRent = listing.listing_type === "rent";
  const period = periodOf(listing);
  const base = isRent ? (period === "month" ? price * 12 : price) : price;
  const rows = [];

  if (isRent) rows.push({ label: period === "month" ? "Rent (12 months)" : "Rent (1 year)", amount: base });
  else rows.push({ label: period === "plot" ? "Price (1 plot)" : "Purchase price", amount: price });

  const pct = (v) => (v === null || v === undefined || v === "" ? null : Number(v));
  const agency = pct(listing.agency_fee_percent);
  const legal = pct(listing.legal_fee_percent);
  if (agency) rows.push({ label: `Agency fee (${agency}%)`, amount: Math.round((base * agency) / 100) });
  if (legal) rows.push({ label: `Legal / agreement fee (${legal}%)`, amount: Math.round((base * legal) / 100) });
  if (isRent && Number(listing.caution_deposit) > 0)
    rows.push({ label: "Caution deposit (refundable)", amount: Number(listing.caution_deposit) });
  if (Number(listing.service_charge) > 0)
    rows.push({ label: "Service charge (per year)", amount: Number(listing.service_charge) });

  const total = rows.reduce((sum, r) => sum + r.amount, 0);
  return { rows, total, hasExtras: rows.length > 1 };
}

// Lagos Tenancy Law caps agency and legal fees at 10% of annual rent each.
export function feeWarning(listing) {
  if (listing.listing_type !== "rent" || listing.state !== "Lagos") return null;
  const over = Number(listing.agency_fee_percent) > 10 || Number(listing.legal_fee_percent) > 10;
  return over ? "Lagos tenancy law caps agency and legal fees at 10% of annual rent each." : null;
}

export const isAvailable = (listing) => !listing.status || listing.status === "active";

// Listings must be re-confirmed by the lister to stay in search.
export const FRESH_DAYS = 45;
export const STALE_WARNING_DAYS = 30;

export function freshCutoff(days = FRESH_DAYS) {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

export function daysSinceConfirmed(listing) {
  const at = listing.last_confirmed_at || listing.created_at;
  return at ? Math.floor((Date.now() - new Date(at).getTime()) / 86_400_000) : 0;
}

// Past the cutoff: hidden from search until the lister confirms it.
export const isExpired = (listing) => isAvailable(listing) && daysSinceConfirmed(listing) >= FRESH_DAYS;
// Getting close: the dashboard starts asking "still available?".
export const needsConfirming = (listing) => isAvailable(listing) && daysSinceConfirmed(listing) >= STALE_WARNING_DAYS;

export const isModerated = (listing) => listing.status === "under_review" || listing.status === "removed";

export const STATUS_LABELS = {
  active: "Live",
  let: "Let",
  sold: "Sold",
  under_review: "Under review",
  removed: "Removed by Ile",
};

export const REPORT_REASONS = [
  { value: "fake", label: "Fake, or the property doesn't exist" },
  { value: "unavailable", label: "Already let or sold" },
  { value: "misleading", label: "Photos, price or details are misleading" },
  { value: "upfront_fee", label: "Asked me to pay an inspection fee or deposit before viewing" },
  { value: "scam", label: "Looks like a scam" },
  { value: "duplicate", label: "Duplicate of another listing" },
  { value: "other", label: "Something else" },
];
