import { describe, expect, test } from "@jest/globals";
import { createOutbox, type OutboxItem } from "../outbox";

function memoryStorage() {
  let saved: OutboxItem[] = [];
  return {
    read: async () => saved,
    write: async (items: OutboxItem[]) => {
      saved = items;
    },
  };
}

const networkError = () => Object.assign(new Error("Network request failed"), { retryable: true });
const serverError = () => Object.assign(new Error("Too many messages"), { retryable: false });

describe("createOutbox", () => {
  test("items survive a restart", async () => {
    const storage = memoryStorage();
    const first = createOutbox({ storage, send: async () => ({}) });
    await first.add("c1", "Hello");
    const second = createOutbox({ storage, send: async () => ({}) });
    await second.ready;
    expect(second.items("c1").map((i) => i.body)).toEqual(["Hello"]);
  });

  test("flush sends oldest first and removes sent items", async () => {
    const sent: string[] = [];
    const outbox = createOutbox({ storage: memoryStorage(), send: async (i) => sent.push(i.body) });
    await outbox.add("c1", "one");
    await outbox.add("c1", "two");
    await outbox.flush();
    expect(sent).toEqual(["one", "two"]);
    expect(outbox.items("c1")).toEqual([]);
  });

  test("a network failure keeps the message waiting and stops flushing", async () => {
    const sent: string[] = [];
    const outbox = createOutbox({
      storage: memoryStorage(),
      send: async (i) => {
        sent.push(i.body);
        throw networkError();
      },
    });
    await outbox.add("c1", "one");
    await outbox.add("c1", "two");
    await outbox.flush();
    expect(sent).toEqual(["one"]);
    expect(outbox.items("c1").map((i) => i.state)).toEqual(["waiting", "waiting"]);
  });

  test("a server rejection marks the message failed and moves on", async () => {
    const sent: string[] = [];
    const outbox = createOutbox({
      storage: memoryStorage(),
      send: async (i) => {
        sent.push(i.body);
        if (i.body === "one") throw serverError();
      },
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
    const outbox = createOutbox({
      storage: memoryStorage(),
      send: () => {
        calls++;
        return new Promise<void>((resolve) => {
          release = resolve;
        });
      },
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
    const outbox = createOutbox({
      storage: memoryStorage(),
      send: async () => {
        if (fail) throw serverError();
      },
    });
    const item = await outbox.add("c1", "one");
    await outbox.flush();
    expect(outbox.items("c1")[0].state).toBe("failed");
    fail = false;
    await outbox.retry(item.localId);
    expect(outbox.items("c1")).toEqual([]);
  });
});
