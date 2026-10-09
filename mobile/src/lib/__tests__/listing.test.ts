import { describe, expect, test } from "@jest/globals";
import { listingPhotos, listingState, listingUrl } from "../listing";

const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString();

describe("listingPhotos", () => {
  test("prefers the photo list", () => {
    expect(listingPhotos({ image_urls: ["a", "b"], image_url: "c" })).toEqual(["a", "b"]);
  });

  test("falls back to the single photo, then to none", () => {
    expect(listingPhotos({ image_urls: [], image_url: "c" })).toEqual(["c"]);
    expect(listingPhotos({})).toEqual([]);
  });
});

describe("listingState", () => {
  test("reports missing, unavailable and available", () => {
    expect(listingState(null)).toBe("missing");
    expect(listingState({ status: "let" })).toBe("unavailable");
    expect(listingState({ status: "active", last_confirmed_at: daysAgo(0) })).toBe("available");
    expect(listingState({ status: "active", last_confirmed_at: daysAgo(60) })).toBe("unavailable");
  });
});

test("listingUrl points at the website listing page", () => {
  expect(listingUrl("abc")).toMatch(/\/listings\/abc$/);
});
