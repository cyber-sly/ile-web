// Lister rules shared by the website and the app: the listing form (draft
// <-> database row), validation, what a lister can do with each listing and
// viewing request, and weekly viewing times.
import { defaultPeriod, isAvailable, isModerated, needsConfirming } from "./property.js";
import { stateLabel } from "./nigeria.js";
import { viewingDateReached } from "./reviews.js";

export const MAX_PHOTOS = 20;
export const MAX_PHOTO_MB = 10;
export const MAX_VIDEOS = 5;
export const MAX_VIDEO_MB = 50; // matches the listing-videos bucket limit
export const MAX_TITLE = 120;
export const MAX_DESCRIPTION = 5000;
export const MAX_NOTE = 300;

// The listing form's values (strings, as typed).
export const EMPTY_DRAFT = {
  category: "homes",
  listingType: "rent",
  propertyType: "flat",
  listerType: "owner",
  state: "",
  lga: "",
  area: "",
  address: "",
  title: "",
  price: "",
  pricePeriod: "year",
  bedrooms: "",
  bathrooms: "",
  toilets: "",
  furnishing: "",
  serviced: false,
  sizeValue: "",
  sizeUnit: "sqm",
  titleDocument: "",
  parkingSpaces: "",
  agencyFee: "",
  legalFee: "",
  caution: "",
  serviceCharge: "",
  description: "",
  features: "",
};

const str = (v) => (v === null || v === undefined ? "" : String(v));
const num = (v) => (v === "" || v === null || v === undefined ? null : Number(v));

export function draftFromListing(l) {
  return {
    category: l.category || "homes",
    listingType: l.listing_type || "rent",
    propertyType: l.property_type || "flat",
    listerType: l.lister_type || "owner",
    state: l.state || "",
    lga: l.lga || "",
    // Older listings only have free-text `location`; offer it as the area.
    area: l.area || (l.state ? "" : l.location || ""),
    address: l.address || "",
    title: l.title || "",
    price: str(l.price),
    pricePeriod: l.price_period || defaultPeriod(l.listing_type),
    bedrooms: str(l.bedrooms),
    bathrooms: str(l.bathrooms),
    toilets: str(l.toilets),
    furnishing: l.furnishing || "",
    serviced: Boolean(l.serviced),
    sizeValue: str(l.size_value),
    sizeUnit: l.size_unit || "sqm",
    titleDocument: l.title_document || "",
    parkingSpaces: str(l.parking_spaces),
    agencyFee: str(l.agency_fee_percent),
    legalFee: str(l.legal_fee_percent),
    caution: str(l.caution_deposit),
    serviceCharge: str(l.service_charge),
    description: l.description || "",
    features: (l.features || []).join(", "),
  };
}

// The row as it would be saved (without photos and videos); also drives the
// live move-in cost preview.
export function draftToRow(v) {
  const isHomes = v.category === "homes";
  const isLand = v.category === "land";
  const isRent = v.listingType === "rent";
  return {
    category: v.category,
    listing_type: v.listingType,
    property_type: v.propertyType,
    lister_type: v.listerType,
    state: v.state || null,
    lga: v.lga || null,
    area: v.area.trim() || null,
    location: [v.area.trim() || v.lga, stateLabel(v.state)].filter(Boolean).join(", "),
    address: v.address.trim(),
    title: v.title.trim(),
    price: Number(v.price) || 0,
    price_period: v.pricePeriod,
    bedrooms: isHomes ? num(v.bedrooms) ?? 0 : 0,
    bathrooms: isHomes ? num(v.bathrooms) : null,
    toilets: isLand ? null : num(v.toilets),
    furnishing: isHomes ? v.furnishing || null : null,
    serviced: isHomes ? v.serviced : false,
    size_value: num(v.sizeValue),
    size_unit: v.sizeValue ? (isLand ? v.sizeUnit : "sqm") : null,
    title_document: isLand ? v.titleDocument || null : null,
    parking_spaces: isLand ? null : num(v.parkingSpaces),
    agency_fee_percent: num(v.agencyFee),
    legal_fee_percent: num(v.legalFee),
    caution_deposit: isRent ? num(v.caution) : null,
    service_charge: isLand ? null : num(v.serviceCharge),
    description: v.description.trim(),
    features: v.features.split(",").map((f) => f.trim()).filter(Boolean),
  };
}

