import { test } from "node:test";
import assert from "node:assert/strict";
import { NIGERIA, STATES, stateLabel, matchPlace } from "../nigeria.js";

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

test("matchPlace finds state and LGA", () => {
  assert.deepEqual(matchPlace({ region: "Lagos State", subregion: "Eti-Osa" }), { state: "Lagos", lga: "Eti-Osa" });
});

test("matchPlace maps the capital territory to FCT", () => {
  assert.equal(matchPlace({ region: "Federal Capital Territory", city: "Abuja" }).state, "FCT");
});

test("matchPlace keeps the state when the LGA is unknown", () => {
  assert.deepEqual(matchPlace({ region: "Oyo", subregion: "Somewhere" }), { state: "Oyo", lga: "" });
});

test("matchPlace returns null outside Nigeria", () => {
  assert.equal(matchPlace({ region: "Greater London" }), null);
});

test("matchPlace ignores 'Local Government Area' wording and case", () => {
  assert.deepEqual(matchPlace({ region: "lagos", subregion: "Ikeja Local Government Area" }), { state: "Lagos", lga: "Ikeja" });
});
