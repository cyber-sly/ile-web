import { expect, test } from "@jest/globals";
import { readFileSync } from "fs";
import { join } from "path";

// Route files load lazily in release builds, so the outbox must be started
// from the root layout or offline messages wait until a chat is opened.
test("the root layout starts the message outbox", () => {
  const source = readFileSync(join(__dirname, "..", "..", "app", "_layout.tsx"), "utf8");
  expect(source).toMatch(/import "@\/lib\/outboxApp";/);
});

test("the Google sign-in return address has a screen (no 'unmatched route' on Android)", () => {
  const { existsSync } = require("fs");
  expect(existsSync(join(__dirname, "..", "..", "app", "auth-callback.tsx"))).toBe(true);
});