// { field: message } for everything that must be fixed before saving.
export function validateDraft(v) {
  const er = {};
  const isHomes = v.category === "homes";
  const isLand = v.category === "land";
  if (!v.state) er.state = "Choose a state.";
  if (!v.lga) er.lga = "Choose an LGA.";
  if (!v.title.trim()) er.title = "Give your listing a title.";
  else if (v.title.trim().length > MAX_TITLE) er.title = `Keep the title under ${MAX_TITLE} characters.`;
  if (!(Number(v.price) > 0)) er.price = "Enter a price above ₦0.";
  if (isHomes && (v.bedrooms === "" || Number(v.bedrooms) < 0 || !Number.isInteger(Number(v.bedrooms))))
    er.bedrooms = "Enter a whole number of bedrooms (0 for a room or studio).";
  if (isLand && !(Number(v.sizeValue) > 0)) er.sizeValue = "Enter the plot size.";
  for (const k of ["agencyFee", "legalFee"]) {
    if (v[k] !== "" && (Number(v[k]) < 0 || Number(v[k]) > 100)) er[k] = "Enter a percentage between 0 and 100.";
  }
  if (v.description.trim().length > MAX_DESCRIPTION) er.description = `Keep the description under ${MAX_DESCRIPTION} characters.`;
  return er;
}

// Photos in the order shown, the cover, and saved photos the lister removed
// (deleted from storage only after the listing saves).
export function mediaChanges(originalUrls, keptUrls, uploadedUrls) {
  const urls = [...keptUrls, ...uploadedUrls];
  return { urls, cover: urls[0] ?? null, removed: originalUrls.filter((u) => !keptUrls.includes(u)) };
}

export function takenStatus(listing) {
  return listing.listing_type === "sale" ? "sold" : "let";
}

export function listingActions(l) {
  const moderated = isModerated(l);
  return {
    confirm: !moderated && needsConfirming(l),
    markTaken: !moderated && isAvailable(l),
    relist: !moderated && !isAvailable(l),
    edit: !moderated,
    times: !moderated,
    remove: true,
  };
}

// What a lister can do with a viewing request.
export function requestActions(inspection) {
  const { status } = inspection;
  const reached = status === "confirmed" && viewingDateReached(inspection);
  return {
    confirm: status === "pending",
    counter: status === "pending",
    decline: status === "pending",
    done: status === "confirmed" && reached,
    cancel: status === "confirmed" && !reached,
    withdraw: status === "countered",
  };
}

export function validateCounter({ date, note }, today) {
  if (!date || date < today) return "Pick a date from today on.";
  if ((note || "").length > MAX_NOTE) return `Keep the note under ${MAX_NOTE} characters.`;
  return null;
}

// Monday-first for display; values match Postgres extract(dow): 0 = Sunday.
export const WEEKDAYS = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 0, label: "Sunday" },
];
export const SLOT_LENGTHS = [15, 30, 45, 60];
export const DEFAULT_WINDOW = { start: "10:00", end: "14:00" };

// { weekday: { on, start, end } } -> rows for set_listing_availability.
export function availabilityRows(days) {
  const rows = WEEKDAYS.filter((w) => days[w.value]?.on).map((w) => ({
    weekday: w.value,
    start_time: days[w.value].start,
    end_time: days[w.value].end,
  }));
  const bad = rows.find((r) => !r.start_time || !r.end_time || r.end_time <= r.start_time);
  return { rows, error: bad ? "Each day's end time must be after its start time." : null };
}

// --- Queries --------------------------------------------------------------

export async function fetchMyListings(client, userId) {
  const { data, error } = await client.from("listings").select("*").eq("landlord_id", userId).order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

export async function fetchRequests(client, listingIds) {
  if (listingIds.length === 0) return [];
  const { data, error } = await client
    .from("inspections")
    .select("*, listings(id, title, image_url, location)")
    .in("listing_id", listingIds)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return data || [];
}

// Insert (no id) or update a listing; returns its id.
export async function saveListing(client, row, { id, userId }) {
  const { data, error } = id
    ? await client.from("listings").update(row).eq("id", id).select("id").single()
    : await client.from("listings").insert({ ...row, landlord_id: userId }).select("id").single();
  if (error) throw new Error(error.message);
  return data.id;
}

export async function updateListing(client, id, changes) {
  const { error } = await client.from("listings").update(changes).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteListing(client, id) {
  const { error } = await client.from("listings").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function fetchAvailability(client, id) {
  const [{ data: listing, error }, { data: windows, error: windowsError }] = await Promise.all([
    client.from("listings").select("id, title, landlord_id, viewing_slot_minutes").eq("id", id).maybeSingle(),
    client.from("listing_availability").select("weekday, start_time, end_time").eq("listing_id", id),
  ]);
  // A failed load must not look like "no such listing".
  if (error || windowsError) throw new Error((error || windowsError).message);
  return { listing: listing ?? null, windows: windows || [] };
}

// Replace the weekly schedule in one go; returns open slots in the next two weeks.
export async function saveAvailability(client, id, minutes, rows) {
  const { error } = await client.rpc("set_listing_availability", { p_listing: id, p_minutes: minutes, p_windows: rows });
  if (error) throw new Error(error.message);
  const { data: open } = await client.rpc("listing_open_slots", { p_listing: id, p_days: 14 });
  return open?.length || 0;
}
