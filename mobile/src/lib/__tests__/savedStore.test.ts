import { describe, expect, test } from "@jest/globals";
import { createSavedStore } from "../savedStore";

// In-memory device storage.
function memoryStorage(initial: string[] = []) {
  let ids = initial;
  return {
    get ids() {
      return ids;
    },
    read: async () => ids,
    write: async (next: string[]) => {
      ids = next;
    },
  };
}

// Fake Supabase client covering what shared/saved.js calls.
function fakeClient({ account = [] as string[], existing = null as string[] | null, failUpsertFor = [] as string[], failLookup = false } = {}) {
  const calls: string[] = [];
  let rows = [...account];
  return {
    calls,
    from(table: string) {
      return {
        select() {
          return {
            order: async () => {
              calls.push(`fetch:${table}`);
              return { data: rows.map((listing_id) => ({ listing_id })), error: null };
            },
            in: async (_col: string, ids: string[]) => {
              calls.push(`lookup:${table}`);
              if (failLookup) return { data: null, error: { message: "offline" } };
              return { data: ids.filter((id) => !existing || existing.includes(id)).map((id) => ({ id })), error: null };
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
}

describe("createSavedStore", () => {
  test("logged-out toggle saves on the device", async () => {
    const client = fakeClient();
    const storage = memoryStorage();
    const store = createSavedStore({ client, storage });
    await store.switchAccount(null);
    await store.toggle("a");
    expect(store.getIds()).toEqual(["a"]);
    expect(storage.ids).toEqual(["a"]);
    expect(client.calls).toEqual([]);
  });

  test("login imports device saves, clears the device list and loads the account", async () => {
    const client = fakeClient({ account: ["b"] });
    const storage = memoryStorage(["a"]);
    const store = createSavedStore({ client, storage });
    await store.switchAccount("u1");
    expect(store.getIds()).toEqual(["a", "b"]);
    expect(storage.ids).toEqual([]);
  });

  test("login still loads account saves when the import fails", async () => {
    const client = fakeClient({ account: ["b"], failLookup: true });
    const storage = memoryStorage(["a"]);
    const store = createSavedStore({ client, storage });
    await store.switchAccount("u1");
    expect(store.getIds()).toEqual(["b"]);
    expect(storage.ids).toEqual(["a"]);
  });

  test("failed save reverts only that heart", async () => {
    const client = fakeClient({ account: ["b"], failUpsertFor: ["a"] });
    const store = createSavedStore({ client, storage: memoryStorage() });
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
});
