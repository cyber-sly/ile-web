import { categoryOf, isBoosted, typeLabel } from "@shared/property.js";

type Listing = Record<string, any>;

// Badges on a card's photo, in the website's order (PropertyCard.jsx).
export function listingBadges(listing: Listing): ("boosted" | "type")[] {
  return isBoosted(listing) ? ["boosted", "type"] : ["type"];
}

// The small gold line above the price ("RESIDENTIAL LAND"), shown for land and
// commercial property only, like the website's card.
export function categoryLine(listing: Listing): string | null {
  if (categoryOf(listing) === "homes" || !listing.property_type) return null;
  return String(typeLabel(listing.property_type)).toUpperCase();
}
