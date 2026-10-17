// Stays (shortlets, hotel rooms, Airbnbs): nights, prices and the rules for a
// stay request. supabase/stays.sql re-checks the same rules in the database.
import { formatNaira } from "./format.js";

export const MAX_STAY_NIGHTS = 90;
export const MAX_STAY_NOTE = 500;
export const MAX_DECLINE_REASON = 200;

export const STAY_STATUS = {
  requested: { label: "Requested", tone: "gold" },
  accepted: { label: "Accepted", tone: "palm" },
  declined: { label: "Declined", tone: "clay" },
  cancelled: { label: "Cancelled", tone: "neutral" },
};

// Dates are "YYYY-MM-DD" strings (no time zone), counted as whole days.
const dayNumber = (date) => Math.round(Date.parse(`${date}T00:00:00Z`) / 86_400_000);

export function stayNights(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0;
  return dayNumber(checkOut) - dayNumber(checkIn);
}

// "3 nights × ₦45,000" plus the cleaning fee and caution deposit, once each.
export function stayQuote(listing, checkIn, checkOut) {
  const nights = Math.max(0, stayNights(checkIn, checkOut));
  const nightly = Number(listing.price) || 0;
  const subtotal = nights * nightly;
  const cleaning = Number(listing.cleaning_fee) > 0 ? Number(listing.cleaning_fee) : 0;
  const caution = Number(listing.caution_deposit) > 0 ? Number(listing.caution_deposit) : 0;
  const rows = [{ label: `${nights} ${nights === 1 ? "night" : "nights"} × ${formatNaira(nightly)}`, amount: subtotal }];
  if (cleaning) rows.push({ label: "Cleaning fee", amount: cleaning });
  if (caution) rows.push({ label: "Caution deposit (refundable)", amount: caution });
  return { nights, nightly, subtotal, cleaning, caution, total: subtotal + cleaning + caution, rows };
}

// Stays are [check-in, check-out): the check-out day is free for the next guest.
export function rangesOverlap(a, b) {
  return a.check_in < b.check_out && b.check_in < a.check_out;
}

// { field: message } for a stay request; {} when it can be sent.
export function validateStayRequest(listing, { checkIn, checkOut, guests, note }, taken, today) {
  const er = {};
  const maxGuests = Number(listing.max_guests) || 1;
  const minNights = Number(listing.min_nights) || 1;
  if (!checkIn) er.checkIn = "Choose your check-in date.";
  else if (checkIn < today) er.checkIn = "Choose a check-in date from today.";
  if (!checkOut) er.checkOut = "Choose your check-out date.";
  else if (checkIn && checkOut <= checkIn) er.checkOut = "Check-out must be after check-in.";
  else if (checkIn) {
    const nights = stayNights(checkIn, checkOut);
    if (nights < minNights) er.checkOut = `This place needs at least ${minNights} nights.`;
    else if (nights > MAX_STAY_NIGHTS) er.checkOut = `Stays can be up to ${MAX_STAY_NIGHTS} nights.`;
  }
  if (!er.checkIn && !er.checkOut && (taken || []).some((t) => rangesOverlap({ check_in: checkIn, check_out: checkOut }, t))) {
    er.checkIn = "Some of those dates are already booked.";
  }
  const g = Number(guests);
  if (!(g >= 1)) er.guests = "Choose how many guests.";
  else if (g > maxGuests) er.guests = `This place sleeps up to ${maxGuests} ${maxGuests === 1 ? "guest" : "guests"}.`;
  if ((note || "").length > MAX_STAY_NOTE) er.note = `Keep your note under ${MAX_STAY_NOTE} characters.`;
  return er;
}

// What the host or the guest can do with a stay today.
export function stayActions(stay, role, today) {
  const none = { accept: false, decline: false, cancel: false, review: false };
  const over = stay.check_out <= today;
  if (stay.status === "requested") {
    return role === "host" ? { ...none, accept: true, decline: true } : { ...none, cancel: true };
  }
  if (stay.status === "accepted") return over ? { ...none, review: true } : { ...none, cancel: true };
  return none;
}

// Upcoming (requested or accepted, not checked out) first by check-in; then
// past accepted stays, newest first; then declined and cancelled.
export function sortStays(list, today) {
  const live = (s) => s.status === "requested" || s.status === "accepted";
  const upcoming = list.filter((s) => live(s) && s.check_out > today).sort((a, b) => a.check_in.localeCompare(b.check_in));
  const past = list.filter((s) => live(s) && s.check_out <= today).sort((a, b) => b.check_out.localeCompare(a.check_out));
  const closed = list.filter((s) => !live(s)).sort((a, b) => b.check_in.localeCompare(a.check_in));
  return [...upcoming, ...past, ...closed];
}
