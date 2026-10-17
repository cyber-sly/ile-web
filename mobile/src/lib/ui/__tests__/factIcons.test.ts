import { expect, test } from "@jest/globals";
import { detailFacts } from "@shared/property.js";
import { FACT_ICONS } from "../factIcons";

test("every detail fact has an icon", () => {
  const listings = [
    { category: "homes", property_type: "flat", bedrooms: 2, bathrooms: 2, furnishing: "furnished", size_value: 120, size_unit: "sqm", lister_type: "owner" },
    { category: "land", property_type: "residential_land", size_value: 600, size_unit: "sqm", title_document: "c_of_o", lister_type: "agent" },
    { category: "commercial", property_type: "shop", size_value: 40, size_unit: "sqm", parking_spaces: 2, toilets: 1, lister_type: "owner" },
    { category: "stays", property_type: "hotel_room", hotel_name: "Eko Suites", bedrooms: 1, bathrooms: 1, max_guests: 2, min_nights: 1, check_in_time: "14:00", check_out_time: "11:00", lister_type: "owner" },
  ];
  for (const listing of listings) {
    for (const fact of detailFacts(listing)) expect(Object.keys(FACT_ICONS)).toContain(fact.key);
  }
});
