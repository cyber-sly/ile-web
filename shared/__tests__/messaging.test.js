import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanMessage, MAX_MESSAGE, threadFrom, shortTime, sendMessage, markRead } from "../messaging.js";

test("cleanMessage trims, and rejects empty or over-long text", () => {
  assert.equal(cleanMessage("  hi "), "hi");
  assert.equal(cleanMessage("   "), null);
  assert.equal(cleanMessage("x".repeat(MAX_MESSAGE + 1)), null);
  assert.equal(cleanMessage("x".repeat(MAX_MESSAGE)).length, MAX_MESSAGE);
});

test("threadFrom names a deleted other person", () => {
  const t = threadFrom({ id: "c1", tenant_id: "me", landlord_id: null, listings: null }, "me", {}, undefined);
  assert.equal(t.otherName, "Deleted user");
  assert.equal(t.otherAvatar, null);
  assert.equal(t.listing, null);
  assert.equal(t.role, "Lister");
  assert.equal(t.unread, 0);
});

test("threadFrom uses the summary row for latest message and unread count", () => {
  const t = threadFrom(
    { id: "c1", tenant_id: "t1", landlord_id: "me", listings: { id: "l1", title: "Flat" } },
    "me",
    { t1: { name: "Ada", avatar: "a.png" } },
    { conversation_id: "c1", last_body: "Hello", last_sender: "t1", last_at: "2026-10-09T10:00:00Z", unread: 2 }
  );
  assert.equal(t.otherName, "Ada");
  assert.equal(t.role, "Home-seeker");
  assert.equal(t.latest.body, "Hello");
  assert.equal(t.unread, 2);
  assert.equal(t.listing.title, "Flat");
});

test("shortTime formats minutes, hours and days", () => {
  const now = new Date("2026-10-09T12:00:00Z");
  assert.equal(shortTime("2026-10-09T11:59:30Z", now), "now");
  assert.equal(shortTime("2026-10-09T11:55:00Z", now), "5m");
  assert.equal(shortTime("2026-10-09T09:00:00Z", now), "3h");
});

// Records insert/update calls on `messages`.
function messagesClient(insertError = null) {
  const calls = [];
  const client = {
    calls,
    from: () => ({
      insert: (row) => {
        calls.push(["insert", row]);
        return { select: () => ({ single: async () => (insertError ? { data: null, error: insertError } : { data: { ...row }, error: null }) }) };
      },
      update: (changes) => {
        calls.push(["update", changes]);
        const chain = {
          in: (...a) => (calls.push(["in", ...a]), chain),
          is: (...a) => (calls.push(["is", ...a]), chain),
          then: (res) => res({ error: null }),
        };
        return chain;
      },
    }),
  };
  return client;
}

test("sendMessage uses the id made on the phone", async () => {
  const client = messagesClient();
  await sendMessage(client, "c1", "u1", "Hi", "11111111-1111-4111-8111-111111111111");
  assert.equal(client.calls[0][1].id, "11111111-1111-4111-8111-111111111111");
});

test("sendMessage treats an already-saved id as sent", async () => {
  const client = messagesClient({ code: "23505", message: "duplicate key" });
  const row = await sendMessage(client, "c1", "u1", "Hi", "22222222-2222-4222-8222-222222222222");
  assert.equal(row.id, "22222222-2222-4222-8222-222222222222");
});

test("markRead only stamps messages that are still unread", async () => {
  const client = messagesClient();
  await markRead(client, ["m1"]);
  assert.ok(client.calls.some((c) => c[0] === "is" && c[1] === "read_at" && c[2] === null));
});
