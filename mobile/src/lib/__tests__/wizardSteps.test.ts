import { expect, test } from "@jest/globals";
import { EMPTY_DRAFT } from "@shared/lister.js";
import { STEPS, stepErrors, stepsFor } from "../wizardSteps";

test("stepErrors only reports the current step's fields", () => {
  expect(Object.keys(stepErrors("where", EMPTY_DRAFT, 0)).sort()).toEqual(["lga", "state"]);
  expect(stepErrors("what", EMPTY_DRAFT, 0)).toEqual({});
  expect(Object.keys(stepErrors("price", EMPTY_DRAFT, 0))).toEqual(["price"]);
  expect(STEPS).toEqual(["what", "where", "details", "stay", "amenities", "price", "photos", "review"]);
});

test("stepErrors needs at least one photo", () => {
  expect(stepErrors("photos", EMPTY_DRAFT, 0)).toEqual({ photos: "Add at least one photo." });
  expect(stepErrors("photos", EMPTY_DRAFT, 2)).toEqual({});
});

test("stepsFor adds the stay step only for stays", () => {
  expect(stepsFor("stays")).toContain("stay");
  expect(stepsFor("homes")).not.toContain("stay");
  expect(stepsFor("homes")).toContain("amenities");
  expect(Object.keys(stepErrors("stay", { ...EMPTY_DRAFT, category: "stays", propertyType: "hotel_room" }, 0)).sort()).toEqual(["hotelName", "maxGuests"]);
});
