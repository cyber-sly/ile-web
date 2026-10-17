import { test } from "node:test";
import assert from "node:assert/strict";
import { stayNights, stayQuote, rangesOverlap, validateStayRequest, stayActions, sortStays, STAY_STATUS, fetchTakenDates, requestStay, respondStay, cancelStay, fetchReviewedStayIds } from "../stays.js";

const STAY = { id: "s1", category: "stays", listing_type: "rent", price_period: "night", price: 45000, max_guests: 4, min_nights: 2, status: "active" };
const TODAY = "2026-11-01";

test("stayNights counts nights", () => {
  assert.equal(stayNights("2026-11-01", "2026-11-04"), 3);
  assert.equal(stayNights("2026-11-30", "2026-12-02"), 2);
});

test("stayQuote adds cleaning and caution once", () => {
  const q = stayQuote({ price: 45000, cleaning_fee: 10000, caution_deposit: 20000 }, "2026-11-01", "2026-11-04");
  assert.equal(q.nights, 3);
  assert.equal(q.subtotal, 135000);
  assert.equal(q.total, 165000);
  assert.equal(q.rows[0].label, "3 nights × ₦45,000");
  assert.deepEqual(q.rows.map((r) => r.amount), [135000, 10000, 20000]);
});

test("check-out day is free for the next check-in", () => {
  const a = { check_in: "2026-11-01", check_out: "2026-11-04" };
  assert.equal(rangesOverlap(a, { check_in: "2026-11-04", check_out: "2026-11-06" }), false);
  assert.equal(rangesOverlap(a, { check_in: "2026-11-03", check_out: "2026-11-05" }), true);
  assert.equal(rangesOverlap(a, { check_in: "2026-10-28", check_out: "2026-11-01" }), false);
});

test("validateStayRequest blocks each broken rule with a plain message", () => {
  const ok = { checkIn: "2026-11-05", checkOut: "2026-11-08", guests: 2, note: "" };
  assert.deepEqual(validateStayRequest(STAY, ok, [], TODAY), {});
  assert.equal(validateStayRequest(STAY, { ...ok, guests: 5 }, [], TODAY).guests, "This place sleeps up to 4 guests.");
  assert.equal(validateStayRequest(STAY, { ...ok, checkOut: "2026-11-06" }, [], TODAY).checkOut, "This place needs at least 2 nights.");
  assert.equal(validateStayRequest(STAY, { ...ok, checkIn: "2026-10-30" }, [], TODAY).checkIn, "Choose a check-in date from today.");
  assert.equal(validateStayRequest(STAY, { ...ok, checkOut: "2026-11-05" }, [], TODAY).checkOut, "Check-out must be after check-in.");
  assert.equal(validateStayRequest(STAY, { ...ok, checkOut: "2027-02-04" }, [], TODAY).checkOut, "Stays can be up to 90 nights.");
  assert.equal(
    validateStayRequest(STAY, ok, [{ check_in: "2026-11-07", check_out: "2026-11-09" }], TODAY).checkIn,
    "Some of those dates are already booked."
  );
  assert.equal(validateStayRequest(STAY, { ...ok, note: "x".repeat(501) }, [], TODAY).note, "Keep your note under 500 characters.");
  assert.equal(validateStayRequest(STAY, { ...ok, checkIn: "" }, [], TODAY).checkIn, "Choose your check-in date.");
  assert.equal(validateStayRequest(STAY, { ...ok, guests: 0 }, [], TODAY).guests, "Choose how many guests.");
});

test("stayActions depend on role, status and dates", () => {
  const requested = { status: "requested", check_in: "2026-11-05", check_out: "2026-11-08" };
  assert.deepEqual(stayActions(requested, "host", TODAY), { accept: true, decline: true, cancel: false, review: false });
  assert.deepEqual(stayActions(requested, "guest", TODAY), { accept: false, decline: false, cancel: true, review: false });
  const accepted = { ...requested, status: "accepted" };
  assert.equal(stayActions(accepted, "host", TODAY).cancel, true);
  assert.equal(stayActions(accepted, "guest", TODAY).cancel, true);
  assert.deepEqual(stayActions(accepted, "guest", "2026-11-08"), { accept: false, decline: false, cancel: false, review: true });
  assert.deepEqual(stayActions({ ...requested, status: "declined" }, "guest", TODAY), { accept: false, decline: false, cancel: false, review: false });
});

