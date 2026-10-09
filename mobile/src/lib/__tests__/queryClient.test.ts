import { describe, expect, jest, test } from "@jest/globals";

jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));
jest.mock("@react-native-community/netinfo", () => ({ addEventListener: jest.fn(() => jest.fn()) }));

import { shouldPersist, trimSearchPages } from "../queryClient";

const query = (queryKey: unknown[], status = "success") => ({ queryKey, state: { status } });

describe("shouldPersist", () => {
  test("keeps successful listing, saved and search queries", () => {
    expect(shouldPersist(query(["listing", "a"]))).toBe(true);
    expect(shouldPersist(query(["saved-listings", ["a"]]))).toBe(true);
    expect(shouldPersist(query(["search", { tab: "rent" }]))).toBe(true);
  });

  test("skips failed queries and other keys", () => {
    expect(shouldPersist(query(["listing", "a"], "error"))).toBe(false);
    expect(shouldPersist(query(["lister", "a"]))).toBe(false);
  });
});

test("trimSearchPages keeps only the first page", () => {
  expect(trimSearchPages({ pages: ["p1", "p2"], pageParams: [0, 1] })).toEqual({ pages: ["p1"], pageParams: [0] });
});
