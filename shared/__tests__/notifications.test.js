import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { CATEGORY_BY_TYPE, buildMessages, categoryOf, chunk, invalidTokens, notificationRoute } from "../notifications.js";

const row = (id, user_id, type, body = "Hello there", data = {}) => ({ id, user_id, type, title: "Ada", body, data });

test("categoryOf maps every type", () => {
  assert.equal(categoryOf("message"), "messages");
  for (const t of ["viewing_request", "viewing_booked", "viewing_confirmed", "viewing_countered", "viewing_declined", "viewing_cancelled", "review"]) {
    assert.equal(categoryOf(t), "bookings", t);
  }
  assert.equal(categoryOf("viewing_reminder"), "reminders");
  assert.equal(categoryOf("still_available"), "reminders");
  assert.equal(Object.keys(CATEGORY_BY_TYPE).length, 10);
});

test("buildMessages sends one push per device", () => {
  const { messages, skipped } = buildMessages([row("n1", "u1", "message")], { u1: ["ExponentPushToken[a]", "ExponentPushToken[b]"] }, {});
  assert.equal(messages.length, 2);
  assert.deepEqual(messages[0], {
    to: "ExponentPushToken[a]",
    title: "Ada",
    body: "Hello there",
    data: { notificationId: "n1" },
    sound: "default",
    channelId: "default",
    priority: "high",
  });
  assert.deepEqual(skipped, []);
});

test("buildMessages skips categories the person turned off", () => {
  const rows = [row("n1", "u1", "message"), row("n2", "u1", "viewing_confirmed", "Flat, Mon 10am")];
  const { messages, skipped } = buildMessages(rows, { u1: ["t1"] }, { u1: { messages: false, bookings: true, reminders: true, hide_message_text: false } });
  assert.deepEqual(messages.map((m) => m.data.notificationId), ["n2"]);
  assert.deepEqual(skipped, ["n1"]);
});

test("buildMessages hides message text when asked", () => {
  const { messages } = buildMessages([row("n1", "u1", "message", "My gate code is 1234")], { u1: ["t1"] }, { u1: { messages: true, bookings: true, reminders: true, hide_message_text: true } });
  assert.equal(messages[0].body, "Sent you a message");
});

test("buildMessages skips people with no devices", () => {
  const { messages, skipped } = buildMessages([row("n1", "u2", "review")], { u1: ["t1"] }, {});
  assert.deepEqual(messages, []);
  assert.deepEqual(skipped, ["n1"]);
});

test("chunk splits into groups of 100", () => {
  const list = Array.from({ length: 250 }, (_, i) => i);
  assert.deepEqual(chunk(list).map((c) => c.length), [100, 100, 50]);
});

test("invalidTokens finds devices Expo no longer knows", () => {
  const messages = [{ to: "t1" }, { to: "t2" }, { to: "t3" }];
  const tickets = [{ status: "ok", id: "x" }, { status: "error", details: { error: "DeviceNotRegistered" } }, { status: "error", details: { error: "MessageRateExceeded" } }];
  assert.deepEqual(invalidTokens(messages, tickets), ["t2"]);
});

test("notificationRoute opens the chat, viewings or account", () => {
  assert.equal(notificationRoute({ route: "chat", id: "c1" }), "/chat/c1");
  assert.equal(notificationRoute({ route: "viewings" }), "/viewings");
  assert.equal(notificationRoute({ route: "dashboard" }), "/viewings");
  assert.equal(notificationRoute({ route: "account" }), "/account");
  assert.equal(notificationRoute({}), "/");
  assert.equal(notificationRoute(null), "/");
});

test("the Edge Function copy matches shared/notifications.js", () => {
  const root = join(import.meta.dirname, "..", "..");
  const a = readFileSync(join(root, "shared", "notifications.js"), "utf8").replace(/\r\n/g, "\n");
  const b = readFileSync(join(root, "supabase", "functions", "_shared", "notifications.js"), "utf8").replace(/\r\n/g, "\n");
  assert.equal(b, a);
});
