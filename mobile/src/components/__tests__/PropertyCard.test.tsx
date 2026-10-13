import { describe, expect, jest, test } from "@jest/globals";
import { Text } from "react-native";
import { act, create, type ReactTestRenderer } from "react-test-renderer";

jest.mock("expo-router", () => ({ router: { push: jest.fn() } }));
jest.mock("@/lib/saved", () => ({ useSavedIds: () => [], toggleSaved: jest.fn() }));

import PropertyCard from "../PropertyCard";

const texts = (r: ReactTestRenderer) => r.root.findAllByType(Text).map((t) => [].concat(t.props.children).join(""));

function render(listing: Record<string, unknown>) {
  let r: ReactTestRenderer;
  act(() => {
    r = create(<PropertyCard listing={{ id: "l1", title: "A place", price: 1000000, ...listing }} />);
  });
  return r!;
}

describe("PropertyCard", () => {
  test("shows the gold category line for land", () => {
    const t = texts(render({ category: "land", listing_type: "sale", property_type: "residential_land", state: "Lagos", lga: "Epe" }));
    expect(t).toContain("RESIDENTIAL LAND");
    expect(t).toContain("For sale");
  });

  test("shows For rent and Boosted badges on the photo, and no gold line for homes", () => {
    const t = texts(render({ category: "homes", listing_type: "rent", property_type: "flat", boosted_until: new Date(Date.now() + 86400000).toISOString(), bedrooms: 2 }));
    expect(t).toContain("For rent");
    expect(t).toContain("Boosted");
    expect(t).not.toContain("FLAT / APARTMENT");
  });

  test("shows the full price period and who listed it, like the website card", () => {
    const t = texts(render({ category: "homes", listing_type: "rent", property_type: "flat", lister_type: "owner", is_verified: true }));
    expect(t).toContain(" /year");
    expect(t).toContain("Listed by owner");
    expect(t).toContain("Verified");
  });
});
