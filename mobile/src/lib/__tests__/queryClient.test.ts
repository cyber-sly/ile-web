import { describe, expect, jest, test } from "@jest/globals";
import { QueryClient } from "@tanstack/react-query";


import { cachedListings, seedListings, shouldPersist, trimSearchPages } from "../queryClient";

const query = (queryKey: unknown[], status = "success") => ({ queryKey, state: { status } });
const scope = { listingIds: new Set(["saved-1", "recent-1"]), searchKey: JSON.stringify({ tab: "rent" }) };

describe("shouldPersist", () => {
  test("keeps listings that are saved or recently viewed", () => {
    expect(shouldPersist(query(["listing", "saved-1"]), scope)).toBe(true);
    expect(shouldPersist(query(["listing", "recent-1"]), scope)).toBe(true);
  });

  test("drops other listings so the cache stays small", () => {
    expect(shouldPersist(query(["listing", "other"]), scope)).toBe(false);
  });

  test("keeps only the current search", () => {
    expect(shouldPersist(query(["search", { tab: "rent" }]), scope)).toBe(true);
    expect(shouldPersist(query(["search", { tab: "land" }]), scope)).toBe(false);
  });

  test("skips failed queries and other keys", () => {
    expect(shouldPersist(query(["listing", "saved-1"], "error"), scope)).toBe(false);
    expect(shouldPersist(query(["lister", "x"]), scope)).toBe(false);
    expect(shouldPersist(query(["saved-listings", ["saved-1"]]), scope)).toBe(false);
  });
});

test("trimSearchPages keeps only the first page", () => {
  expect(trimSearchPages({ pages: ["p1", "p2"], pageParams: [0, 1] })).toEqual({ pages: ["p1"], pageParams: [0] });
});

test("seeded listings can be read back from the cache in order", () => {
  const client = new QueryClient();
  seedListings(client, [{ id: 1, title: "A" }, { id: 2, title: "B" }]);
  expect(client.getQueryData(["listing", "1"])).toEqual({ id: 1, title: "A" });
  expect(cachedListings(client, ["2", "missing", "1"]).map((l) => l.title)).toEqual(["B", "A"]);
  client.clear();
});