test("sortStays puts upcoming first, then past newest first", () => {
  const list = [
    { id: "past-old", status: "accepted", check_in: "2026-09-01", check_out: "2026-09-03" },
    { id: "later", status: "requested", check_in: "2026-12-01", check_out: "2026-12-03" },
    { id: "soon", status: "accepted", check_in: "2026-11-03", check_out: "2026-11-05" },
    { id: "past-new", status: "accepted", check_in: "2026-10-20", check_out: "2026-10-22" },
    { id: "declined", status: "declined", check_in: "2026-11-10", check_out: "2026-11-12" },
  ];
  assert.deepEqual(sortStays(list, TODAY).map((s) => s.id), ["soon", "later", "past-new", "past-old", "declined"]);
});

test("STAY_STATUS has a label for every status", () => {
  assert.deepEqual(Object.keys(STAY_STATUS).sort(), ["accepted", "cancelled", "declined", "requested"]);
  assert.equal(STAY_STATUS.requested.label, "Requested");
});

function rpcClient(result) {
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

test("fetchTakenDates returns [] when the function is missing", async () => {
  assert.deepEqual(await fetchTakenDates(rpcClient({ data: null, error: { code: "PGRST202", message: "Could not find the function" } }), "l1"), []);
  assert.deepEqual(await fetchTakenDates(rpcClient(new Error("offline")), "l1"), []);
  const c = rpcClient({ data: [{ check_in: "2026-11-01", check_out: "2026-11-03" }], error: null });
  assert.deepEqual(await fetchTakenDates(c, "l1"), [{ check_in: "2026-11-01", check_out: "2026-11-03" }]);
  assert.deepEqual(c.calls[0], ["listing_taken_dates", { p_listing: "l1" }]);
});

test("requestStay passes dates, guests and note and throws the database message", async () => {
  const ok = rpcClient({ data: "b1", error: null });
  assert.equal(await requestStay(ok, { listingId: "l1", checkIn: "2026-11-05", checkOut: "2026-11-08", guests: 2, note: " Hi " }), "b1");
  assert.deepEqual(ok.calls[0], ["request_stay", { p_listing: "l1", p_check_in: "2026-11-05", p_check_out: "2026-11-08", p_guests: 2, p_note: "Hi" }]);
  const bad = rpcClient({ data: null, error: { message: "Some of those dates are already booked." } });
  await assert.rejects(requestStay(bad, { listingId: "l1", checkIn: "2026-11-05", checkOut: "2026-11-08", guests: 2, note: "" }), /already booked/);
});

test("respondStay and cancelStay pass their arguments", async () => {
  const c = rpcClient({ data: null, error: null });
  await respondStay(c, "b1", false, " Not free ");
  await cancelStay(c, "b1");
  assert.deepEqual(c.calls, [
    ["respond_stay", { p_id: "b1", p_accept: false, p_reason: "Not free" }],
    ["cancel_stay", { p_id: "b1" }],
  ]);
});

test("fetchReviewedStayIds asks the database function which stays this person reviewed", async () => {
  const c = rpcClient({ data: ["s1"], error: null });
  const ids = await fetchReviewedStayIds(c, ["s1", "s2"], "u1");
  assert.deepEqual([...ids], ["s1"]);
  assert.deepEqual(c.calls[0], ["my_reviewed_stays", { p_ids: ["s1", "s2"] }]);
  assert.equal((await fetchReviewedStayIds(rpcClient(new Error("x")), ["s1"], "u1")).size, 0);
  assert.equal((await fetchReviewedStayIds(c, [], "u1")).size, 0);
});
