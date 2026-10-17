import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanMessage, MAX_MESSAGE, threadFrom, shortTime, sendMessage, markRead, canEdit, editMessage, EDIT_WINDOW_MS } from "../messaging.js";
import { friendlyError } from "../errors.js";

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

const T0 = new Date("2026-10-17T12:00:00Z");
const sent = (secondsAgo, extra = {}) => ({ id: "m1", sender_id: "me", body: "hi", read_at: null, edited_at: null, created_at: new Date(T0.getTime() - secondsAgo * 1000).toISOString(), ...extra });

test("canEdit allows my message inside 3 minutes", () => {
  assert.equal(EDIT_WINDOW_MS, 180000);
  assert.equal(canEdit(sent(179), "me", T0), true);
  assert.equal(canEdit(sent(181), "me", T0), false);
  assert.equal(canEdit(sent(10), "you", T0), false);
});

test("canEdit refuses pending and temp messages", () => {
  assert.equal(canEdit(sent(10, { pending: "sending" }), "me", T0), false);
  assert.equal(canEdit(sent(10, { id: "temp-1" }), "me", T0), false);
});

test("canEdit is false before the edit column exists", () => {
  const { edited_at, ...old } = sent(10);
  assert.equal(edited_at, null);
  assert.equal(canEdit(old, "me", T0), false);
});

test("editMessage calls edit_message with trimmed text", async () => {
  const calls = [];
  const client = { rpc: async (name, args) => (calls.push([name, args]), { data: { id: "m1", body: "hi" }, error: null }) };
  const row = await editMessage(client, "m1", "  hi ");
  assert.deepEqual(calls[0], ["edit_message", { p_id: "m1", p_body: "hi" }]);
  assert.equal(row.body, "hi");
});

test("editMessage passes the window error through friendly", async () => {
  const msg = "You can only edit a message within 3 minutes of sending it.";
  const client = { rpc: async () => ({ data: null, error: { code: "P0001", message: msg } }) };
  await assert.rejects(editMessage(client, "m1", "new"), (e) => friendlyError(e) === msg);
});
