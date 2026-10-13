// Invite codes, share links and messages. Pure rules shared by the website and
// the app; the database (supabase/referrals_boosts.sql) is the source of truth
// for who invited whom and for boost days.
import { placeLabel, priceParts } from "./property.js";
import { pluralize } from "./format.js";

const CODE_SHAPE = /^[A-Z]{1,6}\d{1,3}$/;
const REF_KEY = "ile:ref";
const REF_DAYS = 30;

// " tunde 7" -> "TUNDE7"; anything that can't be a code -> null.
export function normalizeCode(input) {
  const code = String(input ?? "").replace(/\s+/g, "").toUpperCase();
  return CODE_SHAPE.test(code) ? code : null;
}

export function shareUrl({ site, listingId, code }) {
  const valid = normalizeCode(code);
  return `${site}/listings/${listingId}${valid ? `?ref=${valid}` : ""}`;
}

export function cardUrl({ site, listingId, code }) {
  const valid = normalizeCode(code);
  return `${site}/share/listing/${listingId}/card${valid ? `?ref=${valid}` : ""}`;
}

// "2-bed flat · ₦350,000/year · Ikeja, Lagos" + the link on its own line.
export function shareMessage({ listing, site, code }) {
  const { amount, suffix } = priceParts(listing);
  return `${listing.title} · ${amount}${suffix} · ${placeLabel(listing)}\n${shareUrl({ site, listingId: listing.id, code })}`;
}

export function inviteMessage({ site, code }) {
  return `List your property on Ile for free. Serious home-seekers book viewings straight from your listing. Sign up with my code ${code}: ${site}/signup?role=landlord&ref=${code}`;
}

// The code someone arrived with, kept on this device for 30 days. The first
// code wins until it expires.
export function rememberRef(storage, code, now = Date.now()) {
  const valid = normalizeCode(code);
  if (!valid || readRef(storage, now)) return;
  try {
    storage.setItem(REF_KEY, JSON.stringify({ code: valid, at: now }));
  } catch {}
}

export function readRef(storage, now = Date.now()) {
  try {
    const saved = JSON.parse(storage.getItem(REF_KEY) || "null");
    if (saved && normalizeCode(saved.code) && now - saved.at < REF_DAYS * 24 * 60 * 60 * 1000) return saved.code;
    if (saved) storage.removeItem(REF_KEY);
  } catch {}
  return null;
}

// The code to send with a new account: what the person typed (if anything),
// otherwise the code they arrived with.
export function signupInviteCode(typed, remembered) {
  if (String(typed ?? "").trim()) return normalizeCode(typed);
  return normalizeCode(remembered);
}

// "Your shares: 120 views · 9 bookings · 4 joined with your code · 14 boost days left"
export function statsLine({ views = 0, bookings = 0, joined = 0, balance = 0 }) {
  return `Your shares: ${pluralize(views, "view")} · ${pluralize(bookings, "booking")} · ${joined} joined with your code · ${pluralize(balance, "boost day")} left`;
}

// Invited home-seekers earn boost days in batches of 5.
export function seekerProgress(count) {
  const n = Math.max(0, Math.floor(Number(count) || 0));
  return { batches: Math.floor(n / 5), toNext: 5 - (n % 5) };
}

// --- Database calls (security-definer functions in referrals_boosts.sql) ---

// True when the database doesn't have the function yet (SQL not run).
function missingFunction(error) {
  return error?.code === "PGRST202" || /could not find the function/i.test(error?.message || "");
}

export async function inviteCodeExists(client, code) {
  const valid = normalizeCode(code);
  if (!valid) return false;
  const { data, error } = await client.rpc("invite_code_exists", { p_code: valid });
  if (error) throw new Error(error.message);
  return Boolean(data);
}

// For a brand-new Google/Apple account: record who invited them.
export async function claimInviteCode(client, code) {
  const valid = normalizeCode(code);
  if (!valid) return false;
  const { data, error } = await client.rpc("claim_invite_code", { p_code: valid });
  if (error) return false;
  return Boolean(data);
}

// Tracking never gets in the way: failures are ignored.
export async function recordShareVisit(client, { listingId, code, device }) {
  const valid = normalizeCode(code);
  if (!valid || !listingId || !device) return;
  try {
    await client.rpc("record_share_visit", { p_listing: listingId, p_code: valid, p_device: device });
  } catch {}
}

export async function recordBookingRef(client, inspectionId, code) {
  const valid = normalizeCode(code);
  if (!valid || !inspectionId) return;
  try {
    await client.rpc("record_booking_ref", { p_inspection: inspectionId, p_code: valid });
  } catch {}
}

// { code, balance, joined, listers, views, bookings, seekers_confirmed },
// or null when the feature isn't set up in the database yet.
export async function fetchReferralSummary(client) {
  const { data, error } = await client.rpc("my_referral_summary");
  if (error) {
    if (missingFunction(error)) return null;
    throw new Error(error.message);
  }
  return data || null;
}

// Returns the listing's new boosted_until.
export async function spendBoostDays(client, listingId, days) {
  const { data, error } = await client.rpc("spend_boost_days", { p_listing: listingId, p_days: days });
  if (error) throw new Error(error.message);
  return data;
}

export async function fetchHeldRewards(client) {
  const { data, error } = await client.rpc("admin_held_rewards");
  if (error) {
    if (missingFunction(error)) return [];
    throw new Error(error.message);
  }
  return data || [];
}

export async function resolveHeldReward(client, id, approve) {
  const { error } = await client.rpc("admin_resolve_reward", { p_id: id, p_approve: approve });
  if (error) throw new Error(error.message);
}
