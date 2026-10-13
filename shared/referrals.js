// Invite codes, share links and messages. Pure rules shared by the website and
// the app; the database (supabase/referrals_boosts.sql) is the source of truth
// for who invited whom and for boost days.
import { placeLabel, priceParts } from "./property.js";

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

// Invited home-seekers earn boost days in batches of 5.
export function seekerProgress(count) {
  const n = Math.max(0, Math.floor(Number(count) || 0));
  return { batches: Math.floor(n / 5), toNext: 5 - (n % 5) };
}
