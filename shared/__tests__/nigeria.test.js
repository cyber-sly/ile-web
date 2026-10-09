import { test } from "node:test";
import assert from "node:assert/strict";
import { NIGERIA, STATES, stateLabel } from "../nigeria.js";

test("covers 36 states plus FCT and all 774 LGAs", () => {
  assert.equal(STATES.length, 37);
  assert.equal(Object.values(NIGERIA).reduce((n, lgas) => n + lgas.length, 0), 774);
});

test("uses corrected Lagos LGA spellings", () => {
  assert.ok(NIGERIA.Lagos.includes("Eti-Osa"));
  assert.ok(NIGERIA.Lagos.includes("Ibeju-Lekki"));
});

test("labels FCT as Abuja", () => {
  assert.equal(stateLabel("FCT"), "FCT (Abuja)");
  assert.equal(stateLabel("Lagos"), "Lagos");
});
