import { expect, test } from "@jest/globals";
import { idsToMarkRead } from "../chatMessages";

const m = (id: string, sender_id: string, read_at: string | null = null) => ({ id, sender_id, read_at, created_at: "2026-10-09T10:00:00Z", body: "" });

test("only the other person's unread messages not already being marked", () => {
  const requested = new Set(["a"]);
  const rows = [m("a", "them"), m("b", "them"), m("c", "me"), m("d", "them", "2026-10-09T10:01:00Z")];
  expect(idsToMarkRead(rows, "me", requested)).toEqual(["b"]);
});
