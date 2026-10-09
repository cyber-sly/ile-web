import { test } from "node:test";
import assert from "node:assert/strict";
import { mergeSavedIds } from "../saved.js";

test("merges device saves into account saves without duplicates", () => {
  assert.deepEqual(mergeSavedIds(["a", "b"], ["b", "c"]), ["b", "c", "a"]);
});

test("handles empty lists", () => {
  assert.deepEqual(mergeSavedIds([], []), []);
  assert.deepEqual(mergeSavedIds(["1"], []), ["1"]);
});

test("returns ids as strings", () => {
  assert.deepEqual(mergeSavedIds([5], []), ["5"]);
});
