// Messages waiting to be sent. Typed offline (or while a send is in flight),
// kept on the phone, and sent oldest first when the connection is back.
// Each message belongs to the account that wrote it and is only sent as
// that account; logging out removes that account's waiting messages.

export type OutboxItem = {
  localId: string;
  messageId: string; // saved as messages.id, so a retry can't create a copy
  userId: string;
  conversationId: string;
  body: string;
  createdAt: string;
  state: "waiting" | "sending" | "failed";
};

type Storage = { read(): Promise<OutboxItem[]>; write(items: OutboxItem[]): Promise<void> };
// `send` throws an error with `retryable: true` for network problems; any
// other error means the server refused it (e.g. rate limit) and it won't be
// retried automatically.
type Send = (item: OutboxItem) => Promise<unknown>;

export function createOutbox({ storage, send, makeId }: { storage: Storage; send: Send; makeId: () => string }) {
  let all: OutboxItem[] = [];
  let userId: string | null = null;
  let flushing: Promise<void> | null = null;
  const listeners = new Set<() => void>();
  const cache = new Map<string, OutboxItem[]>();
  const EMPTY: OutboxItem[] = [];

  function set(next: OutboxItem[]) {
    all = next;
    cache.clear();
    listeners.forEach((l) => l());
    return storage.write(next).catch(() => {});
  }

  // Anything "sending" when the app closed is waiting again.
  const ready = storage
    .read()
    .then((saved) => set([...saved.filter((i) => i.userId).map((i) => (i.state === "sending" ? { ...i, state: "waiting" as const } : i)), ...all]))
    .catch(() => {});

  function update(localId: string, changes: Partial<OutboxItem> | null) {
    return set(changes ? all.map((i) => (i.localId === localId ? { ...i, ...changes } : i)) : all.filter((i) => i.localId !== localId));
  }

  async function run() {
    await ready;
    for (;;) {
      const next = all.find((i) => i.state === "waiting" && i.userId === userId);
      if (!next) return;
      await update(next.localId, { state: "sending" });
      try {
        await send(next);
        await update(next.localId, null);
      } catch (e) {
        const retryable = Boolean((e as { retryable?: boolean })?.retryable);
        await update(next.localId, { state: retryable ? "waiting" : "failed" });
        if (retryable) return; // still offline: try again on reconnect
      }
    }
  }

  function flush(): Promise<void> {
    if (!flushing) flushing = run().finally(() => (flushing = null));
    return flushing;
  }

  // Called when the signed-in account changes. The previous account's
  // waiting messages are removed from the phone (they are private).
  async function setUser(next: string | null) {
    await ready;
    if (flushing) await flushing;
    const previous = userId;
    userId = next;
    if (previous && previous !== next) await set(all.filter((i) => i.userId !== previous));
    else {
      cache.clear();
      listeners.forEach((l) => l());
    }
    if (next) await flush();
  }

  async function add(conversationId: string, body: string): Promise<OutboxItem> {
    await ready;
    if (!userId) throw new Error("Log in to send messages.");
    const item: OutboxItem = {
      localId: makeId(),
      messageId: makeId(),
      userId,
      conversationId,
      body,
      createdAt: new Date().toISOString(),
      state: "waiting",
    };
    await set([...all, item]);
    return item;
  }

  async function retry(localId: string) {
    await update(localId, { state: "waiting" });
    await flush();
  }

  return {
    ready,
    setUser,
    items(conversationId: string): OutboxItem[] {
      if (!userId) return EMPTY;
      if (!cache.has(conversationId)) cache.set(conversationId, all.filter((i) => i.conversationId === conversationId && i.userId === userId));
      return cache.get(conversationId)!;
    },
    add,
    flush,
    retry,
    subscribe(fn: () => void) {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
  };
}
