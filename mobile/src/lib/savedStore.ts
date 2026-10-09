import { fetchSavedIds, importSavedIds, saveListing, unsaveListing } from "@shared/saved.js";

// Saved homes, same rules as the website (src/lib/saved.js): logged out, the
// list lives on the device; at login, device saves move into the account.
type Storage = { read(): Promise<string[]>; write(ids: string[]): Promise<void> };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createSavedStore({ client, storage }: { client: any; storage: Storage }) {
  let ids: string[] = [];
  let userId: string | null = null;
  const listeners = new Set<() => void>();

  function emit(next: string[]) {
    ids = next;
    listeners.forEach((l) => l());
  }

  async function switchAccount(nextUser: string | null) {
    if (!nextUser) {
      userId = null;
      emit(await storage.read());
      return;
    }
    if (nextUser === userId) return;
    userId = nextUser;
    const local = await storage.read();
    if (local.length) {
      try {
        await importSavedIds(client, nextUser, local);
        await storage.write([]);
      } catch {
        // Device saves stay on the phone; the next login retries.
      }
    }
    try {
      const remote = await fetchSavedIds(client);
      if (userId === nextUser) emit(remote);
    } catch {
      // Offline: keep showing what we have.
    }
  }

  async function toggle(id: string) {
    const key = String(id);
    const removing = ids.includes(key);
    emit(removing ? ids.filter((x) => x !== key) : [key, ...ids]);
    if (!userId) {
      await storage.write(ids);
      return;
    }
    try {
      if (removing) await unsaveListing(client, userId, key);
      else await saveListing(client, userId, key);
    } catch {
      // Undo just this heart; other hearts tapped meanwhile stay.
      emit(removing ? [key, ...ids.filter((x) => x !== key)] : ids.filter((x) => x !== key));
    }
  }

  return {
    getIds: () => ids,
    subscribe(fn: () => void) {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    switchAccount,
    toggle,
  };
}
