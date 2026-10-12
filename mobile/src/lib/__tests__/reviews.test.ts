import { describe, expect, test } from "@jest/globals";
import { reviewState } from "../reviews";

const lagos = (offset: number) => new Date(Date.now() + offset * 86_400_000).toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" });

describe("reviewState", () => {
  test("offers a review after a confirmed viewing's date", () => {
    expect(reviewState({ id: "i1", status: "confirmed", preferred_date: lagos(-1) }, new Set())).toBe("can-review");
    expect(reviewState({ id: "i1", status: "done", preferred_date: lagos(0) }, new Set())).toBe("can-review");
  });

  test("hides it before the date", () => {
    expect(reviewState({ id: "i1", status: "confirmed", preferred_date: lagos(1) }, new Set())).toBe("not-yet");
    expect(reviewState({ id: "i1", status: "cancelled", preferred_date: lagos(-3) }, new Set())).toBe("not-yet");
  });

  test("shows reviewed when already done", () => {
    expect(reviewState({ id: "i1", status: "confirmed", preferred_date: lagos(-1) }, new Set(["i1"]))).toBe("reviewed");
  });
});

test("shows nothing until it's known which viewings were reviewed", () => {
  expect(reviewState({ id: "i1", status: "confirmed", preferred_date: lagos(-1) }, undefined)).toBe("not-yet");
});
