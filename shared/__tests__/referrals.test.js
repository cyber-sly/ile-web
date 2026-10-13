import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeCode, shareMessage, inviteMessage, rememberRef, readRef, seekerProgress } from "../referrals.js";

const SITE = "https://ile.test";
const LISTING = { id: "l1", title: "2-bed flat", price: 350000, listing_type: "rent", lga: "Ikeja", state: "Lagos" };
const DAY = 24 * 60 * 60 * 1000;

function memoryStorage() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
}

test("normalizeCode trims, removes spaces and uppercases; rejects bad shapes", () => {
  assert.equal(normalizeCode(" tunde7 "), "TUNDE7");
  assert.equal(normalizeCode("Tunde 7"), "TUNDE7");
  assert.equal(normalizeCode("TUNDE-7"), null);
  assert.equal(normalizeCode(""), null);
  assert.equal(normalizeCode("ABCDEFG1"), null);
  assert.equal(normalizeCode(null), null);
});

test("shareMessage with a code", () => {
  assert.equal(shareMessage({ listing: LISTING, site: SITE, code: "TUNDE7" }), "2-bed flat · ₦350,000/year · Ikeja, Lagos\nhttps://ile.test/listings/l1?ref=TUNDE7");
});

test("shareMessage without a code", () => {
  assert.ok(shareMessage({ listing: LISTING, site: SITE, code: null }).endsWith("\nhttps://ile.test/listings/l1"));
});

test("inviteMessage uses the exact invite copy", () => {
  assert.equal(
    inviteMessage({ site: SITE, code: "TUNDE7" }),
    "List your property on Ile for free. Serious home-seekers book viewings straight from your listing. Sign up with my code TUNDE7: https://ile.test/signup?role=landlord&ref=TUNDE7"
  );
});

test("rememberRef keeps the first code for 30 days", () => {
  const s = memoryStorage();
  const t0 = 1_700_000_000_000;
  rememberRef(s, "AAA1", t0);
  rememberRef(s, "BBB2", t0 + DAY);
  assert.equal(readRef(s, t0 + DAY), "AAA1");
  assert.equal(readRef(s, t0 + 31 * DAY), null);
  rememberRef(s, "BBB2", t0 + 31 * DAY);
  assert.equal(readRef(s, t0 + 31 * DAY), "BBB2");
});

test("seekerProgress counts batches of 5", () => {
  assert.deepEqual(seekerProgress(0), { batches: 0, toNext: 5 });
  assert.deepEqual(seekerProgress(7), { batches: 1, toNext: 3 });
  assert.deepEqual(seekerProgress(10), { batches: 2, toNext: 5 });
});
