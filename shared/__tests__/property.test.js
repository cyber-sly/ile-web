import { test } from "node:test";
import assert from "node:assert/strict";
import { moveInCost, feeWarning, isExpired, priceParts } from "../property.js";

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
