import { test } from "node:test";
import assert from "node:assert/strict";
import { groupSlotsByDay, sortViewings, viewingActions, acceptChanges, requestViewing, bookSlot } from "../viewings.js";

const lagosDay = (offset) => {
  const d = new Date(Date.now() + offset * 86_400_000);
  return d.toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" });
};

test("groupSlotsByDay groups times under their date in order", () => {
  const slots = [
    { slot_date: "2026-10-12", slot_time: "10:00:00" },
    { slot_date: "2026-10-12", slot_time: "11:00:00" },
    { slot_date: "2026-10-13", slot_time: "09:00:00" },
  ];
  assert.deepEqual(groupSlotsByDay(slots), [
    { date: "2026-10-12", times: ["10:00:00", "11:00:00"] },
    { date: "2026-10-13", times: ["09:00:00"] },
  ]);
});

test("sortViewings puts countered, then pending, then confirmed first", () => {
  const list = ["done", "confirmed", "countered", "pending", "cancelled"].map((status) => ({ status }));
  assert.deepEqual(sortViewings(list).map((v) => v.status), ["countered", "pending", "confirmed", "done", "cancelled"]);
});

test("viewingActions offers accept and decline for a countered time", () => {
  const a = viewingActions({ status: "countered", preferred_date: lagosDay(3) });
  assert.equal(a.accept, true);
  assert.equal(a.decline, true);
  assert.equal(a.message, true);
});

test("viewingActions lets you cancel a pending request", () => {
  assert.equal(viewingActions({ status: "pending", preferred_date: lagosDay(2) }).cancel, true);
});

test("viewingActions blocks cancelling a confirmed viewing on or after its date", () => {
  assert.equal(viewingActions({ status: "confirmed", preferred_date: lagosDay(0) }).cancel, false);
  assert.equal(viewingActions({ status: "confirmed", preferred_date: lagosDay(1) }).cancel, true);
});

test("viewingActions offers nothing for a cancelled viewing", () => {
  assert.deepEqual(viewingActions({ status: "cancelled", preferred_date: lagosDay(1) }), { accept: false, decline: false, cancel: false, message: false });
});

test("acceptChanges moves the proposed time into the booking", () => {
  assert.deepEqual(acceptChanges({ proposed_date: "2026-11-02", proposed_time: "14:00:00" }), {
    status: "confirmed",
    preferred_date: "2026-11-02",
    preferred_time: "14:00:00",
  });
});

test("requestViewing explains a taken time", async () => {
  const client = {
    from: () => ({ insert: () => ({ select: () => ({ single: async () => ({ data: null, error: { code: "23505", message: "dup" } }) }) }) }),
  };
  await assert.rejects(requestViewing(client, "l1", "u1", "2026-11-02", null), { message: "That time is already taken. Please choose another." });
});

test("bookSlot passes the RPC error message on", async () => {
  const client = { rpc: async () => ({ data: null, error: { message: "That time was just taken" } }) };
  await assert.rejects(bookSlot(client, "l1", "2026-11-02", "10:00:00"), { message: "That time was just taken" });
});
