import { test } from "node:test";
import assert from "node:assert/strict";
import { mergeSavedIds } from "../saved.js";

test("merges device saves into account saves without duplicates", () => {
  assert.deepEqual(mergeSavedIds(["a", "b"], ["b", "c"]), ["b", "c", "a"]);
});

test("handles empty lists", () => {
  assert.deepEqual(mergeSavedIds([], []), []);
  assert.deepEqual(mergeSavedIds(["1"], []), ["1"]);
});

test("returns ids as strings", () => {
  assert.deepEqual(mergeSavedIds([5], []), ["5"]);
});

// Fake Supabase client: `listings` holds the ids that still exist; records upserts.
function fakeClient(existing) {
  const upserts = [];
  return {
    upserts,
    from(table) {
      return {
        select() {
          return {
            in: async (_col, ids) => ({ data: table === "listings" ? ids.filter((id) => existing.includes(id)).map((id) => ({ id })) : [], error: null }),
          };
        },
        upsert: async (rows) => {
          upserts.push(...rows);
          return { error: null };
        },
      };
    },
  };
}

test("imports only device saves whose listings still exist", async () => {
  const { importSavedIds } = await import("../saved.js");
  const client = fakeClient(["a", "c"]);
  await importSavedIds(client, "user-1", ["a", "deleted", "c"]);
  assert.deepEqual(client.upserts.map((r) => r.listing_id), ["a", "c"]);
});

test("skips the import entirely when no saved listing still exists", async () => {
  const { importSavedIds } = await import("../saved.js");
  const client = fakeClient([]);
  await importSavedIds(client, "user-1", ["gone"]);
  assert.deepEqual(client.upserts, []);
});
