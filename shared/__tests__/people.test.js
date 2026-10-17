import { test } from "node:test";
import assert from "node:assert/strict";
import { fetchPeople, fetchRatings, fetchResponseTimes, fetchTenantDetails, displayName, normalizeUsername, usernameError, normalizePhone, phoneError, localPhone } from "../people.js";

// Fake Supabase client: returns `rows` for any table query or RPC and records calls.
function fakeClient(rows) {
  const calls = [];
  return {
    calls,
    from(table) {
      return {
        select(cols) {
          return {
            in: async (col, ids) => {
              calls.push(["from", table, cols, col, ids]);
              return { data: rows, error: null };
            },
          };
        },
      };
    },
    rpc: async (name, args) => {
      calls.push(["rpc", name, args]);
      return { data: rows, error: null };
    },
  };
}

test("fetchPeople returns names and avatars keyed by id", async () => {
  const client = fakeClient([{ id: "a", full_name: " Ada ", avatar_url: "u" }]);
  assert.deepEqual(await fetchPeople(client, ["a"]), { a: { name: "Ada", avatar: "u", username: null } });
});

test("fetchPeople makes no request for an empty or all-null id list", async () => {
  const client = fakeClient([]);
  assert.deepEqual(await fetchPeople(client, [null, undefined]), {});
  assert.equal(client.calls.length, 0);
});

test("fetchRatings passes de-duplicated ids and role to user_ratings", async () => {
  const client = fakeClient([{ user_id: "a", average: 4.5, total: 2 }]);
  const out = await fetchRatings(client, ["a", "a", "b"], "lister");
  assert.deepEqual(client.calls[0], ["rpc", "user_ratings", { p_users: ["a", "b"], p_role: "lister" }]);
  assert.equal(out.a.average, 4.5);
});

test("fetchResponseTimes maps median_minutes by user", async () => {
  const client = fakeClient([{ user_id: "a", median_minutes: 42 }]);
  assert.deepEqual(await fetchResponseTimes(client, ["a"]), { a: 42 });
  assert.deepEqual(client.calls[0], ["rpc", "lister_response_times", { p_users: ["a"] }]);
});

test("fetchTenantDetails asks tenant_details for unique ids", async () => {
  const client = fakeClient([{ id: "t1", occupation: "student", move_in_timeline: "now" }]);
  const out = await fetchTenantDetails(client, ["t1", "t1", null]);
  assert.deepEqual(client.calls[0], ["rpc", "tenant_details", { p_ids: ["t1"] }]);
  assert.equal(out.t1.occupation, "student");
});

test("displayName prefers @username only when chosen", () => {
  assert.equal(displayName({ full_name: "Ada Obi", username: "ada", show_as: "username" }), "@ada");
  assert.equal(displayName({ full_name: " Ada Obi ", username: "ada", show_as: "name" }), "Ada Obi");
  assert.equal(displayName({ show_as: "username" }), "Ile member");
  assert.equal(displayName({}), "Ile member");
  assert.equal(displayName(null), "Ile member");
});

test("normalizeUsername lowercases and strips @ and spaces", () => {
  assert.equal(normalizeUsername(" @Tunde_Homes "), "tunde_homes");
});

test("usernameError explains what's wrong", () => {
  assert.equal(usernameError("ab"), "Use 3 to 20 letters, numbers or underscores.");
  assert.equal(usernameError("bad-name"), "Use 3 to 20 letters, numbers or underscores.");
  assert.equal(usernameError("x".repeat(21)), "Use 3 to 20 letters, numbers or underscores.");
  assert.equal(usernameError("_tunde"), "A username can't start or end with _.");
  assert.equal(usernameError("Admin"), "That username isn't available.");
  assert.equal(usernameError("Tunde_Homes"), null);
});

test("normalizePhone accepts common Nigerian formats", () => {
  for (const p of ["0803 123 4567", "803-123-4567", "+234 803 123 4567", "2348031234567"]) {
    assert.equal(normalizePhone(p), "+2348031234567", p);
  }
  assert.equal(normalizePhone("12345"), null);
  assert.equal(phoneError(""), null);
  assert.equal(phoneError("0803 123 4567"), null);
  assert.equal(phoneError("12345"), "Enter a Nigerian number, e.g. 0803 123 4567.");
  assert.equal(localPhone("+2348031234567"), "0803 123 4567");
});

test("fetchPeople falls back when username columns are missing", async () => {
  const selects = [];
  const client = {
    from() {
      return {
        select(cols) {
          selects.push(cols);
          return {
            in: async () =>
              cols.includes("username")
                ? { data: null, error: { code: "42703", message: "column profiles.username does not exist" } }
                : { data: [{ id: "u1", full_name: "Ada Obi", avatar_url: null }], error: null },
          };
        },
      };
    },
  };
  const people = await fetchPeople(client, ["u1"]);
  assert.equal(people.u1.name, "Ada Obi");
  assert.equal(selects.length, 2);
});

test("fetchPeople uses the chosen display name", async () => {
  const client = {
    from: () => ({ select: () => ({ in: async () => ({ data: [{ id: "u1", full_name: "Ada", username: "ada", show_as: "username", avatar_url: "a.png" }], error: null }) }) }),
  };
  assert.deepEqual((await fetchPeople(client, ["u1"])).u1, { name: "@ada", avatar: "a.png", username: "ada" });
});
