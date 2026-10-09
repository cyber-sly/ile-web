import { describe, expect, test } from "@jest/globals";
import { createSavedStore } from "../savedStore";

// In-memory keyed storage ("device" and "account:<uid>" lists).
function memoryStorage(initial: Record<string, string[]> = {}) {
  const data: Record<string, string[]> = { ...initial };
  return {
    data,
    read: async (key: string) => data[key] || [],
    write: async (key: string, ids: string[]) => {
      data[key] = ids;
    },
  };
}

// Fake Supabase client covering what shared/saved.js calls.
function fakeClient({ account = [] as string[], failUpsertFor = [] as string[], offline = false } = {}) {
  const calls: string[] = [];
  let rows = [...account];
  const client = {
    calls,
    offline,
    from(table: string) {
      return {
        select() {
          return {
            order: async () => {
              calls.push(`fetch:${table}`);
              if (client.offline) return { data: null, error: { message: "Network request failed" } };
              return { data: rows.map((listing_id) => ({ listing_id })), error: null };
            },
            in: async (_col: string, ids: string[]) => {
              calls.push(`lookup:${table}`);
              if (client.offline) return { data: null, error: { message: "Network request failed" } };
              return { data: ids.map((id) => ({ id })), error: null };
            },
          };
        },
        upsert: async (input: { listing_id: string } | { listing_id: string }[]) => {
          const list = Array.isArray(input) ? input : [input];
          calls.push(`upsert:${list.map((r) => r.listing_id).join(",")}`);
          if (list.some((r) => failUpsertFor.includes(r.listing_id))) return { error: { message: "nope" } };
          for (const r of list) if (!rows.includes(r.listing_id)) rows = [r.listing_id, ...rows];
          return { error: null };
        },
        delete() {
          const chain = { eq: () => chain, then: (res: (v: { error: null }) => void) => res({ error: null }) };
          return chain;
        },
      };
    },
  };
  return client;
}

describe("createSavedStore", () => {
  test("logged-out toggle saves on the device", async () => {
    const client = fakeClient();
    const storage = memoryStorage();
    const store = createSavedStore({ client, storage });
    await store.switchAccount(null);
    await store.toggle("a");
    expect(store.getIds()).toEqual(["a"]);
    expect(storage.data.device).toEqual(["a"]);
    expect(client.calls).toEqual([]);
  });

  test("login imports device saves, clears the device list and loads the account", async () => {
    const storage = memoryStorage({ device: ["a"] });
    const store = createSavedStore({ client: fakeClient({ account: ["b"] }), storage });
    await store.switchAccount("u1");
    expect(store.getIds()).toEqual(["a", "b"]);
    expect(storage.data.device).toEqual([]);
  });

  test("login still loads account saves when the import fails", async () => {
    const client = fakeClient({ account: ["b"] });
    const storage = memoryStorage({ device: ["a"] });
    // Lookup fails, fetch works.
    const original = client.from.bind(client);
    client.from = (table: string) => {
      const t = original(table);
      if (table === "listings") t.select = () => ({ in: async () => ({ data: null, error: { message: "x" } }), order: async () => ({ data: [], error: null }) });
      return t;
    };
    const store = createSavedStore({ client, storage });
    await store.switchAccount("u1");
    expect(store.getIds()).toEqual(["b"]);
    expect(storage.data.device).toEqual(["a"]);
  });

  test("failed save reverts only that heart", async () => {
    const store = createSavedStore({ client: fakeClient({ account: ["b"], failUpsertFor: ["a"] }), storage: memoryStorage() });
    await store.switchAccount("u1");
    await store.toggle("a");
    expect(store.getIds()).toEqual(["b"]);
  });

  test("notifies subscribers when the list changes", async () => {
    const store = createSavedStore({ client: fakeClient(), storage: memoryStorage() });
    let calls = 0;
    store.subscribe(() => calls++);
    await store.switchAccount(null);
    await store.toggle("a");
    expect(calls).toBeGreaterThan(0);
  });

  test("offline login shows the account saves kept on the phone", async () => {
    const storage = memoryStorage({ "account:u1": ["b", "c"] });
    const store = createSavedStore({ client: fakeClient({ offline: true }), storage });
    await store.switchAccount("u1");
    expect(store.getIds()).toEqual(["b", "c"]);
  });

  test("refresh loads account saves once the connection is back", async () => {
    const client = fakeClient({ account: ["b"], offline: true });
    const storage = memoryStorage();
    const store = createSavedStore({ client, storage });
    await store.switchAccount("u1");
    expect(store.getIds()).toEqual([]);
    client.offline = false;
    await store.refresh();
    expect(store.getIds()).toEqual(["b"]);
    expect(storage.data["account:u1"]).toEqual(["b"]);
  });

  test("a heart tapped before the device list loads keeps the device saves", async () => {
    const storage = memoryStorage({ device: ["a", "b"] });
    const store = createSavedStore({ client: fakeClient(), storage });
    await store.toggle("c"); // before switchAccount runs
    expect(store.getIds()).toEqual(["c", "a", "b"]);
    expect(storage.data.device).toEqual(["c", "a", "b"]);
  });

  test("logging out clears that account's saves from the phone", async () => {
    const storage = memoryStorage();
    const store = createSavedStore({ client: fakeClient({ account: ["b"] }), storage });
    await store.switchAccount("u1");
    expect(storage.data["account:u1"]).toEqual(["b"]);
    await store.switchAccount(null);
    expect(storage.data["account:u1"]).toEqual([]);
    expect(store.getIds()).toEqual([]);
  });
});
