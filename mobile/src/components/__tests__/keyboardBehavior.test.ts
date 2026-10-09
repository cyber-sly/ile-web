import { expect, test } from "@jest/globals";
import { keyboardBehavior } from "../keyboardBehavior";

test("Android lifts the form above the keyboard (edge-to-edge does not resize)", () => {
  expect(keyboardBehavior("android")).toBe("height");
});

test("iOS pads the form above the keyboard", () => {
  expect(keyboardBehavior("ios")).toBe("padding");
});
