import { expect, test } from "@jest/globals";
import { uniqueTopic } from "../realtime";

test("each screen gets its own realtime channel name", () => {
  const a = uniqueTopic("chat-c1");
  const b = uniqueTopic("chat-c1");
  expect(a).not.toBe(b);
  expect(a.startsWith("chat-c1-")).toBe(true);
});
