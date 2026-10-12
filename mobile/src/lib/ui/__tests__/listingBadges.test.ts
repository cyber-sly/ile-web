import { describe, expect, test } from "@jest/globals";
import { categoryLine, listingBadges } from "../listingBadges";

describe("categoryLine", () => {
  test("shows the type for land and commercial only", () => {
    expect(categoryLine({ category: "land", property_type: "residential_land" })).toBe("RESIDENTIAL LAND");
    expect(categoryLine({ category: "commercial", property_type: "shop" })).toBe("SHOP");
    expect(categoryLine({ category: "homes", property_type: "flat" })).toBeNull();
    expect(categoryLine({ category: "land" })).toBeNull();
  });
});

describe("listingBadges", () => {
  test("puts boosted before the type badge", () => {
    expect(listingBadges({ is_boosted: true })).toEqual(["boosted", "type"]);
    expect(listingBadges({})).toEqual(["type"]);
  });
});
