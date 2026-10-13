import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeCode, shareMessage, inviteMessage, rememberRef, readRef, seekerProgress, signupInviteCode, cardUrl, fetchReferralSummary, recordShareVisit, spendBoostDays, inviteCodeExists } from "../referrals.js";

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

function fakeClient(result) {
  const calls = [];
  return {
    calls,
    rpc: async (name, args) => {
      calls.push([name, args]);
      if (result instanceof Error) throw result;
      return result;
    },
  };
}

test("fetchReferralSummary returns null when the function is missing", async () => {
  const c = fakeClient({ data: null, error: { code: "PGRST202", message: "Could not find the function public.my_referral_summary" } });
  assert.equal(await fetchReferralSummary(c), null);
});

test("fetchReferralSummary returns the summary", async () => {
  const summary = { code: "TUNDE7", balance: 7, joined: 3, listers: 1, views: 20, bookings: 2, seekers_confirmed: 2 };
  const c = fakeClient({ data: summary, error: null });
  assert.deepEqual(await fetchReferralSummary(c), summary);
  assert.deepEqual(c.calls[0], ["my_referral_summary", undefined]);
});

test("recordShareVisit never throws and passes listing, code and device", async () => {
  await recordShareVisit(fakeClient(new Error("network")), { listingId: "l1", code: "TUNDE7", device: "d1" });
  const c = fakeClient({ data: null, error: null });
  await recordShareVisit(c, { listingId: "l1", code: "tunde7", device: "d1" });
  assert.deepEqual(c.calls[0], ["record_share_visit", { p_listing: "l1", p_code: "TUNDE7", p_device: "d1" }]);
});

test("spendBoostDays passes listing and days and throws the database message", async () => {
  const ok = fakeClient({ data: "2026-10-20T00:00:00Z", error: null });
  assert.equal(await spendBoostDays(ok, "l1", 5), "2026-10-20T00:00:00Z");
  assert.deepEqual(ok.calls[0], ["spend_boost_days", { p_listing: "l1", p_days: 5 }]);
  const bad = fakeClient({ data: null, error: { message: "You don't have enough boost days" } });
  await assert.rejects(spendBoostDays(bad, "l1", 5), /enough boost days/);
});

test("inviteCodeExists normalises before asking", async () => {
  const c = fakeClient({ data: true, error: null });
  assert.equal(await inviteCodeExists(c, " tunde7"), true);
  assert.deepEqual(c.calls[0], ["invite_code_exists", { p_code: "TUNDE7" }]);
  const none = fakeClient({ data: true, error: null });
  assert.equal(await inviteCodeExists(none, "bad-code"), false);
  assert.equal(none.calls.length, 0);
});

test("signupInviteCode prefers the typed code, falls back to the remembered one", () => {
  assert.equal(signupInviteCode(" ade12 ", "TUNDE7"), "ADE12");
  assert.equal(signupInviteCode("", "TUNDE7"), "TUNDE7");
  assert.equal(signupInviteCode("not a code!", "TUNDE7"), null);
  assert.equal(signupInviteCode("", null), null);
});

test("cardUrl adds the code only when valid", () => {
  assert.equal(cardUrl({ site: SITE, listingId: "l1", code: "TUNDE7" }), "https://ile.test/share/listing/l1/card?ref=TUNDE7");
  assert.equal(cardUrl({ site: SITE, listingId: "l1", code: "bad-code" }), "https://ile.test/share/listing/l1/card");
});
