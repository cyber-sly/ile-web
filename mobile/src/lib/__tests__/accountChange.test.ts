import { expect, test } from "@jest/globals";
import { accountChanged } from "../accountChange";

test("a different account (or logging out) after someone was logged in counts as a change", () => {
  expect(accountChanged("a", null)).toBe(true);
  expect(accountChanged("a", "b")).toBe(true);
});

test("first login and staying logged in are not changes", () => {
  expect(accountChanged(null, "a")).toBe(false);
  expect(accountChanged("a", "a")).toBe(false);
});
