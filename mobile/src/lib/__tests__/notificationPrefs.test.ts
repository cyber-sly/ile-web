import { describe, expect, test } from "@jest/globals";
import { DEFAULT_PREFS, fetchPrefs, savePref, savePrefs } from "../notificationPrefs";

function fakeClient(row: Record<string, unknown> | null) {
  const calls: unknown[][] = [];
  return {
    calls,
    from: (table: string) => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => {
            calls.push(["select", table]);
            return { data: row, error: null };
          },
        }),
      }),
      upsert: async (value: unknown, options: unknown) => {
        calls.push(["upsert", table, value, options]);
        return { error: null };
      },
    }),
  };
}

describe("notification settings", () => {
  test("fetchPrefs returns defaults when there is no row", async () => {
    expect(await fetchPrefs(fakeClient(null), "u1")).toEqual(DEFAULT_PREFS);
    expect(DEFAULT_PREFS).toEqual({ messages: true, bookings: true, reminders: true, hide_message_text: false });
  });

  test("fetchPrefs returns the saved choices", async () => {
    const prefs = await fetchPrefs(fakeClient({ user_id: "u1", messages: false, bookings: true, reminders: false, hide_message_text: true }), "u1");
    expect(prefs).toEqual({ messages: false, bookings: true, reminders: false, hide_message_text: true });
  });

  test("savePrefs upserts the person's row", async () => {
    const client = fakeClient(null);
    await savePrefs(client, "u1", { ...DEFAULT_PREFS, reminders: false });
    expect(client.calls[0][0]).toBe("upsert");
    expect(client.calls[0][2]).toMatchObject({ user_id: "u1", reminders: false, messages: true });
    expect(client.calls[0][3]).toEqual({ onConflict: "user_id" });
  });

  test("savePref changes only the one setting, so it can't undo others", async () => {
    const client = fakeClient(null);
    await savePref(client, "u1", "reminders", false);
    expect(client.calls[0][2]).toEqual(expect.objectContaining({ user_id: "u1", reminders: false }));
    expect(Object.keys(client.calls[0][2] as object).sort()).toEqual(["reminders", "updated_at", "user_id"]);
  });
});
