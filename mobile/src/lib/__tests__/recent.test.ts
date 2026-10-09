import { expect, jest, test } from "@jest/globals";

jest.mock("@react-native-async-storage/async-storage", () => require("@react-native-async-storage/async-storage/jest/async-storage-mock"));

import { pushRecent, RECENT_MAX } from "../recent";

test("pushRecent puts the newest first without duplicates", () => {
  expect(pushRecent(["a", "b"], "b")).toEqual(["b", "a"]);
});

test("pushRecent caps the list", () => {
  const full = Array.from({ length: RECENT_MAX }, (_, i) => String(i));
  const next = pushRecent(full, "new");
  expect(next).toHaveLength(RECENT_MAX);
  expect(next[0]).toBe("new");
});
