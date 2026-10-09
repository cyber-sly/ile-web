import { describe, expect, it } from "@jest/globals";
import { isInactive, INACTIVE_DAYS } from "../inactivity";

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 9, 9, 12, 0, 0);

describe("isInactive", () => {
  it("uses a 30-day window", () => {
    expect(INACTIVE_DAYS).toBe(30);
  });
  it("treats a first launch (no record) as active", () => {
    expect(isInactive(null, NOW)).toBe(false);
  });
  it("logs out after more than 30 days unused", () => {
    expect(isInactive(NOW - 31 * DAY, NOW)).toBe(true);
  });
  it("keeps recent users signed in", () => {
    expect(isInactive(NOW - 10 * DAY, NOW)).toBe(false);
    expect(isInactive(NOW - 30 * DAY + 1000, NOW)).toBe(false);
  });
});
