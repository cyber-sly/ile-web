import { describe, expect, test } from "@jest/globals";
import { parseAuthRedirect, providersEnabled, roleForNewUser } from "../oauthRules";

describe("parseAuthRedirect", () => {
  test("reads tokens from the fragment", () => {
    expect(parseAuthRedirect("ile://auth-callback#access_token=abc&refresh_token=def&expires_in=3600&token_type=bearer")).toEqual({
      accessToken: "abc",
      refreshToken: "def",
    });
  });

  test("reads tokens from the query too", () => {
    expect(parseAuthRedirect("ile://auth-callback?access_token=abc&refresh_token=def")).toEqual({ accessToken: "abc", refreshToken: "def" });
  });

  test("reports an error from Google", () => {
    expect(parseAuthRedirect("ile://auth-callback#error=access_denied&error_description=The+user+denied+access")).toEqual({
      error: "The user denied access",
    });
  });

  test("treats a missing URL as cancelled", () => {
    expect(parseAuthRedirect(null)).toEqual({ cancelled: true });
    expect(parseAuthRedirect("ile://auth-callback")).toEqual({ cancelled: true });
  });
});

describe("roleForNewUser", () => {
  test("uses the chosen role for new accounts only", () => {
    expect(roleForNewUser({}, "landlord")).toBe("landlord");
    expect(roleForNewUser({}, undefined)).toBe("tenant");
    expect(roleForNewUser({ role: "tenant" }, "landlord")).toBeNull();
    expect(roleForNewUser({}, "admin" as never)).toBe("tenant");
  });
});

test("providersEnabled reads Supabase settings", () => {
  expect(providersEnabled({ external: { google: true, apple: false } })).toEqual({ google: true, apple: false });
  expect(providersEnabled({})).toEqual({ google: false, apple: false });
  expect(providersEnabled(null)).toEqual({ google: false, apple: false });
});
