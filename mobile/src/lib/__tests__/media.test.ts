import { describe, expect, test } from "@jest/globals";
import { resizeTarget, storagePath, videoProblem } from "../mediaRules";

describe("resizeTarget", () => {
  test("shrinks the longer side to 1600", () => {
    expect(resizeTarget(4000, 3000)).toEqual({ width: 1600 });
    expect(resizeTarget(3000, 4000)).toEqual({ height: 1600 });
  });

  test("leaves small photos alone", () => {
    expect(resizeTarget(1200, 900)).toBeNull();
  });
});

test("storagePath puts files in the user's folder", () => {
  expect(storagePath("u1", "jpg", 1700000000000, 0.5)).toMatch(/^u1\/1700000000000-[a-z0-9]+\.jpg$/);
});

test("videoProblem refuses big files and unsupported types", () => {
  expect(videoProblem({ size: 51 * 1024 * 1024, mime: "video/mp4" })).toBe("Videos must be 50 MB or smaller.");
  expect(videoProblem({ size: 1000, mime: "video/x-msvideo" })).toBe("Use an MP4, MOV or WebM video.");
  expect(videoProblem({ size: 1000, mime: "video/quicktime" })).toBeNull();
});
