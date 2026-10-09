import { test } from "node:test";
import assert from "node:assert/strict";
import { formatNaira, formatNairaShort, formatDate, formatTime } from "../format.js";

test("formats naira amounts", () => {
  assert.equal(formatNaira(3500000), "₦3,500,000");
  assert.equal(formatNaira("abc"), "₦—");
  assert.equal(formatNairaShort(2400000), "₦2.4m");
  assert.equal(formatNairaShort(850000), "₦850k");
});

test("dates never shift a day", () => {
  assert.match(formatDate("2026-10-12"), /12 Oct 2026/);
});

test("formats times as 12-hour clock", () => {
  assert.equal(formatTime("14:00:00"), "2:00 pm");
  assert.equal(formatTime("00:30"), "12:30 am");
});
