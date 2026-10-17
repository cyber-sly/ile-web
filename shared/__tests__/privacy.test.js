import { test } from "node:test";
import assert from "node:assert/strict";
import { usernameAvailable, fetchMyPhone, fetchBookingContact } from "../privacy.js";

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

const MISSING = { data: null, error: { code: "PGRST202", message: "Could not find the function" } };

test("usernameAvailable normalises, asks the database, and is null when the function is missing", async () => {
  const c = rpcClient({ data: true, error: null });
  assert.equal(await usernameAvailable(c, " @Tunde_Homes"), true);
  assert.deepEqual(c.calls[0], ["username_available", { p_username: "tunde_homes" }]);
  assert.equal(await usernameAvailable(rpcClient(MISSING), "tunde"), null);
  const none = rpcClient({ data: true, error: null });
  assert.equal(await usernameAvailable(none, "ab"), false);
  assert.equal(none.calls.length, 0);
});

test("fetchMyPhone returns the saved number or null", async () => {
  assert.equal(await fetchMyPhone(rpcClient({ data: "+2348031234567", error: null })), "+2348031234567");
  assert.equal(await fetchMyPhone(rpcClient(MISSING)), null);
});

test("fetchBookingContact passes the booking and never throws", async () => {
  const c = rpcClient({ data: "+2348031234567", error: null });
  assert.equal(await fetchBookingContact(c, "stay", "b1"), "+2348031234567");
  assert.deepEqual(c.calls[0], ["booking_contact", { p_kind: "stay", p_id: "b1" }]);
  assert.equal(await fetchBookingContact(rpcClient(new Error("offline")), "viewing", "v1"), null);
  assert.equal(await fetchBookingContact(rpcClient(MISSING), "viewing", "v1"), null);
});
