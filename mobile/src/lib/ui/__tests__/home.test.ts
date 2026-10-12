import { describe, expect, test } from "@jest/globals";
import { accountTabTitle, freshSectionState, HOME_CATEGORIES } from "../home";

describe("Home", () => {
  test("accountTabTitle says Log in when logged out", () => {
    expect(accountTabTitle(null)).toBe("Log in");
    expect(accountTabTitle({ id: "u1" })).toBe("Account");
  });

  test("freshSectionState shows placeholders, offline, empty or the list", () => {
    expect(freshSectionState({ isPending: true, online: true, count: 0 })).toBe("loading");
    expect(freshSectionState({ isPending: true, online: false, count: 0 })).toBe("offline");
    expect(freshSectionState({ isPending: false, online: true, count: 0 })).toBe("empty");
    expect(freshSectionState({ isPending: false, online: false, count: 3 })).toBe("list");
  });

  test("freshSectionState shows an error with retry, not a false empty state, when loading fails", () => {
    expect(freshSectionState({ isPending: false, online: true, count: 0, isError: true })).toBe("error");
    expect(freshSectionState({ isPending: false, online: true, count: 2, isError: true })).toBe("list");
  });

  test("HOME_CATEGORIES uses the website's four categories in order", () => {
    expect(HOME_CATEGORIES.map((c) => [c.title, c.tab])).toEqual([
      ["Homes for rent", "rent"],
      ["Homes for sale", "sale"],
      ["Land", "land"],
      ["Shops and offices", "commercial"],
    ]);
  });
});
