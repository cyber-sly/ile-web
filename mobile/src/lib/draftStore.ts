import { EMPTY_DRAFT } from "@shared/lister.js";
import type { LocalMedia } from "./media";

// The listing wizard's work in progress, kept on the phone so closing the app
// doesn't lose it. Photos are either already on Ile ("saved", when editing)
// or files in the app's storage ("local"); `uploaded` remembers local files
// that already reached Ile, so publishing again doesn't re-upload them.
// `base` fingerprints the listing an edit started from, so a draft made
// before the listing changed elsewhere is not restored over newer data.
export type PhotoItem = { kind: "saved"; url: string } | { kind: "local"; media: LocalMedia };
export type Draft = {
  values: Record<string, any>;
  photos: PhotoItem[];
  videos: PhotoItem[];
  uploaded: Record<string, string>;
  step: number;
  base?: string;
};

type Storage = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
  getAllKeys(): Promise<readonly string[]>;
  multiRemove(keys: readonly string[]): Promise<void>;
};

const PREFIX = "ile:draft:";

// Drafts belong to one account: "<userId>:new" or "<userId>:edit:<listingId>".
export function draftKey(userId: string, listingId: string | null): string {
  return listingId ? `${userId}:edit:${listingId}` : `${userId}:new`;
}

export function listingFingerprint(listing: Record<string, any>): string {
  const { id, ...rest } = listing;
  void id;
  return JSON.stringify(Object.keys(rest).sort().map((k) => [k, rest[k]]));
}

// An edit draft is only restored if the listing hasn't changed since it began.
export function restoreDraft(saved: Draft | null, listing: Record<string, any> | null, fresh: Draft): Draft {
  if (!saved) return fresh;
  if (listing && saved.base !== listingFingerprint(listing)) return fresh;
  return saved;
}

export function createDraftStore(storage: Storage) {
  return {
    async load(key: string): Promise<Draft | null> {
      try {
        const raw = await storage.getItem(PREFIX + key);
        if (!raw) return null;
        const draft = JSON.parse(raw) as Draft;
        // Fields added to the form since this draft was saved start empty.
        return { ...draft, values: { ...EMPTY_DRAFT, ...draft.values } };
      } catch {
        return null;
      }
    },
    async save(key: string, draft: Draft) {
      try {
        await storage.setItem(PREFIX + key, JSON.stringify(draft));
      } catch {}
    },
    async clear(key: string) {
      try {
        await storage.removeItem(PREFIX + key);
      } catch {}
    },
    // On logout: another account must not see this person's drafts.
    async clearUser(userId: string) {
      try {
        const keys = (await storage.getAllKeys()).filter((k) => k.startsWith(`${PREFIX}${userId}:`));
        if (keys.length) await storage.multiRemove(keys);
      } catch {}
    },
  };
}

// Saves a value a moment after the last change. stop() cancels a pending save
// and ignores later ones (after publishing, so the draft isn't written back).
export function createAutosave<T>(save: (value: T) => void, delay = 500) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let stopped = false;
  return {
    schedule(value: T) {
      if (stopped) return;
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        if (!stopped) save(value);
      }, delay);
    },
    stop() {
      stopped = true;
      if (timer) clearTimeout(timer);
      timer = null;
    },
  };
}
