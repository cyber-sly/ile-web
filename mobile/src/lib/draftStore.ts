import type { LocalMedia } from "./media";

// The listing wizard's work in progress, kept on the phone so closing the app
// doesn't lose it. Photos are either already on Ile ("saved", when editing)
// or files in the app's storage ("local"); `uploaded` remembers local files
// that already reached Ile, so publishing again doesn't re-upload them.
export type PhotoItem = { kind: "saved"; url: string } | { kind: "local"; media: LocalMedia };
export type Draft = {
  values: Record<string, any>;
  photos: PhotoItem[];
  videos: PhotoItem[];
  uploaded: Record<string, string>;
  step: number;
};

type Storage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

const storageKey = (key: string) => `ile:draft:${key}`;

// `key` is "new" or "edit:<listing id>".
export function createDraftStore(storage: Storage) {
  return {
    async load(key: string): Promise<Draft | null> {
      try {
        const raw = await storage.getItem(storageKey(key));
        return raw ? (JSON.parse(raw) as Draft) : null;
      } catch {
        return null;
      }
    },
    async save(key: string, draft: Draft) {
      try {
        await storage.setItem(storageKey(key), JSON.stringify(draft));
      } catch {}
    },
    async clear(key: string) {
      try {
        await storage.removeItem(storageKey(key));
      } catch {}
    },
  };
}
