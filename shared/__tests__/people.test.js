import { test } from "node:test";
import assert from "node:assert/strict";
import { fetchPeople, fetchRatings, fetchResponseTimes } from "../people.js";

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
  assert.deepEqual(await fetchPeople(client, ["a"]), { a: { name: "Ada", avatar: "u" } });
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
