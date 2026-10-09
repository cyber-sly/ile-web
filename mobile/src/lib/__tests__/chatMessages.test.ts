import { describe, expect, test } from "@jest/globals";
import { lastSeenId, mergeMessages, withDayBreaks } from "../chatMessages";

const msg = (id: string, created_at: string, sender_id = "me", read_at: string | null = null) => ({ id, created_at, sender_id, read_at, body: id });

describe("mergeMessages", () => {
  test("orders by time, drops duplicates, and appends pending", () => {
    const m1 = msg("m1", "2026-10-09T10:00:00Z");
    const m2 = msg("m2", "2026-10-09T10:01:00Z");
    const pending = [{ localId: "p1", messageId: "p1-id", userId: "me", conversationId: "c1", body: "later", createdAt: "2026-10-09T09:00:00Z", state: "waiting" as const }];
    const rows = mergeMessages([m2, m1, m1], pending);
    expect(rows.map((r) => r.id)).toEqual(["m1", "m2", "p1"]);
    expect(rows[2].pending).toBe("waiting");
  });
});

describe("withDayBreaks", () => {
  test("adds a label before each new day", () => {
    const now = new Date("2026-10-09T12:00:00Z");
    const rows = [msg("a", "2026-10-08T09:00:00Z"), msg("b", "2026-10-08T10:00:00Z"), msg("c", "2026-10-09T09:00:00Z")];
    const out = withDayBreaks(rows, now);
    expect(out.map((r) => ("day" in r ? `day:${r.day}` : r.id))).toEqual(["day:Yesterday", "a", "b", "day:Today", "c"]);
  });
});

describe("lastSeenId", () => {
  test("picks your newest read message", () => {
    const rows = [
      msg("old", "2026-10-09T09:00:00Z", "me", "2026-10-09T09:05:00Z"),
      msg("read", "2026-10-09T10:00:00Z", "me", "2026-10-09T10:02:00Z"),
      msg("unread", "2026-10-09T10:05:00Z", "me", null),
      msg("theirs", "2026-10-09T10:06:00Z", "them", "2026-10-09T10:07:00Z"),
    ];
    expect(lastSeenId(rows, "me")).toBe("read");
  });

  test("is null when nothing you sent has been read", () => {
    expect(lastSeenId([msg("a", "2026-10-09T10:00:00Z", "me", null)], "me")).toBeNull();
  });
});
