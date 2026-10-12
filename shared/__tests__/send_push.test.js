import { test } from "node:test";
import assert from "node:assert/strict";
import { handle } from "../../supabase/functions/send-push/handler.js";

const req = (secret) => new Request("https://x/functions/v1/send-push", { method: "POST", headers: secret ? { "x-push-secret": secret } : {} });

function fakeDb(rows, tokens = {}) {
  const calls = { claimed: 0, deleted: [], unclaimed: [] };
  return {
    calls,
    claimPending: async () => {
      calls.claimed++;
      return rows;
    },
    tokensFor: async () => tokens,
    prefsFor: async () => ({}),
    deleteTokens: async (t) => calls.deleted.push(...t),
    unclaim: async (ids) => calls.unclaimed.push(...ids),
  };
}

const rows = [
  { id: "n1", user_id: "u1", type: "message", title: "Ada", body: "Hi", data: {} },
  { id: "n2", user_id: "u2", type: "review", title: "New review", body: "5 stars", data: {} },
];

test("rejects requests without the secret", async () => {
  const db = fakeDb(rows);
  const res = await handle(req(null), { secret: "s3cret", db, fetchImpl: async () => new Response("{}") });
  assert.equal(res.status, 401);
  assert.equal(db.calls.claimed, 0);
  const wrong = await handle(req("nope"), { secret: "s3cret", db, fetchImpl: async () => new Response("{}") });
  assert.equal(wrong.status, 401);
});

test("sends pending notifications in batches and reports counts", async () => {
  const db = fakeDb(rows, { u1: ["t1", "t2"] });
  const sent = [];
  const res = await handle(req("s3cret"), {
    secret: "s3cret",
    db,
    fetchImpl: async (_url, init) => {
      const body = JSON.parse(init.body);
      sent.push(...body);
      return new Response(JSON.stringify({ data: body.map(() => ({ status: "ok", id: "x" })) }));
    },
  });
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { sent: 2, skipped: 1 });
  assert.deepEqual(sent.map((m) => m.to), ["t1", "t2"]);
});

test("deletes devices Expo says are gone", async () => {
  const db = fakeDb([rows[0]], { u1: ["gone", "fine"] });
  await handle(req("s3cret"), {
    secret: "s3cret",
    db,
    fetchImpl: async () =>
      new Response(JSON.stringify({ data: [{ status: "error", details: { error: "DeviceNotRegistered" } }, { status: "ok", id: "y" }] })),
  });
  assert.deepEqual(db.calls.deleted, ["gone"]);
});

test("puts notifications back when Expo can't be reached", async () => {
  const db = fakeDb([rows[0]], { u1: ["t1"] });
  const res = await handle(req("s3cret"), {
    secret: "s3cret",
    db,
    fetchImpl: async () => {
      throw new Error("network down");
    },
  });
  assert.equal(res.status, 502);
  assert.deepEqual(db.calls.unclaimed, ["n1"]);
});
