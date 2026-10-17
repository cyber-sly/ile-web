import { validateDraft } from "@shared/lister.js";

// The listing wizard's steps, in order. "stay" only appears for stays.
export const STEPS = ["what", "where", "details", "stay", "amenities", "price", "photos", "review"] as const;
export type Step = (typeof STEPS)[number];

export function stepsFor(category: string): Step[] {
  return STEPS.filter((s) => s !== "stay" || category === "stays");
}

export const STEP_TITLES: Record<Step, string> = {
  what: "What are you listing?",
  where: "Where is it?",
  details: "Tell people about it",
  stay: "Stay rules",
  amenities: "Amenities",
  price: "Price and fees",
  photos: "Photos and videos",
  review: "Review and publish",
};

// Which validateDraft fields belong to each step.
const FIELDS: Record<Step, string[]> = {
  what: [],
  where: ["state", "lga"],
  details: ["title", "bedrooms", "sizeValue", "description"],
  stay: ["maxGuests", "minNights", "hotelName", "houseRules", "checkInTime", "checkOutTime"],
  amenities: ["features"],
  price: ["price", "agencyFee", "legalFee", "cleaningFee"],
  photos: [],
  review: [
    "state", "lga", "title", "bedrooms", "sizeValue", "description", "maxGuests", "minNights", "hotelName", "houseRules", "checkInTime", "checkOutTime",
    "features", "price", "agencyFee", "legalFee", "cleaningFee",
  ],
};

export function stepErrors(step: Step, draft: Record<string, any>, photoCount: number): Record<string, string> {
  const all = validateDraft(draft) as unknown as Record<string, string>;
  const out: Record<string, string> = {};
  for (const field of FIELDS[step]) if (all[field]) out[field] = all[field];
  if ((step === "photos" || step === "review") && photoCount < 1) out.photos = "Add at least one photo.";
  return out;
}
