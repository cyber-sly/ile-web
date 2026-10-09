import { expect, test } from "@jest/globals";
import { REQUEST_TIMES, requestDays, todayInLagos } from "../requestTimes";

test("requestDays starts today and covers three weeks", () => {
  const days = requestDays("2026-10-30");
  expect(days).toHaveLength(21);
  expect(days[0]).toBe("2026-10-30");
  expect(days).toContain("2026-11-01");
  expect(days[20]).toBe("2026-11-19");
});

test("REQUEST_TIMES offers any time plus hourly 8am to 6pm", () => {
  expect(REQUEST_TIMES[0]).toBe("");
  expect(REQUEST_TIMES).toContain("08:00");
  expect(REQUEST_TIMES).toContain("18:00");
  expect(REQUEST_TIMES).toHaveLength(12);
});

test("todayInLagos is a YYYY-MM-DD date", () => {
  expect(todayInLagos()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
});
