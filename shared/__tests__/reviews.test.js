import { test } from "node:test";
import assert from "node:assert/strict";
import { canReview, viewingDateReached } from "../reviews.js";

const lagosDay = (offset) =>
  new Date(Date.now() + offset * 86_400_000).toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" });

test("allows reviews only after the viewing date", () => {
  assert.equal(canReview({ status: "done", preferred_date: lagosDay(0) }), true);
  assert.equal(canReview({ status: "done", preferred_date: lagosDay(1) }), false);
  assert.equal(canReview({ status: "confirmed", preferred_date: lagosDay(-1) }), true);
  assert.equal(canReview({ status: "confirmed", preferred_date: lagosDay(0) }), false);
});

test("viewing date reached on the day itself", () => {
  assert.equal(viewingDateReached({ preferred_date: lagosDay(0) }), true);
  assert.equal(viewingDateReached({ preferred_date: lagosDay(1) }), false);
});
