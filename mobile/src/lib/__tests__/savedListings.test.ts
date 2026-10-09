import { describe, expect, jest, test } from "@jest/globals";

jest.mock("../supabase", () => ({ supabase: {} }));

import { fetchSavedListings } from "../savedListings";

function fakeClient(rows: { id: string }[]) {
  const calls: unknown[][] = [];
  const builder = {
    select: (...a: unknown[]) => (calls.push(["select", ...a]), builder),
    in: (...a: unknown[]) => (calls.push(["in", ...a]), builder),
    eq: (...a: unknown[]) => {
      calls.push(["eq", ...a]);
      return Promise.resolve({ data: rows, error: null });
    },
  };
  return { calls, from: (t: string) => (calls.push(["from", t]), builder) };
}

describe("fetchSavedListings", () => {
  test("asks only for active listings", async () => {
    const client = fakeClient([{ id: "a" }]);
    await fetchSavedListings(client, ["a", "b"]);
    expect(client.calls).toContainEqual(["in", "id", ["a", "b"]]);
    expect(client.calls).toContainEqual(["eq", "status", "active"]);
  });

  test("makes no request without ids", async () => {
    const client = fakeClient([]);
    expect(await fetchSavedListings(client, [])).toEqual([]);
    expect(client.calls).toEqual([]);
  });

  test("keeps the saved order", async () => {
    const client = fakeClient([{ id: "b" }, { id: "a" }]);
    const rows = await fetchSavedListings(client, ["a", "b"]);
    expect(rows.map((r) => r.id)).toEqual(["a", "b"]);
  });
});
