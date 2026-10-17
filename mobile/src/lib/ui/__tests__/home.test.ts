import { describe, expect, test } from "@jest/globals";
import { accountTabTitle, afterSignupRoute, freshSectionState, HOME_CATEGORIES } from "../home";

describe("Home", () => {
  test("accountTabTitle says Log in when logged out", () => {
    expect(accountTabTitle(null)).toBe("Log in");
    expect(accountTabTitle({ id: "u1" })).toBe("Account");
  });

  test("accountTabTitle says Account while the session is still loading (no Log in flash)", () => {
    expect(accountTabTitle(null, true)).toBe("Account");
  });

  test("afterSignupRoute continues to the listing form only for the allowed next page", () => {
    expect(afterSignupRoute("/list/new")).toBe("/list/new");
    expect(afterSignupRoute(undefined)).toBeNull();
    expect(afterSignupRoute("https://evil.example")).toBeNull();
    expect(afterSignupRoute("/account/delete")).toBeNull();
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
      ["Homes", "rent"],
      ["Shortlets & hotels", "stays"],
      ["Land", "land"],
      ["Shops & offices", "commercial"],
    ]);
  });
});
