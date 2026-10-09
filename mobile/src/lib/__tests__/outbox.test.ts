import { describe, expect, test } from "@jest/globals";
import { createOutbox, type OutboxItem } from "../outbox";

function memoryStorage() {
  let saved: OutboxItem[] = [];
  return {
    get saved() {
      return saved;
    },
    read: async () => saved,
    write: async (items: OutboxItem[]) => {
      saved = items;
    },
  };
}

let n = 0;
const makeId = () => `id-${++n}`;
const networkError = () => Object.assign(new Error("Network request failed"), { retryable: true });
const serverError = () => Object.assign(new Error("Too many messages"), { retryable: false });

async function outboxFor(user: string, send: (i: OutboxItem) => Promise<unknown>, storage = memoryStorage()) {
  const outbox = createOutbox({ storage, send, makeId });
  await outbox.setUser(user);
  return outbox;
}

describe("createOutbox", () => {
  test("items survive a restart", async () => {
    const storage = memoryStorage();
    const first = await outboxFor("u1", async () => {
      throw networkError();
    }, storage);
    await first.add("c1", "Hello");
    const second = await outboxFor("u1", async () => {
      throw networkError();
    }, storage);
    expect(second.items("c1").map((i) => i.body)).toEqual(["Hello"]);
  });

  test("each message gets its own id, kept for every retry", async () => {
    const ids: string[] = [];
    const outbox = await outboxFor("u1", async (i) => {
      ids.push(i.messageId);
      throw networkError();
    });
    const item = await outbox.add("c1", "one");
    await outbox.flush();
    await outbox.flush();
    expect(ids).toEqual([item.messageId, item.messageId]);
  });

  test("flush sends oldest first and removes sent items", async () => {
    const sent: string[] = [];
    const outbox = await outboxFor("u1", async (i) => sent.push(i.body));
    await outbox.add("c1", "one");
    await outbox.add("c1", "two");
    await outbox.flush();
    expect(sent).toEqual(["one", "two"]);
    expect(outbox.items("c1")).toEqual([]);
  });

  test("a network failure keeps the message waiting and stops flushing", async () => {
    const sent: string[] = [];
    const outbox = await outboxFor("u1", async (i) => {
      sent.push(i.body);
      throw networkError();
    });
    await outbox.add("c1", "one");
    await outbox.add("c1", "two");
    await outbox.flush();
    expect(sent).toEqual(["one"]);
    expect(outbox.items("c1").map((i) => i.state)).toEqual(["waiting", "waiting"]);
  });

  test("a server rejection marks the message failed and moves on", async () => {
    const sent: string[] = [];
    const outbox = await outboxFor("u1", async (i) => {
      sent.push(i.body);
      if (i.body === "one") throw serverError();
    });
    await outbox.add("c1", "one");
    await outbox.add("c1", "two");
    await outbox.flush();
    expect(sent).toEqual(["one", "two"]);
    expect(outbox.items("c1").map((i) => [i.body, i.state])).toEqual([["one", "failed"]]);
  });

  test("flush does not send the same message twice when called again mid-send", async () => {
    let calls = 0;
    let release: () => void = () => {};
    const outbox = await outboxFor("u1", () => {
      calls++;
      return new Promise<void>((resolve) => {
        release = resolve;
      });
    });
    await outbox.add("c1", "one");
    const a = outbox.flush();
    const b = outbox.flush();
    await new Promise((r) => setTimeout(r, 0));
    release();
    await Promise.all([a, b]);
    expect(calls).toBe(1);
  });

  test("retry sends a failed message again", async () => {
    let fail = true;
    const outbox = await outboxFor("u1", async () => {
      if (fail) throw serverError();
    });
    const item = await outbox.add("c1", "one");
    await outbox.flush();
    expect(outbox.items("c1")[0].state).toBe("failed");
    fail = false;
    await outbox.retry(item.localId);
    expect(outbox.items("c1")).toEqual([]);
  });

  test("messages are only sent as the person who wrote them", async () => {
    const storage = memoryStorage();
    const sent: string[] = [];
    const a = await outboxFor("userA", async () => {
      throw networkError();
    }, storage);
    await a.add("c1", "from A");
    const b = await outboxFor("userB", async (i) => sent.push(`${i.userId}:${i.body}`), storage);
    await b.flush();
    expect(sent).toEqual([]);
    expect(b.items("c1")).toEqual([]);
  });

  test("logging out removes that person's waiting messages from the phone", async () => {
    const storage = memoryStorage();
    const outbox = await outboxFor("userA", async () => {
      throw networkError();
    }, storage);
    await outbox.add("c1", "private");
    await outbox.setUser(null);
    expect(storage.saved).toEqual([]);
  });
});
