import { describe, expect, test } from "@jest/globals";
import { createStartupGate } from "../startupGate";

describe("createStartupGate", () => {
  test("drops auth events that arrive before start-up finishes", () => {
    const seen: string[] = [];
    const gate = createStartupGate();
    const handler = gate.wrap((event: string) => seen.push(event));
    handler("SIGNED_IN");
    expect(seen).toEqual([]);
  });

  test("passes auth events through once start-up is done", () => {
    const seen: string[] = [];
    const gate = createStartupGate();
    const handler = gate.wrap((event: string) => seen.push(event));
    gate.open();
    handler("SIGNED_OUT");
    expect(seen).toEqual(["SIGNED_OUT"]);
  });
});
