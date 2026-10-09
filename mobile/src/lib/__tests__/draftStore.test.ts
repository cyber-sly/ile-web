import { describe, expect, test } from "@jest/globals";
import { EMPTY_DRAFT } from "@shared/lister.js";
import { createDraftStore, type Draft } from "../draftStore";

function memory() {
  const data: Record<string, string> = {};
  return {
    data,
    getItem: async (k: string) => data[k] ?? null,
    setItem: async (k: string, v: string) => {
      data[k] = v;
    },
    removeItem: async (k: string) => {
      delete data[k];
    },
  };
}

const draft = (title: string): Draft => ({
  values: { ...EMPTY_DRAFT, title },
  photos: [{ kind: "local", media: { id: "file:///doc/drafts/1.jpg", uri: "file:///doc/drafts/1.jpg", kind: "image", mime: "image/jpeg" } }],
  videos: [],
  uploaded: {},
  step: 3,
});

describe("draftStore", () => {
  test("saves and restores a draft with its photos", async () => {
    const storage = memory();
    await createDraftStore(storage).save("new", draft("Flat in Yaba"));
    const restored = await createDraftStore(storage).load("new");
    expect(restored?.values.title).toBe("Flat in Yaba");
    expect(restored?.photos).toHaveLength(1);
    expect(restored?.step).toBe(3);
  });

  test("keeps new and edit drafts apart", async () => {
    const store = createDraftStore(memory());
    await store.save("new", draft("New one"));
    await store.save("edit:l1", draft("Edited"));
    expect((await store.load("new"))?.values.title).toBe("New one");
    expect((await store.load("edit:l1"))?.values.title).toBe("Edited");
    await store.clear("new");
    expect(await store.load("new")).toBeNull();
  });
});
