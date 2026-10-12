import { expect, test } from "@jest/globals";
import { shadeStops } from "../shadeStops";

test("shadeStops spreads colours evenly and splits rgba into colour and opacity", () => {
  expect(shadeStops(["transparent", "rgba(15,28,21,0.3)", "rgba(15,28,21,0.85)"])).toEqual([
    { offset: "0%", color: "rgb(0,0,0)", opacity: 0 },
    { offset: "50%", color: "rgb(15,28,21)", opacity: 0.3 },
    { offset: "100%", color: "rgb(15,28,21)", opacity: 0.85 },
  ]);
});

test("shadeStops uses given locations", () => {
  expect(shadeStops(["rgba(15,28,21,0.35)", "rgba(15,28,21,0.1)"], [0, 0.45]).map((s) => s.offset)).toEqual(["0%", "45%"]);
});
