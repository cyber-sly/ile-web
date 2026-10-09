import { test } from "node:test";
import assert from "node:assert/strict";
import {
  EMPTY_DRAFT,
  draftFromListing,
  draftToRow,
  validateDraft,
  mediaChanges,
  takenStatus,
  listingActions,
  requestActions,
  validateCounter,
  availabilityRows,
  WEEKDAYS,
} from "../lister.js";

const lagosDay = (offset) => new Date(Date.now() + offset * 86_400_000).toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" });
const daysAgo = (n) => new Date(Date.now() - n * 86_400_000).toISOString();

const homeDraft = {
  ...EMPTY_DRAFT,
  category: "homes",
  listingType: "rent",
  propertyType: "flat",
  state: "Lagos",
  lga: "Eti-Osa",
  area: "Lekki Phase 1",
  title: " 2-bed flat ",
  price: "3500000",
  bedrooms: "2",
  caution: "500000",
};

test("draftToRow maps a home draft like the website", () => {
  const row = draftToRow(homeDraft);
  assert.equal(row.location, "Lekki Phase 1, Lagos");
  assert.equal(row.title, "2-bed flat");
  assert.equal(row.bedrooms, 2);
  assert.equal(row.price, 3500000);
  assert.equal(row.title_document, null);
  assert.equal(row.caution_deposit, 500000);
});

test("draftToRow drops home-only fields for land", () => {
  const row = draftToRow({ ...homeDraft, category: "land", propertyType: "residential_land", listingType: "sale", sizeValue: "2", sizeUnit: "plot", furnishing: "furnished" });
  assert.equal(row.bedrooms, 0);
  assert.equal(row.bathrooms, null);
  assert.equal(row.furnishing, null);
  assert.equal(row.size_unit, "plot");
  assert.equal(row.caution_deposit, null);
});

test("draftFromListing round-trips through draftToRow", () => {
  const row = draftToRow(homeDraft);
  assert.deepEqual(draftToRow(draftFromListing(row)), row);
});

test("validateDraft requires state, LGA, title, price and bedrooms for homes", () => {
  const er = validateDraft({ ...EMPTY_DRAFT });
  for (const key of ["state", "lga", "title", "price", "bedrooms"]) assert.ok(er[key], key);
});

test("validateDraft requires plot size for land", () => {
  const er = validateDraft({ ...homeDraft, category: "land", sizeValue: "" });
  assert.ok(er.sizeValue);
  assert.equal(er.bedrooms, undefined);
});

test("validateDraft rejects fees over 100% and titles over 120 characters", () => {
  const er = validateDraft({ ...homeDraft, agencyFee: "150", title: "x".repeat(121) });
  assert.ok(er.agencyFee);
  assert.ok(er.title);
  assert.deepEqual(validateDraft(homeDraft), {});
});

test("mediaChanges keeps screen order, picks the first as cover, and lists removed photos", () => {
  assert.deepEqual(mediaChanges(["a", "b", "c"], ["c", "a"], ["d"]), { urls: ["c", "a", "d"], cover: "c", removed: ["b"] });
  assert.deepEqual(mediaChanges([], [], []), { urls: [], cover: null, removed: [] });
});

test("takenStatus is sold for sales and let otherwise", () => {
  assert.equal(takenStatus({ listing_type: "sale" }), "sold");
  assert.equal(takenStatus({ listing_type: "rent" }), "let");
});

test("listingActions offers confirm when the listing needs confirming", () => {
  const a = listingActions({ status: "active", listing_type: "rent", last_confirmed_at: daysAgo(31) });
  assert.equal(a.confirm, true);
  assert.equal(a.markTaken, true);
  assert.equal(a.relist, false);
});

test("listingActions offers relist for a let listing", () => {
  const a = listingActions({ status: "let", listing_type: "rent", last_confirmed_at: daysAgo(2) });
  assert.equal(a.relist, true);
  assert.equal(a.markTaken, false);
});

test("listingActions offers no status actions on a moderated listing", () => {
  const a = listingActions({ status: "under_review", listing_type: "rent", last_confirmed_at: daysAgo(2) });
  assert.equal(a.markTaken, false);
  assert.equal(a.relist, false);
  assert.equal(a.edit, false);
  assert.equal(a.remove, true);
});

test("requestActions for a pending request", () => {
  assert.deepEqual(requestActions({ status: "pending", preferred_date: lagosDay(3) }), {
    confirm: true, counter: true, decline: true, done: false, cancel: false, withdraw: false,
  });
});

test("requestActions for a confirmed viewing before and on its date", () => {
  const before = requestActions({ status: "confirmed", preferred_date: lagosDay(2) });
  assert.equal(before.cancel, true);
  assert.equal(before.done, false);
  const on = requestActions({ status: "confirmed", preferred_date: lagosDay(0) });
  assert.equal(on.done, true);
  assert.equal(on.cancel, false);
});

test("requestActions for a countered request is withdraw only", () => {
  assert.deepEqual(requestActions({ status: "countered", preferred_date: lagosDay(3) }), {
    confirm: false, counter: false, decline: false, done: false, cancel: false, withdraw: true,
  });
});

test("validateCounter blocks a past date and long notes", () => {
  const today = "2026-10-09";
  assert.equal(validateCounter({ date: "2026-10-08", time: "", note: "" }, today), "Pick a date from today on.");
  assert.equal(validateCounter({ date: "", time: "", note: "" }, today), "Pick a date from today on.");
  assert.equal(validateCounter({ date: "2026-10-09", time: "", note: "x".repeat(301) }, today), "Keep the note under 300 characters.");
  assert.equal(validateCounter({ date: "2026-10-10", time: "14:00", note: "Gate code 12" }, today), null);
});

test("availabilityRows returns rows for days that are on", () => {
  const { rows, error } = availabilityRows({
    1: { on: true, start: "10:00", end: "14:00" },
    2: { on: false, start: "10:00", end: "14:00" },
    0: { on: true, start: "12:00", end: "15:00" },
  });
  assert.equal(error, null);
  assert.deepEqual(rows, [
    { weekday: 1, start_time: "10:00", end_time: "14:00" },
    { weekday: 0, start_time: "12:00", end_time: "15:00" },
  ]);
  assert.equal(WEEKDAYS[0].label, "Monday");
});

test("availabilityRows blocks an end before the start", () => {
  const { error } = availabilityRows({ 3: { on: true, start: "14:00", end: "10:00" } });
  assert.equal(error, "Each day's end time must be after its start time.");
});
