import { test } from "node:test";
import assert from "node:assert/strict";
import { moveInCost, feeWarning, isExpired, priceParts, isBoosted, periodOptions, amenitiesFor, keyFacts, typeLabel, detailFacts } from "../property.js";

const daysAgo = (n) => new Date(Date.now() - n * 86_400_000).toISOString();

test("adds rent and every fee into the move-in total", () => {
  const cost = moveInCost({
    listing_type: "rent", price: 1000000, price_period: "year",
    agency_fee_percent: 10, legal_fee_percent: 10, caution_deposit: 100000, service_charge: 50000,
  });
  assert.equal(cost.total, 1350000);
  assert.ok(cost.rows.some((r) => r.label === "Agency fee (10%)"));
});

test("charges percentage fees on 12 months for monthly rent", () => {
  const cost = moveInCost({ listing_type: "rent", price: 100000, price_period: "month", agency_fee_percent: 10 });
  assert.equal(cost.rows.find((r) => r.label.startsWith("Agency")).amount, 120000);
});

test("flags Lagos fees above the 10% cap only in Lagos", () => {
  assert.equal(typeof feeWarning({ listing_type: "rent", state: "Lagos", agency_fee_percent: 15 }), "string");
  assert.equal(feeWarning({ listing_type: "rent", state: "Oyo", agency_fee_percent: 15 }), null);
});

test("expires live listings unconfirmed for 45+ days", () => {
  assert.equal(isExpired({ status: "active", last_confirmed_at: daysAgo(46) }), true);
  assert.equal(isExpired({ status: "active", last_confirmed_at: daysAgo(10) }), false);
  assert.equal(isExpired({ status: "let", last_confirmed_at: daysAgo(90) }), false);
});

test("splits price into amount and period suffix", () => {
  assert.deepEqual(priceParts({ price: 3500000, listing_type: "rent", price_period: "year" }), {
    amount: "₦3,500,000",
    suffix: "/year",
  });
});

test("detailFacts lists type, bedrooms and furnishing for homes", async () => {
  const { detailFacts } = await import("../property.js");
  const facts = detailFacts({ category: "homes", property_type: "flat", bedrooms: 0, furnishing: "furnished", lister_type: "agent" });
  assert.deepEqual(facts.map((f) => [f.key, f.value]), [
    ["type", "Flat / apartment"],
    ["bedrooms", "Studio"],
    ["furnishing", "Furnished"],
    ["lister", "Agent"],
  ]);
});

test("detailFacts says when land has no title document", async () => {
  const { detailFacts } = await import("../property.js");
  const facts = detailFacts({ category: "land", property_type: "residential_land" });
  assert.equal(facts.find((f) => f.key === "title").value, "Not stated");
});

test("isBoosted is false for a past date, true for a future one, false when missing", () => {
  const now = Date.parse("2026-10-13T12:00:00Z");
  assert.equal(isBoosted({ boosted_until: "2026-10-13T11:00:00Z" }, now), false);
  assert.equal(isBoosted({ boosted_until: "2026-10-14T11:00:00Z" }, now), true);
  assert.equal(isBoosted({}, now), false);
});

test("priceParts for a stay ends with /night", () => {
  assert.equal(priceParts({ category: "stays", listing_type: "rent", price_period: "night", price: 45000 }).suffix, "/night");
  assert.deepEqual(periodOptions("rent", "stays"), ["night"]);
});

test("amenitiesFor gives each category its list", () => {
  assert.equal(amenitiesFor("stays")[0], "Wi-Fi");
  assert.ok(amenitiesFor("land").includes("Corner piece"));
  assert.ok(amenitiesFor("homes").includes("Prepaid meter"));
  assert.ok(amenitiesFor("commercial").includes("Loading bay"));
  assert.deepEqual(amenitiesFor("unknown"), []);
});

test("keyFacts for stays", () => {
  assert.deepEqual(
    keyFacts({ category: "stays", property_type: "hotel_room", hotel_name: "Eko Suites", max_guests: 2, min_nights: 1 }),
    ["Eko Suites", "2 guests max"]
  );
  assert.deepEqual(keyFacts({ category: "stays", property_type: "shortlet", max_guests: 4, min_nights: 3 }), ["4 guests max", "3-night minimum"]);
  assert.equal(typeLabel("airbnb"), "Airbnb / private room");
});

test("detailFacts for stays show guests, minimum nights and check-in times", () => {
  const keys = detailFacts({ category: "stays", property_type: "shortlet", max_guests: 4, min_nights: 2, check_in_time: "14:00:00", check_out_time: "11:00:00", bedrooms: 2 }).map((f) => f.key);
  for (const k of ["guests", "minNights", "checkIn", "checkOut", "bedrooms"]) assert.ok(keys.includes(k), k);
});
