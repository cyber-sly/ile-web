import { expect, jest, test } from "@jest/globals";

jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));

import { activeFilterCount, DEFAULT_FILTERS } from "../filters";

test("activeFilterCount ignores tab, search text and sort", () => {
  expect(activeFilterCount({ ...DEFAULT_FILTERS, tab: "sale", q: "lekki", sort: "low" })).toBe(0);
});

test("activeFilterCount counts each applied filter", () => {
  expect(activeFilterCount({ ...DEFAULT_FILTERS, state: "Lagos", lga: "Eti-Osa", beds: "2" })).toBe(3);
});

test("default filters start on the Rent tab", () => {
  expect(DEFAULT_FILTERS.tab).toBe("rent");
});
