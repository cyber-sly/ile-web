import { describe, expect, jest, test } from "@jest/globals";
import { EMPTY_DRAFT } from "@shared/lister.js";
import { createAutosave, createDraftStore, draftKey, listingFingerprint, restoreDraft, type Draft } from "../draftStore";

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
    getAllKeys: async () => Object.keys(data),
    multiRemove: async (keys: readonly string[]) => {
      for (const k of keys) delete data[k];
    },
  };
}

const draft = (title: string, base = ""): Draft => ({
  values: { ...EMPTY_DRAFT, title },
  photos: [{ kind: "local", media: { id: "file:///doc/drafts/1.jpg", uri: "file:///doc/drafts/1.jpg", kind: "image", mime: "image/jpeg" } }],
  videos: [],
  uploaded: {},
  step: 3,
  base,
});

describe("draftStore", () => {
  test("saves and restores a draft with its photos", async () => {
    const storage = memory();
    await createDraftStore(storage).save("u1:new", draft("Flat in Yaba"));
    const restored = await createDraftStore(storage).load("u1:new");
    expect(restored?.values.title).toBe("Flat in Yaba");
    expect(restored?.photos).toHaveLength(1);
    expect(restored?.step).toBe(3);
  });

  test("keeps new and edit drafts apart", async () => {
    const store = createDraftStore(memory());
    await store.save("u1:new", draft("New one"));
    await store.save("u1:edit:l1", draft("Edited"));
    expect((await store.load("u1:new"))?.values.title).toBe("New one");
    expect((await store.load("u1:edit:l1"))?.values.title).toBe("Edited");
    await store.clear("u1:new");
    expect(await store.load("u1:new")).toBeNull();
  });

  test("drafts belong to one account and logging out removes them", async () => {
    const storage = memory();
    const store = createDraftStore(storage);
    expect(draftKey("u1", null)).toBe("u1:new");
    expect(draftKey("u1", "l9")).toBe("u1:edit:l9");
    await store.save(draftKey("u1", null), draft("A's"));
    await store.save(draftKey("u2", null), draft("B's"));
    await store.clearUser("u1");
    expect(await store.load(draftKey("u1", null))).toBeNull();
    expect((await store.load(draftKey("u2", null)))?.values.title).toBe("B's");
  });

  test("a draft from an older load fills in fields added since", async () => {
    const storage = memory();
    storage.data["ile:draft:u1:new"] = JSON.stringify({ values: { title: "Old" }, photos: [], videos: [], uploaded: {}, step: 1 });
    const restored = await createDraftStore(storage).load("u1:new");
    expect(restored?.values.area).toBe("");
    expect(restored?.values.title).toBe("Old");
  });
});

describe("restoreDraft", () => {
  const listing = { id: "l1", title: "Flat", price: 100, image_urls: ["a"], video_urls: [] };

  test("keeps an edit draft made from the same version of the listing", () => {
    const saved = draft("Typo fixed", listingFingerprint(listing));
    expect(restoreDraft(saved, listing, draft("fresh"))).toBe(saved);
  });

  test("drops an edit draft when the listing changed on the website since", () => {
    const saved = draft("Typo fixed", listingFingerprint(listing));
    const fresh = draft("fresh");
    expect(restoreDraft(saved, { ...listing, price: 120 }, fresh)).toBe(fresh);
    expect(restoreDraft(saved, { ...listing, image_urls: ["a", "b"] }, fresh)).toBe(fresh);
  });
});

describe("createAutosave", () => {
  test("saves after a pause, but not once stopped", async () => {
    jest.useFakeTimers();
    const save = jest.fn();
    const autosave = createAutosave(save, 500);
    autosave.schedule("first");
    jest.advanceTimersByTime(500);
    expect(save).toHaveBeenCalledWith("first");
    autosave.schedule("second");
    autosave.stop();
    jest.advanceTimersByTime(1000);
    autosave.schedule("third");
    jest.advanceTimersByTime(1000);
    expect(save).toHaveBeenCalledTimes(1);
    jest.useRealTimers();
  });
});
