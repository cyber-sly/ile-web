import { test } from "node:test";
import assert from "node:assert/strict";
import { presenceLabel, fetchChatPresence, touchPresence } from "../presence.js";

const NOW = new Date("2026-10-17T15:00:00Z");
const ago = (s) => new Date(NOW.getTime() - s * 1000).toISOString();

test("presenceLabel says Online within 2 minutes", () => {
  assert.deepEqual(presenceLabel(ago(119), NOW), { online: true, text: "Online" });
  assert.equal(presenceLabel(ago(121), NOW).online, false);
});

test("presenceLabel shows today's time in Lagos", () => {
  assert.deepEqual(presenceLabel("2026-10-17T09:42:00Z", NOW), { online: false, text: "Last seen 10:42" });
});

test("presenceLabel uses Lagos calendar days", () => {
  const now = new Date("2026-10-17T23:30:00Z"); // 00:30 on 18 Oct in Lagos
  assert.equal(presenceLabel("2026-10-17T22:00:00Z", now).text, "Last seen yesterday");
});

test("presenceLabel shows a date for older visits", () => {
  assert.equal(presenceLabel("2026-10-12T10:00:00Z", NOW).text, "Last seen 12 Oct");
  assert.equal(presenceLabel("2025-12-30T10:00:00Z", NOW).text, "Last seen 30 Dec 2025");
});

test("presenceLabel returns null for missing input", () => {
  assert.equal(presenceLabel(null, NOW), null);
  assert.equal(presenceLabel("", NOW), null);
  assert.equal(presenceLabel("nonsense", NOW), null);
});

test("fetchChatPresence maps rows and makes no request for none", async () => {
  const calls = [];
  const client = (result) => ({
    rpc: async (name, args) => {
      calls.push([name, args]);
      return result;
    },
  });
  assert.deepEqual(await fetchChatPresence(client({ data: [{ conversation_id: "c1", last_seen_at: "t" }], error: null }), ["c1"]), { c1: "t" });
  assert.deepEqual(calls[0], ["chat_presence", { p_conversations: ["c1"] }]);
  assert.deepEqual(await fetchChatPresence(client({ data: [], error: null }), []), {});
  assert.equal(calls.length, 1);
  assert.deepEqual(await fetchChatPresence(client({ data: null, error: { code: "PGRST202", message: "missing" } }), ["c1"]), {});
});

test("touchPresence never throws", async () => {
  await touchPresence({ rpc: async () => Promise.reject(new Error("offline")) });
  await touchPresence({ rpc: async () => ({ error: { message: "missing" } }) });
});
