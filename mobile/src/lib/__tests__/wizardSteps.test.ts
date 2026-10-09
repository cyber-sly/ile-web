import { expect, test } from "@jest/globals";
import { EMPTY_DRAFT } from "@shared/lister.js";
import { STEPS, stepErrors } from "../wizardSteps";

test("stepErrors only reports the current step's fields", () => {
  expect(Object.keys(stepErrors("where", EMPTY_DRAFT, 0)).sort()).toEqual(["lga", "state"]);
  expect(stepErrors("what", EMPTY_DRAFT, 0)).toEqual({});
  expect(Object.keys(stepErrors("price", EMPTY_DRAFT, 0))).toEqual(["price"]);
  expect(STEPS).toEqual(["what", "where", "details", "price", "photos", "review"]);
});

test("stepErrors needs at least one photo", () => {
  expect(stepErrors("photos", EMPTY_DRAFT, 0)).toEqual({ photos: "Add at least one photo." });
  expect(stepErrors("photos", EMPTY_DRAFT, 2)).toEqual({});
});
