import { fetchSavedIds, importSavedIds, saveListing, unsaveListing } from "@shared/saved.js";

// Saved homes, same rules as the website (src/lib/saved.js): logged out, the
// list lives on the device; at login, device saves move into the account.
// The account's list is also kept on the phone ("account:<uid>") so it shows
// offline, and refreshed when the connection comes back.
type Storage = { read(key: string): Promise<string[]>; write(key: string, ids: string[]): Promise<void> };

const DEVICE = "device";
const accountKey = (uid: string) => `account:${uid}`;

type Client = any;

export function createSavedStore({ client, storage }: { client: Client; storage: Storage }) {
  let ids: string[] = [];
  let userId: string | null = null;
  const listeners = new Set<() => void>();

  function emit(next: string[]) {
    ids = next;
    listeners.forEach((l) => l());
  }

  // Show device saves straight away; hearts wait for this first read.
  const ready = storage.read(DEVICE).then((device) => {
    if (!userId) emit(device);
  });

  async function loadAccount(uid: string) {
    try {
      const remote = await fetchSavedIds(client);
      if (userId !== uid) return;
      emit(remote);
      await storage.write(accountKey(uid), remote);
    } catch {
      // Offline: keep showing the copy on the phone.
    }
  }

  async function switchAccount(nextUser: string | null) {
    await ready;
    if (!nextUser) {
      if (userId) await storage.write(accountKey(userId), []);
      userId = null;
      emit(await storage.read(DEVICE));
      return;
    }
    if (nextUser === userId) return;
    userId = nextUser;
    emit(await storage.read(accountKey(nextUser)));
    const local = await storage.read(DEVICE);
    if (local.length) {
      try {
        await importSavedIds(client, nextUser, local);
        await storage.write(DEVICE, []);
      } catch {
        // Device saves stay on the phone; the next login retries.
      }
    }
    await loadAccount(nextUser);
  }

  // Re-fetch the account's saves (back online, app reopened, pull to refresh).
  async function refresh() {
    await ready;
    if (userId) await loadAccount(userId);
  }

  async function toggle(id: string) {
    await ready;
    const key = String(id);
    const removing = ids.includes(key);
    emit(removing ? ids.filter((x) => x !== key) : [key, ...ids]);
    const uid = userId;
    if (!uid) {
      await storage.write(DEVICE, ids);
      return;
    }
    try {
      if (removing) await unsaveListing(client, uid, key);
      else await saveListing(client, uid, key);
    } catch {
      // Undo just this heart; other hearts tapped meanwhile stay.
      emit(removing ? [key, ...ids.filter((x) => x !== key)] : ids.filter((x) => x !== key));
    }
    if (userId === uid) await storage.write(accountKey(uid), ids);
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
    refresh,
    toggle,
  };
}
